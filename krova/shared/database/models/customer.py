"""
KROVA — Customer Model
One row = one person who has interacted with a business via any channel.
Built automatically from incoming messages — the owner never creates customers manually.
"""

import uuid
from enum import Enum

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database.base import KrovaBase


class CustomerStatus(str, Enum):
    """
    Claude sets this every night based on conversation patterns.
    hot → actively interested, likely to convert soon
    warm → engaged but needs nurturing
    cold → went quiet, needs follow-up
    converted → paid / signed up
    lost → no response despite follow-ups
    """
    hot = "hot"
    warm = "warm"
    cold = "cold"
    converted = "converted"
    lost = "lost"
    new = "new"  # just arrived, not yet analysed


class Channel(str, Enum):
    """Which channel the customer first contacted the business on."""
    whatsapp = "whatsapp"
    instagram = "instagram"
    gmail = "gmail"
    outlook = "outlook"


class Customer(KrovaBase):
    """
    Built automatically when a message arrives from an unknown sender.
    The customer's identity (name, phone, email) is extracted from the channel webhook.
    """

    __tablename__ = "customers"

    # Multi-tenancy — every query must filter by this
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Identity — at least one of phone/email/instagram_id will be set
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="Phone number in E.164 format e.g. +919876543210",
    )
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    instagram_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Which channel this customer first arrived from
    primary_channel: Mapped[Channel] = mapped_column(
        String(20), nullable=False, default=Channel.whatsapp
    )

    # Current status — set by Claude every night
    status: Mapped[CustomerStatus] = mapped_column(
        String(20), nullable=False, default=CustomerStatus.new
    )

    # Health score 0-100, computed during nightly analysis
    # green: 70-100, yellow: 40-69, red: 0-39
    health_score: Mapped[int] = mapped_column(nullable=False, default=50)

    # Last time any message was received from this customer
    last_contact_at: Mapped[str | None] = mapped_column(
        nullable=True,
        comment="ISO 8601 timestamp of last inbound message",
    )

    # Claude's notes on this customer — tone, preferences, context
    # Updated after each nightly analysis. Fed back into the next analysis.
    ai_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Claude's running notes on this customer — tone, context, what works",
    )

    # Team assignment — supabase_user_id of the assigned team member (null = unassigned)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Flexible extra data — source UTM, referral, custom fields
    # Named 'extra_data' in Python because 'metadata' is reserved by SQLAlchemy.
    extra_data: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)

    # ── Relationships ────────────────────────────────────────────────────────
    business: Mapped["Business"] = relationship(  # noqa: F821
        "Business", back_populates="customers", lazy="noload"
    )
    messages: Mapped[list["Message"]] = relationship(  # noqa: F821
        "Message", back_populates="customer", lazy="noload"
    )
    analysis_results: Mapped[list["AnalysisResult"]] = relationship(  # noqa: F821
        "AnalysisResult", back_populates="customer", lazy="noload"
    )
    actions: Mapped[list["Action"]] = relationship(  # noqa: F821
        "Action", back_populates="customer", lazy="noload"
    )

    # ── Indexes ──────────────────────────────────────────────────────────────
    # The Bible's required indexes — sorted by last contact for dashboard
    __table_args__ = (
        Index("idx_customers_business_contact", "business_id", "last_contact_at"),
        Index("idx_customers_business_status", "business_id", "status"),
        Index("idx_customers_phone", "phone"),
        Index("idx_customers_email", "email"),
        Index("idx_customers_instagram", "instagram_id"),
    )
