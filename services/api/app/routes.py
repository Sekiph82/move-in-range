import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session
from .auth import create_token, hash_password, password_needs_upgrade, revoke_access_token, token_hash, verify_password
from .db.models import (
    AuditLog,
    Exercise,
    ExerciseLocalization,
    ExerciseMedia,
    ExerciseTag,
    FavoriteExercise,
    GlucoseEntry,
    OfflineEvent,
    Plan,
    Profile,
    ReadinessCheck,
    SessionEvent,
    SessionRecord,
    User,
)
from .db.session import get_db
from .security import require_admin_role, require_user
from .settings import get_settings
from .services.safety import EMERGENCY_MESSAGE, evaluate_safety

router = APIRouter()
_rate_limits: dict[str, list[datetime]] = {}
ADMIN_ROLES = {"super_admin", "clinical_reviewer", "exercise_reviewer", "content_editor", "support", "analyst"}

CONDITIONS = [
    "type_1_diabetes",
    "type_2_diabetes",
    "prediabetes",
    "hypertension",
    "obesity_weight_management",
    "arthritis",
    "lower_back_sensitivity",
    "neck_sensitivity",
    "shoulder_sensitivity",
    "knee_sensitivity",
    "ankle_sensitivity",
    "hand_wrist_sensitivity",
    "general_deconditioning",
    "older_adult_mobility",
    "cardiac_rehabilitation_support",
]
DEFAULT_EQUIPMENT = [
    "body weight",
    "resistance band",
    "dumbbell",
    "barbell",
    "cable",
    "machine",
    "bench",
    "stability ball",
    "kettlebell",
    "mat",
    "chair",
    "treadmill",
    "stationary bike",
]


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)


class RefreshPayload(BaseModel):
    refresh_token: str


class ProfilePayload(BaseModel):
    preferred_name: str = "Local mover"
    age: int | None = None
    height: float | None = None
    weight: float | None = None
    units: str = "metric"
    country: str = "US"
    timezone: str = "UTC"
    language: str = "en"
    accessibility: dict[str, Any] = Field(default_factory=dict)
    conditions: list[str] = Field(default_factory=list)
    clinician_restrictions: list[str] = Field(default_factory=list)
    sensitivities: dict[str, Any] = Field(default_factory=dict)
    activity_level: str = "beginner"
    environment: str = "home"
    equipment: list[str] = Field(default_factory=lambda: ["body weight"])
    preferred_training_days: list[str] = Field(default_factory=lambda: ["Mon", "Wed", "Fri"])
    preferred_exercise_time: str | None = None
    normal_session_duration: int = 15
    minimum_session_duration: int = 5
    maximum_session_duration: int = 30
    preferred_rest_duration: int = 30
    goals: list[str] = Field(default_factory=lambda: ["mobility", "consistency"])
    medical_clearance: str = "unknown"
    consent_accepted: bool = False
    diabetes: dict[str, Any] | None = None
    onboarding_step: str = "complete"
    onboarding_complete: bool = True


class ReadinessPayload(BaseModel):
    energy: int = Field(ge=1, le=5)
    sleep_quality: int = Field(default=3, ge=1, le=5)
    pain: int = Field(ge=0, le=10)
    new_injury: bool = False
    dizziness: bool = False
    chest_discomfort: bool = False
    unusual_shortness_of_breath: bool = False
    illness: bool = False
    recent_fall: bool = False
    available_minutes: int = Field(default=15, ge=5, le=60)
    desired_session_type: str = "mixed"
    stress: int = Field(default=2, ge=1, le=5)
    resting_heart_rate: int | None = None
    diabetes: dict[str, Any] | None = None


class SessionStartPayload(BaseModel):
    plan_id: str | None = None
    resume: bool = True


class SessionPatchPayload(BaseModel):
    status: str | None = None
    current_index: int | None = None
    elapsed_seconds: int | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class EventPayload(BaseModel):
    event_type: str
    idempotency_key: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class GlucosePayload(BaseModel):
    value: float
    unit: str = "mg/dL"
    timing: str = "unspecified"
    session_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


@router.get("/health")
def health():
    return {"status": "ok", "service": "moveinrange-api", "api_base_url": "http://localhost:8200"}


@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: Credentials, request: Request, db: Session = Depends(get_db)):
    _rate_limit(f"register:{request.client.host if request.client else 'unknown'}", get_settings().auth_rate_limit)
    email = payload.email.strip().lower()
    if db.query(User).filter(User.email == email).one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "email_exists"})
    user = User(
        id="usr_" + secrets.token_hex(12),
        email=email,
        password_hash=hash_password(payload.password),
        auth_provider="local",
        role="user",
    )
    refresh = create_token(user.id, "refresh")
    user.refresh_token_hash = token_hash(refresh)
    db.add(user)
    db.add(AuditLog(actor_id=user.id, action="auth.register", target_type="user", target_id=user.id, redacted_payload={}))
    db.commit()
    return _auth_response(user, refresh)


