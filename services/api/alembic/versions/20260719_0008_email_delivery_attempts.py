"""add email delivery attempts

Revision ID: 20260719_0008
Revises: 20260719_0007
Create Date: 2026-07-19
"""
from alembic import op
import sqlalchemy as sa

revision = "20260719_0008"
down_revision = "20260719_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "email_delivery_attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("recipient_hash", sa.String(length=128), nullable=False),
        sa.Column("template", sa.String(length=80), nullable=False),
        sa.Column("provider", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("provider_message_id", sa.String(length=160), nullable=True),
        sa.Column("error_code", sa.String(length=120), nullable=True),
        sa.Column("redacted_payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_email_delivery_attempts_user_id", "email_delivery_attempts", ["user_id"])
    op.create_index("ix_email_delivery_attempts_recipient_hash", "email_delivery_attempts", ["recipient_hash"])
    op.create_index("ix_email_delivery_attempts_template", "email_delivery_attempts", ["template"])
    op.create_index("ix_email_delivery_attempts_provider", "email_delivery_attempts", ["provider"])
    op.create_index("ix_email_delivery_attempts_status", "email_delivery_attempts", ["status"])


def downgrade() -> None:
    op.drop_index("ix_email_delivery_attempts_status", table_name="email_delivery_attempts")
    op.drop_index("ix_email_delivery_attempts_provider", table_name="email_delivery_attempts")
    op.drop_index("ix_email_delivery_attempts_template", table_name="email_delivery_attempts")
    op.drop_index("ix_email_delivery_attempts_recipient_hash", table_name="email_delivery_attempts")
    op.drop_index("ix_email_delivery_attempts_user_id", table_name="email_delivery_attempts")
    op.drop_table("email_delivery_attempts")
