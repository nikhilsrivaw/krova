"""
KROVA — Business Model
Represents a single business using KROVA (e.g. "Rahul's Digital Agency").
Every other model in the system has a FK to this table.
"""

import uuid
from enum import Enum

from sqlalchemy import Boolean, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database.base import KrovaBase


class BusinessType(str, Enum):
    digital_agency = "digital_agency"
    freelancer = "freelancer"
    coaching = "coaching"
    recruitment = "recruitment"
    ca_legal = "ca_legal"
    software_agency = "software_agency"
    other = "other"


class SubscriptionPlan(str, Enum):
    starter = "starter"    # ₹299/month
    growth = "growth"      # ₹699/month
    pro = "pro"            # ₹1299/month
    trial = "trial"        # 2-week free trial


class Business(KrovaBase):
    """
    One row = one paying business on KROVA.
    The owner authenticates via Supabase Auth — their Supabase user_id
    is stored here to link the auth identity to their business profile.
    """

    __tablename__ = "businesses"

    # Owner's Supabase Auth user ID — links this business to the authenticated user
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # Business identity
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    business_type: Mapped[BusinessType] = mapped_column(
        String(50), nullable=False, default=BusinessType.other
    )

    # Onboarding context — answers to the 5 setup questions.
    # Stored as free text so Claude gets natural language context, not structured fields.
    context: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Free-text business context from onboarding. Fed directly to Claude prompts.",
    )

    # What makes a good lead / lost customer — used in nightly analysis prompts
    good_lead_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    lost_customer_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Subscription
    plan: Mapped[SubscriptionPlan] = mapped_column(
        String(20), nullable=False, default=SubscriptionPlan.trial
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Nightly analysis schedule — stored as "HH:MM" in IST, default 22:00
    analysis_time: Mapped[str] = mapped_column(
        String(5), nullable=False, default="22:00"
    )

    # Morning briefing delivery — WhatsApp number to send the 8 AM summary to
    briefing_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Flexible metadata bag — feature flags, OAuth tokens, preferences, etc.
    # Named 'extra_data' in Python because 'metadata' is reserved by SQLAlchemy.
    extra_data: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)

    # ── Relationships ────────────────────────────────────────────────────────
    customers: Mapped[list["Customer"]] = relationship(  # noqa: F821
        "Customer", back_populates="business", lazy="noload"
    )
    messages: Mapped[list["Message"]] = relationship(  # noqa: F821
        "Message", back_populates="business", lazy="noload"
    )
    analysis_results: Mapped[list["AnalysisResult"]] = relationship(  # noqa: F821
        "AnalysisResult", back_populates="business", lazy="noload"
    )
    actions: Mapped[list["Action"]] = relationship(  # noqa: F821
        "Action", back_populates="business", lazy="noload"
    )

    # ── Indexes ──────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("idx_businesses_owner", "owner_user_id"),
        Index("idx_businesses_active", "is_active"),
    )
