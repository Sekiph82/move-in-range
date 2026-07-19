from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base, TimestampMixin

class User(TimestampMixin, Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str | None] = mapped_column(String(320), unique=True, index=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(256), nullable=True)
    auth_provider: Mapped[str] = mapped_column(String(32), default="local")
    role: Mapped[str] = mapped_column(String(40), default="user")
    refresh_token_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    deleted_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

class AuthRefreshToken(TimestampMixin, Base):
    __tablename__ = "auth_refresh_tokens"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    family_id: Mapped[str] = mapped_column(String(64), index=True)
    token_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    session_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    issued_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), index=True)
    rotated_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    replacement_token_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

class Profile(TimestampMixin, Base):
    __tablename__ = "profiles"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    preferred_name: Mapped[str] = mapped_column(String(120))
    locale: Mapped[str] = mapped_column(String(8), default="en")
    timezone: Mapped[str] = mapped_column(String(80))
    health_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False)

class Exercise(TimestampMixin, Base):
    __tablename__ = "exercises"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    source_id: Mapped[str] = mapped_column(String(64), unique=True)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(240), index=True)
    body_part: Mapped[str] = mapped_column(String(80), index=True)
    equipment: Mapped[str] = mapped_column(String(120), index=True)
    target: Mapped[str] = mapped_column(String(120), index=True)
    secondary_muscles: Mapped[list] = mapped_column(JSON, default=list)
    source_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

class ExerciseLocalization(TimestampMixin, Base):
    __tablename__ = "exercise_localizations"
    id: Mapped[int] = mapped_column(primary_key=True)
    exercise_id: Mapped[str] = mapped_column(ForeignKey("exercises.id"), index=True)
    locale: Mapped[str] = mapped_column(String(8))
    instructions: Mapped[str] = mapped_column(Text)
    instruction_steps: Mapped[list] = mapped_column(JSON, default=list)
    __table_args__ = (UniqueConstraint("exercise_id", "locale"),)

class ExerciseMedia(TimestampMixin, Base):
    __tablename__ = "exercise_media"
    id: Mapped[int] = mapped_column(primary_key=True)
    exercise_id: Mapped[str] = mapped_column(ForeignKey("exercises.id"), index=True)
    media_id: Mapped[str] = mapped_column(String(120))
    image_path: Mapped[str] = mapped_column(String(500))
    gif_path: Mapped[str] = mapped_column(String(500))
    attribution: Mapped[str] = mapped_column(Text)
    license_status: Mapped[str] = mapped_column(String(80), default="external_terms_required")

class ReadinessCheck(TimestampMixin, Base):
    __tablename__ = "readiness_checks"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    decision: Mapped[dict] = mapped_column(JSON, default=dict)
    available_minutes: Mapped[int] = mapped_column(Integer, default=15)

class Plan(TimestampMixin, Base):
    __tablename__ = "plans"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    plan_type: Mapped[str] = mapped_column(String(24), index=True)
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    safety_action: Mapped[str] = mapped_column(String(80), default="READY")

class SessionRecord(TimestampMixin, Base):
    __tablename__ = "sessions"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    plan_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="in_progress", index=True)
    current_index: Mapped[int] = mapped_column(Integer, default=0)
    elapsed_seconds: Mapped[int] = mapped_column(Integer, default=0)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)

class SessionEvent(TimestampMixin, Base):
    __tablename__ = "session_events"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(120), index=True)
    event_type: Mapped[str] = mapped_column(String(80), index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    __table_args__ = (UniqueConstraint("user_id", "idempotency_key"),)

class GlucoseEntry(TimestampMixin, Base):
    __tablename__ = "glucose_entries"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    value: Mapped[int] = mapped_column(Integer)
    unit: Mapped[str] = mapped_column(String(12))
    canonical_mg_dl: Mapped[int] = mapped_column(Integer)
    timing: Mapped[str] = mapped_column(String(40), default="unspecified", index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)

class OfflineEvent(TimestampMixin, Base):
    __tablename__ = "offline_events"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(120), index=True)
    event_type: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(40), default="accepted")
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    __table_args__ = (UniqueConstraint("user_id", "idempotency_key"),)

class FavoriteExercise(TimestampMixin, Base):
    __tablename__ = "favorite_exercises"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    exercise_id: Mapped[str] = mapped_column(ForeignKey("exercises.id"), index=True)
    __table_args__ = (UniqueConstraint("user_id", "exercise_id"),)

