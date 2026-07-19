import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, or_, text
from sqlalchemy.orm import Session
from .auth import create_token, decode_token, hash_password, password_needs_upgrade, token_hash, verify_password
from .db.models import (
    AuditLog,
    AuthRefreshToken,
    AchievementRecord,
    BaselineAssessment,
    CalendarEvent,
    CameraAnalysisSession,
    CapacityProfile,
    CaregiverRelationship,
    ConsentRecord,
    DataExportJob,
    DeletionJob,
    DiabetesContextEntry,
    ExerciseFeedback,
    Exercise,
    ExerciseLocalization,
    ExerciseMedia,
    ExerciseTag,
    FavoriteExercise,
    GlucoseEntry,
    GoalPreference,
    MediaApproval,
    NotificationJob,
    NotificationPreference,
    OnboardingProgress,
    OfflineEvent,
    Plan,
    PlanDecisionEvidence,
    PlanModification,
    Profile,
    ProfessionalNote,
    ProfessionalRelationship,
    ProfessionalRestriction,
    ProgramSimulation,
    ProviderConnection,
    ProviderSyncRecord,
    ReadinessCheck,
    SessionEvent,
    SessionRecord,
    User,
    WearableSample,
)
from .db.session import get_db
from .revocation import RedisTokenRevocationStore, get_token_revocation_store
from .security import require_admin_role, require_user
from .settings import get_settings
from .services.safety import EMERGENCY_MESSAGE, evaluate_safety
from .services.platform import (
    GENERAL_GOALS,
    PROGRAM_VARIANTS,
    PROVIDER_REGISTRY,
    TARGET_FOCUSES,
    apply_plan_modification,
    build_program_payload,
    derive_capacity_profile,
    diabetes_insights,
    evaluate_contextual_safety,
    interpret_natural_request,
    mock_pose_result,
    mock_provider_sync,
    progression_recommendation,
    resolve_media,
    schedule_notification,
    schedule_voice_cues,
)

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


class ProductPayload(BaseModel):
    payload: dict[str, Any] = Field(default_factory=dict)


class OnboardingPayload(BaseModel):
    step: str
    payload: dict[str, Any] = Field(default_factory=dict)
    completed: bool = False
    language: str = "en"


class ConsentPayload(BaseModel):
    consent_type: str
    version: str = "consent-2026-07"
    granted: bool
    evidence: dict[str, Any] = Field(default_factory=dict)


class GoalsPayload(BaseModel):
    goals: list[str] = Field(default_factory=list)
    target_focuses: list[str] = Field(default_factory=list)
    natural_request: str | None = None


class AssessmentPayload(BaseModel):
    assessment_type: str
    status: str = "completed"
    result_payload: dict[str, Any] = Field(default_factory=dict)
    symptoms: dict[str, Any] = Field(default_factory=dict)
    confidence: int = Field(default=3, ge=1, le=5)


class ProgramRequestPayload(BaseModel):
    variant: str | None = None
    available_minutes: int | None = Field(default=None, ge=5, le=60)
    target_focuses: list[str] = Field(default_factory=list)
    equipment: list[str] = Field(default_factory=list)
    natural_request: str | None = None
    energy: int = Field(default=3, ge=1, le=5)
    pain: int = Field(default=0, ge=0, le=10)
    no_floor: bool = False
    chair_only: bool = False
    quiet: bool = False
    recent_low: bool = False
    cgm_trend: str | None = None
    cardiac_rehabilitation: bool = False
    clinician_prohibited_movements: list[str] = Field(default_factory=list)
    physiological_context: dict[str, Any] = Field(default_factory=dict)


class PlanModificationPayload(BaseModel):
    intent: str
    request_payload: dict[str, Any] = Field(default_factory=dict)


class ProviderConnectPayload(BaseModel):
    provider_key: str
    scopes: list[str] = Field(default_factory=list)
    mock: bool = True


class NotificationPreferencePayload(BaseModel):
    category: str
    enabled: bool = True
    quiet_hours: dict[str, Any] = Field(default_factory=dict)
    channel: str = "local"


class RelationshipPayload(BaseModel):
    email: str
    scopes: list[str] = Field(default_factory=list)
    role: str | None = None
    organization: str | None = None


@router.get("/health")
def health():
    settings = get_settings()
    return {"status": "ok", "service": "moveinrange-api", "version": settings.service_version, "environment": settings.environment, "api_base_url": "http://localhost:8200"}


@router.get("/ready")
def ready(db: Session = Depends(get_db)):
    db.execute(text("select 1"))
    store = get_token_revocation_store()
    return {
        "status": "ready",
        "database": "ok",
        "revocation_store": "redis" if isinstance(store, RedisTokenRevocationStore) else "development_in_memory",
        "service": "moveinrange-api",
        "version": get_settings().service_version,
    }


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
    db.add(user)
    db.flush()
    refresh = _issue_refresh_token(user, db, "mobile")
    user.refresh_token_hash = token_hash(refresh)
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
    refresh = _issue_refresh_token(user, db, "mobile")
    user.refresh_token_hash = token_hash(refresh)
    db.add(AuditLog(actor_id=user.id, action="auth.login", target_type="user", target_id=user.id, redacted_payload={}))
    db.commit()
    return _auth_response(user, refresh)


@router.post("/auth/refresh")
def refresh(payload: RefreshPayload, request: Request, db: Session = Depends(get_db)):
    _rate_limit(f"refresh:{request.client.host if request.client else 'unknown'}", get_settings().auth_rate_limit)
    decoded = decode_token(payload.refresh_token, "refresh")
    user = db.get(User, decoded["sub"])
    if not user or user.refresh_token_hash != token_hash(payload.refresh_token):
        if decoded.get("fam"):
            _revoke_refresh_family(decoded["fam"], db)
            db.add(AuditLog(actor_id=decoded["sub"], action="auth.refresh_replay", target_type="refresh_family", target_id=decoded["fam"], redacted_payload={}))
            db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "invalid_refresh"})
    next_refresh = _rotate_refresh_token(user, decoded, payload.refresh_token, db)
    user.refresh_token_hash = token_hash(next_refresh)
    db.commit()
    return _auth_response(user, next_refresh)


