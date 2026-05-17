"""
KROVA — Action Model
Every message KROVA sends (or tries to send) on behalf of the business is recorded here.
Also records owner approvals and rejections of suggested follow-ups.
The feedback loop: outcome of each action feeds back into next night's analysis.
"""

import uuid
from enum import Enum

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database.base import KrovaBase


class ActionType(str, Enum):
    follow_up = "follow_up"
    check_in = "check_in"
    close = "close"
    morning_briefing = "morning_briefing"


class ActionStatus(str, Enum):
    pending = "pending"       # Waiting for owner approval
    approved = "approved"     # Owner tapped HAAN — queued for sending
    rejected = "rejected"     # Owner dismissed it
    sending = "sending"       # In the action execution queue
    sent = "sent"             # Successfully sent via platform API
    failed = "failed"         # Platform API returned an error
    auto_sent = "auto_sent"   # Sent automatically (Growth/Pro plan)


class ActionOutcome(str, Enum):
    """
    What happened after the message was sent.
    Recorded when the customer's next message arrives.
    Feeds directly into the next nightly analysis for this customer.
    """
    replied = "replied"         # Customer responded
    converted = "converted"     # Customer paid / signed up after this
    no_response = "no_response" # Still no reply after 48 hours
    went_cold = "went_cold"     # Customer stopped engaging after this


class Action(KrovaBase):
    """
    An action KROVA suggested or took — the feedback loop record.
    Every row here is a data point that makes the next analysis smarter.
    """

    __tablename__ = "actions"

    # Multi-tenancy
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

    # Which analysis result triggered this action
    analysis_result_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("analysis_results.id", ondelete="SET NULL"),
        nullable=True,
    )

    action_type: Mapped[ActionType] = mapped_column(String(30), nullable=False)
    status: Mapped[ActionStatus] = mapped_column(
        String(20), nullable=False, default=ActionStatus.pending
    )

    # The message content — exactly what was (or will be) sent
    message_content: Mapped[str] = mapped_column(Text, nullable=False)

    # Which channel to send it on
    channel: Mapped[str] = mapped_column(String(20), nullable=False)

    # Platform-specific message ID returned after successful send
    external_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # What happened after sending — set when customer's next message arrives
    outcome: Mapped[ActionOutcome | None] = mapped_column(String(20), nullable=True)

    # Error details if status = failed
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Full API response from the platform — for debugging
    raw_response: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # ── Relationships ────────────────────────────────────────────────────────
    business: Mapped["Business"] = relationship(  # noqa: F821
        "Business", back_populates="actions", lazy="noload"
    )
    customer: Mapped["Customer"] = relationship(  # noqa: F821
        "Customer", back_populates="actions", lazy="noload"
    )

    # ── Indexes ──────────────────────────────────────────────────────────────
    __table_args__ = (
        # The Bible's required index: pending follow-ups for a business
        Index("idx_actions_business_status", "business_id", "status", "created_at"),
        Index("idx_actions_business_customer", "business_id", "customer_id"),
        Index("idx_actions_outcome", "business_id", "outcome"),
    )
