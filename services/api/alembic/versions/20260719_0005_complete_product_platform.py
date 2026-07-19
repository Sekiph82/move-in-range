"""complete product platform models

Revision ID: 20260719_0005
Revises: 20260719_0004
Create Date: 2026-07-19
"""
from alembic import op
import sqlalchemy as sa

revision = "20260719_0005"
down_revision = "20260719_0004"
branch_labels = None
depends_on = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    ]


def upgrade() -> None:
    op.create_table(
        "onboarding_progress",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("current_step", sa.String(80), nullable=False, server_default="identity"),
        sa.Column("completed_steps", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("draft_payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("language", sa.String(8), nullable=False, server_default="en"),
        sa.Column("status", sa.String(40), nullable=False, server_default="in_progress"),
        *_timestamps(),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_onboarding_progress_status", "onboarding_progress", ["status"])

    op.create_table(
        "consent_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("consent_type", sa.String(80), nullable=False),
        sa.Column("version", sa.String(80), nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("source", sa.String(80), nullable=False, server_default="mobile"),
        sa.Column("evidence", sa.JSON(), nullable=False, server_default="{}"),
        *_timestamps(),
    )
    op.create_index("ix_consent_records_user_type", "consent_records", ["user_id", "consent_type"])

    op.create_table(
        "capacity_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("version", sa.String(80), nullable=False),
        sa.Column("source", sa.String(80), nullable=False, server_default="onboarding"),
        sa.Column("inputs", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("derived_profile", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_capacity_profiles_user_version", "capacity_profiles", ["user_id", "version"])

    op.create_table(
        "baseline_assessments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("assessment_type", sa.String(80), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="completed"),
        sa.Column("result_payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("symptoms", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("confidence", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_baseline_assessments_user_type", "baseline_assessments", ["user_id", "assessment_type"])

    op.create_table(
        "goal_preferences",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("goals", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("target_focuses", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("natural_request", sa.Text(), nullable=True),
        sa.Column("safe_interpretation", sa.JSON(), nullable=False, server_default="{}"),
        *_timestamps(),
        sa.UniqueConstraint("user_id"),
    )

    op.create_table(
        "plan_decision_evidence",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("plan_id", sa.String(64), nullable=True),
        sa.Column("generator_version", sa.String(80), nullable=False),
        sa.Column("policy_version", sa.String(80), nullable=False),
        sa.Column("triggered_rules", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("excluded_exercises", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("selected_exercises", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("modifications", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("user_request", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("final_safe_interpretation", sa.JSON(), nullable=False, server_default="{}"),
        *_timestamps(),
    )
    op.create_index("ix_plan_decision_user_plan", "plan_decision_evidence", ["user_id", "plan_id"])

    op.create_table(
        "plan_modifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("plan_id", sa.String(64), nullable=False),
        sa.Column("intent", sa.String(80), nullable=False),
        sa.Column("request_payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("result_payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("safety_decision", sa.JSON(), nullable=False, server_default="{}"),
        *_timestamps(),
    )
    op.create_index("ix_plan_modifications_user_plan", "plan_modifications", ["user_id", "plan_id"])

    op.create_table(
        "exercise_feedback",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("exercise_id", sa.String(64), nullable=True),
        sa.Column("session_id", sa.String(64), nullable=True),
        sa.Column("feedback_type", sa.String(80), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        *_timestamps(),
    )
    op.create_index("ix_exercise_feedback_user_type", "exercise_feedback", ["user_id", "feedback_type"])

    op.create_table(
        "diabetes_context_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("session_id", sa.String(64), nullable=True),
        sa.Column("timing", sa.String(40), nullable=False),
        sa.Column("source", sa.String(80), nullable=False, server_default="manual"),
        sa.Column("unit", sa.String(12), nullable=False, server_default="mg/dL"),
        sa.Column("canonical_mg_dl", sa.Integer(), nullable=True),
        sa.Column("sensor_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        *_timestamps(),
    )
    op.create_index("ix_diabetes_context_user_timing", "diabetes_context_entries", ["user_id", "timing"])

    op.create_table(
        "provider_connections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("provider_key", sa.String(80), nullable=False),
        sa.Column("category", sa.String(40), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="mock_connected"),
        sa.Column("scopes", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("consent_version", sa.String(80), nullable=False, server_default="consent-2026-07"),
        sa.Column("token_reference", sa.String(160), nullable=True),
        sa.Column("sync_cursor", sa.String(160), nullable=True),
        sa.Column("provenance", sa.JSON(), nullable=False, server_default="{}"),
        *_timestamps(),
    )
    op.create_index("ix_provider_connections_user_provider", "provider_connections", ["user_id", "provider_key"])

    op.create_table(
        "provider_sync_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("connection_id", sa.Integer(), sa.ForeignKey("provider_connections.id"), nullable=False),
        sa.Column("sync_type", sa.String(80), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="completed"),
        sa.Column("cursor_before", sa.String(160), nullable=True),
        sa.Column("cursor_after", sa.String(160), nullable=True),
        sa.Column("records_seen", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duplicates_skipped", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        *_timestamps(),
    )

    op.create_table(
        "wearable_samples",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("provider_key", sa.String(80), nullable=False),
        sa.Column("sample_type", sa.String(80), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("value_payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("provenance", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("stale", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamps(),
    )
    op.create_index("ix_wearable_samples_user_type_time", "wearable_samples", ["user_id", "sample_type", "observed_at"])

    op.create_table(
        "calendar_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("event_date", sa.String(10), nullable=False),
        sa.Column("event_type", sa.String(80), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("plan_id", sa.String(64), nullable=True),
        sa.Column("session_id", sa.String(64), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        *_timestamps(),
    )
    op.create_index("ix_calendar_events_user_date", "calendar_events", ["user_id", "event_date"])

    op.create_table(
        "achievement_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("achievement_key", sa.String(80), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="earned"),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        *_timestamps(),
        sa.UniqueConstraint("user_id", "achievement_key"),
    )

    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("category", sa.String(80), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("quiet_hours", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("channel", sa.String(40), nullable=False, server_default="local"),
        sa.Column("preview_policy", sa.String(80), nullable=False, server_default="private"),
        *_timestamps(),
        sa.UniqueConstraint("user_id", "category"),
    )

    op.create_table(
        "notification_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("category", sa.String(80), nullable=False),
        sa.Column("provider", sa.String(80), nullable=False, server_default="mock"),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="scheduled"),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        *_timestamps(),
    )
    op.create_index("ix_notification_jobs_user_status", "notification_jobs", ["user_id", "status"])

    op.create_table(
        "data_export_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="queued"),
        sa.Column("archive_format", sa.String(40), nullable=False, server_default="json"),
        sa.Column("download_token_hash", sa.String(128), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        *_timestamps(),
    )

    op.create_table(
        "deletion_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("deletion_type", sa.String(80), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="requested"),
        sa.Column("cancellation_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        *_timestamps(),
    )

    op.create_table(
        "caregiver_relationships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("caregiver_email", sa.String(320), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="invited"),
        sa.Column("shared_scopes", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("invitation_token_hash", sa.String(128), nullable=True),
        *_timestamps(),
    )

    op.create_table(
        "professional_relationships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("professional_email", sa.String(320), nullable=False),
        sa.Column("role", sa.String(80), nullable=False),
        sa.Column("organization", sa.String(160), nullable=True),
        sa.Column("verification_status", sa.String(40), nullable=False, server_default="self_attested"),
        sa.Column("status", sa.String(40), nullable=False, server_default="invited"),
        sa.Column("consent_scopes", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
    )

    op.create_table(
        "professional_restrictions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("relationship_id", sa.Integer(), sa.ForeignKey("professional_relationships.id"), nullable=False),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("restriction_type", sa.String(80), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(40), nullable=False, server_default="active"),
        sa.Column("review_date", sa.String(10), nullable=True),
        *_timestamps(),
    )

    op.create_table(
        "professional_notes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("relationship_id", sa.Integer(), sa.ForeignKey("professional_relationships.id"), nullable=False),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("note_type", sa.String(80), nullable=False, server_default="movement"),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("redacted_payload", sa.JSON(), nullable=False, server_default="{}"),
        *_timestamps(),
    )

    op.create_table(
        "camera_analysis_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("session_id", sa.String(64), nullable=True),
        sa.Column("exercise_id", sa.String(64), nullable=True),
        sa.Column("provider", sa.String(80), nullable=False, server_default="mock_pose"),
        sa.Column("privacy_mode", sa.String(80), nullable=False, server_default="session_only"),
        sa.Column("status", sa.String(40), nullable=False, server_default="completed"),
        sa.Column("result_payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("recording_stored", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamps(),
    )

    op.create_table(
        "media_approvals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exercise_id", sa.String(64), nullable=False),
        sa.Column("media_type", sa.String(80), nullable=False),
        sa.Column("license_state", sa.String(80), nullable=False),
        sa.Column("source", sa.String(160), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="pending"),
        sa.Column("attribution", sa.Text(), nullable=True),
        sa.Column("metadata_payload", sa.JSON(), nullable=False, server_default="{}"),
        *_timestamps(),
    )

    op.create_table(
        "policy_approvals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("policy_version_id", sa.Integer(), sa.ForeignKey("policy_versions.id"), nullable=False),
        sa.Column("reviewer_id", sa.String(80), nullable=False),
        sa.Column("decision", sa.String(40), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        *_timestamps(),
    )

    op.create_table(
        "program_simulations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_id", sa.String(80), nullable=False),
        sa.Column("synthetic_profile", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("result_payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("policy_version", sa.String(80), nullable=False),
        *_timestamps(),
    )

    op.create_table(
        "system_incidents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("incident_type", sa.String(80), nullable=False),
        sa.Column("severity", sa.String(40), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="open"),
        sa.Column("redacted_payload", sa.JSON(), nullable=False, server_default="{}"),
        *_timestamps(),
    )


def downgrade() -> None:
    for table_name in [
        "system_incidents",
        "program_simulations",
        "policy_approvals",
        "media_approvals",
        "camera_analysis_sessions",
        "professional_notes",
        "professional_restrictions",
        "professional_relationships",
        "caregiver_relationships",
        "deletion_jobs",
        "data_export_jobs",
        "notification_jobs",
        "notification_preferences",
        "achievement_records",
        "calendar_events",
        "wearable_samples",
        "provider_sync_records",
        "provider_connections",
        "diabetes_context_entries",
        "exercise_feedback",
        "plan_modifications",
        "plan_decision_evidence",
        "goal_preferences",
        "baseline_assessments",
        "capacity_profiles",
        "consent_records",
        "onboarding_progress",
    ]:
        op.drop_table(table_name)