@router.post("/auth/logout")
def logout(authorization: str | None = Header(default=None), user: User = Depends(require_user), db: Session = Depends(get_db)):
    _revoke_authorization_header(authorization)
    _revoke_user_refresh_tokens(user.id, db)
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
    refresh = _issue_refresh_token(user, db, "admin")
    user.refresh_token_hash = token_hash(refresh)
    db.add(AuditLog(actor_id=user.id, action="admin.auth.login", target_type="admin", target_id=user.id, redacted_payload={"role": user.role}))
    db.commit()
    return _auth_response(user, refresh)


@router.get("/admin/auth/me")
def admin_me(admin: User = Depends(require_admin_role("admin"))):
    return {"admin": _user_payload(admin)}


@router.post("/admin/auth/logout")
def admin_logout(authorization: str | None = Header(default=None), admin: User = Depends(require_admin_role("admin")), db: Session = Depends(get_db)):
    _revoke_authorization_header(authorization)
    _revoke_user_refresh_tokens(admin.id, db)
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


@router.get("/onboarding")
def get_onboarding(user: User = Depends(require_user), db: Session = Depends(get_db)):
    progress = db.query(OnboardingProgress).filter(OnboardingProgress.user_id == user.id).one_or_none()
    if not progress:
        return {"progress": {"current_step": "identity", "completed_steps": [], "draft_payload": {}, "language": "en", "status": "not_started"}}
    return {"progress": _onboarding_payload(progress)}


