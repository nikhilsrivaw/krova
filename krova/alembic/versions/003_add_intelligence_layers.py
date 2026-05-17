"""Add all 13 intelligence layer tables

Revision ID: 003
Revises: 002
Create Date: 2026-04-07

Adds:
  - business_dna        (Layer 1: Memory)
  - predictions         (Layer 2: Prediction)
  - customer_intelligence (Layer 3: Relationship Intelligence)
  - benchmarks          (Layer 4: Benchmark Intelligence)
  - autopilot_rules     (Layer 9: Autopilot)
  - revenue_entries     (Layer 10: Financial Intelligence)
  - reputation_events   (Layer 11: Reputation)
  - weekly_insights     (Layer 12: Learning)
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    # ── business_dna (Layer 1 — Memory) ──────────────────────────────────────
    op.create_table(
        "business_dna",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("profile", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("narrative", sa.Text(), nullable=True),
        sa.Column("analysis_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("business_id"),
    )
    op.create_index("idx_dna_business", "business_dna", ["business_id"], unique=True)

    # ── predictions (Layer 2 — Prediction) ───────────────────────────────────
    op.create_table(
        "predictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("prediction_type", sa.String(30), nullable=False),
        sa.Column("probability", sa.Float(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("prediction_text", sa.Text(), nullable=False),
        sa.Column("recommended_action", sa.Text(), nullable=True),
        sa.Column("predicted_for_date", sa.String(10), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("is_acknowledged", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("evidence", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_predictions_business_status", "predictions", ["business_id", "status"])
    op.create_index("idx_predictions_customer", "predictions", ["customer_id"])
    op.create_index("idx_predictions_type", "predictions", ["business_id", "prediction_type", "status"])

    # ── customer_intelligence (Layer 3 — Relationship Intelligence) ───────────
    op.create_table(
        "customer_intelligence",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("profile", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("current_recommendation", sa.Text(), nullable=True),
        sa.Column("message_template", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("interaction_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("customer_id"),
    )
    op.create_index("idx_intelligence_customer", "customer_intelligence", ["customer_id"], unique=True)
    op.create_index("idx_intelligence_business", "customer_intelligence", ["business_id"])

    # ── benchmarks (Layer 4 — Benchmark Intelligence) ─────────────────────────
    op.create_table(
        "benchmarks",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("business_type", sa.String(50), nullable=False),
        sa.Column("city_tier", sa.String(10), nullable=True),
        sa.Column("period_type", sa.String(10), nullable=False, server_default="weekly"),
        sa.Column("period_date", sa.String(10), nullable=False),
        sa.Column("metrics", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("sample_size", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_benchmarks_type_date", "benchmarks", ["business_type", "period_date"])
    op.create_index("idx_benchmarks_segment", "benchmarks", ["business_type", "city_tier", "period_date"])

    # ── autopilot_rules (Layer 9 — Autopilot) ────────────────────────────────
    op.create_table(
        "autopilot_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("trigger_type", sa.String(30), nullable=False),
        sa.Column("trigger_config", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("action_type", sa.String(30), nullable=False),
        sa.Column("message_template", sa.Text(), nullable=True),
        sa.Column("channel", sa.String(20), nullable=True),
        sa.Column("requires_approval", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("execution_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cooldown_days", sa.Integer(), nullable=False, server_default="7"),
        sa.Column("applies_to_status", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_autopilot_business_active", "autopilot_rules", ["business_id", "is_active"])
    op.create_index("idx_autopilot_trigger", "autopilot_rules", ["business_id", "trigger_type", "is_active"])

    # ── revenue_entries (Layer 10 — Financial Intelligence) ───────────────────
    op.create_table(
        "revenue_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="expected"),
        sa.Column("payment_method", sa.String(20), nullable=True),
        sa.Column("payment_date", sa.String(10), nullable=True),
        sa.Column("due_date", sa.String(10), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("external_reference", sa.String(255), nullable=True),
        sa.Column("extra_data", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="SET NULL"),
    )
    op.create_index("idx_revenue_business_status", "revenue_entries", ["business_id", "status"])
    op.create_index("idx_revenue_business_date", "revenue_entries", ["business_id", "payment_date"])
    op.create_index("idx_revenue_customer", "revenue_entries", ["customer_id"])
    op.create_index("idx_revenue_overdue", "revenue_entries", ["business_id", "due_date", "status"])

    # ── reputation_events (Layer 11 — Reputation) ─────────────────────────────
    op.create_table(
        "reputation_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column("sentiment", sa.String(20), nullable=False),
        sa.Column("rating", sa.Float(), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("external_id", sa.String(255), nullable=True),
        sa.Column("source_url", sa.String(500), nullable=True),
        sa.Column("owner_notified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("suggested_response", sa.Text(), nullable=True),
        sa.Column("is_responded", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("raw_data", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="SET NULL"),
    )
    op.create_index("idx_reputation_business_type", "reputation_events", ["business_id", "event_type"])
    op.create_index("idx_reputation_business_sentiment", "reputation_events", ["business_id", "sentiment"])
    op.create_index("idx_reputation_unnotified", "reputation_events", ["business_id", "owner_notified"])
    op.create_index("idx_reputation_external", "reputation_events", ["external_id"])

    # ── weekly_insights (Layer 12 — Learning) ─────────────────────────────────
    op.create_table(
        "weekly_insights",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("week", sa.String(10), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("headline", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("action_item", sa.Text(), nullable=False),
        sa.Column("data_evidence", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("estimated_impact", sa.Text(), nullable=True),
        sa.Column("benchmark_comparison", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("owner_committed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("business_id", "week", name="uq_weekly_insight_business_week"),
    )
    op.create_index("idx_weekly_insights_business_week", "weekly_insights", ["business_id", "week"], unique=True)
    op.create_index("idx_weekly_insights_unread", "weekly_insights", ["business_id", "is_read"])

    # ── updated_at triggers for new tables ────────────────────────────────────
    for table in [
        "business_dna", "predictions", "customer_intelligence", "benchmarks",
        "autopilot_rules", "revenue_entries", "reputation_events", "weekly_insights",
    ]:
        op.execute(f"""
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """)


def downgrade() -> None:
    for table in [
        "business_dna", "predictions", "customer_intelligence", "benchmarks",
        "autopilot_rules", "revenue_entries", "reputation_events", "weekly_insights",
    ]:
        op.execute(f"DROP TRIGGER IF EXISTS set_updated_at ON {table};")

    op.drop_table("weekly_insights")
    op.drop_table("reputation_events")
    op.drop_table("revenue_entries")
    op.drop_table("autopilot_rules")
    op.drop_table("benchmarks")
    op.drop_table("customer_intelligence")
    op.drop_table("predictions")
    op.drop_table("business_dna")
