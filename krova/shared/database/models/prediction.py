"""
KROVA — Prediction Model (Layer 2: Prediction Layer)
One row = one specific prediction about a customer's future behaviour.
Generated nightly after the main analysis. Confidence scores shown to owner
so they trust the high-confidence ones and aren't misled by uncertain ones.
"""

import uuid
from enum import Enum

from sqlalchemy import Boolean, Float, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database.base import KrovaBase


class PredictionType(str, Enum):
    churn_risk = "churn_risk"           # Will go cold / leave
    conversion_window = "conversion_window"  # Ready to buy soon
    upsell_opportunity = "upsell_opportunity"  # Existing client ready for more
    reactivation = "reactivation"       # Cold lead showing signs of life
    revenue_at_risk = "revenue_at_risk" # Business-level: pipeline going cold
    referral_likely = "referral_likely" # This customer is likely to refer someone


class PredictionStatus(str, Enum):
    active = "active"       # Still in the future — owner should act
    correct = "correct"     # Prediction came true
    incorrect = "incorrect" # Prediction was wrong — feeds model improvement
    expired = "expired"     # Predicted window passed without resolution


class Prediction(KrovaBase):
    """
    A specific, falsifiable prediction about what will happen to a customer.
    The 'correct' / 'incorrect' outcome is recorded automatically when
    the customer's status changes — closing the feedback loop.
    """

    __tablename__ = "predictions"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )

    # NULL for business-level predictions (e.g., revenue_at_risk)
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=True,
    )

    prediction_type: Mapped[PredictionType] = mapped_column(
        String(30), nullable=False
    )

    # 0.0 to 1.0 — probability the event will occur
    probability: Mapped[float] = mapped_column(Float, nullable=False)

    # 0.0 to 1.0 — how confident KROVA is in this probability estimate
    # Low confidence = shown to owner with caveat. High confidence = act on it.
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)

    # Plain language: what KROVA predicts and why
    prediction_text: Mapped[str] = mapped_column(Text, nullable=False)

    # The specific action KROVA recommends to prevent / accelerate this
    recommended_action: Mapped[str | None] = mapped_column(Text, nullable=True)

    # When the predicted event is expected to happen (ISO date string)
    predicted_for_date: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # Resolution
    status: Mapped[PredictionStatus] = mapped_column(
        String(20), nullable=False, default=PredictionStatus.active
    )

    # Whether the owner has seen / acted on this prediction
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Supporting data used to make the prediction
    evidence: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # ── Relationships ────────────────────────────────────────────────────────
    business: Mapped["Business"] = relationship(  # noqa: F821
        "Business", lazy="noload"
    )
    customer: Mapped["Customer"] = relationship(  # noqa: F821
        "Customer", lazy="noload"
    )

    # ── Indexes ──────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("idx_predictions_business_status", "business_id", "status"),
        Index("idx_predictions_customer", "customer_id"),
        Index("idx_predictions_type", "business_id", "prediction_type", "status"),
    )