@router.put("/onboarding")
def save_onboarding(payload: OnboardingPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    progress = db.query(OnboardingProgress).filter(OnboardingProgress.user_id == user.id).one_or_none()
    if not progress:
        progress = OnboardingProgress(user_id=user.id)
        db.add(progress)
    draft = dict(progress.draft_payload or {})
    draft[payload.step] = payload.payload
    completed = set(progress.completed_steps or [])
    if payload.completed:
        completed.add(payload.step)
    progress.current_step = payload.step
    progress.completed_steps = sorted(completed)
    progress.draft_payload = draft
    progress.language = payload.language
    required = {"identity", "health_profile", "goals", "capacity", "consent"}
    progress.status = "complete" if required.issubset(completed) else "in_progress"
    profile = _profile_for(user.id, db)
    health = dict(profile.health_payload or {})
    health["onboarding_draft"] = draft
    profile.health_payload = health
    profile.onboarding_complete = progress.status == "complete"
    db.add(AuditLog(actor_id=user.id, action="onboarding.save_step", target_type="onboarding", target_id=payload.step, redacted_payload={"completed": payload.completed}))
    db.commit()
    db.refresh(progress)
    return {"progress": _onboarding_payload(progress)}


@router.post("/consents", status_code=status.HTTP_201_CREATED)
def record_consent(payload: ConsentPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    record = ConsentRecord(user_id=user.id, consent_type=payload.consent_type, version=payload.version, granted=payload.granted, evidence=payload.evidence)
    db.add(record)
    db.add(AuditLog(actor_id=user.id, action="consent.record", target_type="consent", target_id=payload.consent_type, redacted_payload={"version": payload.version, "granted": payload.granted}))
    db.commit()
    return {"consent": _consent_payload(record)}


@router.get("/consents")
def list_consents(user: User = Depends(require_user), db: Session = Depends(get_db)):
    records = db.query(ConsentRecord).filter(ConsentRecord.user_id == user.id).order_by(desc(ConsentRecord.created_at)).all()
    return {"items": [_consent_payload(record) for record in records]}


@router.put("/profile/advanced")
def update_advanced_profile(payload: ProductPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    profile = _profile_for(user.id, db)
    health = dict(profile.health_payload or {})
    health.update(payload.payload)
    profile.health_payload = health
    db.add(AuditLog(actor_id=user.id, action="profile.advanced_upsert", target_type="profile", target_id=str(profile.id), redacted_payload={"fields": sorted(payload.payload.keys())}))
    db.commit()
    return _profile_payload(user, profile)


@router.put("/capacity-profile")
def upsert_capacity_profile(payload: ProductPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    derived = derive_capacity_profile(payload.payload)
    record = CapacityProfile(
        user_id=user.id,
        version=derived["version"],
        inputs=payload.payload,
        derived_profile=derived,
        expires_at=datetime.now(UTC) + timedelta(days=derived["expires_at_days"]),
    )
    db.add(record)
    db.commit()
    return {"capacity_profile": _capacity_payload(record)}


@router.post("/baseline-assessments", status_code=status.HTTP_201_CREATED)
def create_baseline_assessment(payload: AssessmentPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    safety = evaluate_contextual_safety({**payload.result_payload, **payload.symptoms})
    if safety["action"] in {"BLOCK_AND_SHOW_SAFETY_MESSAGE", "CLINICIAN_SUPERVISION_REQUIRED"} and payload.status == "completed":
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "assessment_not_allowed_by_safety", "safety_decision": safety})
    record = BaselineAssessment(
        user_id=user.id,
        assessment_type=payload.assessment_type,
        status=payload.status,
        result_payload=payload.result_payload,
        symptoms=payload.symptoms,
        confidence=payload.confidence,
        expires_at=datetime.now(UTC) + timedelta(days=90),
    )
    db.add(record)
    db.add(_safety_decision_log(user.id, safety, {"assessment_type": payload.assessment_type, **payload.result_payload}))
    db.commit()
    return {"assessment": _assessment_payload(record), "safety_decision": safety}


@router.put("/goals-targets")
def upsert_goals_targets(payload: GoalsPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    invalid_goals = sorted(set(payload.goals) - GENERAL_GOALS)
    invalid_focuses = sorted(set(payload.target_focuses) - TARGET_FOCUSES)
    if invalid_goals or invalid_focuses:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "invalid_goal_or_focus", "invalid_goals": invalid_goals, "invalid_focuses": invalid_focuses})
    interpretation = interpret_natural_request(payload.natural_request)
    record = db.query(GoalPreference).filter(GoalPreference.user_id == user.id).one_or_none()
    if not record:
        record = GoalPreference(user_id=user.id)
        db.add(record)
    record.goals = payload.goals
    record.target_focuses = sorted(set(payload.target_focuses + interpretation["target_focuses"]))
    record.natural_request = payload.natural_request
    record.safe_interpretation = interpretation
    db.commit()
    return {"goals": _goals_payload(record)}


@router.post("/safety/evaluate")
def evaluate_safety_context(payload: ProductPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    decision = evaluate_contextual_safety(payload.payload)
    db.add(_safety_decision_log(user.id, decision, payload.payload))
    db.commit()
    return {"decision": decision}


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
        "items": [_exercise_brief_payload(item) for item in items],
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


@router.get("/exercises/{exercise_id}/media-resolution")
def exercise_media_resolution(
    exercise_id: str,
    language: str = "en",
    reduced_motion: bool = False,
    low_bandwidth: bool = False,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    exercise = _get_exercise(exercise_id, db)
    payload = _exercise_payload(exercise, db, language)
    return {"media": resolve_media(payload, reduced_motion=reduced_motion, low_bandwidth=low_bandwidth)}


@router.post("/media-approvals", status_code=status.HTTP_201_CREATED)
def create_media_approval(payload: ProductPayload, admin: User = Depends(require_admin_role("exercise_reviewer")), db: Session = Depends(get_db)):
    record = MediaApproval(
        exercise_id=payload.payload.get("exercise_id", ""),
        media_type=payload.payload.get("media_type", "silhouette"),
        license_state=payload.payload.get("license_state", "internal"),
        source=payload.payload.get("source", "internal_silhouette"),
        status=payload.payload.get("status", "pending"),
        attribution=payload.payload.get("attribution"),
        metadata_payload=payload.payload,
    )
    db.add(record)
    db.add(AuditLog(actor_id=admin.id, action="media.approval.create", target_type="media", target_id=record.exercise_id, redacted_payload={"status": record.status, "license_state": record.license_state}))
    db.commit()
    return {"media_approval": _media_approval_payload(record)}


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


@router.get("/program-variants")
def list_program_variants():
    return {"items": [{"key": key, **value} for key, value in PROGRAM_VARIANTS.items()]}


@router.post("/plans/advanced/generate", status_code=status.HTTP_201_CREATED)
def generate_advanced_plan(payload: ProgramRequestPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    _rate_limit(f"advanced-plan:{user.id}", get_settings().auth_rate_limit * 2)
    candidates = [_exercise_brief_payload(item) for item in db.query(Exercise).order_by(Exercise.name).limit(80).all()]
    plan_payload = build_program_payload(user.id, payload.model_dump(), candidates)
    if plan_payload["safety_decision"]["action"] == "BLOCK_AND_SHOW_SAFETY_MESSAGE":
        return {"blocked": True, "safety_decision": plan_payload["safety_decision"], "plan": None}
    plan = Plan(id=plan_payload["id"], user_id=user.id, plan_type="advanced", payload=plan_payload, safety_action=plan_payload["safety_decision"]["action"])
    evidence = PlanDecisionEvidence(
        user_id=user.id,
        plan_id=plan.id,
        generator_version=plan_payload["generator_version"],
        policy_version=plan_payload["policy_version"],
        triggered_rules=plan_payload["triggered_rules"],
        excluded_exercises=plan_payload["excluded_exercises"],
        selected_exercises=plan_payload["selected_exercises"],
        reason="Deterministic complete-product generator selected an auditable safe plan.",
        modifications=plan_payload["modifications"],
        user_request=plan_payload["user_request"],
        final_safe_interpretation=plan_payload["final_safe_interpretation"],
    )
    db.add(plan)
    db.add(evidence)
    db.add(_safety_decision_log(user.id, plan_payload["safety_decision"], payload.model_dump()))
    db.commit()
    return {"blocked": False, "plan": plan_payload, "evidence_id": evidence.id}


@router.get("/plans/advanced/latest")
def latest_advanced_plan(user: User = Depends(require_user), db: Session = Depends(get_db)):
    plan = _latest_plan(user.id, "advanced", db)
    return {"plan": plan.payload if plan else None}


@router.post("/plans/{plan_id}/modify")
def modify_plan(plan_id: str, payload: PlanModificationPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    plan = db.get(Plan, plan_id)
    if not plan or plan.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "plan_not_found"})
    modified = apply_plan_modification(plan.payload, payload.intent, payload.request_payload)
    record = PlanModification(user_id=user.id, plan_id=plan.id, intent=payload.intent, request_payload=payload.request_payload, result_payload=modified, safety_decision=modified["safety_decision"])
    plan.payload = modified
    plan.safety_action = modified["safety_decision"]["action"]
    db.add(record)
    db.add(_safety_decision_log(user.id, modified["safety_decision"], payload.request_payload))
    db.commit()
    return {"plan": modified, "modification": _plan_modification_payload(record)}


@router.post("/quick-session", status_code=status.HTTP_201_CREATED)
def create_quick_session(payload: ProgramRequestPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    request_payload = payload.model_dump()
    request_payload["variant"] = request_payload.get("variant") or None
    candidates = [_exercise_brief_payload(item) for item in db.query(Exercise).order_by(Exercise.name).limit(60).all()]
    plan_payload = build_program_payload(user.id, request_payload, candidates)
    plan_payload["source"] = "what_can_i_do_today"
    plan = Plan(id=plan_payload["id"], user_id=user.id, plan_type="quick_session", payload=plan_payload, safety_action=plan_payload["safety_decision"]["action"])
    db.add(plan)
    db.add(CalendarEvent(user_id=user.id, event_date=datetime.now(UTC).date().isoformat(), event_type="quick_session", status="planned", plan_id=plan.id, payload={"minutes": plan_payload["total_minutes"]}))
    db.add(_safety_decision_log(user.id, plan_payload["safety_decision"], request_payload))
    db.commit()
    return {"plan": plan_payload}


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


@router.get("/calendar")
def calendar_events(start: str | None = None, end: str | None = None, user: User = Depends(require_user), db: Session = Depends(get_db)):
    query = db.query(CalendarEvent).filter(CalendarEvent.user_id == user.id)
    if start:
        query = query.filter(CalendarEvent.event_date >= start)
    if end:
        query = query.filter(CalendarEvent.event_date <= end)
    items = query.order_by(CalendarEvent.event_date, CalendarEvent.id).all()
    return {"items": [_calendar_event_payload(item) for item in items]}


@router.post("/calendar-events", status_code=status.HTTP_201_CREATED)
def create_calendar_event(payload: ProductPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    event = CalendarEvent(
        user_id=user.id,
        event_date=payload.payload.get("event_date", datetime.now(UTC).date().isoformat()),
        event_type=payload.payload.get("event_type", "planned_session"),
        status=payload.payload.get("status", "planned"),
        plan_id=payload.payload.get("plan_id"),
        session_id=payload.payload.get("session_id"),
        payload=payload.payload,
    )
    db.add(event)
    db.commit()
    return {"event": _calendar_event_payload(event)}


@router.get("/progression")
def progression(user: User = Depends(require_user), db: Session = Depends(get_db)):
    sessions = db.query(SessionRecord).filter(SessionRecord.user_id == user.id).order_by(desc(SessionRecord.created_at)).limit(10).all()
    history = [{"status": item.status, "pain": (item.payload or {}).get("pain"), "symptoms": item.status == "stopped_for_symptoms"} for item in sessions]
    profile = _profile_for(user.id, db)
    recommendation = progression_recommendation(history, profile.health_payload or {})
    return {"recommendation": recommendation}


@router.get("/achievements")
def achievements(user: User = Depends(require_user), db: Session = Depends(get_db)):
    records = db.query(AchievementRecord).filter(AchievementRecord.user_id == user.id).order_by(desc(AchievementRecord.created_at)).all()
    return {"items": [_achievement_payload(item) for item in records]}


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
    if session.status == "completed":
        achievement = db.query(AchievementRecord).filter(AchievementRecord.user_id == user.id, AchievementRecord.achievement_key == "first_safe_completion").one_or_none()
        if not achievement:
            db.add(AchievementRecord(user_id=user.id, achievement_key="first_safe_completion", payload={"message": "Completed a movement session without unsafe pressure."}))
        db.add(CalendarEvent(user_id=user.id, event_date=datetime.now(UTC).date().isoformat(), event_type="session", status="completed", plan_id=session.plan_id, session_id=session.id, payload={"source": "session_complete"}))
    db.add(AuditLog(actor_id=user.id, action="session.complete", target_type="session", target_id=session.id, redacted_payload={"status": session.status}))
    db.commit()
    return {"session": _session_payload(session)}


@router.post("/exercise-feedback", status_code=status.HTTP_201_CREATED)
def create_exercise_feedback(payload: ProductPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    record = ExerciseFeedback(
        user_id=user.id,
        exercise_id=payload.payload.get("exercise_id"),
        session_id=payload.payload.get("session_id"),
        feedback_type=payload.payload.get("feedback_type", "session_feedback"),
        payload=payload.payload,
    )
    db.add(record)
    db.commit()
    return {"feedback": _feedback_payload(record)}


@router.post("/voice/cues")
def voice_cues(payload: ProductPayload, user: User = Depends(require_user)):
    items = payload.payload.get("items", [])
    mode = payload.payload.get("mode", "essential_cues")
    language = payload.payload.get("language", "en")
    return {"items": schedule_voice_cues(items, mode, language), "adapter": {"tts": "mock_tts", "prerecorded": "asset_manifest"}}


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


@router.post("/diabetes/context", status_code=status.HTTP_201_CREATED)
def diabetes_context(payload: ProductPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    unit = payload.payload.get("unit", "mg/dL")
    value = payload.payload.get("value")
    canonical = None
    if value is not None:
        canonical = round(float(value) * 18.0182) if unit == "mmol/L" else round(float(value))
    record = DiabetesContextEntry(
        user_id=user.id,
        session_id=payload.payload.get("session_id"),
        timing=payload.payload.get("timing", "unspecified"),
        source=payload.payload.get("source", "manual"),
        unit=unit,
        canonical_mg_dl=canonical,
        sensor_timestamp=_optional_datetime(payload.payload.get("sensor_timestamp")),
        payload=payload.payload,
    )
    db.add(record)
    if payload.payload.get("delayed_check_minutes") in {30, 60, 90, 120}:
        scheduled = schedule_notification(f"delayed_glucose_{payload.payload['delayed_check_minutes']}", (_profile_for(user.id, db).timezone or "UTC"), {"session_id": record.session_id})
        db.add(NotificationJob(user_id=user.id, category=scheduled["category"], provider=scheduled["provider"], scheduled_for=_optional_datetime(scheduled["scheduled_for"]) or datetime.now(UTC), payload=scheduled))
    db.commit()
    return {"entry": _diabetes_context_payload(record), "no_insulin_recommendation": True}


@router.get("/diabetes/insights")
def advanced_diabetes_insights(user: User = Depends(require_user), db: Session = Depends(get_db)):
    entries = db.query(DiabetesContextEntry).filter(DiabetesContextEntry.user_id == user.id).order_by(DiabetesContextEntry.created_at).all()
    return {"insights": diabetes_insights([_diabetes_context_payload(item) for item in entries])}


@router.get("/integrations/providers")
def providers():
    return {"items": [{"key": key, **value} for key, value in PROVIDER_REGISTRY.items()]}


@router.post("/integrations/connect", status_code=status.HTTP_201_CREATED)
def connect_provider(payload: ProviderConnectPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    if payload.provider_key not in PROVIDER_REGISTRY:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "provider_not_found"})
    provider = PROVIDER_REGISTRY[payload.provider_key]
    connection = ProviderConnection(
        user_id=user.id,
        provider_key=payload.provider_key,
        category=provider["category"],
        status="mock_connected" if provider["status"] == "mock_ready" and payload.mock else provider["status"],
        scopes=payload.scopes or provider["scopes"],
        token_reference=None if payload.mock else "external_secret_store_required",
        provenance={"mock": payload.mock, "blocked_reason": None if provider["status"] == "mock_ready" else provider["status"]},
    )
    db.add(connection)
    db.add(AuditLog(actor_id=user.id, action="provider.connect", target_type="provider", target_id=payload.provider_key, redacted_payload={"mock": payload.mock, "status": connection.status}))
    db.commit()
    return {"connection": _provider_connection_payload(connection)}


@router.post("/integrations/{connection_id}/sync")
def sync_provider(connection_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    connection = db.get(ProviderConnection, connection_id)
    if not connection or connection.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "connection_not_found"})
    result = mock_provider_sync(connection.provider_key)
    record = ProviderSyncRecord(
        connection_id=connection.id,
        sync_type=connection.category,
        status=result["status"],
        cursor_before=connection.sync_cursor,
        cursor_after=result["cursor_after"],
        records_seen=result["records_seen"],
        duplicates_skipped=result["duplicates_skipped"],
        payload=result,
    )
    connection.sync_cursor = result["cursor_after"]
    db.add(record)
    db.commit()
    return {"sync": _provider_sync_payload(record)}


@router.delete("/integrations/{connection_id}")
def disconnect_provider(connection_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    connection = db.get(ProviderConnection, connection_id)
    if not connection or connection.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "connection_not_found"})
    connection.status = "disconnected"
    connection.token_reference = None
    db.add(AuditLog(actor_id=user.id, action="provider.disconnect", target_type="provider", target_id=connection.provider_key, redacted_payload={}))
    db.commit()
    return {"disconnected": True, "connection": _provider_connection_payload(connection)}


@router.post("/wearables/samples", status_code=status.HTTP_201_CREATED)
def wearable_sample(payload: ProductPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    observed_at = _optional_datetime(payload.payload.get("observed_at")) or datetime.now(UTC)
    record = WearableSample(
        user_id=user.id,
        provider_key=payload.payload.get("provider_key", "mock_wearable"),
        sample_type=payload.payload.get("sample_type", "heart_rate"),
        observed_at=observed_at,
        value_payload=payload.payload.get("value_payload", payload.payload),
        provenance={"mock": True, "not_sole_safety_source": True},
        stale=(datetime.now(UTC) - observed_at) > timedelta(hours=24),
    )
    db.add(record)
    db.commit()
    return {"sample": _wearable_sample_payload(record)}


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


@router.get("/notification-preferences")
def notification_preferences(user: User = Depends(require_user), db: Session = Depends(get_db)):
    items = db.query(NotificationPreference).filter(NotificationPreference.user_id == user.id).order_by(NotificationPreference.category).all()
    return {"items": [_notification_preference_payload(item) for item in items]}


@router.put("/notification-preferences")
def upsert_notification_preference(payload: NotificationPreferencePayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == user.id, NotificationPreference.category == payload.category).one_or_none()
    if not pref:
        pref = NotificationPreference(user_id=user.id, category=payload.category)
        db.add(pref)
    pref.enabled = payload.enabled
    pref.quiet_hours = payload.quiet_hours
    pref.channel = payload.channel
    db.commit()
    return {"preference": _notification_preference_payload(pref)}


@router.post("/notifications/schedule", status_code=status.HTTP_201_CREATED)
def create_notification_job(payload: ProductPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    profile = _profile_for(user.id, db)
    scheduled = schedule_notification(payload.payload.get("category", "workout_reminder"), profile.timezone or "UTC", payload.payload)
    job = NotificationJob(user_id=user.id, category=scheduled["category"], provider=scheduled["provider"], scheduled_for=_optional_datetime(scheduled["scheduled_for"]) or datetime.now(UTC), payload=scheduled)
    db.add(job)
    db.commit()
    return {"job": _notification_job_payload(job)}


@router.post("/privacy/export-jobs", status_code=status.HTTP_201_CREATED)
def create_export_job(user: User = Depends(require_user), db: Session = Depends(get_db)):
    job = DataExportJob(user_id=user.id, status="ready", payload={"format": "json", "contains": ["profile", "plans", "sessions", "glucose", "consents"], "machine_readable": True})
    db.add(job)
    db.add(AuditLog(actor_id=user.id, action="privacy.export.request", target_type="data_export", target_id=user.id, redacted_payload={}))
    db.commit()
    return {"job": _export_job_payload(job)}


@router.get("/privacy/export-jobs")
def list_export_jobs(user: User = Depends(require_user), db: Session = Depends(get_db)):
    jobs = db.query(DataExportJob).filter(DataExportJob.user_id == user.id).order_by(desc(DataExportJob.created_at)).all()
    return {"items": [_export_job_payload(job) for job in jobs]}


@router.post("/privacy/deletion-jobs", status_code=status.HTTP_201_CREATED)
def create_deletion_job(payload: ProductPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    job = DeletionJob(
        user_id=user.id,
        deletion_type=payload.payload.get("deletion_type", "selected_health_data"),
        status="requested",
        cancellation_deadline=datetime.now(UTC) + timedelta(days=7),
        payload=payload.payload,
    )
    db.add(job)
    db.add(AuditLog(actor_id=user.id, action="privacy.deletion.request", target_type="deletion_job", target_id=user.id, redacted_payload={"deletion_type": job.deletion_type}))
    db.commit()
    return {"job": _deletion_job_payload(job)}


@router.post("/caregivers/invite", status_code=status.HTTP_201_CREATED)
def invite_caregiver(payload: RelationshipPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    relationship = CaregiverRelationship(user_id=user.id, caregiver_email=payload.email.strip().lower(), shared_scopes=payload.scopes, expires_at=datetime.now(UTC) + timedelta(days=180), invitation_token_hash=token_hash(secrets.token_urlsafe(24)))
    db.add(relationship)
    db.add(AuditLog(actor_id=user.id, action="caregiver.invite", target_type="caregiver", target_id=relationship.caregiver_email, redacted_payload={"scopes": payload.scopes}))
    db.commit()
    return {"relationship": _caregiver_payload(relationship)}


@router.post("/caregivers/{relationship_id}/revoke")
def revoke_caregiver(relationship_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    relationship = db.get(CaregiverRelationship, relationship_id)
    if not relationship or relationship.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "caregiver_relationship_not_found"})
    relationship.status = "revoked"
    relationship.shared_scopes = []
    db.add(AuditLog(actor_id=user.id, action="caregiver.revoke", target_type="caregiver", target_id=relationship.caregiver_email, redacted_payload={}))
    db.commit()
    return {"relationship": _caregiver_payload(relationship)}


@router.post("/professionals/invite", status_code=status.HTTP_201_CREATED)
def invite_professional(payload: RelationshipPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    relationship = ProfessionalRelationship(
        user_id=user.id,
        professional_email=payload.email.strip().lower(),
        role=payload.role or "trainer",
        organization=payload.organization,
        consent_scopes=payload.scopes,
        expires_at=datetime.now(UTC) + timedelta(days=180),
    )
    db.add(relationship)
    db.add(AuditLog(actor_id=user.id, action="professional.invite", target_type="professional", target_id=relationship.professional_email, redacted_payload={"role": relationship.role, "scopes": payload.scopes}))
    db.commit()
    return {"relationship": _professional_payload(relationship)}


@router.post("/professionals/{relationship_id}/restrictions", status_code=status.HTTP_201_CREATED)
def create_professional_restriction(relationship_id: int, payload: ProductPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    relationship = db.get(ProfessionalRelationship, relationship_id)
    if not relationship or relationship.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "professional_relationship_not_found"})
    record = ProfessionalRestriction(user_id=user.id, relationship_id=relationship.id, restriction_type=payload.payload.get("restriction_type", "movement"), payload=payload.payload, review_date=payload.payload.get("review_date"))
    db.add(record)
    db.add(AuditLog(actor_id=user.id, action="professional.restriction.create", target_type="professional_restriction", target_id=str(relationship.id), redacted_payload={"restriction_type": record.restriction_type}))
    db.commit()
    return {"restriction": _professional_restriction_payload(record)}


@router.post("/professionals/{relationship_id}/notes", status_code=status.HTTP_201_CREATED)
def create_professional_note(relationship_id: int, payload: ProductPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    relationship = db.get(ProfessionalRelationship, relationship_id)
    if not relationship or relationship.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "professional_relationship_not_found"})
    note = str(payload.payload.get("note", "")).strip()
    if not note:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "note_required"})
    record = ProfessionalNote(user_id=user.id, relationship_id=relationship.id, note_type=payload.payload.get("note_type", "movement"), note=note, redacted_payload={"no_prescribing": True})
    db.add(record)
    db.commit()
    return {"note": _professional_note_payload(record)}


@router.post("/camera/analyze", status_code=status.HTTP_201_CREATED)
def camera_analyze(payload: ProductPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    if not payload.payload.get("camera_consent"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "camera_consent_required"})
    result = mock_pose_result(payload.payload.get("exercise_id"), payload.payload.get("samples", []))
    record = CameraAnalysisSession(
        user_id=user.id,
        session_id=payload.payload.get("session_id"),
        exercise_id=payload.payload.get("exercise_id"),
        provider="mock_pose",
        privacy_mode=payload.payload.get("privacy_mode", "session_only"),
        result_payload=result,
        recording_stored=False,
    )
    db.add(record)
    db.add(AuditLog(actor_id=user.id, action="camera.mock_analysis", target_type="camera_session", target_id=record.exercise_id or "session", redacted_payload={"uploaded": False, "recording_stored": False}))
    db.commit()
    return {"analysis": _camera_payload(record)}


@router.get("/admin/policies")
def policies(admin=Depends(require_admin_role("clinical_reviewer"))):
    return {"admin": admin.id, "policies": [{"version": "draft-2026-07-18", "status": "draft", "clinical_review_state": "draft"}]}


@router.get("/admin/exercises")
def admin_exercises(admin=Depends(require_admin_role("exercise_reviewer")), db: Session = Depends(get_db)):
    return exercise_search(page_size=25, db=db)


@router.get("/admin/users")
def admin_users(admin=Depends(require_admin_role("support")), db: Session = Depends(get_db)):
    users = db.query(User).order_by(desc(User.created_at)).limit(50).all()
    db.add(AuditLog(actor_id=admin.id, action="admin.users.masked_list", target_type="user", target_id="masked", redacted_payload={"count": len(users)}))
    db.commit()
    return {"items": [{"id": user.id, "email_masked": _mask_email(user.email), "role": user.role, "deleted": user.deleted_at is not None} for user in users], "impersonation": "disabled_by_default"}


@router.get("/admin/system")
def admin_system(admin=Depends(require_admin_role("analyst")), db: Session = Depends(get_db)):
    store = get_token_revocation_store()
    return {
        "api": health(),
        "ready": ready(db),
        "postgresql": "configured" if "postgresql" in get_settings().database_url else "not_current_backend",
        "redis": "configured" if isinstance(store, RedisTokenRevocationStore) else "development_fallback",
        "import_jobs": {"latest": "see audit logs"},
        "provider_status": [{"key": key, "status": value["status"]} for key, value in PROVIDER_REGISTRY.items()],
        "secrets_exposed": False,
    }


@router.get("/admin/privacy-jobs")
def admin_privacy_jobs(admin=Depends(require_admin_role("support")), db: Session = Depends(get_db)):
    exports = db.query(DataExportJob).order_by(desc(DataExportJob.created_at)).limit(20).all()
    deletions = db.query(DeletionJob).order_by(desc(DeletionJob.created_at)).limit(20).all()
    return {"exports": [_export_job_payload(item) for item in exports], "deletions": [_deletion_job_payload(item) for item in deletions]}


@router.get("/admin/audit-logs")
def audit_logs(admin=Depends(require_admin_role("support")), db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(50).all()
    return {"items": [{"event": log.action, "actor_id": log.actor_id, "target_type": log.target_type, "redacted": True} for log in logs]}


@router.post("/admin/policy-simulator")
def policy_simulator(payload: ReadinessPayload, admin=Depends(require_admin_role("clinical_reviewer")), db: Session = Depends(get_db)):
    _rate_limit(f"admin-simulator:{admin.id}", get_settings().auth_rate_limit * 3)
    decision = evaluate_contextual_safety(payload.model_dump())
    simulation = ProgramSimulation(actor_id=admin.id, synthetic_profile=payload.model_dump(), result_payload={"decision": decision}, policy_version=decision["policy_version"])
    db.add(simulation)
    db.add(AuditLog(actor_id=admin.id, action="admin.policy.simulate", target_type="policy", target_id=decision["policy_version"], redacted_payload={"action": decision["action"]}))
    db.commit()
    return {"admin": admin.id, "decision": decision, "rejected_exercises": [], "generated_plan_allowed": decision["action"] != "BLOCK_AND_SHOW_SAFETY_MESSAGE", "simulation_id": simulation.id}


def _auth_response(user: User, refresh: str) -> dict[str, Any]:
    return {"user": _user_payload(user), "access_token": create_token(user.id), "refresh_token": refresh, "token_type": "bearer"}


def _issue_refresh_token(user: User, db: Session, session_label: str, family_id: str | None = None) -> str:
    family = family_id or "fam_" + secrets.token_hex(12)
    token_id = "rt_" + secrets.token_hex(12)
    token = create_token(user.id, "refresh", family_id=family, token_id=token_id)
    issued_at = datetime.now(UTC)
    expires_at = issued_at + timedelta(days=get_settings().refresh_token_days)
    db.add(
        AuthRefreshToken(
            user_id=user.id,
            family_id=family,
            token_id=token_id,
            token_hash=token_hash(token),
            session_label=session_label,
            issued_at=issued_at,
            expires_at=expires_at,
        )
    )
    return token


def _validate_refresh_family(decoded: dict[str, Any], refresh_token: str, db: Session) -> AuthRefreshToken:
    family_id = decoded.get("fam")
    token_id = decoded.get("jti")
    if not family_id or not token_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "invalid_refresh_claims"})
    if get_token_revocation_store().is_refresh_family_revoked(family_id):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "refresh_family_revoked"})
    record = db.query(AuthRefreshToken).filter(AuthRefreshToken.family_id == family_id, AuthRefreshToken.token_id == token_id).one_or_none()
    now = datetime.now(UTC)
    if not record or record.token_hash != token_hash(refresh_token) or record.revoked_at is not None or _as_utc(record.expires_at) < now:
        _revoke_refresh_family(family_id, db)
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "invalid_refresh"})
    if record.rotated_at is not None:
        _revoke_refresh_family(family_id, db)
        db.add(AuditLog(actor_id=record.user_id, action="auth.refresh_replay", target_type="refresh_family", target_id=family_id, redacted_payload={}))
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "refresh_replay"})
    return record


