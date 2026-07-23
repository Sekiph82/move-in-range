import hashlib
import json
import logging
import secrets
from time import perf_counter
from datetime import UTC, datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, or_, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from .auth import create_token, decode_token, hash_password, password_needs_upgrade, token_hash, verify_password
from .email import get_email_sender
from .db.models import (
    AuditLog,
    AuthRefreshToken,
    EmailDeliveryAttempt,
    PasswordResetToken,
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
    PolicyApproval,
    PolicyVersion,
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
    SessionRevocation,
    SystemIncident,
    User,
    WearableSample,
)
from .db.session import get_db
from .rate_limit import RateLimitExceeded, get_rate_limiter
from .revocation import InMemoryTokenRevocationStore, PostgresTokenRevocationStore, RedisTokenRevocationStore, get_token_revocation_store
from .security import require_admin_role, require_admin_roles, require_user
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
logger = logging.getLogger("moveinrange.api")
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


class PasswordResetRequestPayload(BaseModel):
    email: str = Field(min_length=3, max_length=320)


class PasswordResetValidatePayload(BaseModel):
    token: str = Field(min_length=24, max_length=256)


class PasswordResetPayload(BaseModel):
    token: str = Field(min_length=24, max_length=256)
    password: str = Field(min_length=8, max_length=128)


class AdminUpdatePayload(BaseModel):
    payload: dict[str, Any] = Field(default_factory=dict)


class PolicyCreatePayload(BaseModel):
    version: str = Field(min_length=3, max_length=80)
    rules: dict[str, Any] = Field(default_factory=dict)
    clinical_review_state: str = "draft"


class PolicyActionPayload(BaseModel):
    rationale: str = Field(default="Admin console action", max_length=500)


class StrictPayload(BaseModel):
    model_config = {"extra": "forbid"}


class ExerciseTranslationUpdatePayload(StrictPayload):
    locale: str
    title: str
    instruction_steps: list[str] = Field(min_length=1)
    form_cues: list[str] = Field(default_factory=list)
    common_mistakes: list[str] = Field(default_factory=list)
    breathing_cues: list[str] = Field(default_factory=list)
    change_reason: str


class ExerciseMetadataUpdatePayload(StrictPayload):
    category: str | None = None
    equipment: str | None = None
    position: str | None = None
    difficulty: str | None = None
    change_reason: str


class ExerciseSafetyUpdatePayload(StrictPayload):
    safety_tags: list[str] = Field(default_factory=list)
    restricted_regions: list[str] = Field(default_factory=list)
    contraindication_categories: list[str] = Field(default_factory=list)
    review_reason: str


class ExerciseSubstitutionPayload(StrictPayload):
    substitution_id: str
    reason: str


class ExercisePublicationPayload(StrictPayload):
    reason: str


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
    idempotency_key: str | None = None
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
    return {"status": "ok", "service": "moveinrange-api", "version": settings.service_version, "environment": settings.deployment_environment, "api_base_url": settings.api_base_url}


@router.get("/ready")
def ready(db: Session = Depends(get_db)):
    db.execute(text("select 1"))
    store = get_token_revocation_store()
    limiter = get_rate_limiter()
    exercise_count = db.query(Exercise.id).count()
    try:
        migration = db.execute(text("select version_num from alembic_version")).scalar_one_or_none()
    except SQLAlchemyError:
        migration = None
    settings = get_settings()
    return {
        "status": "ready",
        "postgresql": "connected" if "postgresql" in settings.database_url else "not_current_backend",
        "database": "ok",
        "session_revocation": _revocation_store_name(store),
        "revocation_store": _revocation_store_name(store),
        "rate_limiter": limiter.backend,
        "email": "resend_configured" if settings.email_sender == "resend" and settings.resend_api_key and settings.resend_from_email else f"{settings.email_sender}_configured",
        "migration_head": migration,
        "dataset": {"exercise_count": exercise_count, "available": exercise_count >= 1324},
        "service": "moveinrange-api",
        "version": settings.service_version,
    }


@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: Credentials, request: Request, db: Session = Depends(get_db)):
    _rate_limit(f"register:{request.client.host if request.client else 'unknown'}", get_settings().auth_rate_limit)
    email = payload.email.strip().lower()
    _validate_password_strength(payload.password)
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
    if user.deleted_at is not None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "account_disabled"})
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
    if user and user.deleted_at is not None:
        if decoded.get("fam"):
            _revoke_refresh_family(decoded["fam"], db)
        user.refresh_token_hash = None
        db.commit()
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "account_disabled"})
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


@router.post("/auth/forgot-password")
def forgot_password(payload: PasswordResetRequestPayload, request: Request, db: Session = Depends(get_db)):
    _rate_limit(f"forgot-password:{request.client.host if request.client else 'unknown'}", get_settings().auth_rate_limit)
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).one_or_none()
    response: dict[str, Any] = {"accepted": True, "message": "If an account exists, password reset instructions have been sent."}
    if user and user.password_hash and user.deleted_at is None:
        token = secrets.token_urlsafe(32)
        ip_hash = token_hash(request.client.host) if request.client else None
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash(token),
                expires_at=datetime.now(UTC) + timedelta(minutes=30),
                requested_ip_hash=ip_hash,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
        )
        reset_base = _password_reset_page_base()
        reset_link = f"{reset_base}#token={token}"
        sender = get_email_sender()
        result = sender.send_password_reset(user.email or email, reset_link)
        db.add(
            EmailDeliveryAttempt(
                user_id=user.id,
                recipient_hash=token_hash(email),
                template="password_reset",
                provider=result.provider,
                status=result.status,
                provider_message_id=result.provider_message_id,
                error_code=result.error_code,
                redacted_payload={"expires_minutes": 30, "reset_page": reset_base},
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
        )
        db.add(AuditLog(actor_id=user.id, action="auth.password_reset.request", target_type="user", target_id=user.id, redacted_payload={"delivery": result.provider, "delivery_status": result.status}))
        if _show_reset_preview():
            response["development_reset_link"] = reset_link
            response["development_reset_token"] = token
    else:
        db.add(AuditLog(actor_id="system", action="auth.password_reset.request_unknown", target_type="user", target_id="masked", redacted_payload={}))
    db.commit()
    return response


@router.post("/auth/reset-password/validate")
def validate_password_reset(payload: PasswordResetValidatePayload, db: Session = Depends(get_db)):
    record = _password_reset_record(payload.token, db)
    return {"valid": True, "expires_at": record.expires_at.isoformat()}


@router.post("/auth/reset-password")
def reset_password(payload: PasswordResetPayload, request: Request, db: Session = Depends(get_db)):
    _rate_limit(f"reset-password:{request.client.host if request.client else 'unknown'}", get_settings().auth_rate_limit)
    _validate_password_strength(payload.password)
    record = _password_reset_record(payload.token, db)
    user = db.get(User, record.user_id)
    if not user or user.deleted_at is not None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "invalid_reset_token"})
    user.password_hash = hash_password(payload.password)
    user.refresh_token_hash = None
    user.auth_invalidated_at = datetime.now(UTC)
    record.used_at = datetime.now(UTC)
    _revoke_user_refresh_tokens(user.id, db)
    db.add(AuditLog(actor_id=user.id, action="auth.password_reset.complete", target_type="user", target_id=user.id, redacted_payload={"sessions_revoked": True}))
    db.commit()
    return {"reset": True}


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
    if user.deleted_at is not None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "account_disabled"})
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
    completed.add(payload.step)
    now = datetime.now(UTC).isoformat()
    meta = dict(draft.get("_meta") or {})
    meta["schema_version"] = "closed-beta-1"
    meta["saved_step"] = payload.step
    meta["completed_steps"] = sorted(completed)
    meta["updated_at"] = now
    if payload.completed:
        meta["completed_at"] = now
    draft["_meta"] = meta
    progress.current_step = payload.step
    progress.completed_steps = sorted(completed)
    progress.draft_payload = draft
    progress.language = payload.language
    progress.status = "complete" if payload.completed or payload.step == "review_complete" else "in_progress"
    profile = _profile_for(user.id, db)
    health = dict(profile.health_payload or {})
    health["onboarding_draft"] = draft
    if progress.status == "complete":
        controlled_keys = {
            "goals",
            "activity_level",
            "conditions",
            "movement_limitations",
            "limitation_body_areas",
            "equipment",
            "preferred_training_days",
            "preferred_days_per_week",
            "preferred_minutes",
            "consent_accepted",
        }
        for key in controlled_keys:
            if key in payload.payload:
                health[key] = payload.payload[key]
    profile.health_payload = health
    profile.onboarding_complete = profile.onboarding_complete or progress.status == "complete"
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


@router.get("/categories")
def categories(db: Session = Depends(get_db)):
    return {"items": _exercise_taxonomy_items(db, "category")}


@router.get("/body-parts")
def body_parts(db: Session = Depends(get_db)):
    return {"items": _exercise_taxonomy_items(db, "body_part")}


@router.get("/target-muscles")
def target_muscles(db: Session = Depends(get_db)):
    return {"items": _exercise_taxonomy_items(db, "target")}


@router.get("/exercise-tags")
def exercise_tags(db: Session = Depends(get_db)):
    return {"items": _exercise_taxonomy_items(db, "tags")}


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
    category: str | None = None,
    body_part: str | None = None,
    equipment: str | None = None,
    target: str | None = None,
    position: str | None = None,
    difficulty: str | None = None,
    impact: str | None = None,
    bodyweight: bool = False,
    favorites: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    language: str = "en",
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    query = db.query(Exercise)
    if q:
        like = f"%{q.lower()}%"
        localized = db.query(ExerciseLocalization.exercise_id).filter(
            func.lower(ExerciseLocalization.instructions).like(like)
        )
        query = query.filter(
            or_(
                func.lower(Exercise.name).like(like),
                func.lower(Exercise.target).like(like),
                func.lower(Exercise.equipment).like(like),
                func.lower(Exercise.body_part).like(like),
                Exercise.id.in_(localized),
            )
        )
    selected_body_part = (body_part or category or "").strip().lower()
    if selected_body_part:
        query = query.filter(Exercise.body_part == selected_body_part)
    if equipment:
        query = query.filter(Exercise.equipment == equipment.lower())
    if target:
        query = query.filter(Exercise.target == target.lower())
    if bodyweight:
        query = query.filter(Exercise.equipment == "body weight")
    if favorites:
        favorite_ids = db.query(FavoriteExercise.exercise_id).filter(FavoriteExercise.user_id == user.id)
        query = query.filter(Exercise.id.in_(favorite_ids))
    filtered_items = query.order_by(Exercise.name).all()
    if position:
        filtered_items = [item for item in filtered_items if _position_for_exercise(item) == position.lower()]
    if difficulty:
        filtered_items = [item for item in filtered_items if _difficulty_for_exercise(item) == difficulty.lower()]
    if impact:
        filtered_items = [item for item in filtered_items if _impact_for_exercise(item) == impact.lower()]
    total = len(filtered_items)
    items = filtered_items[(page - 1) * page_size : page * page_size]
    return {
        "items": _exercise_list_payload(items, db, language, user.id),
        "pagination": {"page": page, "page_size": page_size, "total": total},
        "filters": {"category": category, "body_part": body_part, "equipment": equipment, "target": target, "position": position, "difficulty": difficulty, "impact": impact, "bodyweight": bodyweight, "favorites": favorites},
        "filter_options": _exercise_filter_options(db),
        "media_policy": "hosted-https-required",
    }


@router.get("/exercises/favorites")
def favorite_exercises(user: User = Depends(require_user), db: Session = Depends(get_db)):
    rows = (
        db.query(FavoriteExercise)
        .filter(FavoriteExercise.user_id == user.id)
        .order_by(desc(FavoriteExercise.created_at))
        .limit(50)
        .all()
    )
    exercises = [db.get(Exercise, row.exercise_id) for row in rows]
    return {"items": _exercise_list_payload([item for item in exercises if item], db, "en", user.id)}


@router.get("/exercises/recent")
def recent_exercises(user: User = Depends(require_user), db: Session = Depends(get_db)):
    rows = (
        db.query(AuditLog)
        .filter(AuditLog.actor_id == user.id, AuditLog.action == "exercise.view", AuditLog.target_type == "exercise")
        .order_by(desc(AuditLog.created_at))
        .limit(100)
        .all()
    )
    seen: set[str] = set()
    items: list[dict[str, Any]] = []
    for row in rows:
        if not row.target_id or row.target_id in seen:
            continue
        exercise = db.get(Exercise, row.target_id)
        if exercise:
            items.append(exercise)
            seen.add(row.target_id)
        if len(items) >= 20:
            break
    return {"items": _exercise_list_payload(items, db, "en", user.id)}