@router.post("/auth/login")
def login(payload: Credentials, request: Request, db: Session = Depends(get_db)):
    _rate_limit(f"login:{request.client.host if request.client else 'unknown'}", get_settings().auth_rate_limit)
    user = db.query(User).filter(User.email == payload.email.strip().lower()).one_or_none()
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "invalid_credentials"})
    if password_needs_upgrade(user.password_hash):
        user.password_hash = hash_password(payload.password)
    refresh = create_token(user.id, "refresh")
    user.refresh_token_hash = token_hash(refresh)
    db.add(AuditLog(actor_id=user.id, action="auth.login", target_type="user", target_id=user.id, redacted_payload={}))
    db.commit()
    return _auth_response(user, refresh)


@router.post("/auth/refresh")
def refresh(payload: RefreshPayload, request: Request, db: Session = Depends(get_db)):
    _rate_limit(f"refresh:{request.client.host if request.client else 'unknown'}", get_settings().auth_rate_limit)
    from .auth import decode_token

    decoded = decode_token(payload.refresh_token, "refresh")
    user = db.get(User, decoded["sub"])
    if not user or user.refresh_token_hash != token_hash(payload.refresh_token):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "invalid_refresh"})
    next_refresh = create_token(user.id, "refresh")
    user.refresh_token_hash = token_hash(next_refresh)
    db.commit()
    return _auth_response(user, next_refresh)


@router.post("/auth/logout")
def logout(authorization: str | None = Header(default=None), user: User = Depends(require_user), db: Session = Depends(get_db)):
    if authorization and authorization.startswith("Bearer "):
        revoke_access_token(authorization.removeprefix("Bearer ").strip())
    user.refresh_token_hash = None
    db.add(AuditLog(actor_id=user.id, action="auth.logout", target_type="user", target_id=user.id, redacted_payload={}))
    db.commit()
    return {"logged_out": True}


@router.get("/auth/me")
def me(user: User = Depends(require_user)):
    return _user_payload(user)


@router.post("/admin/auth/login")
def admin_login(payload: Credentials, request: Request, db: Session = Depends(get_db)):
    _rate_limit(f"admin-login:{request.client.host if request.client else 'unknown'}", get_settings().auth_rate_limit)
    settings = get_settings()
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).one_or_none()
    if not user and email == settings.local_admin_email and payload.password == settings.local_admin_password:
        user = User(
            id="adm_" + secrets.token_hex(12),
            email=email,
            password_hash=hash_password(payload.password),
            auth_provider="local",
            role="super_admin",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    if not user or user.role not in ADMIN_ROLES or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "invalid_admin_credentials"})
    if password_needs_upgrade(user.password_hash):
        user.password_hash = hash_password(payload.password)
    refresh = create_token(user.id, "refresh")
    user.refresh_token_hash = token_hash(refresh)
    db.add(AuditLog(actor_id=user.id, action="admin.auth.login", target_type="admin", target_id=user.id, redacted_payload={"role": user.role}))
    db.commit()
    return _auth_response(user, refresh)


@router.get("/admin/auth/me")
def admin_me(admin: User = Depends(require_admin_role("admin"))):
    return {"admin": _user_payload(admin)}


@router.post("/admin/auth/logout")
def admin_logout(authorization: str | None = Header(default=None), admin: User = Depends(require_admin_role("admin")), db: Session = Depends(get_db)):
    if authorization and authorization.startswith("Bearer "):
        revoke_access_token(authorization.removeprefix("Bearer ").strip())
    admin.refresh_token_hash = None
    db.add(AuditLog(actor_id=admin.id, action="admin.auth.logout", target_type="admin", target_id=admin.id, redacted_payload={}))
    db.commit()
    return {"logged_out": True}


@router.get("/profile")
def get_profile(user: User = Depends(require_user), db: Session = Depends(get_db)):
    profile = _profile_for(user.id, db)
    return _profile_payload(user, profile)


