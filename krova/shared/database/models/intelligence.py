"""
KROVA — Customer Intelligence Model (Layer 3: Relationship Intelligence Layer)
One row per customer. Separate from Customer model to keep that table lean.
Stores deep relationship intelligence built from months of conversation history.
After 100+ interactions, KROVA understands this customer better than the owner's memory does.
"""

import uuid

from sqlalchemy import Float, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database.base import KrovaBase


class CustomerIntelligence(KrovaBase):
    """
    Deep relationship intelligence for one customer.
    Updated after every nightly analysis. Grows richer with every interaction.

    Structure of the `profile` JSONB:
    {
        "communication": {
            "language": "hindi | english | hinglish",
            "formality": "formal | casual",
            "preferred_channel": "whatsapp",
            "best_contact_days": ["Tuesday", "Wednesday"],
            "best_contact_time": "10am-12pm",
            "avg_response_time_hours": 4.2,
            "prefers_voice_notes": false
        },
        "decision_making": {
            "style": "fast | slow | needs_approval",
            "influencers": ["spouse", "business partner"],
            "avg_days_to_decide": 8.5,
            "requires_demo": true
        },
        "objection_patterns": [
            "always raises price in second conversation",
            "asks for references before committing"
        ],
        "conversion_triggers": [
            "personal recommendation helped",
            "EMI option was decisive",
            "urgency created by deadline"
        ],
        "relationship_health": {
            "sentiment_trend": "improving | stable | declining",
            "last_sentiment": "positive | neutral | negative",
            "trust_level": "high | medium | low",
            "engagement_frequency": "weekly | monthly | sporadic"
        },
        "value_signals": {
            "estimated_ltv": 75000,
            "referral_potential": "high | medium | low",
            "upsell_readiness": "ready | not_yet | unlikely",
            "payment_behaviour": "fast | average | slow"
        },
        "interaction_count": 47,
        "confidence": 0.81,
        "last_updated": "2026-04-07"
    }
    """

    __tablename__ = "customer_intelligence"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # One intelligence profile per customer
    )

    # Structured relationship intelligence
    profile: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # What KROVA recommends saying to this customer RIGHT NOW
    # Regenerated nightly. Context-specific to their current situation.
    current_recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)

    # The best personalised message template for this customer's style
    message_template: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 0.0 to 1.0 — how confident KROVA is in this intelligence profile
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # How many interactions have contributed to this profile
    interaction_count: Mapped[int] = mapped_column(nullable=False, default=0)

    # Relationship trajectory — how this customer's engagement is trending
    # values: improving | stable | declining | critical
    relationship_trajectory: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # 0.0 to 1.0 — likelihood this customer will churn in the next 30 days
    churn_probability: Mapped[float | None] = mapped_column(Float, nullable=True)

    # How many messages this customer sent in the current month
    monthly_message_count: Mapped[int] = mapped_column(nullable=False, default=0)

    # 0 to 100 — composite engagement / energy score for the relationship
    energy_score: Mapped[int | None] = mapped_column(nullable=True)

    # ── Relationships ────────────────────────────────────────────────────────
    business: Mapped["Business"] = relationship(  # noqa: F821
        "Business", lazy="noload"
    )
    customer: Mapped["Customer"] = relationship(  # noqa: F821
        "Customer", lazy="noload"
    )

    # ── Indexes ──────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("idx_intelligence_customer", "customer_id", unique=True),
        Index("idx_intelligence_business", "business_id"),
    )