@router.get("/exercises/search")
def exercise_search_alias(
    q: str = "",
    category: str | None = None,
    body_part: str | None = None,
    equipment: str | None = None,
    target: str | None = None,
    position: str | None = None,
    difficulty: str | None = None,
    impact: str | None = None,
    bodyweight: bool = False,
    favorites: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    language: str = "en",
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return exercise_search(
        q=q,
        category=category,
        body_part=body_part,
        equipment=equipment,
        target=target,
        position=position,
        difficulty=difficulty,
        impact=impact,
        bodyweight=bodyweight,
        favorites=favorites,
        page=page,
        page_size=page_size,
        language=language,
        user=user,
        db=db,
    )


@router.get("/exercises/{exercise_id}")
def exercise_detail(exercise_id: str, language: str = "en", user: User = Depends(require_user), db: Session = Depends(get_db)):
    exercise = _get_exercise(exercise_id, db)
    _record_recent(user.id, exercise.id, db)
    db.commit()
    return _exercise_payload(exercise, db, language, user=user)


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


@router.delete("/exercises/{exercise_id}/favorite")
def unfavorite(exercise_id: str, user: User = Depends(require_user), db: Session = Depends(get_db)):
    exercise = _get_exercise(exercise_id, db)
    db.query(FavoriteExercise).filter(FavoriteExercise.user_id == user.id, FavoriteExercise.exercise_id == exercise.id).delete(synchronize_session=False)
    db.commit()
    return {"favorited": False, "exercise_id": exercise.id}


@router.post("/plans/daily/generate", status_code=status.HTTP_201_CREATED)
def generate_daily(payload: ReadinessPayload | None = None, user: User = Depends(require_user), db: Session = Depends(get_db)):
    started = perf_counter()
    timings: dict[str, int] = {}

    def mark(label: str, since: float) -> float:
        now = perf_counter()
        timings[label] = int((now - since) * 1000)
        return now

    _rate_limit(f"daily-plan:{user.id}", get_settings().auth_rate_limit * 2)
    checkpoint = mark("rate_limit", started)
    readiness = payload or _latest_or_default_readiness(user.id, db)
    idempotency_key = readiness.idempotency_key.strip() if readiness.idempotency_key else None
    if idempotency_key:
        existing = _latest_plan_by_generation_key(user.id, "daily", idempotency_key, db)
        if existing:
            timings["total"] = int((perf_counter() - started) * 1000)
            logger.info("daily_plan_generation", extra={"user_id_hash": token_hash(user.id)[:12], "idempotent": True, "timings_ms": timings})
            return {"blocked": False, "plan": existing.payload, "idempotent": True, "timings_ms": timings}
    checkpoint = mark("readiness_load", checkpoint)
    decision = evaluate_safety(readiness.model_dump())
    checkpoint = mark("safety", checkpoint)
    if decision["action"] == "BLOCK_AND_SHOW_SAFETY_MESSAGE":
        return {"blocked": True, "safety_decision": {**decision, "timestamp": datetime.now(UTC).isoformat()}, "plan": None}
    allowed_equipment = _allowed_equipment_for_user(user.id, db)
    checkpoint = mark("profile", checkpoint)
    exercise_pool = _plan_exercise_pool(user.id, readiness.model_dump(), decision, db, allowed_equipment)
    checkpoint = mark("exercise_pool", checkpoint)
    plan_payload = _daily_plan_payload(
        user.id,
        readiness.model_dump(),
        decision,
        db,
        plan_date=datetime.now(UTC).date().isoformat(),
        session_type="daily",
        exercise_pool=exercise_pool,
        allowed_equipment=allowed_equipment,
    )
    plan_payload["generation_request_id"] = idempotency_key
    plan_payload["timings_ms"] = timings
    checkpoint = mark("selection_enrichment", checkpoint)
    plan = Plan(id=plan_payload["id"], user_id=user.id, plan_type="daily", payload=plan_payload, safety_action=decision["action"])
    db.add(plan)
    db.commit()
    mark("persistence", checkpoint)
    timings["total"] = int((perf_counter() - started) * 1000)
    plan_payload["timings_ms"] = timings
    logger.info("daily_plan_generation", extra={"user_id_hash": token_hash(user.id)[:12], "idempotent": False, "exercise_pool_count": len(exercise_pool), "timings_ms": timings})
    return {"blocked": False, "plan": plan_payload, "idempotent": False, "timings_ms": timings}


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
    candidates = [_exercise_brief_payload(item, db) for item in db.query(Exercise).order_by(Exercise.name).limit(80).all()]
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
    candidates = [_exercise_brief_payload(item, db) for item in db.query(Exercise).order_by(Exercise.name).limit(60).all()]
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
    profile = _profile_for(user.id, db)
    preferred_days = (profile.health_payload or {}).get("preferred_training_days", ["Mon", "Wed", "Fri"])
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    week_start = datetime.now(UTC).date() - timedelta(days=datetime.now(UTC).weekday())
    previous_was_movement = False
    schedule = []
    used_signatures: set[str] = set()
    recent_primary_ids: set[str] = set()
    focus_cycle = ["mobility", "upper_body", "balance", "conditioning", "lower_body", "core", "recovery"]
    allowed_equipment = _allowed_equipment_for_user(user.id, db)
    exercise_pool = _plan_exercise_pool(user.id, readiness.model_dump(), decision, db, allowed_equipment)
    for index, day in enumerate(days):
        planned_movement = day in preferred_days and not previous_was_movement and decision["action"] != "BLOCK_AND_SHOW_SAFETY_MESSAGE"
        status_value = "planned" if planned_movement else "recovery"
        day_payload = None
        if planned_movement:
            plan_date = (week_start + timedelta(days=index)).isoformat()
            day_payload = _daily_plan_payload(
                user.id,
                readiness.model_dump(),
                decision,
                db,
                plan_date=plan_date,
                session_type=focus_cycle[index],
                day_index=index,
                week_index=0,
                avoid_signatures=used_signatures,
                avoid_primary_ids=recent_primary_ids,
                exercise_pool=exercise_pool,
                allowed_equipment=allowed_equipment,
            )
            signature = _plan_items_signature(day_payload["items"], focus_cycle[index])
            used_signatures.add(signature)
            if day_payload["items"]:
                recent_primary_ids = {day_payload["items"][0]["exercise_id"]}
        schedule.append(
            {
                "id": (day_payload or {}).get("session_id") or f"rest_{(week_start + timedelta(days=index)).isoformat()}",
                "day": day,
                "date": (week_start + timedelta(days=index)).isoformat(),
                "day_index": index,
                "focus": focus_cycle[index],
                "session_type": "movement" if planned_movement else "recovery",
                "session_id": (day_payload or {}).get("session_id"),
                "planned_duration": day_payload["total_minutes"] if day_payload else 0,
                "duration_minutes": day_payload["total_minutes"] if day_payload else 0,
                "intensity": "low" if decision["action"] != "READY" or not planned_movement else day_payload["intensity"],
                "status": status_value,
                "safety_modified": decision["action"] != "READY",
                "items": day_payload["items"] if day_payload else [],
                "media_summary": day_payload["media_summary"] if day_payload else {"playable": 0, "fallback": 0},
                "actions": ["open", "start", "make_easier", "move_session"] if planned_movement else ["swap_rest_day"],
            }
        )
        previous_was_movement = planned_movement
    payload = {
        "id": "week_" + secrets.token_hex(8),
        "days": schedule,
        "week_start": week_start.isoformat(),
        "total_planned_minutes": sum(day["duration_minutes"] for day in schedule),
        "explanation": "Weekly plan spaces movement days with recovery days and keeps intensity conservative after safety modifications.",
    }
    db.add(Plan(id=payload["id"], user_id=user.id, plan_type="weekly", payload=payload, safety_action=decision["action"]))
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
        (2, "Consistency", "Repeat the weekly rhythm with different movement choices before progressing load."),
        (3, "Gentle progression", "Progress one variable at a time; no simultaneous aggressive increase."),
        (4, "Recovery and reassessment", "Consolidate, review symptoms, and avoid automatic load increase."),
    ]
    profile = _profile_for(user.id, db)
    preferred_days = (profile.health_payload or {}).get("preferred_training_days", ["Mon", "Wed", "Fri"])
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    focus_cycle = ["mobility", "upper_body", "balance", "conditioning", "lower_body", "core", "recovery"]
    start_date = datetime.now(UTC).date()
    used_week_signatures: set[str] = set()
    recent_primary_ids: set[str] = set()
    allowed_equipment = _allowed_equipment_for_user(user.id, db)
    exercise_pool = _plan_exercise_pool(user.id, readiness_payload, decision, db, allowed_equipment)
    weeks: list[dict[str, Any]] = []
    for week, phase, reason in phases:
        week_hold = hold_reason is not None and week > 1
        planned_indexes = {days.index(day) for day in preferred_days if day in days}
        if week == 4 and not week_hold:
            planned_indexes = set(sorted(planned_indexes)[: max(1, min(2, len(planned_indexes)))])
        week_days = []
        week_signatures = []
        for index, day in enumerate(days):
            plan_date = (start_date + timedelta(days=((week - 1) * 7) + index)).isoformat()
            planned_movement = index in planned_indexes and not week_hold and decision["action"] != "BLOCK_AND_SHOW_SAFETY_MESSAGE"
            day_payload = None
            if planned_movement:
                day_payload = _daily_plan_payload(
                    user.id,
                    readiness_payload,
                    decision,
                    db,
                    plan_date=plan_date,
                    session_type=focus_cycle[(index + week - 1) % len(focus_cycle)],
                    day_index=index,
                    week_index=week - 1,
                    avoid_signatures=used_week_signatures,
                    avoid_primary_ids=recent_primary_ids,
                    exercise_pool=exercise_pool,
                    allowed_equipment=allowed_equipment,
                )
                signature = _plan_items_signature(day_payload["items"], day_payload["session_type"])
                used_week_signatures.add(signature)
                week_signatures.append(signature)
                if day_payload["items"]:
                    recent_primary_ids = {day_payload["items"][0]["exercise_id"]}
            week_days.append(
                {
                    "id": (day_payload or {}).get("session_id") or f"rest_{plan_date}",
                    "day": day,
                    "date": plan_date,
                    "day_index": index,
                    "status": "planned" if planned_movement else "recovery",
                    "focus": focus_cycle[(index + week - 1) % len(focus_cycle)],
                    "session_type": "movement" if planned_movement else "recovery",
                    "session_id": (day_payload or {}).get("session_id"),
                    "planned_duration": day_payload["total_minutes"] if day_payload else 0,
                    "duration_minutes": day_payload["total_minutes"] if day_payload else 0,
                    "items": day_payload["items"] if day_payload else [],
                    "media_summary": day_payload["media_summary"] if day_payload else {"playable": 0, "fallback": 0},
                    "actions": ["open", "start", "make_easier", "move_session"] if planned_movement else ["swap_rest_day"],
                }
            )
        weeks.append(
            {
                "week": week,
                "phase": phase,
                "progression_reason": hold_reason or reason,
                "hold": week_hold,
                "status": "hold" if week_hold else "planned",
                "planned_sessions": sum(1 for day in week_days if day["status"] == "planned"),
                "recovery_days": sum(1 for day in week_days if day["status"] != "planned"),
                "focus": sorted({day["focus"] for day in week_days if day["status"] == "planned"}) or ["recovery", "reassessment"],
                "days": week_days,
                "total_planned_minutes": sum(day["duration_minutes"] for day in week_days),
                "signature_count": len(set(week_signatures)),
            }
        )
    payload = {
        "id": "month_" + secrets.token_hex(8),
        "program_start_date": start_date.isoformat(),
        "weeks": weeks,
        "timeline": ["Adaptation", "Consistency", "Gentle progression", "Recovery and reassessment"],
        "actions": ["open_week", "open_day", "pause", "extend", "reduce_intensity", "change_frequency", "regenerate_future_days"],
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
    token = secrets.token_urlsafe(32)
    archive = _privacy_export_archive(user, db)
    expires_at = datetime.now(UTC) + timedelta(hours=24)
    archive["manifest"]["expires_at"] = expires_at.isoformat()
    checksum = hashlib.sha256(json.dumps(archive, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    job = DataExportJob(
        user_id=user.id,
        status="ready",
        download_token_hash=token_hash(token),
        payload={
            "format": "json",
            "manifest": archive["manifest"],
            "checksum_sha256": checksum,
            "expires_at": expires_at.isoformat(),
            "secrets_included": False,
            "download_token_issued": True,
            "archive": archive,
        },
    )
    db.add(job)
    db.add(AuditLog(actor_id=user.id, action="privacy.export.request", target_type="data_export", target_id=user.id, redacted_payload={}))
    db.commit()
    exported = _export_job_payload(job)
    exported["download_url"] = f"/api/v1/privacy/export-jobs/{job.id}/download?token={token}"
    return {"job": exported}


@router.get("/privacy/export-jobs")
def list_export_jobs(user: User = Depends(require_user), db: Session = Depends(get_db)):
    jobs = db.query(DataExportJob).filter(DataExportJob.user_id == user.id).order_by(desc(DataExportJob.created_at)).all()
    return {"items": [_export_job_payload(job) for job in jobs]}


@router.get("/privacy/export-jobs/{job_id}/download")
def download_export_job(job_id: int, token: str = Query(min_length=24), user: User = Depends(require_user), db: Session = Depends(get_db)):
    job = db.get(DataExportJob, job_id)
    if not job or job.user_id != user.id or job.status != "ready" or job.download_token_hash != token_hash(token):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "export_not_found"})
    expires_at = _optional_datetime((job.payload or {}).get("expires_at"))
    if expires_at and _as_utc(expires_at) < datetime.now(UTC):
        raise HTTPException(status.HTTP_410_GONE, detail={"code": "export_expired"})
    db.add(AuditLog(actor_id=user.id, action="privacy.export.download", target_type="data_export", target_id=str(job.id), redacted_payload={"archive_format": job.archive_format}))
    db.commit()
    return {"archive": (job.payload or {}).get("archive"), "checksum_sha256": (job.payload or {}).get("checksum_sha256")}


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


@router.get("/privacy/deletion-jobs")
def list_deletion_jobs(user: User = Depends(require_user), db: Session = Depends(get_db)):
    jobs = db.query(DeletionJob).filter(DeletionJob.user_id == user.id).order_by(desc(DeletionJob.created_at)).all()
    return {"items": [_deletion_job_payload(job) for job in jobs]}


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
def policies(admin=Depends(require_admin_roles("clinical_reviewer", "content_editor", "super_admin", required_label="policy_access")), db: Session = Depends(get_db)):
    items = db.query(PolicyVersion).order_by(desc(PolicyVersion.created_at)).limit(50).all()
    if not items:
        items = [PolicyVersion(version="draft-2026-07-18", status="draft", rules={"source": "seed"}, clinical_review_state="draft")]
    return {"admin": admin.id, "items": [_policy_payload(item) for item in items]}


@router.post("/admin/policies", status_code=status.HTTP_201_CREATED)
def create_policy(payload: PolicyCreatePayload, admin=Depends(require_admin_roles("content_editor", "super_admin", required_label="policy_draft_create")), db: Session = Depends(get_db)):
    if payload.clinical_review_state != "draft":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "policy_draft_create_cannot_set_review_state"})
    existing = db.query(PolicyVersion).filter(PolicyVersion.version == payload.version).one_or_none()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "policy_version_exists"})
    policy = PolicyVersion(version=payload.version, status="draft", rules=payload.rules, clinical_review_state=payload.clinical_review_state, creator_id=admin.id)
    db.add(policy)
    db.add(AuditLog(actor_id=admin.id, action="admin.policy.create", target_type="policy", target_id=policy.version, redacted_payload={"status": policy.status}))
    db.commit()
    return {"policy": _policy_payload(policy)}


