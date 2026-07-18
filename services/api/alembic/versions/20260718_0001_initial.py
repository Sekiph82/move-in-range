"""initial MoveInRange schema

Revision ID: 20260718_0001
Revises:
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa

revision = "20260718_0001"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("users", sa.Column("id", sa.String(64), primary_key=True), sa.Column("auth_provider", sa.String(32), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_table("exercises", sa.Column("id", sa.String(64), primary_key=True), sa.Column("source_id", sa.String(16), unique=True), sa.Column("slug", sa.String(220), unique=True), sa.Column("name", sa.String(240)), sa.Column("body_part", sa.String(80)), sa.Column("equipment", sa.String(120)), sa.Column("target", sa.String(120)), sa.Column("secondary_muscles", sa.JSON()), sa.Column("source_metadata", sa.JSON()), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_exercise_search", "exercises", ["name", "body_part", "equipment", "target"])
    op.create_table("policy_versions", sa.Column("id", sa.Integer, primary_key=True), sa.Column("version", sa.String(80), unique=True), sa.Column("status", sa.String(40)), sa.Column("rules", sa.JSON()), sa.Column("clinical_review_state", sa.String(40)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_table("safety_decisions", sa.Column("id", sa.Integer, primary_key=True), sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id")), sa.Column("policy_version", sa.String(80)), sa.Column("triggered_rule_ids", sa.JSON()), sa.Column("relevant_inputs", sa.JSON()), sa.Column("action", sa.String(80)), sa.Column("explanation", sa.Text), sa.Column("outcome_classification", sa.String(80)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_table("audit_logs", sa.Column("id", sa.Integer, primary_key=True), sa.Column("actor_id", sa.String(80)), sa.Column("action", sa.String(120)), sa.Column("target_type", sa.String(80)), sa.Column("target_id", sa.String(120)), sa.Column("redacted_payload", sa.JSON()), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))

def downgrade():
    op.drop_table("audit_logs")
    op.drop_table("safety_decisions")
    op.drop_table("policy_versions")
    op.drop_index("ix_exercise_search", table_name="exercises")
    op.drop_table("exercises")
    op.drop_table("users")
