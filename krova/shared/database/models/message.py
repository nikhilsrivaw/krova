"""
KROVA — Message Model
Every inbound message from WhatsApp, Instagram, or Gmail stored here.
Also stores outbound messages sent by KROVA on behalf of the business.
This is the raw data the AI brain reads every night.
"""

import uuid
from enum import Enum

from sqlalchemy import Boolean, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database.base import KrovaBase


class MessageDirection(str, Enum):
    inbound = "inbound"    # Customer → Business
    outbound = "outbound"  # Business → Customer (KROVA sent this)


class MessageSignalType(str, Enum):
    sales_signal = "sales_signal"           # Buying intent, pricing questions, requests to proceed
    money_signal = "money_signal"           # Payment, invoice, refund, billing mentions
    complaint_signal = "complaint_signal"   # Dissatisfaction, problem reports, negative sentiment
    vendor_signal = "vendor_signal"         # Supplier, B2B service, partnership enquiries
    relationship_signal = "relationship_signal"  # Personal updates, warm conversation, referrals
    none = "none"                           # Classified but no strong signal detected


class MessageChannel(str, Enum):
    whatsapp = "whatsapp"
    instagram = "instagram"
    gmail = "gmail"
    outlook = "outlook"


class MessageType(str, Enum):
    text = "text"
    image = "image"
    audio = "audio"
    video = "video"
    document = "document"
    email = "email"
    dm = "dm"           # Instagram DM
    comment = "comment" # Instagram comment


class Message(KrovaBase):
    """
    Immutable record of every communication that touched a business.
    Never updated after creation — append only.
    The AI brain reads these records every night to understand patterns.
    """

    __tablename__ = "messages"

    # Multi-tenancy — every query must filter by this first
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Which channel this came from
    channel: Mapped[MessageChannel] = mapped_column(String(20), nullable=False)
    message_type: Mapped[MessageType] = mapped_column(
        String(20), nullable=False, default=MessageType.text
    )
    direction: Mapped[MessageDirection] = mapped_column(String(10), nullable=False)

    # The actual content — plain text for text/email messages
    # For media messages, this holds the caption or transcription
    content: Mapped[str | None] = mapped_column(Text, nullable=True)

    # For email messages — subject line stored separately for analysis
    subject: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # External message ID from the platform (Meta message ID, Gmail message ID)
    # Stored to prevent duplicate processing if a webhook fires twice
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Timestamp when the message was actually sent (from the platform, not our receipt time)
    sent_at: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="ISO 8601 timestamp from the sending platform",
    )

    # Signal classification — set by analysis_worker before nightly analysis
    signal_type: Mapped[MessageSignalType | None] = mapped_column(
        String(30), nullable=True, comment="Pre-classified signal type for fast filtering"
    )

    # Whether Claude has read this message in a nightly analysis
    is_analysed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Raw webhook payload — stored for debugging and reprocessing
    raw_payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # ── Relationships ────────────────────────────────────────────────────────
    business: Mapped["Business"] = relationship(  # noqa: F821
        "Business", back_populates="messages", lazy="noload"
    )
    customer: Mapped["Customer"] = relationship(  # noqa: F821
        "Customer", back_populates="messages", lazy="noload"
    )

    # ── Indexes ──────────────────────────────────────────────────────────────
    # The Bible's primary index pattern: fetch messages for a business + customer, newest first
    __table_args__ = (
        Index(
            "idx_messages_business_customer",
            "business_id", "customer_id", "created_at",
        ),
        Index("idx_messages_business_channel", "business_id", "channel"),
        Index("idx_messages_unanalysed", "business_id", "is_analysed"),
        # Unique on external_id to prevent duplicate message saves
        Index("idx_messages_external_id", "external_id", unique=True),
    )
