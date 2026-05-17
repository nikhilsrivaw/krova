"""Add BSP integration tables: connected_platforms, message_templates

Revision ID: 005
Revises: 004
Create Date: 2026-04-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ── connected_platforms ───────────────────────────────────────────────────
    op.create_table(
        "connected_platforms",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(50), nullable=False),   # interakt | wati | gupshup
        sa.Column("api_key_encrypted", sa.LargeBinary, nullable=False),
        sa.Column("account_id", sa.String(255), nullable=True),  # Wati account ID, etc.
        sa.Column("source_phone", sa.String(20), nullable=True),  # for Gupshup
        sa.Column("is_active", sa.Boolean, default=True, nullable=False, server_default="true"),
        sa.Column("template_count", sa.Integer, default=0, nullable=False, server_default="0"),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("connected_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_connected_platforms_business_id", "connected_platforms", ["business_id"])
    op.create_unique_constraint("uq_platform_per_business", "connected_platforms", ["business_id", "platform"])

    # ── message_templates ─────────────────────────────────────────────────────
    op.create_table(
        "message_templates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform_id", UUID(as_uuid=True), sa.ForeignKey("connected_platforms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("template_id", sa.String(255), nullable=False),   # BSP's own template ID
        sa.Column("template_name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(50), nullable=True),         # marketing | utility | authentication
        sa.Column("language", sa.String(10), nullable=False, server_default="en"),
        sa.Column("body", sa.Text, nullable=False),                  # full template text with {{variables}}
        sa.Column("variables", JSONB, default=list),                 # extracted variable names in order
        sa.Column("status", sa.String(50), nullable=True),           # APPROVED | PENDING | REJECTED
        sa.Column("is_active", sa.Boolean, default=True, nullable=False, server_default="true"),
        sa.Column("synced_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_message_templates_business_id", "message_templates", ["business_id"])
    op.create_index("ix_message_templates_platform_id", "message_templates", ["platform_id"])


def downgrade() -> None:
    op.drop_table("message_templates")
    op.drop_table("connected_platforms")
