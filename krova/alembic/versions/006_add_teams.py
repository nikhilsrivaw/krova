"""Add teams: team_members table + assigned_to on customers

Revision ID: 006
Revises: 005
Create Date: 2026-04-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ── team_members ──────────────────────────────────────────────────────────
    op.create_table(
        "team_members",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("supabase_user_id", UUID(as_uuid=True), nullable=True),    # set after they accept invite
        sa.Column("role", sa.String(30), nullable=False, server_default="team_member"),  # manager | team_member
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False, server_default="true"),
        sa.Column("invited_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_team_members_business_id", "team_members", ["business_id"])
    op.create_index("ix_team_members_supabase_user_id", "team_members", ["supabase_user_id"])
    op.create_unique_constraint("uq_team_member_email_business", "team_members", ["business_id", "email"])

    # ── assigned_to on customers ──────────────────────────────────────────────
    op.add_column(
        "customers",
        sa.Column("assigned_to", UUID(as_uuid=True), nullable=True),  # supabase_user_id of team member
    )
    op.create_index("ix_customers_assigned_to", "customers", ["assigned_to"])


def downgrade() -> None:
    op.drop_index("ix_customers_assigned_to", "customers")
    op.drop_column("customers", "assigned_to")
    op.drop_table("team_members")
