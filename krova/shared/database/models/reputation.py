"""
KROVA — Reputation Event Model (Layer 11: Reputation Layer)
Monitors and tracks the business's public reputation.
KROVA catches a negative Google review the moment it appears and suggests how to respond.
Also prompts review requests from happy customers at exactly the right moment.
"""

import uuid
from enum import Enum

from sqlalchemy import Boolean, Float, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database.base import KrovaBase


class ReputationEventType(str, Enum):
    google_review = "google_review"         # New Google Maps review
    instagram_mention = "instagram_mention" # Mentioned in Instagram post/story
    instagram_comment = "instagram_comment" # Comment on business's post
    review_requested = "review_requested"   # KROVA asked a customer for a review
    review_received = "review_received"     # Customer left a review after request


class ReputationSentiment(str, Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"


class ReputationEvent(KrovaBase):
    """
    One row = one reputation event — a review, mention, or comment.
    KROVA monitors these and surfaces them to the owner immediately.
    Negative events get priority alerts. Positive events feed the "ask for review"
    suggestion engine.
    """

    __tablename__ = "reputation_events"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )

    # NULL if event is from an anonymous person
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
    )

    event_type: Mapped[ReputationEventType] = mapped_column(String(30), nullable=False)
    sentiment: Mapped[ReputationSentiment] = mapped_column(String(20), nullable=False)

    # Star rating 1-5 for reviews, NULL for mentions
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)

    # The actual content — review text, comment, etc.
    content: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Platform-specific ID (Google review ID, Instagram post ID, etc.)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # URL to the review/post if available
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Has the owner been notified about this event?
    owner_notified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # KROVA's suggested response to this review/comment
    suggested_response: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Has the owner responded to this event?
    is_responded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Raw data from the platform API
    raw_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # ── Relationships ────────────────────────────────────────────────────────
    business: Mapped["Business"] = relationship(  # noqa: F821
        "Business", lazy="noload"
    )
    customer: Mapped["Customer"] = relationship(  # noqa: F821
        "Customer", lazy="noload"
    )

    # ── Indexes ──────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("idx_reputation_business_type", "business_id", "event_type"),
        Index("idx_reputation_business_sentiment", "business_id", "sentiment"),
        Index("idx_reputation_unnotified", "business_id", "owner_notified"),
        Index("idx_reputation_external", "external_id"),
    )
