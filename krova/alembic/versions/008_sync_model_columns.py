"""Sync ORM model columns with actual DB schema

Adds missing columns that exist in Python models but not in the database:
- analysis_results: batch_request_id, customer_status, morning_briefing, raw_claude_output
- Renames raw_response -> raw_claude_output (keep both for safety, just add new)

Revision ID: 008
Revises: 007
Create Date: 2026-04-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── analysis_results ──────────────────────────────────────────────────────
    op.add_column("analysis_results", sa.Column("batch_request_id", sa.String(100), nullable=True))
    op.add_column("analysis_results", sa.Column("customer_status", sa.String(20), nullable=True))
    op.add_column("analysis_results", sa.Column("morning_briefing", sa.Text, nullable=True))
    # raw_claude_output replaces raw_response — add new column, copy data, keep old for safety
    op.add_column(
        "analysis_results",
        sa.Column("raw_claude_output", JSONB, nullable=False, server_default="{}"),
    )
    # Copy existing raw_response data into raw_claude_output
    op.execute("UPDATE analysis_results SET raw_claude_output = COALESCE(raw_response, '{}'::jsonb)")


def downgrade() -> None:
    op.drop_column("analysis_results", "raw_claude_output")
    op.drop_column("analysis_results", "morning_briefing")
    op.drop_column("analysis_results", "customer_status")
    op.drop_column("analysis_results", "batch_request_id")