@router.put("/profile")
def put_profile(payload: ProfilePayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    profile = _profile_for(user.id, db)
    profile.preferred_name = payload.preferred_name
    profile.locale = payload.language
    profile.timezone = payload.timezone
    profile.health_payload = payload.model_dump()
    profile.onboarding_complete = payload.onboarding_complete and payload.consent_accepted
    db.add(AuditLog(actor_id=user.id, action="profile.upsert", target_type="profile", target_id=str(profile.id), redacted_payload={"fields": sorted(payload.model_dump().keys())}))
    db.commit()
    db.refresh(profile)
    return _profile_payload(user, profile)


@router.put("/profile/conditions")
def update_conditions(payload: dict[str, list[str]], user: User = Depends(require_user), db: Session = Depends(get_db)):
    return _patch_profile_list(user, db, "conditions", payload.get("conditions", []))


@router.put("/profile/sensitivities")
def update_sensitivities(payload: dict[str, Any], user: User = Depends(require_user), db: Session = Depends(get_db)):
    profile = _profile_for(user.id, db)
    health = dict(profile.health_payload or {})
    health["sensitivities"] = payload.get("sensitivities", payload)
    profile.health_payload = health
    db.commit()
    return _profile_payload(user, profile)


@router.put("/profile/equipment")
def update_equipment(payload: dict[str, list[str]], user: User = Depends(require_user), db: Session = Depends(get_db)):
    return _patch_profile_list(user, db, "equipment", payload.get("equipment", []))


@router.put("/profile/goals")
def update_goals(payload: dict[str, list[str]], user: User = Depends(require_user), db: Session = Depends(get_db)):
    return _patch_profile_list(user, db, "goals", payload.get("goals", []))


@router.get("/conditions")
def conditions():
    return {"items": [{"code": code, "label": code.replace("_", " ").title()} for code in CONDITIONS]}


@router.get("/equipment")
def equipment(db: Session = Depends(get_db)):
    values = [row[0] for row in db.query(Exercise.equipment).distinct().all() if row[0]]
    return {"items": sorted(set(DEFAULT_EQUIPMENT + values))}


@router.post("/readiness-checks", status_code=status.HTTP_201_CREATED)
def create_readiness(payload: ReadinessPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    _rate_limit(f"readiness:{user.id}", get_settings().auth_rate_limit * 3)
    decision = evaluate_safety(payload.model_dump())
    created_at = datetime.now(UTC)
    check = ReadinessCheck(
        id="rdn_" + secrets.token_hex(12),
        user_id=user.id,
        payload=payload.model_dump(),
        decision={**decision, "timestamp": created_at.isoformat()},
        available_minutes=payload.available_minutes,
        created_at=created_at,
    )
    db.add(check)
    db.add(_safety_decision_log(user.id, decision, payload.model_dump()))
    db.commit()
    return _readiness_payload(check)


@router.get("/readiness-checks/latest")
def latest_readiness(user: User = Depends(require_user), db: Session = Depends(get_db)):
    check = db.query(ReadinessCheck).filter(ReadinessCheck.user_id == user.id).order_by(desc(ReadinessCheck.created_at)).first()
    if not check:
        return {"item": None}
    return {"item": _readiness_payload(check)}


@router.post("/readiness")
def legacy_readiness(payload: ReadinessPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    return create_readiness(payload, user, db)


@router.get("/exercises")
def exercise_search(
    q: str = "",
    body_part: str | None = None,
    equipment: str | None = None,
    target: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    language: str = "en",
    db: Session = Depends(get_db),
):
    query = db.query(Exercise)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(or_(func.lower(Exercise.name).like(like), func.lower(Exercise.target).like(like)))
    if body_part:
        query = query.filter(Exercise.body_part == body_part.lower())
    if equipment:
        query = query.filter(Exercise.equipment == equipment.lower())
    if target:
        query = query.filter(Exercise.target == target.lower())
    total = query.count()
    items = query.order_by(Exercise.name).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [_exercise_payload(item, db, language, brief=True) for item in items],
        "pagination": {"page": page, "page_size": page_size, "total": total},
        "filters": {"body_part": body_part, "equipment": equipment, "target": target},
        "media_policy": "external-license-required",
    }


@router.get("/exercises/{exercise_id}")
def exercise_detail(exercise_id: str, language: str = "en", user: User = Depends(require_user), db: Session = Depends(get_db)):
    exercise = _get_exercise(exercise_id, db)
    _record_recent(user.id, exercise.id, db)
    db.commit()
    return _exercise_payload(exercise, db, language)


@router.get("/exercises/{exercise_id}/substitutions")
def substitutions(exercise_id: str, db: Session = Depends(get_db)):
    exercise = _get_exercise(exercise_id, db)
    items = (
        db.query(Exercise)
        .filter(Exercise.id != exercise.id, Exercise.equipment == exercise.equipment, Exercise.body_part == exercise.body_part)
        .order_by(Exercise.name)
        .limit(5)
        .all()
    )
    if not items:
        items = db.query(Exercise).filter(Exercise.id != exercise.id).order_by(Exercise.name).limit(5).all()
    return {"items": [_exercise_payload(item, db, "en", brief=True) for item in items]}


@router.post("/exercises/{exercise_id}/favorite")
def favorite(exercise_id: str, user: User = Depends(require_user), db: Session = Depends(get_db)):
    exercise = _get_exercise(exercise_id, db)
    existing = db.query(FavoriteExercise).filter(FavoriteExercise.user_id == user.id, FavoriteExercise.exercise_id == exercise.id).one_or_none()
    if not existing:
        db.add(FavoriteExercise(user_id=user.id, exercise_id=exercise.id))
    db.commit()
    return {"favorited": True, "exercise_id": exercise.id}


@router.post("/plans/daily/generate", status_code=status.HTTP_201_CREATED)
def generate_daily(payload: ReadinessPayload | None = None, user: User = Depends(require_user), db: Session = Depends(get_db)):
    _rate_limit(f"daily-plan:{user.id}", get_settings().auth_rate_limit * 2)
    readiness = payload or _latest_or_default_readiness(user.id, db)
    decision = evaluate_safety(readiness.model_dump())
    if decision["action"] == "BLOCK_AND_SHOW_SAFETY_MESSAGE":
        return {"blocked": True, "safety_decision": {**decision, "timestamp": datetime.now(UTC).isoformat()}, "plan": None}
    plan_payload = _daily_plan_payload(user.id, readiness.model_dump(), decision, db)
    plan = Plan(id=plan_payload["id"], user_id=user.id, plan_type="daily", payload=plan_payload, safety_action=decision["action"])
    db.add(plan)
    db.commit()
    return {"blocked": False, "plan": plan_payload}


@router.get("/plans/daily/today")
def today_plan(user: User = Depends(require_user), db: Session = Depends(get_db)):
    plan = _latest_plan(user.id, "daily", db)
    return {"plan": plan.payload if plan else None}


@router.post("/plans/daily")
def legacy_daily_plan(payload: ReadinessPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    return generate_daily(payload, user, db)


@router.post("/plans/weekly/generate", status_code=status.HTTP_201_CREATED)
def generate_weekly(user: User = Depends(require_user), db: Session = Depends(get_db)):
    readiness = _latest_or_default_readiness(user.id, db)
    decision = evaluate_safety(readiness.model_dump())
    daily = _daily_plan_payload(user.id, readiness.model_dump(), decision, db)
    profile = _profile_for(user.id, db)
    preferred_days = (profile.health_payload or {}).get("preferred_training_days", ["Mon", "Wed", "Fri"])
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    previous_was_movement = False
    schedule = []
    for day in days:
        planned_movement = day in preferred_days and not previous_was_movement and decision["action"] != "BLOCK_AND_SHOW_SAFETY_MESSAGE"
        status_value = "planned" if planned_movement else "recovery"
        schedule.append(
            {
                "day": day,
                "session_type": "movement" if planned_movement else "recovery",
                "planned_duration": daily["total_minutes"] if planned_movement else 0,
                "intensity": "low" if decision["action"] != "READY" or not planned_movement else daily["intensity"],
                "status": status_value,
                "safety_modified": decision["action"] != "READY",
            }
        )
        previous_was_movement = planned_movement
    payload = {
        "id": "week_" + secrets.token_hex(8),
        "days": schedule,
        "explanation": "Weekly plan spaces movement days with recovery days and keeps intensity conservative after safety modifications.",
    }
    db.add(Plan(id=payload["id"], user_id=user.id, plan_type="weekly", payload=payload, safety_action=daily["safety_decision"]["action"]))
    db.commit()
    return {"plan": payload}


@router.get("/plans/weekly/current")
def current_weekly(user: User = Depends(require_user), db: Session = Depends(get_db)):
    plan = _latest_plan(user.id, "weekly", db)
    return {"plan": plan.payload if plan else None}


@router.post("/plans/monthly/generate", status_code=status.HTTP_201_CREATED)
def generate_monthly(user: User = Depends(require_user), db: Session = Depends(get_db)):
    readiness = _latest_or_default_readiness(user.id, db)
    readiness_payload = readiness.model_dump()
    decision = evaluate_safety(readiness_payload)
    hold_reason = None
    if decision["action"] == "BLOCK_AND_SHOW_SAFETY_MESSAGE":
        hold_reason = "safety-block hold"
    elif readiness_payload.get("pain", 0) >= 7:
        hold_reason = "pain hold"
    elif decision["action"] in {"DELAY_AND_RECHECK", "LOW_INTENSITY_ONLY", "FOLLOW_CLINICIAN_PLAN"}:
        hold_reason = "low-readiness or clinician-restriction hold"
    phases = [
        (1, "Adaptation", "Establish routine and comfortable movement range."),
        (2, "Duration progression", "Add modest duration only if readiness and pain history remain stable."),
        (3, "Modest intensity or volume progression", "Progress one variable at a time; no simultaneous aggressive increase."),
        (4, "Recovery and performance review", "Consolidate, review symptoms, and avoid automatic load increase."),
    ]
    payload = {
        "id": "month_" + secrets.token_hex(8),
        "program_start_date": datetime.now(UTC).date().isoformat(),
        "weeks": [
            {"week": week, "phase": phase, "progression_reason": hold_reason or reason, "hold": hold_reason is not None and week > 1}
            for week, phase, reason in phases
        ],
        "blocking_rules": ["pain increase", "concerning symptoms", "low readiness", "poor adherence", "clinician restriction", "safety block"],
    }
    db.add(Plan(id=payload["id"], user_id=user.id, plan_type="monthly", payload=payload, safety_action=decision["action"]))
    db.commit()
    return {"plan": payload}


@router.get("/plans/monthly/current")
def current_monthly(user: User = Depends(require_user), db: Session = Depends(get_db)):
    plan = _latest_plan(user.id, "monthly", db)
    return {"plan": plan.payload if plan else None}


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
def start_session(payload: SessionStartPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    latest = db.query(ReadinessCheck).filter(ReadinessCheck.user_id == user.id).order_by(desc(ReadinessCheck.created_at)).first()
    if latest and latest.decision.get("action") == "BLOCK_AND_SHOW_SAFETY_MESSAGE":
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "readiness_blocks_workout", "safety_message": latest.decision.get("explanation")})
    if payload.resume:
        existing = db.query(SessionRecord).filter(SessionRecord.user_id == user.id, SessionRecord.status == "in_progress").order_by(desc(SessionRecord.created_at)).first()
        if existing:
            return {"session": _session_payload(existing), "resumed": True}
    plan = db.get(Plan, payload.plan_id) if payload.plan_id else _latest_plan(user.id, "daily", db)
    if plan and plan.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "plan_not_found"})
    session = SessionRecord(id="ses_" + secrets.token_hex(12), user_id=user.id, plan_id=plan.id if plan else None, payload={"plan": plan.payload if plan else None})
    db.add(session)
    db.commit()
    return {"session": _session_payload(session), "resumed": False}


