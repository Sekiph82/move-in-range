"""MVP hardening fields

Revision ID: 20260719_0003
Revises: 20260718_0002
Create Date: 2026-07-19
"""
from alembic import op
import sqlalchemy as sa

revision = "20260719_0003"
down_revision = "20260718_0002"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("offline_events") as batch:
        batch.add_column(sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"))
        batch.add_column(sa.Column("last_error", sa.Text(), nullable=True))
        batch.add_column(sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    with op.batch_alter_table("offline_events") as batch:
        batch.drop_column("processed_at")
        batch.drop_column("last_error")
        batch.drop_column("retry_count")
