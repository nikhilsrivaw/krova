"""Add Phase 1 tables: commitments, revenue_signals, competitor_mentions, growth_reports

Revision ID: 004
Revises: 003
Create Date: 2026-04-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ── commitments ───────────────────────────────────────────────────────────
    op.create_table(
        "commitments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("team_member_id", UUID(as_uuid=True), nullable=True),
        sa.Column("commitment_text", sa.Text, nullable=False),
        sa.Column("due_date", sa.Date, nullable=True),
        sa.Column("source_channel", sa.String(50), nullable=True),
        sa.Column("source_message_id", UUID(as_uuid=True), nullable=True),
        sa.Column("is_fulfilled", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_dismissed", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_commitments_business_id", "commitments", ["business_id"])
    op.create_index("ix_commitments_customer_id", "commitments", ["customer_id"])
    op.create_index("ix_commitments_is_fulfilled", "commitments", ["is_fulfilled"])

    # ── revenue_signals ───────────────────────────────────────────────────────
    op.create_table(
        "revenue_signals",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("signal_type", sa.String(50), nullable=False),  # scope_creep, forgotten_invoice, retainer_mismatch, ghost_invoice
        sa.Column("estimated_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("evidence", JSONB, nullable=False, server_default="{}"),
        sa.Column("is_resolved", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_revenue_signals_business_id", "revenue_signals", ["business_id"])
    op.create_index("ix_revenue_signals_is_resolved", "revenue_signals", ["is_resolved"])

    # ── competitor_mentions ───────────────────────────────────────────────────
    op.create_table(
        "competitor_mentions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("competitor_name", sa.String(200), nullable=False),
        sa.Column("channel", sa.String(50), nullable=True),
        sa.Column("context", sa.Text, nullable=True),
        sa.Column("sentiment", sa.String(20), nullable=True),  # comparing, switched, neutral
        sa.Column("mentioned_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_competitor_mentions_business_id", "competitor_mentions", ["business_id"])
    op.create_index("ix_competitor_mentions_competitor_name", "competitor_mentions", ["competitor_name"])

    # ── growth_reports ────────────────────────────────────────────────────────
    op.create_table(
        "growth_reports",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("report_date", sa.Date, nullable=False),
        sa.Column("blockers", JSONB, nullable=False, server_default="[]"),
        sa.Column("total_revenue_leakage_estimate", sa.Numeric(12, 2), nullable=True),
        sa.Column("top_blocker", sa.Text, nullable=True),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("business_id", "report_date", name="uq_growth_reports_business_date"),
    )
    op.create_index("ix_growth_reports_business_id", "growth_reports", ["business_id"])

    # ── message_signal_type — add column to messages ──────────────────────────
    op.add_column(
        "messages",
        sa.Column("signal_type", sa.String(50), nullable=True),
        # values: sales_signal, money_signal, complaint_signal, vendor_signal, relationship_signal, noise
    )

    # ── customer_intelligence — add relationship trajectory fields ─────────────
    op.add_column(
        "customer_intelligence",
        sa.Column("relationship_trajectory", sa.String(20), nullable=True),
        # values: improving, stable, declining, critical
    )
    op.add_column(
        "customer_intelligence",
        sa.Column("churn_probability", sa.Float, nullable=True),
    )
    op.add_column(
        "customer_intelligence",
        sa.Column("monthly_message_count", sa.Integer, nullable=True),
    )
    op.add_column(
        "customer_intelligence",
        sa.Column("energy_score", sa.Float, nullable=True),
        # messages per rupee ratio — higher = more draining
    )

    # ── updated_at triggers for new tables ────────────────────────────────────
    for table in ["commitments", "revenue_signals"]:
        op.execute(f"""
            CREATE TRIGGER set_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """)


def downgrade() -> None:
    op.drop_column("customer_intelligence", "energy_score")
    op.drop_column("customer_intelligence", "monthly_message_count")
    op.drop_column("customer_intelligence", "churn_probability")
    op.drop_column("customer_intelligence", "relationship_trajectory")
    op.drop_column("messages", "signal_type")
    op.drop_table("growth_reports")
    op.drop_table("competitor_mentions")
    op.drop_table("revenue_signals")
    op.drop_table("commitments")