@router.patch("/sessions/{session_id}")
def patch_session(session_id: str, payload: SessionPatchPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    session = _get_session(session_id, user.id, db)
    if payload.status:
        session.status = payload.status
    if payload.current_index is not None:
        session.current_index = payload.current_index
    if payload.elapsed_seconds is not None:
        session.elapsed_seconds = payload.elapsed_seconds
    session.payload = {**(session.payload or {}), **payload.payload}
    db.commit()
    return {"session": _session_payload(session)}


@router.post("/sessions/{session_id}/events", status_code=status.HTTP_201_CREATED)
def add_session_event(session_id: str, payload: EventPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    _get_session(session_id, user.id, db)
    key = payload.idempotency_key or f"{session_id}:{payload.event_type}:{secrets.token_hex(4)}"
    existing = db.query(SessionEvent).filter(SessionEvent.user_id == user.id, SessionEvent.idempotency_key == key).one_or_none()
    if existing:
        return {"event": _event_payload(existing), "duplicate": True}
    event = SessionEvent(id="evt_" + secrets.token_hex(12), user_id=user.id, session_id=session_id, idempotency_key=key, event_type=payload.event_type, payload=payload.payload)
    db.add(event)
    db.commit()
    return {"event": _event_payload(event), "duplicate": False}


@router.post("/sessions/{session_id}/pain")
def report_pain(session_id: str, payload: dict[str, Any], user: User = Depends(require_user), db: Session = Depends(get_db)):
    _get_session(session_id, user.id, db)
    severity = int(payload.get("severity", 0))
    if severity < 0 or severity > 10 or not payload.get("location"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "invalid_pain_report"})
    action = "stop" if severity >= 7 else "offer_approved_substitution"
    event = EventPayload(event_type="pain_report", idempotency_key=payload.get("idempotency_key"), payload={**payload, "action": action})
    return {**add_session_event(session_id, event, user, db), "action": action}


@router.post("/sessions/{session_id}/symptoms")
def report_symptoms(session_id: str, payload: dict[str, Any], user: User = Depends(require_user), db: Session = Depends(get_db)):
    session = _get_session(session_id, user.id, db)
    session.status = "stopped_for_symptoms"
    session.payload = {**(session.payload or {}), "requires_new_readiness": True, "active_timer_invalidated": True}
    event = EventPayload(event_type="symptom_report", idempotency_key=payload.get("idempotency_key"), payload={**payload, "safety_message": EMERGENCY_MESSAGE})
    result = add_session_event(session_id, event, user, db)
    db.commit()
    return {**result, "action": "stop_and_show_safety_flow", "safety_message": EMERGENCY_MESSAGE}


@router.post("/sessions/{session_id}/complete")
def complete_session(session_id: str, payload: dict[str, Any], user: User = Depends(require_user), db: Session = Depends(get_db)):
    session = _get_session(session_id, user.id, db)
    if session.status == "stopped_for_symptoms":
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "session_stopped_for_symptoms", "safety_message": EMERGENCY_MESSAGE})
    session.status = "completed" if payload.get("completed", True) else "partial"
    session.payload = {**(session.payload or {}), "completion": payload}
    db.add(AuditLog(actor_id=user.id, action="session.complete", target_type="session", target_id=session.id, redacted_payload={"status": session.status}))
    db.commit()
    return {"session": _session_payload(session)}


