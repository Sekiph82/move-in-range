"""functional MVP persistence

Revision ID: 20260718_0002
Revises: 20260718_0001
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa

revision = "20260718_0002"
down_revision = "20260718_0001"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("email", sa.String(320), nullable=True))
        batch.add_column(sa.Column("password_hash", sa.String(256), nullable=True))
        batch.add_column(sa.Column("role", sa.String(40), nullable=False, server_default="user"))
        batch.add_column(sa.Column("refresh_token_hash", sa.String(128), nullable=True))
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("preferred_name", sa.String(120), nullable=False),
        sa.Column("locale", sa.String(8), nullable=False),
        sa.Column("timezone", sa.String(80), nullable=False),
        sa.Column("health_payload", sa.JSON(), nullable=False),
        sa.Column("onboarding_complete", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_profiles_user_id", "profiles", ["user_id"])

    op.create_table(
        "exercise_localizations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exercise_id", sa.String(64), sa.ForeignKey("exercises.id"), nullable=False),
        sa.Column("locale", sa.String(8), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=False),
        sa.Column("instruction_steps", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("exercise_id", "locale"),
    )
    op.create_index("ix_exercise_localizations_exercise_id", "exercise_localizations", ["exercise_id"])

    op.create_table(
        "exercise_media",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exercise_id", sa.String(64), sa.ForeignKey("exercises.id"), nullable=False),
        sa.Column("media_id", sa.String(120), nullable=False),
        sa.Column("image_path", sa.String(500), nullable=False),
        sa.Column("gif_path", sa.String(500), nullable=False),
        sa.Column("attribution", sa.Text(), nullable=False),
        sa.Column("license_status", sa.String(80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_exercise_media_exercise_id", "exercise_media", ["exercise_id"])

    op.create_table(
        "exercise_tags",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exercise_id", sa.String(64), sa.ForeignKey("exercises.id"), nullable=False),
        sa.Column("classifier_version", sa.String(80), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("provenance", sa.String(80), nullable=False),
        sa.Column("confidence", sa.Integer(), nullable=False),
        sa.Column("manual_review_status", sa.String(40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_exercise_tags_exercise_id", "exercise_tags", ["exercise_id"])

    op.create_table(
        "readiness_checks",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("decision", sa.JSON(), nullable=False),
        sa.Column("available_minutes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_readiness_checks_user_id", "readiness_checks", ["user_id"])

    op.create_table(
        "plans",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("plan_type", sa.String(24), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("safety_action", sa.String(80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_plans_user_id", "plans", ["user_id"])
    op.create_index("ix_plans_plan_type", "plans", ["plan_type"])
    op.create_index("ix_plans_status", "plans", ["status"])

    op.create_table(
        "sessions",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("plan_id", sa.String(64), nullable=True),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("current_index", sa.Integer(), nullable=False),
        sa.Column("elapsed_seconds", sa.Integer(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])
    op.create_index("ix_sessions_plan_id", "sessions", ["plan_id"])
    op.create_index("ix_sessions_status", "sessions", ["status"])

    op.create_table(
        "session_events",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("session_id", sa.String(64), sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("idempotency_key", sa.String(120), nullable=False),
        sa.Column("event_type", sa.String(80), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "idempotency_key"),
    )
    op.create_index("ix_session_events_user_id", "session_events", ["user_id"])
    op.create_index("ix_session_events_session_id", "session_events", ["session_id"])

    op.create_table(
        "glucose_entries",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("session_id", sa.String(64), nullable=True),
        sa.Column("value", sa.Integer(), nullable=False),
        sa.Column("unit", sa.String(12), nullable=False),
        sa.Column("canonical_mg_dl", sa.Integer(), nullable=False),
        sa.Column("timing", sa.String(40), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_glucose_entries_user_id", "glucose_entries", ["user_id"])
    op.create_index("ix_glucose_entries_session_id", "glucose_entries", ["session_id"])

    op.create_table(
        "offline_events",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("idempotency_key", sa.String(120), nullable=False),
        sa.Column("event_type", sa.String(80), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "idempotency_key"),
    )

    op.create_table(
        "favorite_exercises",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("exercise_id", sa.String(64), sa.ForeignKey("exercises.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "exercise_id"),
    )


def downgrade():
    op.drop_table("favorite_exercises")
    op.drop_table("offline_events")
    op.drop_table("glucose_entries")
    op.drop_table("session_events")
    op.drop_table("sessions")
    op.drop_table("plans")
    op.drop_table("readiness_checks")
    op.drop_table("exercise_tags")
    op.drop_table("exercise_media")
    op.drop_table("exercise_localizations")
    op.drop_table("profiles")
    op.drop_index("ix_users_email", table_name="users")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("refresh_token_hash")
        batch.drop_column("role")
        batch.drop_column("password_hash")
        batch.drop_column("email")