@router.get("/admin/policies/{policy_id}")
def policy_detail(policy_id: str, admin=Depends(require_admin_roles("clinical_reviewer", "content_editor", "super_admin", required_label="policy_access")), db: Session = Depends(get_db)):
    policy = _admin_policy_lookup(policy_id, db)
    approvals = db.query(PolicyApproval).filter(PolicyApproval.policy_version_id == policy.id).order_by(desc(PolicyApproval.created_at)).all()
    return {"policy": _policy_payload(policy, include_rules=True), "approvals": [_policy_approval_payload(item) for item in approvals]}


@router.patch("/admin/policies/{policy_id}")
def update_policy(policy_id: str, payload: AdminUpdatePayload, admin=Depends(require_admin_roles("content_editor", "super_admin", required_label="policy_draft_update")), db: Session = Depends(get_db)):
    policy = _admin_policy_lookup(policy_id, db)
    unknown = set(payload.payload) - {"rules"}
    if unknown:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "policy_draft_update_forbidden_fields", "fields": sorted(unknown)})
    if "rules" in payload.payload and isinstance(payload.payload["rules"], dict):
        policy.rules = payload.payload["rules"]
    db.add(AuditLog(actor_id=admin.id, action="admin.policy.update", target_type="policy", target_id=policy.version, redacted_payload={"fields": sorted(payload.payload.keys())}))
    db.commit()
    return {"policy": _policy_payload(policy, include_rules=True)}


@router.post("/admin/policies/{policy_id}/submit")
def submit_policy(policy_id: str, payload: PolicyActionPayload, admin=Depends(require_admin_roles("content_editor", "super_admin", required_label="policy_submit")), db: Session = Depends(get_db)):
    policy = _admin_policy_lookup(policy_id, db)
    rationale = payload.rationale.strip()
    if not rationale:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "rationale_required"})
    policy.status = "submitted"
    policy.clinical_review_state = "submitted"
    policy.submitter_id = admin.id
    policy.submitted_at = datetime.now(UTC)
    db.add(AuditLog(actor_id=admin.id, action="admin.policy.submit", target_type="policy", target_id=policy.version, redacted_payload={"fields": ["status", "clinical_review_state"]}))
    db.commit()
    return {"policy": _policy_payload(policy, include_rules=True)}


@router.post("/admin/policies/{policy_id}/approve")
def approve_policy(policy_id: str, payload: PolicyActionPayload, admin=Depends(require_admin_roles("clinical_reviewer", required_label="policy_approve")), db: Session = Depends(get_db)):
    return _policy_action(policy_id, "approved", payload.rationale, admin, db)


@router.post("/admin/policies/{policy_id}/reject")
def reject_policy(policy_id: str, payload: PolicyActionPayload, admin=Depends(require_admin_roles("clinical_reviewer", required_label="policy_reject")), db: Session = Depends(get_db)):
    return _policy_action(policy_id, "rejected", payload.rationale, admin, db)


@router.post("/admin/policies/{policy_id}/publish")
def publish_policy(policy_id: str, payload: PolicyActionPayload, admin=Depends(require_admin_roles("super_admin", required_label="policy_publish")), db: Session = Depends(get_db)):
    policy = _admin_policy_lookup(policy_id, db)
    if policy.clinical_review_state != "approved" or not policy.approver_id:
        db.add(AuditLog(actor_id=admin.id, action="admin.policy.publish.denied", target_type="policy", target_id=policy.version, redacted_payload={"reason": "missing_clinical_approval"}))
        db.commit()
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "policy_requires_clinical_approval"})
    policy.status = "published"
    policy.publisher_id = admin.id
    policy.published_at = datetime.now(UTC)
    approval = PolicyApproval(policy_version_id=policy.id, reviewer_id=admin.id, decision="published", rationale=payload.rationale)
    db.add(approval)
    db.add(AuditLog(actor_id=admin.id, action="admin.policy.publish", target_type="policy", target_id=policy.version, redacted_payload={"decision": "published"}))
    db.commit()
    return {"policy": _policy_payload(policy, include_rules=True), "approval": _policy_approval_payload(approval)}


@router.post("/admin/policies/{policy_id}/rollback")
def rollback_policy(policy_id: str, payload: PolicyActionPayload, admin=Depends(require_admin_roles("super_admin", required_label="policy_rollback")), db: Session = Depends(get_db)):
    policy = _admin_policy_lookup(policy_id, db)
    policy.status = "rolled_back"
    policy.rollback_actor_id = admin.id
    policy.rolled_back_at = datetime.now(UTC)
    approval = PolicyApproval(policy_version_id=policy.id, reviewer_id=admin.id, decision="rolled_back", rationale=payload.rationale)
    db.add(approval)
    db.add(AuditLog(actor_id=admin.id, action="admin.policy.rollback", target_type="policy", target_id=policy.version, redacted_payload={"decision": "rolled_back"}))
    db.commit()
    return {"policy": _policy_payload(policy, include_rules=True), "approval": _policy_approval_payload(approval)}


@router.get("/admin/exercises")
def admin_exercises(admin=Depends(require_admin_roles("exercise_reviewer", "content_editor", "super_admin", required_label="exercise_access")), db: Session = Depends(get_db)):
    items = db.query(Exercise).order_by(Exercise.name).limit(25).all()
    total = db.query(Exercise).count()
    return {
        "items": _exercise_list_payload(items, db, "en"),
        "pagination": {"page": 1, "page_size": 25, "total": total},
        "filter_options": _exercise_filter_options(db),
        "media_policy": "hosted-https-required",
    }


@router.get("/admin/exercises/{exercise_id}")
def admin_exercise_detail(exercise_id: str, admin=Depends(require_admin_roles("exercise_reviewer", "content_editor", "super_admin", required_label="exercise_access")), db: Session = Depends(get_db)):
    exercise = _get_exercise(exercise_id, db)
    approvals = db.query(MediaApproval).filter(MediaApproval.exercise_id == exercise.id).order_by(desc(MediaApproval.created_at)).all()
    tags = db.query(ExerciseTag).filter(ExerciseTag.exercise_id == exercise.id).order_by(desc(ExerciseTag.created_at)).all()
    metadata = exercise.source_metadata or {}
    return {
        "exercise": _exercise_payload(exercise, db, "en"),
        "turkish": _exercise_payload(exercise, db, "tr"),
        "metadata": metadata,
        "substitution_ids": list(metadata.get("substitution_ids") or []),
        "publication_preconditions": _exercise_publication_preconditions(exercise, db),
        "media_approvals": [_media_approval_payload(item) for item in approvals],
        "tags": [_exercise_tag_payload(item) for item in tags],
        "revision_history": [tag.created_at.isoformat() for tag in tags if tag.created_at],
    }


@router.patch("/admin/exercises/{exercise_id}/translation")
def update_admin_exercise_translation(exercise_id: str, payload: ExerciseTranslationUpdatePayload, admin=Depends(require_admin_roles("content_editor", "super_admin", required_label="exercise_translation_update")), db: Session = Depends(get_db)):
    exercise = _get_exercise(exercise_id, db)
    if payload.locale != "tr":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "unsupported_exercise_locale"})
    title = _required_text(payload.title, "title_required")
    reason = _required_text(payload.change_reason, "change_reason_required")
    steps = _required_text_list(payload.instruction_steps, "instruction_steps_required")
    localized = db.query(ExerciseLocalization).filter(ExerciseLocalization.exercise_id == exercise.id, ExerciseLocalization.locale == "tr").one_or_none()
    if not localized:
        localized = ExerciseLocalization(exercise_id=exercise.id, locale="tr", instructions="", instruction_steps=[])
        db.add(localized)
    metadata = {**(exercise.source_metadata or {})}
    metadata["tr_title"] = title
    metadata["tr_form_cues"] = _clean_text_list(payload.form_cues)
    metadata["tr_common_mistakes"] = _clean_text_list(payload.common_mistakes)
    metadata["tr_breathing_cues"] = _clean_text_list(payload.breathing_cues)
    metadata["translation_updated_by"] = admin.id
    metadata["translation_updated_at"] = datetime.now(UTC).isoformat()
    exercise.source_metadata = metadata
    localized.instructions = "\n".join(steps)
    localized.instruction_steps = steps
    db.add(AuditLog(actor_id=admin.id, action="admin.exercise.translation_update", target_type="exercise", target_id=exercise.id, redacted_payload={"locale": payload.locale, "reason": reason}))
    db.commit()
    return admin_exercise_detail(exercise_id, admin, db)


@router.patch("/admin/exercises/{exercise_id}/metadata")
def update_admin_exercise_metadata(exercise_id: str, payload: ExerciseMetadataUpdatePayload, admin=Depends(require_admin_roles("content_editor", "super_admin", required_label="exercise_metadata_update")), db: Session = Depends(get_db)):
    exercise = _get_exercise(exercise_id, db)
    reason = _required_text(payload.change_reason, "change_reason_required")
    metadata_updates = {
        "category": payload.category,
        "position": payload.position,
        "difficulty": payload.difficulty,
    }
    equipment = payload.equipment.strip().lower() if payload.equipment and payload.equipment.strip() else None
    cleaned = {key: str(value).strip().lower() for key, value in metadata_updates.items() if value and str(value).strip()}
    if not cleaned and not equipment:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "metadata_field_required"})
    metadata = {**(exercise.source_metadata or {})}
    metadata.update(cleaned)
    if equipment:
        exercise.equipment = equipment
    metadata["metadata_updated_by"] = admin.id
    metadata["metadata_updated_at"] = datetime.now(UTC).isoformat()
    exercise.source_metadata = metadata
    db.add(AuditLog(actor_id=admin.id, action="admin.exercise.metadata_update", target_type="exercise", target_id=exercise.id, redacted_payload={"fields": sorted([*cleaned.keys(), *(["equipment"] if equipment else [])]), "reason": reason}))
    db.commit()
    return admin_exercise_detail(exercise_id, admin, db)