@router.post("/glucose", status_code=status.HTTP_201_CREATED)
def glucose(payload: GlucosePayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    _rate_limit(f"glucose:{user.id}", get_settings().auth_rate_limit * 5)
    if payload.session_id:
        _get_session(payload.session_id, user.id, db)
    canonical = round(payload.value * 18.0182) if payload.unit == "mmol/L" else round(payload.value)
    entry = GlucoseEntry(
        id="glu_" + secrets.token_hex(12),
        user_id=user.id,
        session_id=payload.session_id,
        value=round(payload.value),
        unit=payload.unit,
        canonical_mg_dl=canonical,
        timing=payload.timing,
        payload=payload.payload,
    )
    db.add(entry)
    db.commit()
    return {"entry": _glucose_payload(entry), "no_insulin_recommendation": True}


@router.post("/diabetes/glucose")
def legacy_glucose(payload: GlucosePayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    return glucose(payload, user, db)


@router.post("/offline-events", status_code=status.HTTP_201_CREATED)
def offline_event(payload: EventPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    _rate_limit(f"offline-events:{user.id}", get_settings().auth_rate_limit * 10)
    allowed_events = {"readiness", "workout_progress", "pain_report", "symptom_report", "session_completion", "glucose", "post_workout_feedback"}
    if payload.event_type not in allowed_events:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "invalid_offline_event_type"})
    key = payload.idempotency_key or secrets.token_hex(12)
    existing = db.query(OfflineEvent).filter(OfflineEvent.user_id == user.id, OfflineEvent.idempotency_key == key).one_or_none()
    if existing:
        return {"event": _offline_payload(existing), "duplicate": True}
    status_value = "failed" if payload.payload.get("failed") else "accepted"
    event = OfflineEvent(
        id="off_" + secrets.token_hex(12),
        user_id=user.id,
        idempotency_key=key,
        event_type=payload.event_type,
        status=status_value,
        retry_count=int(payload.payload.get("retry_count", 0)),
        last_error=payload.payload.get("last_error"),
        processed_at=datetime.now(UTC) if status_value == "accepted" else None,
        payload=payload.payload,
    )
    db.add(event)
    db.commit()
    return {"event": _offline_payload(event), "duplicate": False}


@router.get("/insights/summary")
def insights(user: User = Depends(require_user), db: Session = Depends(get_db)):
    sessions = db.query(SessionRecord).filter(SessionRecord.user_id == user.id).all()
    completed = [s for s in sessions if s.status == "completed"]
    glucose_entries = db.query(GlucoseEntry).filter(GlucoseEntry.user_id == user.id).order_by(GlucoseEntry.created_at).all()
    planned_minutes = sum((s.payload or {}).get("plan", {}).get("total_minutes", 0) for s in sessions)
    completed_minutes = sum((s.payload or {}).get("completion", {}).get("actual_duration", 0) for s in completed)
    pain_events = db.query(SessionEvent).filter(SessionEvent.user_id == user.id, SessionEvent.event_type == "pain_report").count()
    substitution_events = db.query(SessionEvent).filter(SessionEvent.user_id == user.id, SessionEvent.event_type == "substitution").count()
    glucose_summary = {"status": "INSUFFICIENT_DATA", "sample_count": len(glucose_entries), "disclaimer": "This is not an insulin or treatment recommendation."}
    if len(glucose_entries) >= 5:
        values = [g.canonical_mg_dl for g in glucose_entries]
        glucose_summary = {
            "status": "READY",
            "sample_count": len(values),
            "mean_recorded_glucose": round(sum(values) / len(values), 1),
            "min": min(values),
            "max": max(values),
            "confidence": "low" if len(values) < 10 else "moderate",
            "disclaimer": "This is not an insulin or treatment recommendation.",
        }
    return {
        "sessions_completed": len(completed),
        "planned_minutes": planned_minutes,
        "completed_minutes": completed_minutes,
        "weekly_completion_rate": round(len(completed) / max(1, len(sessions)), 2),
        "monthly_completion_rate": round(len(completed) / max(1, len(sessions)), 2),
        "pain_report_count": pain_events,
        "substitution_count": substitution_events,
        "current_program_phase": "adaptation",
        "glucose": glucose_summary,
    }


@router.get("/admin/policies")
def policies(admin=Depends(require_admin_role("clinical_reviewer"))):
    return {"admin": admin.id, "policies": [{"version": "draft-2026-07-18", "status": "draft", "clinical_review_state": "draft"}]}


@router.get("/admin/exercises")
def admin_exercises(admin=Depends(require_admin_role("exercise_reviewer")), db: Session = Depends(get_db)):
    return exercise_search(page_size=25, db=db)


@router.get("/admin/audit-logs")
def audit_logs(admin=Depends(require_admin_role("support")), db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(50).all()
    return {"items": [{"event": log.action, "actor_id": log.actor_id, "target_type": log.target_type, "redacted": True} for log in logs]}


@router.post("/admin/policy-simulator")
def policy_simulator(payload: ReadinessPayload, admin=Depends(require_admin_role("clinical_reviewer")), db: Session = Depends(get_db)):
    _rate_limit(f"admin-simulator:{admin.id}", get_settings().auth_rate_limit * 3)
    decision = evaluate_safety(payload.model_dump())
    db.add(AuditLog(actor_id=admin.id, action="admin.policy.simulate", target_type="policy", target_id=decision["policy_version"], redacted_payload={"action": decision["action"]}))
    db.commit()
    return {"admin": admin.id, "decision": decision, "rejected_exercises": [], "generated_plan_allowed": decision["action"] != "BLOCK_AND_SHOW_SAFETY_MESSAGE"}


def _auth_response(user: User, refresh: str) -> dict[str, Any]:
    return {"user": _user_payload(user), "access_token": create_token(user.id), "refresh_token": refresh, "token_type": "bearer"}


def _rate_limit(key: str, limit: int) -> None:
    settings = get_settings()
    now = datetime.now(UTC)
    window_start = now - timedelta(seconds=settings.rate_limit_window_seconds)
    hits = [hit for hit in _rate_limits.get(key, []) if hit >= window_start]
    if len(hits) >= limit:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail={"code": "rate_limited"})
    hits.append(now)
    _rate_limits[key] = hits


def _user_payload(user: User) -> dict[str, Any]:
    return {"id": user.id, "email": user.email, "auth_provider": user.auth_provider, "role": user.role}


def _profile_for(user_id: str, db: Session) -> Profile:
    profile = db.query(Profile).filter(Profile.user_id == user_id).one_or_none()
    if profile:
        return profile
    profile = Profile(user_id=user_id, preferred_name="Local mover", locale="en", timezone="UTC", health_payload={"equipment": ["body weight"], "goals": ["mobility"], "conditions": []}, onboarding_complete=False)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def _profile_payload(user: User, profile: Profile) -> dict[str, Any]:
    return {"user": _user_payload(user), "profile": {"id": profile.id, "preferred_name": profile.preferred_name, "locale": profile.locale, "timezone": profile.timezone, "onboarding_complete": profile.onboarding_complete, **(profile.health_payload or {})}}


def _patch_profile_list(user: User, db: Session, key: str, value: list[str]) -> dict[str, Any]:
    profile = _profile_for(user.id, db)
    health = dict(profile.health_payload or {})
    health[key] = value
    profile.health_payload = health
    db.commit()
    return _profile_payload(user, profile)


def _readiness_payload(check: ReadinessCheck) -> dict[str, Any]:
    return {"id": check.id, "payload": check.payload, "decision": check.decision, "available_minutes": check.available_minutes, "created_at": check.created_at.isoformat() if check.created_at else None}


def _get_exercise(exercise_id: str, db: Session) -> Exercise:
    exercise = db.get(Exercise, exercise_id) or db.query(Exercise).filter(Exercise.slug == exercise_id).one_or_none()
    if not exercise:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "exercise_not_found"})
    return exercise


