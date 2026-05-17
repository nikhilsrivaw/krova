"""Add missing business fields: context, good_lead_description, lost_customer_description,
plan (rename subscription_plan), analysis_time, briefing_phone

Revision ID: 007
Revises: 006
Create Date: 2026-04-08
"""

from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing columns to businesses table
    op.add_column("businesses", sa.Column("context", sa.Text, nullable=True))
    op.add_column("businesses", sa.Column("good_lead_description", sa.Text, nullable=True))
    op.add_column("businesses", sa.Column("lost_customer_description", sa.Text, nullable=True))
    op.add_column("businesses", sa.Column("analysis_time", sa.String(5), nullable=False, server_default="07:00"))
    op.add_column("businesses", sa.Column("briefing_phone", sa.String(20), nullable=True))
    # Add plan column (the model uses 'plan' mapped_column name, separate from subscription_plan)
    op.add_column(
        "businesses",
        sa.Column("plan", sa.String(50), nullable=False, server_default="starter"),
    )


def downgrade() -> None:
    op.drop_column("businesses", "plan")
    op.drop_column("businesses", "briefing_phone")
    op.drop_column("businesses", "analysis_time")
    op.drop_column("businesses", "lost_customer_description")
    op.drop_column("businesses", "good_lead_description")
    op.drop_column("businesses", "context")