class ExerciseTag(TimestampMixin, Base):
    __tablename__ = "exercise_tags"
    id: Mapped[int] = mapped_column(primary_key=True)
    exercise_id: Mapped[str] = mapped_column(ForeignKey("exercises.id"), index=True)
    classifier_version: Mapped[str] = mapped_column(String(80))
    tags: Mapped[dict] = mapped_column(JSON)
    provenance: Mapped[str] = mapped_column(String(80))
    confidence: Mapped[int] = mapped_column(Integer)
    manual_review_status: Mapped[str] = mapped_column(String(40), default="pending")

class PolicyVersion(TimestampMixin, Base):
    __tablename__ = "policy_versions"
    id: Mapped[int] = mapped_column(primary_key=True)
    version: Mapped[str] = mapped_column(String(80), unique=True)
    status: Mapped[str] = mapped_column(String(40), default="draft")
    rules: Mapped[dict] = mapped_column(JSON)
    clinical_review_state: Mapped[str] = mapped_column(String(40), default="draft")

class SafetyDecision(TimestampMixin, Base):
    __tablename__ = "safety_decisions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    policy_version: Mapped[str] = mapped_column(String(80), index=True)
    triggered_rule_ids: Mapped[list] = mapped_column(JSON, default=list)
    relevant_inputs: Mapped[dict] = mapped_column(JSON, default=dict)
    action: Mapped[str] = mapped_column(String(80), index=True)
    explanation: Mapped[str] = mapped_column(Text)
    outcome_classification: Mapped[str] = mapped_column(String(80))

class AuditLog(TimestampMixin, Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[str] = mapped_column(String(80), index=True)
    action: Mapped[str] = mapped_column(String(120), index=True)
    target_type: Mapped[str] = mapped_column(String(80))
    target_id: Mapped[str] = mapped_column(String(120))
    redacted_payload: Mapped[dict] = mapped_column(JSON, default=dict)

class OnboardingProgress(TimestampMixin, Base):
    __tablename__ = "onboarding_progress"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True, unique=True)
    current_step: Mapped[str] = mapped_column(String(80), default="identity", index=True)
    completed_steps: Mapped[list] = mapped_column(JSON, default=list)
    draft_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    language: Mapped[str] = mapped_column(String(8), default="en")
    status: Mapped[str] = mapped_column(String(40), default="in_progress", index=True)

class ConsentRecord(TimestampMixin, Base):
    __tablename__ = "consent_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    consent_type: Mapped[str] = mapped_column(String(80), index=True)
    version: Mapped[str] = mapped_column(String(80))
    granted: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(80), default="mobile")
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)

class CapacityProfile(TimestampMixin, Base):
    __tablename__ = "capacity_profiles"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    version: Mapped[str] = mapped_column(String(80), index=True)
    source: Mapped[str] = mapped_column(String(80), default="onboarding")
    inputs: Mapped[dict] = mapped_column(JSON, default=dict)
    derived_profile: Mapped[dict] = mapped_column(JSON, default=dict)
    expires_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

class BaselineAssessment(TimestampMixin, Base):
    __tablename__ = "baseline_assessments"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    assessment_type: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(40), default="completed")
    result_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    symptoms: Mapped[dict] = mapped_column(JSON, default=dict)
    confidence: Mapped[int] = mapped_column(Integer, default=3)
    expires_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

class GoalPreference(TimestampMixin, Base):
    __tablename__ = "goal_preferences"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True, unique=True)
    goals: Mapped[list] = mapped_column(JSON, default=list)
    target_focuses: Mapped[list] = mapped_column(JSON, default=list)
    natural_request: Mapped[str | None] = mapped_column(Text, nullable=True)
    safe_interpretation: Mapped[dict] = mapped_column(JSON, default=dict)

class PlanDecisionEvidence(TimestampMixin, Base):
    __tablename__ = "plan_decision_evidence"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    plan_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    generator_version: Mapped[str] = mapped_column(String(80))
    policy_version: Mapped[str] = mapped_column(String(80), index=True)
    triggered_rules: Mapped[list] = mapped_column(JSON, default=list)
    excluded_exercises: Mapped[list] = mapped_column(JSON, default=list)
    selected_exercises: Mapped[list] = mapped_column(JSON, default=list)
    reason: Mapped[str] = mapped_column(Text)
    modifications: Mapped[dict] = mapped_column(JSON, default=dict)
    user_request: Mapped[dict] = mapped_column(JSON, default=dict)
    final_safe_interpretation: Mapped[dict] = mapped_column(JSON, default=dict)