def _exercise_payload(exercise: Exercise, db: Session, language: str, brief: bool = False) -> dict[str, Any]:
    localizations = db.query(ExerciseLocalization).filter(ExerciseLocalization.exercise_id == exercise.id).all()
    media = db.query(ExerciseMedia).filter(ExerciseMedia.exercise_id == exercise.id).one_or_none()
    tag = db.query(ExerciseTag).filter(ExerciseTag.exercise_id == exercise.id).one_or_none()
    instructions = {loc.locale: loc.instructions for loc in localizations}
    steps = {loc.locale: loc.instruction_steps for loc in localizations}
    selected_locale = language if language in instructions else "en"
    payload = {
        "id": exercise.id,
        "slug": exercise.slug,
        "name": exercise.name,
        "body_part": exercise.body_part,
        "equipment": exercise.equipment,
        "target": exercise.target,
        "secondary_muscles": exercise.secondary_muscles or [],
        "instruction": instructions.get(selected_locale) or instructions.get("en") or "",
        "instruction_steps": steps.get(selected_locale) or steps.get("en") or [],
        "locales": sorted(instructions),
        "derived_tags": tag.tags if tag else {},
        "safety_notes": ["Use a comfortable range and stop for concerning symptoms or increasing pain."],
    }
    if not brief:
        payload["media"] = {
            "image": media.image_path if media else "",
            "gif": media.gif_path if media else "",
            "media_id": media.media_id if media else "",
            "attribution": media.attribution if media else "",
            "license_status": media.license_status if media else "external_terms_required",
        }
    return payload


