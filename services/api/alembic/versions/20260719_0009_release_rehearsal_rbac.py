"""release rehearsal RBAC policy actors

Revision ID: 20260719_0009
Revises: 20260719_0008
Create Date: 2026-07-19
"""

from alembic import op
import sqlalchemy as sa


revision = "20260719_0009"
down_revision = "20260719_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("policy_versions") as batch:
        batch.add_column(sa.Column("creator_id", sa.String(length=80), nullable=True))
        batch.add_column(sa.Column("submitter_id", sa.String(length=80), nullable=True))
        batch.add_column(sa.Column("approver_id", sa.String(length=80), nullable=True))
        batch.add_column(sa.Column("publisher_id", sa.String(length=80), nullable=True))
        batch.add_column(sa.Column("rollback_actor_id", sa.String(length=80), nullable=True))
        batch.add_column(sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("rolled_back_at", sa.DateTime(timezone=True), nullable=True))
        batch.create_index("ix_policy_versions_creator_id", ["creator_id"])
        batch.create_index("ix_policy_versions_submitter_id", ["submitter_id"])
        batch.create_index("ix_policy_versions_approver_id", ["approver_id"])
        batch.create_index("ix_policy_versions_publisher_id", ["publisher_id"])
        batch.create_index("ix_policy_versions_rollback_actor_id", ["rollback_actor_id"])


def downgrade() -> None:
    with op.batch_alter_table("policy_versions") as batch:
        batch.drop_index("ix_policy_versions_rollback_actor_id")
        batch.drop_index("ix_policy_versions_publisher_id")
        batch.drop_index("ix_policy_versions_approver_id")
        batch.drop_index("ix_policy_versions_submitter_id")
        batch.drop_index("ix_policy_versions_creator_id")
        batch.drop_column("rolled_back_at")
        batch.drop_column("published_at")
        batch.drop_column("approved_at")
        batch.drop_column("submitted_at")
        batch.drop_column("rollback_actor_id")
        batch.drop_column("publisher_id")
        batch.drop_column("approver_id")
        batch.drop_column("submitter_id")
        batch.drop_column("creator_id")