def _rotate_refresh_token(user: User, decoded: dict[str, Any], refresh_token: str, db: Session) -> str:
    record = _validate_refresh_family(decoded, refresh_token, db)
    next_refresh = _issue_refresh_token(user, db, record.session_label or "mobile", family_id=record.family_id)
    next_decoded = decode_token(next_refresh, "refresh")
    record.rotated_at = datetime.now(UTC)
    record.replacement_token_id = next_decoded["jti"]
    return next_refresh


def _revoke_refresh_family(family_id: str, db: Session) -> None:
    now = datetime.now(UTC)
    records = db.query(AuthRefreshToken).filter(AuthRefreshToken.family_id == family_id).all()
    for record in records:
        record.revoked_at = record.revoked_at or now
    get_token_revocation_store().revoke_refresh_family(family_id, get_settings().refresh_token_days * 24 * 60 * 60)


def _revoke_user_refresh_tokens(user_id: str, db: Session) -> None:
    records = db.query(AuthRefreshToken).filter(AuthRefreshToken.user_id == user_id, AuthRefreshToken.revoked_at.is_(None)).all()
    for record in records:
        _revoke_refresh_family(record.family_id, db)


def _revoke_authorization_header(authorization: str | None) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        return
    token = authorization.removeprefix("Bearer ").strip()
    decoded = decode_token(token, "access")
    ttl = max(1, int(decoded.get("exp", 0)) - int(datetime.now(UTC).timestamp()))
    get_token_revocation_store().revoke_access_token(decoded["jti"], ttl)


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


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