@router.patch("/admin/exercises/{exercise_id}/safety")
def update_admin_exercise_safety(exercise_id: str, payload: ExerciseSafetyUpdatePayload, admin=Depends(require_admin_roles("exercise_reviewer", "super_admin", required_label="exercise_safety_update")), db: Session = Depends(get_db)):
    exercise = _get_exercise(exercise_id, db)
    reason = _required_text(payload.review_reason, "review_reason_required")
    safety_tags = _clean_text_list(payload.safety_tags)
    restricted_regions = _clean_text_list(payload.restricted_regions)
    contraindications = _clean_text_list(payload.contraindication_categories)
    if not safety_tags and not restricted_regions and not contraindications:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "safety_field_required"})
    metadata = {**(exercise.source_metadata or {})}
    metadata["safety_tags"] = safety_tags
    metadata["restricted_regions"] = restricted_regions
    metadata["contraindication_categories"] = contraindications
    metadata["review_status"] = "approved"
    metadata["safety_reviewed_by"] = admin.id
    metadata["safety_reviewed_at"] = datetime.now(UTC).isoformat()
    exercise.source_metadata = metadata
    db.add(ExerciseTag(exercise_id=exercise.id, classifier_version="manual-admin", tags={"safety_tags": safety_tags, "restricted_regions": restricted_regions, "contraindication_categories": contraindications}, provenance="admin", confidence=100, manual_review_status="approved"))
    db.add(AuditLog(actor_id=admin.id, action="admin.exercise.safety_update", target_type="exercise", target_id=exercise.id, redacted_payload={"reason": reason}))
    db.commit()
    return admin_exercise_detail(exercise_id, admin, db)


@router.post("/admin/exercises/{exercise_id}/substitutions")
def add_admin_exercise_substitution(exercise_id: str, payload: ExerciseSubstitutionPayload, admin=Depends(require_admin_roles("exercise_reviewer", "super_admin", required_label="exercise_substitution_add")), db: Session = Depends(get_db)):
    exercise = _get_exercise(exercise_id, db)
    substitution = _get_exercise(payload.substitution_id, db)
    reason = _required_text(payload.reason, "reason_required")
    if substitution.id == exercise.id:
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "self_substitution_rejected"})
    metadata = {**(exercise.source_metadata or {})}
    substitutions = list(metadata.get("substitution_ids") or [])
    if substitution.id in substitutions:
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "duplicate_substitution"})
    substitutions.append(substitution.id)
    metadata["substitution_ids"] = substitutions[:20]
    metadata["substitution_updated_by"] = admin.id
    metadata["substitution_updated_at"] = datetime.now(UTC).isoformat()
    exercise.source_metadata = metadata
    db.add(AuditLog(actor_id=admin.id, action="admin.exercise.substitution_add", target_type="exercise", target_id=exercise.id, redacted_payload={"substitution_id": substitution.id, "reason": reason}))
    db.commit()
    return admin_exercise_detail(exercise_id, admin, db)


@router.post("/admin/exercises/{exercise_id}/substitutions/remove")
def remove_admin_exercise_substitution(exercise_id: str, payload: ExerciseSubstitutionPayload, admin=Depends(require_admin_roles("exercise_reviewer", "super_admin", required_label="exercise_substitution_remove")), db: Session = Depends(get_db)):
    exercise = _get_exercise(exercise_id, db)
    reason = _required_text(payload.reason, "reason_required")
    substitution_id = _required_text(payload.substitution_id, "substitution_id_required")
    metadata = {**(exercise.source_metadata or {})}
    substitutions = [item for item in list(metadata.get("substitution_ids") or []) if item != substitution_id]
    metadata["substitution_ids"] = substitutions
    metadata["substitution_updated_by"] = admin.id
    metadata["substitution_updated_at"] = datetime.now(UTC).isoformat()
    exercise.source_metadata = metadata
    db.add(AuditLog(actor_id=admin.id, action="admin.exercise.substitution_remove", target_type="exercise", target_id=exercise.id, redacted_payload={"substitution_id": substitution_id, "reason": reason}))
    db.commit()
    return admin_exercise_detail(exercise_id, admin, db)


@router.post("/admin/exercises/{exercise_id}/publish")
def publish_admin_exercise(exercise_id: str, payload: ExercisePublicationPayload, admin=Depends(require_admin_roles("exercise_reviewer", "super_admin", required_label="exercise_publish")), db: Session = Depends(get_db)):
    exercise = _get_exercise(exercise_id, db)
    reason = _required_text(payload.reason, "reason_required")
    preconditions = _exercise_publication_preconditions(exercise, db)
    if not preconditions["eligible"]:
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "exercise_publication_preconditions_failed", "preconditions": preconditions})
    metadata = {**(exercise.source_metadata or {})}
    metadata["publish_state"] = "published"
    metadata["published_by"] = admin.id
    metadata["published_at"] = datetime.now(UTC).isoformat()
    exercise.source_metadata = metadata
    db.add(AuditLog(actor_id=admin.id, action="admin.exercise.publish", target_type="exercise", target_id=exercise.id, redacted_payload={"reason": reason}))
    db.commit()
    return admin_exercise_detail(exercise_id, admin, db)


@router.post("/admin/exercises/{exercise_id}/unpublish")
def unpublish_admin_exercise(exercise_id: str, payload: ExercisePublicationPayload, admin=Depends(require_admin_roles("exercise_reviewer", "super_admin", required_label="exercise_unpublish")), db: Session = Depends(get_db)):
    exercise = _get_exercise(exercise_id, db)
    reason = _required_text(payload.reason, "reason_required")
    metadata = {**(exercise.source_metadata or {})}
    metadata["publish_state"] = "unpublished"
    metadata["unpublished_by"] = admin.id
    metadata["unpublished_at"] = datetime.now(UTC).isoformat()
    exercise.source_metadata = metadata
    db.add(AuditLog(actor_id=admin.id, action="admin.exercise.unpublish", target_type="exercise", target_id=exercise.id, redacted_payload={"reason": reason}))
    db.commit()
    return admin_exercise_detail(exercise_id, admin, db)


@router.get("/admin/users")
def admin_users(q: str = "", role: str | None = None, page: int = Query(default=1, ge=1), admin=Depends(require_admin_role("support")), db: Session = Depends(get_db)):
    query = db.query(User)
    if q:
        query = query.filter(func.lower(User.email).like(f"%{q.lower()}%"))
    if role:
        query = query.filter(User.role == role)
    total = query.count()
    users = query.order_by(desc(User.created_at)).offset((page - 1) * 50).limit(50).all()
    db.add(AuditLog(actor_id=admin.id, action="admin.users.masked_list", target_type="user", target_id="masked", redacted_payload={"count": len(users)}))
    db.commit()
    return {"items": [{"id": user.id, "email_masked": _mask_email(user.email), "role": user.role, "deleted": user.deleted_at is not None} for user in users], "pagination": {"page": page, "page_size": 50, "total": total}, "impersonation": "disabled_by_default"}


@router.get("/admin/users/{user_id}")
def admin_user_detail(user_id: str, admin=Depends(require_admin_role("support")), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "user_not_found"})
    profile = db.query(Profile).filter(Profile.user_id == user.id).one_or_none()
    sessions = db.query(SessionRecord).filter(SessionRecord.user_id == user.id).order_by(desc(SessionRecord.created_at)).limit(5).all()
    plans = db.query(Plan).filter(Plan.user_id == user.id).order_by(desc(Plan.created_at)).limit(5).all()
    consents = db.query(ConsentRecord).filter(ConsentRecord.user_id == user.id).order_by(desc(ConsentRecord.created_at)).limit(10).all()
    db.add(AuditLog(actor_id=admin.id, action="admin.user.masked_detail", target_type="user", target_id=user.id, redacted_payload={"email_masked": _mask_email(user.email)}))
    db.commit()
    return {
        "user": {"id": user.id, "email_masked": _mask_email(user.email), "role": user.role, "deleted": user.deleted_at is not None},
        "profile_summary": _profile_admin_summary(profile),
        "sessions": [{"id": item.id, "status": item.status, "plan_id": item.plan_id, "elapsed_seconds": item.elapsed_seconds} for item in sessions],
        "plans": [{"id": item.id, "plan_type": item.plan_type, "status": item.status, "safety_action": item.safety_action} for item in plans],
        "consents": [{"consent_type": item.consent_type, "granted": item.granted, "version": item.version} for item in consents],
    }


@router.patch("/admin/users/{user_id}")
def update_admin_user(user_id: str, payload: AdminUpdatePayload, admin=Depends(require_admin_role("support")), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "user_not_found"})
    action = payload.payload.get("action")
    if action == "disable":
        if user.id == admin.id and admin.role == "super_admin":
            raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "cannot_disable_current_super_admin"})
        user.deleted_at = datetime.now(UTC)
    elif action == "enable":
        user.deleted_at = None
    elif action == "update_role":
        if admin.role != "super_admin":
            db.add(AuditLog(actor_id=admin.id, action="admin.user.update_role.denied", target_type="user", target_id=user.id, redacted_payload={"reason": "super_admin_required"}))
            db.commit()
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "super_admin_required"})
        next_role = str(payload.payload.get("role", "user"))
        if next_role not in ADMIN_ROLES | {"user"}:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "unsupported_role"})
        user.role = next_role
    else:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "unsupported_user_action"})
    db.add(AuditLog(actor_id=admin.id, action=f"admin.user.{action}", target_type="user", target_id=user.id, redacted_payload={"reason": payload.payload.get("reason", "admin_action")}))
    db.commit()
    return {"user": {"id": user.id, "email_masked": _mask_email(user.email), "role": user.role, "deleted": user.deleted_at is not None}}


@router.get("/admin/system")
def admin_system(admin=Depends(require_admin_role("analyst")), db: Session = Depends(get_db)):
    store = get_token_revocation_store()
    limiter = get_rate_limiter()
    return {
        "api": health(),
        "ready": ready(db),
        "postgresql": "configured" if "postgresql" in get_settings().database_url else "not_current_backend",
        "redis": "configured_optional" if isinstance(store, RedisTokenRevocationStore) else "not_required",
        "revocation": _revocation_store_name(store),
        "rate_limiter": limiter.backend,
        "import_jobs": {"latest": "see audit logs"},
        "provider_status": [{"key": key, "status": value["status"]} for key, value in PROVIDER_REGISTRY.items()],
        "incidents": [_system_incident_payload(item) for item in db.query(SystemIncident).order_by(desc(SystemIncident.created_at)).limit(10).all()],
        "secrets_exposed": False,
    }


@router.get("/admin/privacy-jobs")
def admin_privacy_jobs(admin=Depends(require_admin_role("support")), db: Session = Depends(get_db)):
    exports = db.query(DataExportJob).order_by(desc(DataExportJob.created_at)).limit(20).all()
    deletions = db.query(DeletionJob).order_by(desc(DeletionJob.created_at)).limit(20).all()
    return {"exports": [_export_job_payload(item) for item in exports], "deletions": [_deletion_job_payload(item) for item in deletions]}


@router.post("/admin/privacy-jobs/{kind}/{job_id}/{action}")
def admin_privacy_job_action(kind: str, job_id: int, action: str, payload: AdminUpdatePayload | None = None, admin=Depends(require_admin_role("support")), db: Session = Depends(get_db)):
    allowed = {"process", "retry", "fail", "cancel", "approve"}
    if action not in allowed:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "unsupported_privacy_action"})
    if kind == "export":
        job = db.get(DataExportJob, job_id)
        if not job:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "privacy_job_not_found"})
        job.status = "ready" if action in {"process", "approve"} else "queued" if action == "retry" else "failed" if action == "fail" else "cancelled"
        job.payload = {**(job.payload or {}), "processed_by": admin.id, "contains": ["profile", "onboarding", "plans", "sessions", "feedback", "diabetes", "consents", "relationships", "provider_metadata"], "secrets_included": False}
        result = {"job": _export_job_payload(job)}
    elif kind == "deletion":
        job = db.get(DeletionJob, job_id)
        if not job:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "privacy_job_not_found"})
        if action == "process":
            job.status = "completed"
            job.payload = {**(job.payload or {}), "processed_by": admin.id, "legal_certification": False, "deleted_counts": _process_deletion_job(job, db)}
        else:
            job.status = "requested" if action == "retry" else "failed" if action == "fail" else "cancelled" if action == "cancel" else "approved"
            job.payload = {**(job.payload or {}), "processed_by": admin.id, "legal_certification": False}
        result = {"job": _deletion_job_payload(job)}
    else:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "unsupported_privacy_job_kind"})
    db.add(AuditLog(actor_id=admin.id, action=f"admin.privacy.{kind}.{action}", target_type=f"privacy_{kind}", target_id=str(job_id), redacted_payload=(payload.payload if payload else {})))
    db.commit()
    return result


