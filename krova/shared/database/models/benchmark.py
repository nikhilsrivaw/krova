"""
KROVA — Benchmark Model (Layer 4: Benchmark Intelligence Layer)
Stores anonymised aggregate statistics across businesses of the same type.
This is the network moat — grows more accurate and valuable with every business that joins.
At 10,000 businesses, this is the most accurate SMB intelligence data in India.
"""

import uuid

from sqlalchemy import Float, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.database.base import KrovaBase


class Benchmark(KrovaBase):
    """
    Anonymised industry benchmarks computed weekly from all active businesses.
    Segmented by business_type + city_tier to make comparisons meaningful.

    Structure of `metrics` JSONB:
    {
        "conversion": {
            "whatsapp_lead_conversion_rate": 0.28,
            "instagram_lead_conversion_rate": 0.22,
            "gmail_lead_conversion_rate": 0.15,
            "overall_conversion_rate": 0.24,
            "avg_days_to_convert": 8.4,
            "top_quartile_rate": 0.41
        },
        "response": {
            "avg_first_response_hours": 3.2,
            "top_quartile_response_hours": 0.8,
            "follow_up_success_rate": 0.34
        },
        "retention": {
            "monthly_churn_rate": 0.08,
            "avg_customer_lifetime_months": 14.2,
            "repeat_purchase_rate": 0.31
        },
        "pipeline": {
            "avg_hot_leads": 8,
            "avg_warm_leads": 22,
            "avg_pipeline_size": 47
        },
        "revenue": {
            "avg_deal_size": 42000,
            "top_quartile_deal_size": 95000,
            "avg_monthly_revenue_signals": "up"
        },
        "channels": {
            "most_common_primary_channel": "whatsapp",
            "best_converting_channel": "whatsapp",
            "best_lead_gen_channel": "instagram"
        },
        "sample_size": 143,
        "computed_at": "2026-04-07"
    }
    """

    __tablename__ = "benchmarks"

    # Segment key — what group of businesses does this benchmark represent
    business_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # Tier 1 = Mumbai/Delhi/Bangalore, Tier 2 = Pune/Hyderabad/etc, Tier 3 = others
    # NULL = all cities combined
    city_tier: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # "weekly" | "monthly" — how often this benchmark is recomputed
    period_type: Mapped[str] = mapped_column(String(10), nullable=False, default="weekly")

    # ISO date string for when this benchmark snapshot was taken
    period_date: Mapped[str] = mapped_column(String(10), nullable=False)

    # The actual benchmark data
    metrics: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # How many businesses contributed to this benchmark (minimum 5 for privacy)
    sample_size: Mapped[int] = mapped_column(nullable=False, default=0)

    # ── Indexes ──────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("idx_benchmarks_type_date", "business_type", "period_date"),
        Index("idx_benchmarks_segment", "business_type", "city_tier", "period_date"),
    )