def _record_recent(user_id: str, exercise_id: str, db: Session) -> None:
    db.add(AuditLog(actor_id=user_id, action="exercise.view", target_type="exercise", target_id=exercise_id, redacted_payload={}))


def _latest_or_default_readiness(user_id: str, db: Session) -> ReadinessPayload:
    latest = db.query(ReadinessCheck).filter(ReadinessCheck.user_id == user_id).order_by(desc(ReadinessCheck.created_at)).first()
    if latest:
        return ReadinessPayload(**latest.payload)
    return ReadinessPayload(energy=3, sleep_quality=3, pain=1, available_minutes=15)


def _daily_plan_payload(user_id: str, readiness: dict[str, Any], decision: dict[str, Any], db: Session) -> dict[str, Any]:
    minutes = min([5, 10, 15, 20, 30, 45, 60], key=lambda value: abs(value - readiness.get("available_minutes", 15)))
    query = db.query(Exercise).order_by(Exercise.name)
    if decision["action"] in {"LOW_INTENSITY_ONLY", "DELAY_AND_RECHECK", "READY_WITH_MODIFICATIONS"}:
        query = query.filter(or_(Exercise.equipment == "body weight", Exercise.equipment == "chair"))
    exercises = query.limit(max(4, min(8, round(minutes / 4)))).all()
    if not exercises:
        exercises = _fallback_exercises(db)
    total_seconds = minutes * 60
    base_items = []
    blocks = ["warmup", "main", "cardio", "cooldown"]
    for index, exercise in enumerate(exercises[:4]):
        base_items.append({
            "exercise_id": exercise.id,
            "name": exercise.name,
            "block": blocks[min(index, len(blocks) - 1)],
            "duration_seconds": total_seconds // 4,
            "rest_seconds": 20 if index in {0, 3} else 30,
            "sets": 1 if index in {0, 3} else 2,
            "reps": None if index == 2 else 8,
            "approved_substitutions": [item.id for item in db.query(Exercise).filter(Exercise.id != exercise.id, Exercise.equipment == exercise.equipment).limit(2).all()],
            "safety_notes": ["Stay conversational and stop for symptoms or increasing pain."],
        })
    base_items[-1]["duration_seconds"] += total_seconds - sum(item["duration_seconds"] for item in base_items)
    return {
        "id": "day_" + secrets.token_hex(8),
        "user_id": user_id,
        "total_minutes": minutes,
        "intensity": "low" if decision["action"] != "READY" else "moderate",
        "phase": "adaptation",
        "generator_version": "mvp-rule-planner-2026-07-18",
        "policy_version": decision["policy_version"],
        "safety_decision": {**decision, "timestamp": datetime.now(UTC).isoformat()},
        "items": base_items,
        "explanation": f"Generated from readiness, available time, equipment, and draft safety policy. Component durations total {minutes} minutes.",
    }


