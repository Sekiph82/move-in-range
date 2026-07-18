from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin

class User(TimestampMixin, Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    auth_provider: Mapped[str] = mapped_column(String(32), default="local")
    deleted_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

class Profile(TimestampMixin, Base):
    __tablename__ = "profiles"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    preferred_name: Mapped[str] = mapped_column(String(120))
    locale: Mapped[str] = mapped_column(String(8), default="en")
    timezone: Mapped[str] = mapped_column(String(80))
    health_payload: Mapped[dict] = mapped_column(JSON, default=dict)

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