@router.get("/admin/import-jobs")
def admin_import_jobs(admin=Depends(require_admin_role("content_editor")), db: Session = Depends(get_db)):
    exercise_count = db.query(Exercise).count()
    media_status = _exercise_media_admin_status(db)
    latest = db.query(AuditLog).filter(AuditLog.action.like("%import%")).order_by(desc(AuditLog.created_at)).limit(10).all()
    return {
        "items": [
            {"kind": "exercise_import", "status": "ready", "records_available": exercise_count},
            {"kind": "exercise_media", "status": media_status["status"], "records_available": media_status["hosted_https_rows"]},
        ],
        "media": media_status,
        "audit": [{"event": item.action, "redacted": True} for item in latest],
    }


@router.get("/admin/exercise-media")
def admin_exercise_media(admin=Depends(require_admin_roles("exercise_reviewer", "content_editor", "super_admin", required_label="exercise_media_access")), db: Session = Depends(get_db)):
    return _exercise_media_admin_status(db)


@router.get("/admin/notifications")
def admin_notifications(admin=Depends(require_admin_roles("analyst", "support", "super_admin", required_label="notification_access")), db: Session = Depends(get_db)):
    jobs = db.query(NotificationJob).order_by(desc(NotificationJob.created_at)).limit(50).all()
    return {"items": [_notification_job_payload(item) for item in jobs], "provider": "mock_or_local"}


@router.post("/admin/notifications/{job_id}/{action}")
def admin_notification_action(job_id: int, action: str, admin=Depends(require_admin_roles("analyst", "support", "super_admin", required_label="notification_action")), db: Session = Depends(get_db)):
    job = db.get(NotificationJob, job_id)
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "notification_job_not_found"})
    if action == "retry":
        job.status = "scheduled"
        job.retry_count += 1
    elif action == "cancel":
        if admin.role not in {"support", "super_admin"}:
            db.add(AuditLog(actor_id=admin.id, action="admin.notification.cancel.denied", target_type="notification_job", target_id=str(job.id), redacted_payload={"reason": "support_or_super_admin_required"}))
            db.commit()
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "support_or_super_admin_required"})
        job.status = "cancelled"
    else:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "unsupported_notification_action"})
    db.add(AuditLog(actor_id=admin.id, action=f"admin.notification.{action}", target_type="notification_job", target_id=str(job.id), redacted_payload={}))
    db.commit()
    return {"job": _notification_job_payload(job)}


@router.get("/admin/integrations")
def admin_integrations(admin=Depends(require_admin_role("analyst")), db: Session = Depends(get_db)):
    connections = db.query(ProviderConnection).order_by(desc(ProviderConnection.created_at)).limit(50).all()
    syncs = db.query(ProviderSyncRecord).order_by(desc(ProviderSyncRecord.created_at)).limit(50).all()
    return {
        "providers": [{"key": key, **value} for key, value in PROVIDER_REGISTRY.items()],
        "connections": [_provider_connection_payload(item) for item in connections],
        "syncs": [_provider_sync_payload(item) for item in syncs],
    }


@router.post("/admin/integrations/{connection_id}/{action}")
def admin_integration_action(connection_id: int, action: str, admin=Depends(require_admin_roles("analyst", "super_admin", required_label="integration_action")), db: Session = Depends(get_db)):
    connection = db.get(ProviderConnection, connection_id)
    if not connection:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "integration_connection_not_found"})
    if action in {"disable", "revoke"}:
        if admin.role != "super_admin":
            db.add(AuditLog(actor_id=admin.id, action=f"admin.integration.{action}.denied", target_type="provider_connection", target_id=str(connection.id), redacted_payload={"reason": "super_admin_required"}))
            db.commit()
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "super_admin_required"})
        connection.status = "disabled"
        connection.token_reference = None
    elif action == "retry-sync":
        db.add(ProviderSyncRecord(connection_id=connection.id, sync_type="admin_retry", status="completed", records_seen=0, duplicates_skipped=0, payload={"manual": True}))
    else:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "unsupported_integration_action"})
    db.add(AuditLog(actor_id=admin.id, action=f"admin.integration.{action}", target_type="provider_connection", target_id=str(connection.id), redacted_payload={}))
    db.commit()
    return {"connection": _provider_connection_payload(connection)}


@router.post("/admin/e2e-seed")
def admin_e2e_seed(admin=Depends(require_admin_role("super_admin")), db: Session = Depends(get_db)):
    if get_settings().environment.lower() == "production":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "seed_mode_disabled"})
    user = db.query(User).filter(User.email == "closed-beta-e2e@example.test").one_or_none()
    if not user:
        user = User(id="usr_closed_beta_e2e", email="closed-beta-e2e@example.test", password_hash=hash_password("MoveInRange1"), auth_provider="local", role="user")
        db.add(user)
        db.flush()
    for email, role in {
        "closed-beta-clinical@example.test": "clinical_reviewer",
        "closed-beta-exercise@example.test": "exercise_reviewer",
        "closed-beta-content@example.test": "content_editor",
        "closed-beta-support@example.test": "support",
        "closed-beta-analyst@example.test": "analyst",
    }.items():
        if not db.query(User).filter(User.email == email).one_or_none():
            db.add(User(id="adm_" + hashlib.sha256(email.encode()).hexdigest()[:16], email=email, password_hash=hash_password("MoveInRangeAdmin1"), auth_provider="local", role=role))
    exercise = db.get(Exercise, "exercise-closed-beta-admin-e2e")
    if not exercise:
        exercise = Exercise(
            id="exercise-closed-beta-admin-e2e",
            source_id="closed-beta-admin-e2e",
            slug="closed-beta-admin-e2e",
            name="000 Closed beta admin exercise",
            body_part="legs",
            equipment="chair",
            target="mobility",
            secondary_muscles=[],
            source_metadata={"category": "mobility", "position": "seated", "difficulty": "easy", "publish_state": "unpublished"},
        )
        db.add(exercise)
    else:
        exercise.name = "000 Closed beta admin exercise"
        exercise.body_part = "legs"
        exercise.equipment = "chair"
        exercise.target = "mobility"
        exercise.secondary_muscles = []
        exercise.source_metadata = {"category": "mobility", "position": "seated", "difficulty": "easy", "publish_state": "unpublished"}
    substitution = db.get(Exercise, "exercise-closed-beta-admin-substitution")
    if not substitution:
        substitution = Exercise(
            id="exercise-closed-beta-admin-substitution",
            source_id="closed-beta-admin-substitution",
            slug="closed-beta-admin-substitution",
            name="001 Closed beta substitution exercise",
            body_part="legs",
            equipment="chair",
            target="mobility",
            secondary_muscles=[],
            source_metadata={"category": "mobility", "position": "seated", "difficulty": "easy", "publish_state": "unpublished"},
        )
        db.add(substitution)
    else:
        substitution.name = "001 Closed beta substitution exercise"
        substitution.body_part = "legs"
        substitution.equipment = "chair"
        substitution.target = "mobility"
        substitution.secondary_muscles = []
        substitution.source_metadata = {"category": "mobility", "position": "seated", "difficulty": "easy", "publish_state": "unpublished"}
    for seeded in [exercise, substitution]:
        if not db.query(ExerciseLocalization).filter(ExerciseLocalization.exercise_id == seeded.id, ExerciseLocalization.locale == "en").one_or_none():
            db.add(ExerciseLocalization(exercise_id=seeded.id, locale="en", instructions="Move with control.", instruction_steps=["Move with control."]))
    media = MediaApproval(exercise_id=exercise.id, media_type="silhouette", license_state="internal", source="closed_beta_seed", status="pending", metadata_payload={})
    db.add(media)
    policy_version = "closed-beta-e2e-policy"
    if not db.query(PolicyVersion).filter(PolicyVersion.version == policy_version).one_or_none():
        db.add(PolicyVersion(version=policy_version, status="draft", rules={"closed_beta": True}, clinical_review_state="draft"))
    export = DataExportJob(user_id=user.id, status="queued", payload={"seed": True})
    deletion = DeletionJob(user_id=user.id, deletion_type="selected_health_data", status="requested", cancellation_deadline=datetime.now(UTC) + timedelta(days=7), payload={"seed": True})
    notification = NotificationJob(user_id=user.id, category="sync_failure", provider="local", scheduled_for=datetime.now(UTC), status="failed", payload={"seed": True})
    connection = ProviderConnection(user_id=user.id, provider_key="nightscout", category="cgm", status="sync_failed", scopes=["glucose:read"], token_reference="seed-token-ref")
    db.add_all([export, deletion, notification, connection])
    db.add(AuditLog(actor_id=admin.id, action="admin.e2e.seed", target_type="closed_beta", target_id=user.id, redacted_payload={"seed": True}))
    db.commit()
    return {"user_id": user.id, "policy_version": policy_version, "privacy_export_id": export.id, "deletion_id": deletion.id, "notification_id": notification.id, "connection_id": connection.id, "exercise_id": exercise.id, "substitution_id": substitution.id}


@router.get("/admin/audit")
def audit(admin=Depends(require_admin_role("support")), db: Session = Depends(get_db)):
    return audit_logs(admin, db)


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


def _show_reset_preview() -> bool:
    settings = get_settings()
    return settings.environment.lower() != "production" and settings.enable_development_reset_preview


def _password_reset_page_base() -> str:
    settings = get_settings()
    configured = (settings.password_reset_url_base or settings.product_web_base_url).rstrip("/")
    if configured.endswith("/auth/reset-password"):
        return configured
    return f"{configured}/auth/reset-password"


def _validate_password_strength(password: str) -> None:
    if len(password) < 10 or not any(ch.islower() for ch in password) or not any(ch.isupper() for ch in password) or not any(ch.isdigit() for ch in password):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "weak_password"})


def _password_reset_record(token: str, db: Session) -> PasswordResetToken:
    record = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash(token)).one_or_none()
    now = datetime.now(UTC)
    if not record:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "invalid_reset_token"})
    if record.used_at is not None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "used_reset_token"})
    if _as_utc(record.expires_at) < now:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "expired_reset_token"})
    return record


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
    user_id = records[0].user_id if records else None
    store = get_token_revocation_store()
    if isinstance(store, PostgresTokenRevocationStore):
        _record_postgres_revocation(db, "refresh_family", family_id, get_settings().refresh_token_days * 24 * 60 * 60, session_id=None, user_id=user_id, token_family_id=family_id, reason="refresh_family_revoked", actor_type="system", actor_id=user_id)
    else:
        store.revoke_refresh_family(family_id, get_settings().refresh_token_days * 24 * 60 * 60, user_id=user_id, reason="refresh_family_revoked", actor_type="system", actor_id=user_id)


def _revoke_user_refresh_tokens(user_id: str, db: Session) -> None:
    records = db.query(AuthRefreshToken).filter(AuthRefreshToken.user_id == user_id, AuthRefreshToken.revoked_at.is_(None)).all()
    for family_id in {record.family_id for record in records}:
        _revoke_refresh_family(family_id, db)


def _revoke_authorization_header(authorization: str | None) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        return
    token = authorization.removeprefix("Bearer ").strip()
    decoded = decode_token(token, "access")
    ttl = max(1, int(decoded.get("exp", 0)) - int(datetime.now(UTC).timestamp()))
    get_token_revocation_store().revoke_access_token(decoded["jti"], ttl, user_id=decoded.get("sub"), reason="logout", actor_type="user", actor_id=decoded.get("sub"))


def _record_postgres_revocation(
    db: Session,
    token_type: str,
    identifier: str,
    ttl_seconds: int,
    *,
    session_id: str | None,
    user_id: str | None,
    token_family_id: str | None,
    reason: str,
    actor_type: str,
    actor_id: str | None,
) -> None:
    now = datetime.now(UTC)
    expires_at = now + timedelta(seconds=max(1, ttl_seconds))
    identifier_hash = token_hash(identifier)
    existing = db.query(SessionRevocation).filter(SessionRevocation.token_type == token_type, SessionRevocation.token_identifier_hash == identifier_hash).one_or_none()
    if existing:
        existing.expires_at = max(_as_utc(existing.expires_at), expires_at)
        existing.reason = reason
        existing.actor_type = actor_type
        existing.actor_id = actor_id
        existing.metadata_redacted = {"token_material_stored": False}
    else:
        db.add(
            SessionRevocation(
                session_id=session_id,
                user_id=user_id,
                token_family_id=token_family_id,
                token_type=token_type,
                token_identifier_hash=identifier_hash,
                revoked_at=now,
                expires_at=expires_at,
                reason=reason,
                actor_type=actor_type,
                actor_id=actor_id,
                metadata_redacted={"token_material_stored": False},
            )
        )


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _rate_limit(key: str, limit: int) -> None:
    try:
        get_rate_limiter().check(key, limit)
    except RateLimitExceeded:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail={"code": "rate_limited"})