def _fallback_exercises(db: Session) -> list[Exercise]:
    fallback = [
        ("exercise-local-chair-march", "Chair-supported march", "cardio", "body weight", "cardio"),
        ("exercise-local-wall-shoulder-glide", "Wall shoulder glide", "shoulders", "wall", "mobility"),
        ("exercise-local-seated-ankle-circles", "Seated ankle circles", "ankles", "chair", "mobility"),
        ("exercise-local-breathing-cooldown", "Breathing cooldown", "cardio", "body weight", "recovery"),
    ]
    exercises = []
    for exercise_id, name, body_part, equipment, target in fallback:
        exercise = db.get(Exercise, exercise_id)
        if not exercise:
            exercise = Exercise(id=exercise_id, source_id=exercise_id, slug=exercise_id, name=name, body_part=body_part, equipment=equipment, target=target, secondary_muscles=[], source_metadata={"source": "local_fallback"})
            db.add(exercise)
        exercises.append(exercise)
    db.commit()
    return exercises


def _latest_plan(user_id: str, plan_type: str, db: Session) -> Plan | None:
    return db.query(Plan).filter(Plan.user_id == user_id, Plan.plan_type == plan_type).order_by(desc(Plan.created_at)).first()


def _get_session(session_id: str, user_id: str, db: Session) -> SessionRecord:
    session = db.get(SessionRecord, session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "session_not_found"})
    return session


def _session_payload(session: SessionRecord) -> dict[str, Any]:
    return {"id": session.id, "plan_id": session.plan_id, "status": session.status, "current_index": session.current_index, "elapsed_seconds": session.elapsed_seconds, "payload": session.payload}


def _event_payload(event: SessionEvent) -> dict[str, Any]:
    return {"id": event.id, "session_id": event.session_id, "event_type": event.event_type, "payload": event.payload}


def _glucose_payload(entry: GlucoseEntry) -> dict[str, Any]:
    return {"id": entry.id, "value": entry.value, "unit": entry.unit, "canonical_mg_dl": entry.canonical_mg_dl, "timing": entry.timing, "created_at": entry.created_at.isoformat() if entry.created_at else None}


def _offline_payload(event: OfflineEvent) -> dict[str, Any]:
    return {
        "id": event.id,
        "status": event.status,
        "retry_count": event.retry_count,
        "last_error": event.last_error,
        "processed_at": event.processed_at.isoformat() if event.processed_at else None,
    }


def _safety_decision_log(user_id: str, decision: dict[str, Any], inputs: dict[str, Any]):
    from .db.models import SafetyDecision

    return SafetyDecision(user_id=user_id, policy_version=decision["policy_version"], triggered_rule_ids=decision["triggered_rule_ids"], relevant_inputs=inputs, action=decision["action"], explanation=decision["explanation"], outcome_classification=decision["outcome_classification"])