class PlanModification(TimestampMixin, Base):
    __tablename__ = "plan_modifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    plan_id: Mapped[str] = mapped_column(String(64), index=True)
    intent: Mapped[str] = mapped_column(String(80), index=True)
    request_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    result_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    safety_decision: Mapped[dict] = mapped_column(JSON, default=dict)

class ExerciseFeedback(TimestampMixin, Base):
    __tablename__ = "exercise_feedback"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    exercise_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    feedback_type: Mapped[str] = mapped_column(String(80), index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)

class DiabetesContextEntry(TimestampMixin, Base):
    __tablename__ = "diabetes_context_entries"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    session_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    timing: Mapped[str] = mapped_column(String(40), index=True)
    source: Mapped[str] = mapped_column(String(80), default="manual")
    unit: Mapped[str] = mapped_column(String(12), default="mg/dL")
    canonical_mg_dl: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sensor_timestamp: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)

class ProviderConnection(TimestampMixin, Base):
    __tablename__ = "provider_connections"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    provider_key: Mapped[str] = mapped_column(String(80), index=True)
    category: Mapped[str] = mapped_column(String(40), index=True)
    status: Mapped[str] = mapped_column(String(40), default="mock_connected", index=True)
    scopes: Mapped[list] = mapped_column(JSON, default=list)
    consent_version: Mapped[str] = mapped_column(String(80), default="consent-2026-07")
    token_reference: Mapped[str | None] = mapped_column(String(160), nullable=True)
    sync_cursor: Mapped[str | None] = mapped_column(String(160), nullable=True)
    provenance: Mapped[dict] = mapped_column(JSON, default=dict)

class ProviderSyncRecord(TimestampMixin, Base):
    __tablename__ = "provider_sync_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    connection_id: Mapped[int] = mapped_column(ForeignKey("provider_connections.id"), index=True)
    sync_type: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(40), default="completed")
    cursor_before: Mapped[str | None] = mapped_column(String(160), nullable=True)
    cursor_after: Mapped[str | None] = mapped_column(String(160), nullable=True)
    records_seen: Mapped[int] = mapped_column(Integer, default=0)
    duplicates_skipped: Mapped[int] = mapped_column(Integer, default=0)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)

class WearableSample(TimestampMixin, Base):
    __tablename__ = "wearable_samples"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    provider_key: Mapped[str] = mapped_column(String(80), index=True)
    sample_type: Mapped[str] = mapped_column(String(80), index=True)
    observed_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), index=True)
    value_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    provenance: Mapped[dict] = mapped_column(JSON, default=dict)
    stale: Mapped[bool] = mapped_column(Boolean, default=False)

class CalendarEvent(TimestampMixin, Base):
    __tablename__ = "calendar_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    event_date: Mapped[str] = mapped_column(String(10), index=True)
    event_type: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(40), index=True)
    plan_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)

class AchievementRecord(TimestampMixin, Base):
    __tablename__ = "achievement_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    achievement_key: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(40), default="earned")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    __table_args__ = (UniqueConstraint("user_id", "achievement_key"),)

class NotificationPreference(TimestampMixin, Base):
    __tablename__ = "notification_preferences"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    category: Mapped[str] = mapped_column(String(80), index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    quiet_hours: Mapped[dict] = mapped_column(JSON, default=dict)
    channel: Mapped[str] = mapped_column(String(40), default="local")
    preview_policy: Mapped[str] = mapped_column(String(80), default="private")
    __table_args__ = (UniqueConstraint("user_id", "category"),)

class NotificationJob(TimestampMixin, Base):
    __tablename__ = "notification_jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    category: Mapped[str] = mapped_column(String(80), index=True)
    provider: Mapped[str] = mapped_column(String(80), default="mock")
    scheduled_for: Mapped[DateTime] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[str] = mapped_column(String(40), default="scheduled", index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)

class DataExportJob(TimestampMixin, Base):
    __tablename__ = "data_export_jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(40), default="queued", index=True)
    archive_format: Mapped[str] = mapped_column(String(40), default="json")
    download_token_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)

