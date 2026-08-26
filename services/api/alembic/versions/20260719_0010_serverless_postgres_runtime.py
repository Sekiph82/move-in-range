"""serverless postgres revocation rate limits and jobs

Revision ID: 20260719_0010
Revises: 20260719_0009
Create Date: 2026-07-19
"""

from alembic import op
import sqlalchemy as sa


revision = "20260719_0010"
down_revision = "20260719_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "session_revocations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.String(length=128), nullable=True),
        sa.Column("user_id", sa.String(length=64), nullable=True),
        sa.Column("token_family_id", sa.String(length=128), nullable=True),
        sa.Column("token_type", sa.String(length=40), nullable=False),
        sa.Column("token_identifier_hash", sa.String(length=128), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(length=80), nullable=False, server_default="unspecified"),
        sa.Column("actor_type", sa.String(length=40), nullable=False, server_default="system"),
        sa.Column("actor_id", sa.String(length=80), nullable=True),
        sa.Column("metadata_redacted", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_type", "token_identifier_hash"),
    )
    op.create_index("ix_session_revocations_actor_id", "session_revocations", ["actor_id"])
    op.create_index("ix_session_revocations_actor_type", "session_revocations", ["actor_type"])
    op.create_index("ix_session_revocations_expires_at", "session_revocations", ["expires_at"])
    op.create_index("ix_session_revocations_reason", "session_revocations", ["reason"])
    op.create_index("ix_session_revocations_revoked_at", "session_revocations", ["revoked_at"])
    op.create_index("ix_session_revocations_session_id", "session_revocations", ["session_id"])
    op.create_index("ix_session_revocations_token_family_id", "session_revocations", ["token_family_id"])
    op.create_index("ix_session_revocations_token_identifier_hash", "session_revocations", ["token_identifier_hash"])
    op.create_index("ix_session_revocations_token_type", "session_revocations", ["token_type"])
    op.create_index("ix_session_revocations_user_id", "session_revocations", ["user_id"])

    op.create_table(
        "rate_limit_buckets",
        sa.Column("bucket_key", sa.String(length=128), nullable=False),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("window_seconds", sa.Integer(), nullable=False),
        sa.Column("request_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("limit_value", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("bucket_key"),
    )
    op.create_index("ix_rate_limit_buckets_expires_at", "rate_limit_buckets", ["expires_at"])
    op.create_index("ix_rate_limit_buckets_updated_at", "rate_limit_buckets", ["updated_at"])
    op.create_index("ix_rate_limit_buckets_window_started_at", "rate_limit_buckets", ["window_started_at"])

    op.create_table(
        "background_jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="queued"),
        sa.Column("payload_redacted", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_by", sa.String(length=120), nullable=True),
        sa.Column("last_error_code", sa.String(length=120), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_background_jobs_available_at", "background_jobs", ["available_at"])
    op.create_index("ix_background_jobs_completed_at", "background_jobs", ["completed_at"])
    op.create_index("ix_background_jobs_job_type", "background_jobs", ["job_type"])
    op.create_index("ix_background_jobs_locked_at", "background_jobs", ["locked_at"])
    op.create_index("ix_background_jobs_locked_by", "background_jobs", ["locked_by"])
    op.create_index("ix_background_jobs_status", "background_jobs", ["status"])


def downgrade() -> None:
    op.drop_index("ix_background_jobs_status", table_name="background_jobs")
    op.drop_index("ix_background_jobs_locked_by", table_name="background_jobs")
    op.drop_index("ix_background_jobs_locked_at", table_name="background_jobs")
    op.drop_index("ix_background_jobs_job_type", table_name="background_jobs")
    op.drop_index("ix_background_jobs_completed_at", table_name="background_jobs")
    op.drop_index("ix_background_jobs_available_at", table_name="background_jobs")
    op.drop_table("background_jobs")

    op.drop_index("ix_rate_limit_buckets_window_started_at", table_name="rate_limit_buckets")
    op.drop_index("ix_rate_limit_buckets_updated_at", table_name="rate_limit_buckets")
    op.drop_index("ix_rate_limit_buckets_expires_at", table_name="rate_limit_buckets")
    op.drop_table("rate_limit_buckets")

    op.drop_index("ix_session_revocations_user_id", table_name="session_revocations")
    op.drop_index("ix_session_revocations_token_type", table_name="session_revocations")
    op.drop_index("ix_session_revocations_token_identifier_hash", table_name="session_revocations")
    op.drop_index("ix_session_revocations_token_family_id", table_name="session_revocations")
    op.drop_index("ix_session_revocations_session_id", table_name="session_revocations")
    op.drop_index("ix_session_revocations_revoked_at", table_name="session_revocations")
    op.drop_index("ix_session_revocations_reason", table_name="session_revocations")
    op.drop_index("ix_session_revocations_expires_at", table_name="session_revocations")
    op.drop_index("ix_session_revocations_actor_type", table_name="session_revocations")
    op.drop_index("ix_session_revocations_actor_id", table_name="session_revocations")
    op.drop_table("session_revocations")
