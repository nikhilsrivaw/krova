"""Sync all remaining ORM model columns with DB schema

Adds every missing column identified by comparing SQLAlchemy model metadata
against introspected DB schema:
- actions: external_message_id, error_detail, raw_response
- conversation_sessions: user_id, is_active
- competitor_mentions: updated_at
- growth_reports: updated_at
- connected_platforms: created_at, updated_at
- message_templates: created_at, updated_at
- team_members: created_at, updated_at

Revision ID: 009
Revises: 008
Create Date: 2026-04-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── actions ───────────────────────────────────────────────────────────────
    op.add_column("actions", sa.Column("external_message_id", sa.String(255), nullable=True))
    op.add_column("actions", sa.Column("error_detail", sa.Text, nullable=True))
    op.add_column(
        "actions",
        sa.Column("raw_response", JSONB, nullable=False, server_default="{}"),
    )

    # ── conversation_sessions ─────────────────────────────────────────────────
    # user_id: UUID, references users.id — make nullable to allow existing rows
    op.add_column(
        "conversation_sessions",
        sa.Column("user_id", UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "conversation_sessions",
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
    )

    # ── competitor_mentions ───────────────────────────────────────────────────
    op.add_column(
        "competitor_mentions",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    # ── growth_reports ────────────────────────────────────────────────────────
    op.add_column(
        "growth_reports",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    # ── connected_platforms ───────────────────────────────────────────────────
    op.add_column(
        "connected_platforms",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.add_column(
        "connected_platforms",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    # ── message_templates ─────────────────────────────────────────────────────
    op.add_column(
        "message_templates",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.add_column(
        "message_templates",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    # ── team_members ──────────────────────────────────────────────────────────
    op.add_column(
        "team_members",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.add_column(
        "team_members",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )


def downgrade() -> None:
    op.drop_column("team_members", "updated_at")
    op.drop_column("team_members", "created_at")
    op.drop_column("message_templates", "updated_at")
    op.drop_column("message_templates", "created_at")
    op.drop_column("connected_platforms", "updated_at")
    op.drop_column("connected_platforms", "created_at")
    op.drop_column("growth_reports", "updated_at")
    op.drop_column("competitor_mentions", "updated_at")
    op.drop_column("conversation_sessions", "is_active")
    op.drop_column("conversation_sessions", "user_id")
    op.drop_column("actions", "raw_response")
    op.drop_column("actions", "error_detail")
    op.drop_column("actions", "external_message_id")
