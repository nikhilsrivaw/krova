"""
KROVA — Weekly Insight Model (Layer 12: Learning Layer)
One row per business per week. The single most impactful thing the owner can learn
this week, derived from their own data. Not a generic tip — a specific lesson.
Over 52 weeks the owner becomes genuinely better at running their business.
"""

import uuid

from sqlalchemy import Boolean, Float, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database.base import KrovaBase


class WeeklyInsight(KrovaBase):
    """
    One specific, actionable, data-derived insight per business per week.

    Example: "Your Instagram leads convert at 8%. Businesses like yours average 22%.
    The gap: you respond in 4 hours, top performers respond in 15 minutes.
    One change — respond to Instagram DMs within 15 minutes — could triple your Instagram revenue."

    Never a generic tip. Always specific to this business's data.
    """

    __tablename__ = "weekly_insights"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ISO week date string e.g. "2026-W15"
    week: Mapped[str] = mapped_column(String(10), nullable=False)

    # Category of insight — helps owner track what's been covered
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="response_time | channel_performance | pricing | retention | conversion | pipeline",
    )

    # The insight headline — short, punchy
    headline: Mapped[str] = mapped_column(String(255), nullable=False)

    # The full insight with data, comparison, and specific recommendation
    body: Mapped[str] = mapped_column(Text, nullable=False)

    # The one specific action the owner should take this week
    action_item: Mapped[str] = mapped_column(Text, nullable=False)

    # The data that powered this insight — for transparency
    data_evidence: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Estimated impact if owner acts on this insight
    estimated_impact: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="e.g. 'Could increase Instagram conversion by 3x'",
    )

    # Benchmark comparison used (if any)
    benchmark_comparison: Mapped[str | None] = mapped_column(Text, nullable=True)

    # How confident KROVA is in this insight (based on data volume)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)

    # Has the owner read/acknowledged this insight?
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Did the owner say they'll act on it?
    owner_committed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # ── Relationships ────────────────────────────────────────────────────────
    business: Mapped["Business"] = relationship(  # noqa: F821
        "Business", lazy="noload"
    )

    # ── Indexes ──────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("idx_weekly_insights_business_week", "business_id", "week", unique=True),
        Index("idx_weekly_insights_unread", "business_id", "is_read"),
    )