def _revocation_store_name(store: object) -> str:
    if isinstance(store, PostgresTokenRevocationStore):
        return "postgres"
    if isinstance(store, RedisTokenRevocationStore):
        return "redis"
    if isinstance(store, InMemoryTokenRevocationStore):
        return "development_in_memory"
    return "unknown"


def _user_payload(user: User) -> dict[str, Any]:
    return {"id": user.id, "email": user.email, "auth_provider": user.auth_provider, "role": user.role}


def _mask_email(email: str | None) -> str | None:
    if not email or "@" not in email:
        return email
    name, domain = email.split("@", 1)
    return f"{name[:2]}***@{domain}"


def _policy_payload(record: PolicyVersion, include_rules: bool = False) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": record.id,
        "version": record.version,
        "status": record.status,
        "clinical_review_state": record.clinical_review_state,
        "creator_id": record.creator_id,
        "submitter_id": record.submitter_id,
        "approver_id": record.approver_id,
        "publisher_id": record.publisher_id,
        "rollback_actor_id": record.rollback_actor_id,
        "submitted_at": record.submitted_at.isoformat() if record.submitted_at else None,
        "approved_at": record.approved_at.isoformat() if record.approved_at else None,
        "published_at": record.published_at.isoformat() if record.published_at else None,
        "rolled_back_at": record.rolled_back_at.isoformat() if record.rolled_back_at else None,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }
    if include_rules:
        payload["rules"] = record.rules or {}
    else:
        payload["rule_count"] = len(record.rules or {})
    return payload


def _admin_policy_lookup(policy_id: str, db: Session) -> PolicyVersion:
    query = db.query(PolicyVersion)
    policy = query.filter(PolicyVersion.version == policy_id).one_or_none()
    if not policy and policy_id.isdigit():
        policy = db.get(PolicyVersion, int(policy_id))
    if not policy:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "policy_not_found"})
    return policy


def _policy_approval_payload(record: PolicyApproval) -> dict[str, Any]:
    return {"id": record.id, "reviewer_id": record.reviewer_id, "decision": record.decision, "rationale": record.rationale, "created_at": record.created_at.isoformat() if record.created_at else None}


def _policy_action(policy_id: str, decision: str, rationale: str, admin: User, db: Session) -> dict[str, Any]:
    policy = _admin_policy_lookup(policy_id, db)
    if admin.role != "clinical_reviewer":
        db.add(AuditLog(actor_id=admin.id, action=f"admin.policy.{decision}.denied", target_type="policy", target_id=policy.version, redacted_payload={"reason": "clinical_reviewer_required"}))
        db.commit()
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "clinical_reviewer_required"})
    if policy.creator_id == admin.id:
        db.add(AuditLog(actor_id=admin.id, action=f"admin.policy.{decision}.denied", target_type="policy", target_id=policy.version, redacted_payload={"reason": "self_approval_blocked"}))
        db.commit()
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "self_approval_blocked"})
    policy.clinical_review_state = decision
    if decision == "approved":
        policy.approver_id = admin.id
        policy.approved_at = datetime.now(UTC)
    if decision == "rejected":
        policy.status = "changes_requested"
    approval = PolicyApproval(policy_version_id=policy.id, reviewer_id=admin.id, decision=decision, rationale=rationale)
    db.add(approval)
    db.add(AuditLog(actor_id=admin.id, action=f"admin.policy.{decision}", target_type="policy", target_id=policy.version, redacted_payload={"decision": decision}))
    db.commit()
    return {"policy": _policy_payload(policy, include_rules=True), "approval": _policy_approval_payload(approval)}


def _profile_admin_summary(profile: Profile | None) -> dict[str, Any]:
    if not profile:
        return {"present": False}
    health = profile.health_payload or {}
    return {
        "present": True,
        "preferred_name": profile.preferred_name,
        "locale": profile.locale,
        "timezone": profile.timezone,
        "onboarding_complete": profile.onboarding_complete,
        "conditions_count": len(health.get("conditions", [])),
        "sensitivities_count": len(health.get("sensitivities", {})),
        "equipment": health.get("equipment", []),
        "goals": health.get("goals", []),
        "diabetes_enabled": bool((health.get("diabetes") or {}).get("enabled")),
    }


def _exercise_tag_payload(record: ExerciseTag) -> dict[str, Any]:
    return {"id": record.id, "classifier_version": record.classifier_version, "tags": record.tags, "provenance": record.provenance, "confidence": record.confidence, "manual_review_status": record.manual_review_status}


def _system_incident_payload(record: SystemIncident) -> dict[str, Any]:
    return {"id": record.id, "incident_type": record.incident_type, "severity": record.severity, "status": record.status, "redacted_payload": record.redacted_payload}


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


def _privacy_export_archive(user: User, db: Session) -> dict[str, Any]:
    profile = db.query(Profile).filter(Profile.user_id == user.id).one_or_none()
    return {
        "manifest": {
            "schema": "moveinrange.privacy-export.v1",
            "generated_at": datetime.now(UTC).isoformat(),
            "user_id": user.id,
            "contains": [
                "account",
                "profile",
                "onboarding",
                "readiness",
                "plans",
                "sessions",
                "feedback",
                "diabetes",
                "consents",
                "relationships",
                "provider_metadata",
                "calendar",
                "notifications",
            ],
            "secrets_included": False,
            "machine_readable": True,
        },
        "account": _user_payload(user),
        "profile": _profile_payload(user, profile)["profile"] if profile else None,
        "onboarding": [_onboarding_payload(item) for item in db.query(OnboardingProgress).filter(OnboardingProgress.user_id == user.id).all()],
        "readiness": [_readiness_payload(item) for item in db.query(ReadinessCheck).filter(ReadinessCheck.user_id == user.id).order_by(ReadinessCheck.created_at).all()],
        "plans": [
            {"id": item.id, "plan_type": item.plan_type, "status": item.status, "safety_action": item.safety_action, "payload": item.payload}
            for item in db.query(Plan).filter(Plan.user_id == user.id).order_by(Plan.created_at).all()
        ],
        "sessions": [_session_payload(item) for item in db.query(SessionRecord).filter(SessionRecord.user_id == user.id).order_by(SessionRecord.created_at).all()],
        "session_events": [_event_payload(item) for item in db.query(SessionEvent).filter(SessionEvent.user_id == user.id).order_by(SessionEvent.created_at).all()],
        "feedback": [_feedback_payload(item) for item in db.query(ExerciseFeedback).filter(ExerciseFeedback.user_id == user.id).order_by(ExerciseFeedback.created_at).all()],
        "diabetes": [_diabetes_context_payload(item) for item in db.query(DiabetesContextEntry).filter(DiabetesContextEntry.user_id == user.id).order_by(DiabetesContextEntry.created_at).all()],
        "glucose": [_glucose_payload(item) for item in db.query(GlucoseEntry).filter(GlucoseEntry.user_id == user.id).order_by(GlucoseEntry.created_at).all()],
        "consents": [_consent_payload(item) for item in db.query(ConsentRecord).filter(ConsentRecord.user_id == user.id).order_by(ConsentRecord.created_at).all()],
        "relationships": {
            "caregivers": [_caregiver_payload(item) for item in db.query(CaregiverRelationship).filter(CaregiverRelationship.user_id == user.id).all()],
            "professionals": [_professional_payload(item) for item in db.query(ProfessionalRelationship).filter(ProfessionalRelationship.user_id == user.id).all()],
        },
        "provider_metadata": [_provider_connection_payload(item) for item in db.query(ProviderConnection).filter(ProviderConnection.user_id == user.id).all()],
        "calendar": [_calendar_event_payload(item) for item in db.query(CalendarEvent).filter(CalendarEvent.user_id == user.id).order_by(CalendarEvent.event_date).all()],
        "notifications": {
            "preferences": [_notification_preference_payload(item) for item in db.query(NotificationPreference).filter(NotificationPreference.user_id == user.id).all()],
            "jobs": [_notification_job_payload(item) for item in db.query(NotificationJob).filter(NotificationJob.user_id == user.id).all()],
        },
    }