def _mask_email(email: str | None) -> str | None:
    if not email or "@" not in email:
        return email
    name, domain = email.split("@", 1)
    return f"{name[:2]}***@{domain}"


def _optional_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
    except ValueError:
        return None


def _onboarding_payload(progress: OnboardingProgress) -> dict[str, Any]:
    return {
        "current_step": progress.current_step,
        "completed_steps": progress.completed_steps or [],
        "draft_payload": progress.draft_payload or {},
        "language": progress.language,
        "status": progress.status,
        "updated_at": progress.updated_at.isoformat() if progress.updated_at else None,
    }


def _consent_payload(record: ConsentRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "consent_type": record.consent_type,
        "version": record.version,
        "granted": record.granted,
        "source": record.source,
        "evidence": record.evidence,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


def _capacity_payload(record: CapacityProfile) -> dict[str, Any]:
    return {
        "id": record.id,
        "version": record.version,
        "source": record.source,
        "inputs": record.inputs,
        "derived_profile": record.derived_profile,
        "expires_at": record.expires_at.isoformat() if record.expires_at else None,
    }


def _assessment_payload(record: BaselineAssessment) -> dict[str, Any]:
    return {
        "id": record.id,
        "assessment_type": record.assessment_type,
        "status": record.status,
        "result_payload": record.result_payload,
        "symptoms": record.symptoms,
        "confidence": record.confidence,
        "expires_at": record.expires_at.isoformat() if record.expires_at else None,
    }


def _goals_payload(record: GoalPreference) -> dict[str, Any]:
    return {
        "goals": record.goals or [],
        "target_focuses": record.target_focuses or [],
        "natural_request": record.natural_request,
        "safe_interpretation": record.safe_interpretation or {},
    }


def _plan_modification_payload(record: PlanModification) -> dict[str, Any]:
    return {"id": record.id, "plan_id": record.plan_id, "intent": record.intent, "safety_decision": record.safety_decision}


def _media_approval_payload(record: MediaApproval) -> dict[str, Any]:
    return {"id": record.id, "exercise_id": record.exercise_id, "media_type": record.media_type, "license_state": record.license_state, "source": record.source, "status": record.status, "attribution": record.attribution, "metadata": record.metadata_payload}


def _calendar_event_payload(record: CalendarEvent) -> dict[str, Any]:
    return {"id": record.id, "event_date": record.event_date, "event_type": record.event_type, "status": record.status, "plan_id": record.plan_id, "session_id": record.session_id, "payload": record.payload}


def _achievement_payload(record: AchievementRecord) -> dict[str, Any]:
    return {"id": record.id, "achievement_key": record.achievement_key, "status": record.status, "payload": record.payload}


def _feedback_payload(record: ExerciseFeedback) -> dict[str, Any]:
    return {"id": record.id, "exercise_id": record.exercise_id, "session_id": record.session_id, "feedback_type": record.feedback_type, "payload": record.payload}


def _diabetes_context_payload(record: DiabetesContextEntry) -> dict[str, Any]:
    return {
        "id": record.id,
        "session_id": record.session_id,
        "timing": record.timing,
        "source": record.source,
        "unit": record.unit,
        "canonical_mg_dl": record.canonical_mg_dl,
        "sensor_timestamp": record.sensor_timestamp.isoformat() if record.sensor_timestamp else None,
        "payload": record.payload,
    }


def _provider_connection_payload(record: ProviderConnection) -> dict[str, Any]:
    return {
        "id": record.id,
        "provider_key": record.provider_key,
        "category": record.category,
        "status": record.status,
        "scopes": record.scopes,
        "sync_cursor": record.sync_cursor,
        "provenance": record.provenance,
    }


def _provider_sync_payload(record: ProviderSyncRecord) -> dict[str, Any]:
    return {"id": record.id, "status": record.status, "records_seen": record.records_seen, "duplicates_skipped": record.duplicates_skipped, "cursor_after": record.cursor_after, "payload": record.payload}


def _wearable_sample_payload(record: WearableSample) -> dict[str, Any]:
    return {"id": record.id, "provider_key": record.provider_key, "sample_type": record.sample_type, "observed_at": record.observed_at.isoformat(), "value_payload": record.value_payload, "provenance": record.provenance, "stale": record.stale}


def _notification_preference_payload(record: NotificationPreference) -> dict[str, Any]:
    return {"id": record.id, "category": record.category, "enabled": record.enabled, "quiet_hours": record.quiet_hours, "channel": record.channel, "preview_policy": record.preview_policy}


def _notification_job_payload(record: NotificationJob) -> dict[str, Any]:
    return {"id": record.id, "category": record.category, "provider": record.provider, "scheduled_for": record.scheduled_for.isoformat(), "status": record.status, "retry_count": record.retry_count, "payload": record.payload}


def _export_job_payload(record: DataExportJob) -> dict[str, Any]:
    return {"id": record.id, "status": record.status, "archive_format": record.archive_format, "payload": record.payload, "created_at": record.created_at.isoformat() if record.created_at else None}


def _deletion_job_payload(record: DeletionJob) -> dict[str, Any]:
    return {"id": record.id, "deletion_type": record.deletion_type, "status": record.status, "cancellation_deadline": record.cancellation_deadline.isoformat() if record.cancellation_deadline else None, "payload": record.payload}


def _caregiver_payload(record: CaregiverRelationship) -> dict[str, Any]:
    return {"id": record.id, "caregiver_email": _mask_email(record.caregiver_email), "status": record.status, "shared_scopes": record.shared_scopes, "expires_at": record.expires_at.isoformat() if record.expires_at else None}


def _professional_payload(record: ProfessionalRelationship) -> dict[str, Any]:
    return {"id": record.id, "professional_email": _mask_email(record.professional_email), "role": record.role, "organization": record.organization, "verification_status": record.verification_status, "status": record.status, "consent_scopes": record.consent_scopes, "expires_at": record.expires_at.isoformat() if record.expires_at else None}


def _professional_restriction_payload(record: ProfessionalRestriction) -> dict[str, Any]:
    return {"id": record.id, "relationship_id": record.relationship_id, "restriction_type": record.restriction_type, "payload": record.payload, "status": record.status, "review_date": record.review_date}


def _professional_note_payload(record: ProfessionalNote) -> dict[str, Any]:
    return {"id": record.id, "relationship_id": record.relationship_id, "note_type": record.note_type, "note": record.note, "redacted_payload": record.redacted_payload}


def _camera_payload(record: CameraAnalysisSession) -> dict[str, Any]:
    return {"id": record.id, "session_id": record.session_id, "exercise_id": record.exercise_id, "provider": record.provider, "privacy_mode": record.privacy_mode, "status": record.status, "recording_stored": record.recording_stored, "result": record.result_payload}


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


def _exercise_brief_payload(exercise: Exercise) -> dict[str, Any]:
    return {
        "id": exercise.id,
        "slug": exercise.slug,
        "name": exercise.name,
        "body_part": exercise.body_part,
        "equipment": exercise.equipment,
        "target": exercise.target,
        "secondary_muscles": exercise.secondary_muscles or [],
        "media_policy": "detail_endpoint_only",
    }


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
