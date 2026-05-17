"""
KROVA — Business DNA Model (Layer 1: Memory Layer)
One row per business. Updated nightly. The evolving personality profile of the business
built from months of real conversation data. This is the deepest moat — switching
KROVA means losing this intelligence entirely.
"""

import uuid

from sqlalchemy import ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database.base import KrovaBase


class BusinessDNA(KrovaBase):
    """
    The living personality model of a business.
    Updated after every nightly analysis run. Never deleted — only refined.

    Structure of the `profile` JSONB:
    {
        "communication_style": {
            "language": "hinglish | hindi | english",
            "formality": "casual | formal | mixed",
            "tone": "warm | professional | direct",
            "signature_phrases": ["yaar", "kindly revert", ...]
        },
        "conversion_patterns": {
            "best_client_segments": ["coaching institutes", "real estate"],
            "avg_days_to_convert": 7.2,
            "conversion_triggers": ["demo call", "EMI option", "referral"],
            "win_rate": 0.34
        },
        "problem_patterns": {
            "high_churn_segments": ["startups under 1 year"],
            "common_objections": ["price", "timeline", "trust"],
            "red_flags": ["delayed payments", "scope creep requests"]
        },
        "seasonal_patterns": {
            "best_months": ["October", "March", "January"],
            "slow_months": ["May", "June"],
            "insights": "Q4 budget flush drives most conversions"
        },
        "channel_insights": {
            "best_for_leads": "instagram",
            "best_for_conversion": "whatsapp",
            "avg_response_time_hours": {"whatsapp": 2.1, "instagram": 6.4, "gmail": 14.2}
        },
        "pricing_intelligence": {
            "avg_deal_size": 45000,
            "min_deal": 15000,
            "max_deal": 200000,
            "discount_effectiveness": "Works 60% of time when offered upfront",
            "payment_preferences": "EMI popular, 3-month split closes most deals"
        },
        "relationship_insights": {
            "referral_rate": 0.22,
            "top_referrers": ["client_id_1", "client_id_2"],
            "network_density": "medium"
        },
        "confidence": 0.72,
        "data_points_analyzed": 347,
        "weeks_of_data": 8,
        "last_updated": "2026-04-07"
    }
    """

    __tablename__ = "business_dna"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # One DNA profile per business
    )

    # The full structured profile — updated nightly, grows richer over time
    profile: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Claude's plain-language summary of what makes this business unique
    # Regenerated weekly. Used to seed conversations and briefings.
    narrative: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Plain language summary of the business personality — fed to Claude prompts",
    )

    # How many analysis runs have contributed to this profile
    analysis_count: Mapped[int] = mapped_column(nullable=False, default=0)

    # ── Relationships ────────────────────────────────────────────────────────
    business: Mapped["Business"] = relationship(  # noqa: F821
        "Business", lazy="noload"
    )

    # ── Indexes ──────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("idx_dna_business", "business_id", unique=True),
    )