def _process_deletion_job(job: DeletionJob, db: Session) -> dict[str, int]:
    if job.deletion_type != "selected_health_data":
        return {}
    user_id = job.user_id
    counts = {
        "glucose": db.query(GlucoseEntry).filter(GlucoseEntry.user_id == user_id).delete(synchronize_session=False),
        "diabetes": db.query(DiabetesContextEntry).filter(DiabetesContextEntry.user_id == user_id).delete(synchronize_session=False),
        "exercise_feedback": db.query(ExerciseFeedback).filter(ExerciseFeedback.user_id == user_id).delete(synchronize_session=False),
        "wearable_samples": db.query(WearableSample).filter(WearableSample.user_id == user_id).delete(synchronize_session=False),
        "camera_analysis": db.query(CameraAnalysisSession).filter(CameraAnalysisSession.user_id == user_id).delete(synchronize_session=False),
    }
    profile = db.query(Profile).filter(Profile.user_id == user_id).one_or_none()
    if profile:
        health = dict(profile.health_payload or {})
        for key in ["conditions", "sensitivities", "injuries", "diabetes", "mobility_aids"]:
            health.pop(key, None)
        profile.health_payload = health
        counts["profile_health_fields"] = 1
    active_sessions = db.query(AuthRefreshToken).filter(AuthRefreshToken.user_id == user_id, AuthRefreshToken.revoked_at.is_(None)).count()
    _revoke_user_refresh_tokens(user_id, db)
    counts["sessions_revoked"] = active_sessions
    return counts


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
    payload = dict(record.payload or {})
    payload.pop("archive", None)
    return {
        "id": record.id,
        "status": record.status,
        "archive_format": record.archive_format,
        "download_available": bool(record.download_token_hash),
        "payload": payload,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


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


def _required_text(value: str | None, code: str) -> str:
    text_value = str(value or "").strip()
    if not text_value:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": code})
    return text_value


def _clean_text_list(values: list[str]) -> list[str]:
    return [str(value).strip() for value in values if str(value).strip()]


def _required_text_list(values: list[str], code: str) -> list[str]:
    cleaned = _clean_text_list(values)
    if not cleaned:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": code})
    return cleaned


def _exercise_publication_preconditions(exercise: Exercise, db: Session) -> dict[str, Any]:
    metadata = exercise.source_metadata or {}
    localized = db.query(ExerciseLocalization).filter(ExerciseLocalization.exercise_id == exercise.id, ExerciseLocalization.locale == "tr").one_or_none()
    safety_review_complete = metadata.get("review_status") == "approved" and bool(metadata.get("safety_reviewed_by"))
    localized_content_complete = bool(str(metadata.get("tr_title") or "").strip()) and bool(localized and _clean_text_list(localized.instruction_steps or []))
    return {
        "eligible": safety_review_complete and localized_content_complete,
        "safety_review_complete": safety_review_complete,
        "localized_content_complete": localized_content_complete,
    }


def _exercise_filter_options(db: Session) -> dict[str, list[str]]:
    exercises = db.query(Exercise).all()
    return {
        "body_part": sorted({item.body_part for item in exercises if item.body_part}),
        "category": sorted({str((item.source_metadata or {}).get("category") or item.body_part).strip().lower() for item in exercises if item.body_part or (item.source_metadata or {}).get("category")}),
        "equipment": sorted({item.equipment for item in exercises if item.equipment}),
        "target": sorted({item.target for item in exercises if item.target}),
        "position": sorted({_position_for_exercise(item) for item in exercises}),
        "difficulty": sorted({_difficulty_for_exercise(item) for item in exercises}),
        "impact": sorted({_impact_for_exercise(item) for item in exercises}),
        "movement_type": sorted({_section_for_exercise(item) for item in exercises}),
        "tags": _exercise_taxonomy_items(db, "tags"),
    }


def _exercise_taxonomy_items(db: Session, kind: str) -> list[str]:
    exercises = db.query(Exercise).all()
    if kind == "body_part":
        return sorted({item.body_part for item in exercises if item.body_part})
    if kind == "category":
        return sorted({str((item.source_metadata or {}).get("category") or item.body_part).strip().lower() for item in exercises if item.body_part or (item.source_metadata or {}).get("category")})
    if kind == "equipment":
        return sorted({item.equipment for item in exercises if item.equipment})
    if kind == "target":
        return sorted({item.target for item in exercises if item.target})
    if kind == "movement_type":
        return sorted({_section_for_exercise(item) for item in exercises})
    if kind == "tags":
        values: set[str] = set()
        for tag in db.query(ExerciseTag).all():
            payload = tag.tags or {}
            for value in payload.values():
                if isinstance(value, str):
                    values.add(value.strip().lower())
                elif isinstance(value, list):
                    values.update(str(item).strip().lower() for item in value if str(item).strip())
        return sorted(values)
    return []


def _exercise_media_admin_status(db: Session) -> dict[str, Any]:
    media_rows = db.query(ExerciseMedia).count()
    hosted_https_rows = (
        db.query(ExerciseMedia)
        .filter(ExerciseMedia.image_path.like("https://%"), ExerciseMedia.gif_path.like("https://%"))
        .count()
    )
    playable_rows = (
        db.query(ExerciseMedia)
        .filter(ExerciseMedia.license_status.in_(["available", "approved"]))
        .filter(or_(ExerciseMedia.image_path.like("https://%"), ExerciseMedia.gif_path.like("https://%")))
        .count()
    )
    missing_media_rows = (
        db.query(ExerciseMedia)
        .filter(or_(ExerciseMedia.image_path == "", ExerciseMedia.gif_path == "", ExerciseMedia.image_path.is_(None), ExerciseMedia.gif_path.is_(None)))
        .count()
    )
    local_path_rows = (
        db.query(ExerciseMedia)
        .filter(or_(ExerciseMedia.image_path.like("file:%"), ExerciseMedia.gif_path.like("file:%"), ExerciseMedia.image_path.like("C:%"), ExerciseMedia.gif_path.like("C:%")))
        .count()
    )
    storage_objects: dict[str, Any] = {"available": False}
    try:
        row = db.execute(
            text(
                """
                select
                  count(*) filter (where bucket_id='exercise-media' and name like 'v1/images/%') as image_objects,
                  count(*) filter (where bucket_id='exercise-media' and name like 'v1/videos/%') as gif_objects,
                  count(*) filter (where bucket_id='exercise-media') as total_objects,
                  coalesce(sum((metadata->>'size')::bigint) filter (where bucket_id='exercise-media'), 0) as total_bytes
                from storage.objects
                """
            )
        ).mappings().one()
        storage_objects = {"available": True, **dict(row)}
    except SQLAlchemyError:
        storage_objects = {"available": False}
    return {
        "status": "ready" if media_rows and hosted_https_rows == media_rows and playable_rows == media_rows and local_path_rows == 0 else "attention_required",
        "media_rows": media_rows,
        "hosted_https_rows": hosted_https_rows,
        "playable_rows": playable_rows,
        "missing_media_rows": missing_media_rows,
        "local_path_rows": local_path_rows,
        "bucket": "exercise-media",
        "object_prefix": "v1",
        "storage_objects": storage_objects,
    }


def _exercise_list_payload(items: list[Exercise], db: Session, language: str, user_id: str | None = None) -> list[dict[str, Any]]:
    exercise_ids = [item.id for item in items]
    if not exercise_ids:
        return []
    media_by_exercise = {
        media.exercise_id: media
        for media in db.query(ExerciseMedia).filter(ExerciseMedia.exercise_id.in_(exercise_ids)).all()
    }
    localizations_by_exercise: dict[str, list[ExerciseLocalization]] = {exercise_id: [] for exercise_id in exercise_ids}
    for localization in db.query(ExerciseLocalization).filter(ExerciseLocalization.exercise_id.in_(exercise_ids)).all():
        localizations_by_exercise.setdefault(localization.exercise_id, []).append(localization)
    favorite_ids: set[str] = set()
    if user_id:
        favorite_ids = {
            row[0]
            for row in db.query(FavoriteExercise.exercise_id)
            .filter(FavoriteExercise.user_id == user_id, FavoriteExercise.exercise_id.in_(exercise_ids))
            .all()
        }
    return [
        _exercise_brief_payload(
            item,
            language=language,
            media=media_by_exercise.get(item.id),
            localizations=localizations_by_exercise.get(item.id, []),
            favorited=item.id in favorite_ids,
        )
        for item in items
    ]


def _related_exercises(exercise: Exercise, db: Session, language: str, user_id: str | None = None) -> list[dict[str, Any]]:
    candidates = (
        db.query(Exercise)
        .filter(Exercise.id != exercise.id)
        .filter(or_(Exercise.target == exercise.target, Exercise.body_part == exercise.body_part))
        .limit(80)
        .all()
    )

    def score(candidate: Exercise) -> tuple[int, str]:
        value = 0
        if candidate.target == exercise.target:
            value += 40
        if candidate.body_part == exercise.body_part:
            value += 25
        if candidate.equipment == exercise.equipment:
            value += 15
        if _position_for_exercise(candidate) == _position_for_exercise(exercise):
            value += 10
        if _difficulty_for_exercise(candidate) == _difficulty_for_exercise(exercise):
            value += 5
        if _impact_for_exercise(candidate) == _impact_for_exercise(exercise):
            value += 5
        return (-value, candidate.name)

    ranked = sorted(candidates, key=score)[:8]
    return _exercise_list_payload(ranked, db, language, user_id)


def _exercise_payload(exercise: Exercise, db: Session, language: str, brief: bool = False, user: User | None = None) -> dict[str, Any]:
    localizations = db.query(ExerciseLocalization).filter(ExerciseLocalization.exercise_id == exercise.id).all()
    media = db.query(ExerciseMedia).filter(ExerciseMedia.exercise_id == exercise.id).one_or_none()
    tag = db.query(ExerciseTag).filter(ExerciseTag.exercise_id == exercise.id).order_by(desc(ExerciseTag.created_at)).first()
    favorited = False
    if user:
        favorited = db.query(FavoriteExercise).filter(FavoriteExercise.user_id == user.id, FavoriteExercise.exercise_id == exercise.id).one_or_none() is not None
    instructions = {loc.locale: loc.instructions for loc in localizations}
    steps = {loc.locale: loc.instruction_steps for loc in localizations}
    selected_locale = language if language in instructions else "en"
    localized_name = (exercise.source_metadata or {}).get("tr_title") if selected_locale == "tr" else None
    payload = {
        "id": exercise.id,
        "slug": exercise.slug,
        "name": localized_name or exercise.name,
        "body_part": exercise.body_part,
        "equipment": exercise.equipment,
        "target": exercise.target,
        "secondary_muscles": exercise.secondary_muscles or [],
        "instruction": instructions.get(selected_locale) or instructions.get("en") or "",
        "instruction_steps": steps.get(selected_locale) or steps.get("en") or [],
        "locales": sorted(instructions),
        "derived_tags": tag.tags if tag else {},
        "safety_notes": ["Use a comfortable range and stop for concerning symptoms or increasing pain."],
        "favorited": favorited,
        "recent_state": {"viewed": bool(user)},
        "media": _exercise_media_payload(media),
    }
    if not brief:
        payload["related_exercises"] = _related_exercises(exercise, db, language, user.id if user else None)
        payload["safe_alternatives_label"] = "Related movements"
    return payload


def _exercise_media_payload(media: ExerciseMedia | None) -> dict[str, Any]:
    license_status = media.license_status if media else "missing"
    image = media.image_path if media else ""
    gif = media.gif_path if media else ""
    image_url = image if image.startswith("https://") else ""
    gif_url = gif if gif.startswith("https://") else ""
    approved = license_status in {"approved", "available"} and bool(image_url or gif_url)
    playable_type = "gif" if approved and gif else "image" if approved and image else "internal_fallback"
    status_value = "available" if approved else "review_required" if media else "missing"
    return {
        "thumbnail_url": image_url,
        "gif_url": gif_url,
        "media_type": "gif" if gif_url else "image" if image_url else "fallback",
        "status": status_value,
        "width": 180 if approved else 0,
        "height": 180 if approved else 0,
        "version": "v1",
        "image": image_url,
        "gif": gif_url,
        "raw_image_path_present": bool(image),
        "raw_gif_path_present": bool(gif),
        "mp4": "",
        "thumbnail": image_url,
        "media_id": media.media_id if media else "",
        "attribution": media.attribution if media else "",
        "license_status": license_status,
        "playable": approved and bool(gif_url or image_url),
        "playable_type": playable_type,
        "fallback_type": "internal_motion" if not approved else None,
        "validation_state": "approved" if approved else "requires_review",
    }


def _section_for_exercise(exercise: Exercise) -> str:
    target = f"{exercise.body_part} {exercise.target}".lower()
    if any(value in target for value in ["cardio", "cardiovascular"]):
        return "cardio"
    if any(value in target for value in ["calves", "forearms", "biceps", "triceps", "pectorals", "lats", "quads", "glutes", "hamstrings"]):
        return "strength"
    if any(value in target for value in ["abs", "waist", "spine", "back"]):
        return "mobility"
    return "mobility"


def _position_for_exercise(exercise: Exercise) -> str:
    text = f"{exercise.name} {exercise.slug}".lower()
    if any(value in text for value in ["seated", "chair"]):
        return "seated"
    if any(value in text for value in ["lying", "floor", "prone", "supine"]):
        return "floor"
    if any(value in text for value in ["kneeling"]):
        return "kneeling"
    if any(value in text for value in ["wall", "supported"]):
        return "supported"
    return "standing"


def _difficulty_for_exercise(exercise: Exercise) -> str:
    equipment = exercise.equipment.lower()
    text = f"{exercise.name} {exercise.target}".lower()
    if any(value in equipment for value in ["barbell", "sled", "smith", "machine"]) or any(value in text for value in ["jump", "lever", "clean"]):
        return "advanced"
    if any(value in equipment for value in ["dumbbell", "kettlebell", "band", "cable"]):
        return "moderate"
    return "gentle"


def _impact_for_exercise(exercise: Exercise) -> str:
    text = f"{exercise.name} {exercise.slug}".lower()
    if any(value in text for value in ["jump", "hop", "burpee", "sprint"]):
        return "high"
    if any(value in text for value in ["run", "lunge", "squat"]):
        return "moderate"
    return "low"


def _plan_item_payload(exercise: Exercise, db: Session, language: str, block: str, duration_seconds: int, rest_seconds: int, index: int, approved_substitutions: list[str] | None = None) -> dict[str, Any]:
    brief = _exercise_brief_payload(exercise, db, language)
    return {
        "exercise_id": brief["id"],
        "source_id": brief["source_id"],
        "name": brief["name"],
        "description": brief["instruction"],
        "section": block,
        "block": block,
        "category": brief["category"],
        "targets": [brief["target"]],
        "muscles": [brief["target"], *brief["secondary_muscles"]],
        "equipment": brief["equipment"],
        "position": brief["position"],
        "difficulty": brief["difficulty"],
        "impact": brief["impact"],
        "unilateral": brief["unilateral"],
        "side_switch": brief["side_switch"],
        "preparation_seconds": brief["preparation_seconds"],
        "duration_seconds": duration_seconds,
        "work_seconds": duration_seconds,
        "rest_seconds": rest_seconds,
        "sets": 1 if block in {"warmup", "cooldown", "recovery"} else brief["sets"],
        "reps": None if block in {"cardio", "recovery"} else brief["reps"],
        "tempo": brief["tempo"],
        "instructions": brief["instruction_steps"],
        "breathing_cue": brief["breathing_cue"],
        "mistakes": brief["mistakes"],
        "safety_notes": brief["safety_notes"],
        "contraindication_tags": brief["contraindication_tags"],
        "approved_substitutions": approved_substitutions
        if approved_substitutions is not None
        else [item.id for item in db.query(Exercise).filter(Exercise.id != exercise.id, Exercise.equipment == exercise.equipment, Exercise.body_part == exercise.body_part).limit(3).all()],
        "media": brief["media"],
        "availability": "playable" if brief["media"]["playable"] else "fallback",
        "validation_state": brief["media"]["validation_state"],
        "order": index + 1,
    }


def _exercise_brief_payload(
    exercise: Exercise,
    db: Session | None = None,
    language: str = "en",
    media: ExerciseMedia | None = None,
    localizations: list[ExerciseLocalization] | None = None,
    favorited: bool = False,
) -> dict[str, Any]:
    media = media if media is not None else db.query(ExerciseMedia).filter(ExerciseMedia.exercise_id == exercise.id).one_or_none() if db else None
    localizations = localizations if localizations is not None else db.query(ExerciseLocalization).filter(ExerciseLocalization.exercise_id == exercise.id).all() if db else []
    instructions = {loc.locale: loc.instructions for loc in localizations}
    steps = {loc.locale: loc.instruction_steps for loc in localizations}
    selected_locale = language if language in instructions else "en"
    metadata = exercise.source_metadata or {}
    localized_name = metadata.get("tr_title") if selected_locale == "tr" else None
    return {
        "id": exercise.id,
        "slug": exercise.slug,
        "source_id": exercise.source_id,
        "name": localized_name or exercise.name,
        "body_part": exercise.body_part,
        "equipment": exercise.equipment,
        "target": exercise.target,
        "secondary_muscles": exercise.secondary_muscles or [],
        "instruction": instructions.get(selected_locale) or instructions.get("en") or "",
        "instruction_steps": steps.get(selected_locale) or steps.get("en") or [],
        "section": metadata.get("section") or _section_for_exercise(exercise),
        "category": metadata.get("category") or exercise.body_part,
        "position": metadata.get("position") or _position_for_exercise(exercise),
        "difficulty": metadata.get("difficulty") or _difficulty_for_exercise(exercise),
        "impact": metadata.get("impact") or _impact_for_exercise(exercise),
        "unilateral": bool(metadata.get("unilateral", False)),
        "side_switch": bool(metadata.get("side_switch", False)),
        "work_seconds": int(metadata.get("work_seconds") or 35),
        "rest_seconds": int(metadata.get("rest_seconds") or 20),
        "preparation_seconds": int(metadata.get("preparation_seconds") or 5),
        "sets": int(metadata.get("sets") or 1),
        "reps": metadata.get("reps") or 8,
        "tempo": metadata.get("tempo") or "controlled",
        "breathing_cue": metadata.get("breathing_cue") or "Breathe steadily and avoid holding your breath.",
        "mistakes": metadata.get("mistakes") or ["Moving too fast", "Holding your breath", "Ignoring increasing pain"],
        "safety_notes": ["Use a comfortable range and stop for concerning symptoms or increasing pain."],
        "contraindication_tags": metadata.get("contraindication_tags") or [],
        "media": _exercise_media_payload(media),
        "favorited": favorited,
    }


def _record_recent(user_id: str, exercise_id: str, db: Session) -> None:
    db.add(AuditLog(actor_id=user_id, action="exercise.view", target_type="exercise", target_id=exercise_id, redacted_payload={}))


def _latest_or_default_readiness(user_id: str, db: Session) -> ReadinessPayload:
    latest = db.query(ReadinessCheck).filter(ReadinessCheck.user_id == user_id).order_by(desc(ReadinessCheck.created_at)).first()
    if latest:
        return ReadinessPayload(**latest.payload)
    return ReadinessPayload(energy=3, sleep_quality=3, pain=1, available_minutes=15)


SESSION_BLOCKS: dict[str, list[str]] = {
    "daily": ["warmup", "mobility", "main", "cooldown"],
    "mobility": ["warmup", "mobility", "balance", "cooldown"],
    "upper_body": ["warmup", "upper_body", "main", "cooldown"],
    "lower_body": ["warmup", "lower_body", "balance", "cooldown"],
    "balance": ["warmup", "balance", "core", "cooldown"],
    "conditioning": ["warmup", "cardio", "main", "cooldown"],
    "core": ["warmup", "core", "mobility", "cooldown"],
    "recovery": ["warmup", "mobility", "recovery", "cooldown"],
}


def _stable_plan_int(*parts: Any) -> int:
    source = "|".join(str(part) for part in parts)
    return int(hashlib.sha256(source.encode("utf-8")).hexdigest()[:16], 16)


def _plan_items_signature(items: list[dict[str, Any]], session_type: str) -> str:
    normalized = [
        {
            "exercise_id": item.get("exercise_id"),
            "order": item.get("order"),
            "sets": item.get("sets"),
            "reps": item.get("reps"),
            "work_seconds": item.get("work_seconds"),
            "rest_seconds": item.get("rest_seconds"),
        }
        for item in items
    ]
    return hashlib.sha256(json.dumps({"session_type": session_type, "items": normalized}, sort_keys=True).encode("utf-8")).hexdigest()


def _exercise_focus_score(exercise: Exercise, session_type: str, block: str) -> int:
    body_part = (exercise.body_part or "").lower()
    target = (exercise.target or "").lower()
    equipment = (exercise.equipment or "").lower()
    metadata = exercise.source_metadata or {}
    category = str(metadata.get("category") or "").lower()
    section = str(metadata.get("section") or "").lower()
    haystack = " ".join([body_part, target, equipment, category, section, exercise.name.lower()])
    score = 0
    if block in {"warmup", "cooldown", "recovery", "mobility"} and any(term in haystack for term in ["mobility", "stretch", "warm", "recovery", "body weight", "chair"]):
        score += 35
    if block == "cardio" and any(term in haystack for term in ["cardio", "march", "step", "jump", "run", "bike"]):
        score += 35
    if block in {"main", "upper_body"} and any(term in haystack for term in ["chest", "back", "shoulder", "arm", "biceps", "triceps"]):
        score += 30
    if block in {"main", "lower_body"} and any(term in haystack for term in ["leg", "quad", "glute", "hamstring", "calf", "hip"]):
        score += 30
    if block in {"core", "balance"} and any(term in haystack for term in ["core", "abs", "waist", "balance"]):
        score += 30
    if session_type in haystack:
        score += 15
    if equipment in {"body weight", "chair", "wall"}:
        score += 8
    if str(metadata.get("media_status") or "").lower() == "available":
        score += 8
    return score


def _allowed_equipment_for_user(user_id: str, db: Session) -> set[str]:
    profile = _profile_for(user_id, db)
    payload = profile.health_payload or {}
    equipment = payload.get("equipment") or payload.get("available_equipment") or []
    if isinstance(equipment, str):
        equipment = [equipment]
    normalized = {str(item).strip().lower() for item in equipment if str(item).strip()}
    return normalized | {"body weight", "bodyweight", "none"}


def _plan_exercise_pool(user_id: str, readiness: dict[str, Any], decision: dict[str, Any], db: Session, allowed_equipment: set[str] | None = None) -> list[Exercise]:
    query = db.query(Exercise)
    if decision["action"] in {"LOW_INTENSITY_ONLY", "DELAY_AND_RECHECK", "READY_WITH_MODIFICATIONS"} or readiness.get("pain", 0) >= 5:
        query = query.filter(or_(Exercise.equipment == "body weight", Exercise.equipment == "chair", Exercise.equipment == "wall"))
    exercises = query.all()
    allowed = allowed_equipment if allowed_equipment is not None else _allowed_equipment_for_user(user_id, db)
    if allowed:
        equipment_filtered = [
            exercise
            for exercise in exercises
            if (exercise.equipment or "").strip().lower() in allowed or (exercise.equipment or "").strip().lower() in {"body weight", "bodyweight", "none"}
        ]
        if len(equipment_filtered) >= 4:
            exercises = equipment_filtered
    return exercises or _fallback_exercises(db)


def _select_plan_exercises(
    user_id: str,
    readiness: dict[str, Any],
    decision: dict[str, Any],
    db: Session,
    *,
    plan_date: str,
    session_type: str,
    day_index: int,
    week_index: int,
    explicit_seed: str | None,
    avoid_primary_ids: set[str] | None,
    exercise_pool: list[Exercise] | None,
    allowed_equipment: set[str] | None,
    attempt: int,
    count: int,
) -> list[Exercise]:
    exercises = exercise_pool or _plan_exercise_pool(user_id, readiness, decision, db, allowed_equipment)
    seed = explicit_seed or f"{user_id}:{plan_date}:{session_type}:{week_index}:{day_index}:{attempt}"
    blocks = SESSION_BLOCKS.get(session_type, SESSION_BLOCKS["daily"])
    selected: list[Exercise] = []
    avoid_primary_ids = avoid_primary_ids or set()
    for block in blocks[:count]:
        candidates = [exercise for exercise in exercises if exercise.id not in {item.id for item in selected}]
        if not candidates:
            break
        if not selected and avoid_primary_ids and len(candidates) > 1:
            candidates = [exercise for exercise in candidates if exercise.id not in avoid_primary_ids] or candidates
        ranked = sorted(
            candidates,
            key=lambda exercise: (
                -_exercise_focus_score(exercise, session_type, block),
                _stable_plan_int(seed, block, exercise.id),
                exercise.id,
            ),
        )
        selected.append(ranked[0])
    if len(selected) < count:
        for exercise in sorted(exercises, key=lambda item: (_stable_plan_int(seed, "fill", item.id), item.id)):
            if exercise.id not in {item.id for item in selected}:
                selected.append(exercise)
            if len(selected) >= count:
                break
    return selected[:count] or _fallback_exercises(db)[:count]


def _daily_plan_payload(
    user_id: str,
    readiness: dict[str, Any],
    decision: dict[str, Any],
    db: Session,
    *,
    plan_date: str | None = None,
    session_type: str = "daily",
    day_index: int = 0,
    week_index: int = 0,
    explicit_seed: str | None = None,
    avoid_signatures: set[str] | None = None,
    avoid_primary_ids: set[str] | None = None,
    exercise_pool: list[Exercise] | None = None,
    allowed_equipment: set[str] | None = None,
) -> dict[str, Any]:
    plan_date = plan_date or datetime.now(UTC).date().isoformat()
    minutes = min([5, 10, 15, 20, 30, 45, 60], key=lambda value: abs(value - readiness.get("available_minutes", 15)))
    if week_index == 2 and decision["action"] == "READY":
        minutes = min(60, minutes + 5)
    elif week_index == 3:
        minutes = max(5, minutes - 5)
    total_seconds = minutes * 60
    base_items = []
    blocks = SESSION_BLOCKS.get(session_type, SESSION_BLOCKS["daily"])
    for attempt in range(0, 8):
        exercises = _select_plan_exercises(
            user_id,
            readiness,
            decision,
            db,
            plan_date=plan_date,
            session_type=session_type,
            day_index=day_index,
            week_index=week_index,
            explicit_seed=explicit_seed,
            avoid_primary_ids=avoid_primary_ids,
            exercise_pool=exercise_pool,
            allowed_equipment=allowed_equipment,
            attempt=attempt,
            count=4,
        )
        base_items = []
        for index, exercise in enumerate(exercises[:4]):
            block = blocks[min(index, len(blocks) - 1)]
            substitutions = [
                candidate.id
                for candidate in exercises
                if candidate.id != exercise.id and candidate.equipment == exercise.equipment and candidate.body_part == exercise.body_part
            ][:3]
            item = _plan_item_payload(exercise, db, "en", block, total_seconds // 4, 20 if index in {0, 3} else 30, index, substitutions)
            item["id"] = "item_" + hashlib.sha256(f"{user_id}:{plan_date}:{session_type}:{week_index}:{day_index}:{index}:{exercise.id}".encode("utf-8")).hexdigest()[:16]
            item["plan_item_id"] = item["id"]
            item["session_date"] = plan_date
            item["session_type"] = session_type
            base_items.append(item)
        if not avoid_signatures or _plan_items_signature(base_items, session_type) not in avoid_signatures:
            break
    if not base_items:
        exercises = _fallback_exercises(db)
        for index, exercise in enumerate(exercises[:4]):
            block = blocks[min(index, len(blocks) - 1)]
            item = _plan_item_payload(exercise, db, "en", block, total_seconds // 4, 20 if index in {0, 3} else 30, index)
            item["id"] = "item_" + hashlib.sha256(f"{user_id}:{plan_date}:{session_type}:{week_index}:{day_index}:{index}:{exercise.id}".encode("utf-8")).hexdigest()[:16]
            item["plan_item_id"] = item["id"]
            item["session_date"] = plan_date
            item["session_type"] = session_type
            base_items.append(item)
    base_items[-1]["duration_seconds"] += total_seconds - sum(item["duration_seconds"] for item in base_items)
    base_items[-1]["work_seconds"] = base_items[-1]["duration_seconds"]
    plan_id = "day_" + secrets.token_hex(8)
    session_id = "session_" + hashlib.sha256(f"{plan_id}:{plan_date}:{session_type}".encode("utf-8")).hexdigest()[:16]
    return {
        "id": plan_id,
        "user_id": user_id,
        "date": plan_date,
        "day_index": day_index,
        "week_index": week_index,
        "session_id": session_id,
        "session_type": session_type,
        "title": f"{session_type.replace('_', ' ').title()} movement",
        "total_minutes": minutes,
        "total_duration": minutes,
        "total_seconds": total_seconds,
        "intensity": "low" if decision["action"] != "READY" else "moderate",
        "phase": "adaptation",
        "sections": sorted({item["section"] for item in base_items}),
        "movement_count": len(base_items),
        "media_summary": {
            "playable": sum(1 for item in base_items if item["media"]["playable"]),
            "fallback": sum(1 for item in base_items if not item["media"]["playable"]),
        },
        "actions": ["start", "make_easier", "shorten", "replace_movement", "regenerate_safely", "view_details", "postpone", "mark_unavailable"],
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


def _latest_plan_by_generation_key(user_id: str, plan_type: str, generation_request_id: str, db: Session) -> Plan | None:
    if not generation_request_id:
        return None
    recent = db.query(Plan).filter(Plan.user_id == user_id, Plan.plan_type == plan_type).order_by(desc(Plan.created_at)).limit(30).all()
    return next((plan for plan in recent if (plan.payload or {}).get("generation_request_id") == generation_request_id), None)


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
