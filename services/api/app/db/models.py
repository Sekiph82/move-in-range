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
    source_id: Mapped[str] = mapped_column(String(16), unique=True)
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

Index("ix_exercise_search", Exercise.name, Exercise.body_part, Exercise.equipment, Exercise.target)
