"""
KROVA — User Model
Represents the business owner authenticated via Supabase Auth.
Minimal — Supabase handles auth state. We only store what we need
beyond what Supabase provides (notification preferences, onboarding state).
"""

import uuid

from sqlalchemy import Boolean, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.database.base import KrovaBase


class User(KrovaBase):
    """
    Thin profile layer on top of Supabase Auth.
    One user = one business owner.
    The supabase_user_id is the authoritative identity — it comes from
    Supabase Auth JWT and is used to look up the user's businesses.
    """

    __tablename__ = "users"

    # Supabase Auth user ID — the link between the JWT and this row
    supabase_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        unique=True,
        index=True,
    )

    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Has the user completed the onboarding flow?
    is_onboarded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Is the account active? Flipped to False on subscription cancellation.
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # User preferences — notification settings, language preference (hi/en)
    preferences: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # ── Indexes ──────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("idx_users_supabase_id", "supabase_user_id", unique=True),
        Index("idx_users_email", "email", unique=True),
    )