class DeletionJob(TimestampMixin, Base):
    __tablename__ = "deletion_jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    deletion_type: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(40), default="requested", index=True)
    cancellation_deadline: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)

class CaregiverRelationship(TimestampMixin, Base):
    __tablename__ = "caregiver_relationships"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    caregiver_email: Mapped[str] = mapped_column(String(320), index=True)
    status: Mapped[str] = mapped_column(String(40), default="invited", index=True)
    shared_scopes: Mapped[list] = mapped_column(JSON, default=list)
    expires_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    invitation_token_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)

class ProfessionalRelationship(TimestampMixin, Base):
    __tablename__ = "professional_relationships"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    professional_email: Mapped[str] = mapped_column(String(320), index=True)
    role: Mapped[str] = mapped_column(String(80), index=True)
    organization: Mapped[str | None] = mapped_column(String(160), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(40), default="self_attested", index=True)
    status: Mapped[str] = mapped_column(String(40), default="invited", index=True)
    consent_scopes: Mapped[list] = mapped_column(JSON, default=list)
    expires_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

class ProfessionalRestriction(TimestampMixin, Base):
    __tablename__ = "professional_restrictions"
    id: Mapped[int] = mapped_column(primary_key=True)
    relationship_id: Mapped[int] = mapped_column(ForeignKey("professional_relationships.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    restriction_type: Mapped[str] = mapped_column(String(80), index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    review_date: Mapped[str | None] = mapped_column(String(10), nullable=True)

class ProfessionalNote(TimestampMixin, Base):
    __tablename__ = "professional_notes"
    id: Mapped[int] = mapped_column(primary_key=True)
    relationship_id: Mapped[int] = mapped_column(ForeignKey("professional_relationships.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    note_type: Mapped[str] = mapped_column(String(80), default="movement")
    note: Mapped[str] = mapped_column(Text)
    redacted_payload: Mapped[dict] = mapped_column(JSON, default=dict)

class CameraAnalysisSession(TimestampMixin, Base):
    __tablename__ = "camera_analysis_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    session_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    exercise_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    provider: Mapped[str] = mapped_column(String(80), default="mock_pose")
    privacy_mode: Mapped[str] = mapped_column(String(80), default="session_only")
    status: Mapped[str] = mapped_column(String(40), default="completed", index=True)
    result_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    recording_stored: Mapped[bool] = mapped_column(Boolean, default=False)

class MediaApproval(TimestampMixin, Base):
    __tablename__ = "media_approvals"
    id: Mapped[int] = mapped_column(primary_key=True)
    exercise_id: Mapped[str] = mapped_column(String(64), index=True)
    media_type: Mapped[str] = mapped_column(String(80), index=True)
    license_state: Mapped[str] = mapped_column(String(80), index=True)
    source: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(40), default="pending", index=True)
    attribution: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_payload: Mapped[dict] = mapped_column(JSON, default=dict)

class PolicyApproval(TimestampMixin, Base):
    __tablename__ = "policy_approvals"
    id: Mapped[int] = mapped_column(primary_key=True)
    policy_version_id: Mapped[int] = mapped_column(ForeignKey("policy_versions.id"), index=True)
    reviewer_id: Mapped[str] = mapped_column(String(80), index=True)
    decision: Mapped[str] = mapped_column(String(40), index=True)
    rationale: Mapped[str] = mapped_column(Text)

class ProgramSimulation(TimestampMixin, Base):
    __tablename__ = "program_simulations"
    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[str] = mapped_column(String(80), index=True)
    synthetic_profile: Mapped[dict] = mapped_column(JSON, default=dict)
    result_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    policy_version: Mapped[str] = mapped_column(String(80), index=True)

class SystemIncident(TimestampMixin, Base):
    __tablename__ = "system_incidents"
    id: Mapped[int] = mapped_column(primary_key=True)
    incident_type: Mapped[str] = mapped_column(String(80), index=True)
    severity: Mapped[str] = mapped_column(String(40), index=True)
    status: Mapped[str] = mapped_column(String(40), default="open", index=True)
    redacted_payload: Mapped[dict] = mapped_column(JSON, default=dict)

Index("ix_exercise_search", Exercise.name, Exercise.body_part, Exercise.equipment, Exercise.target)
