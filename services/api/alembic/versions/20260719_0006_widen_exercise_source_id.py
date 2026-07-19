"""widen exercise source IDs

Revision ID: 20260719_0006
Revises: 20260719_0005
Create Date: 2026-07-19
"""
from alembic import op
import sqlalchemy as sa

revision = "20260719_0006"
down_revision = "20260719_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("exercises") as batch_op:
        batch_op.alter_column(
            "source_id",
            existing_type=sa.String(length=16),
            type_=sa.String(length=64),
            existing_nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("exercises") as batch_op:
        batch_op.alter_column(
            "source_id",
            existing_type=sa.String(length=64),
            type_=sa.String(length=16),
            existing_nullable=True,
        )
