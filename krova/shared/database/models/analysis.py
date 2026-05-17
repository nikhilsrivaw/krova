"""
KROVA — Analysis Result Model
One row = Claude's nightly decision about one customer for one business.
The web dashboard reads from this table — no live AI calls needed.
The mobile app conversation is seeded with the latest rows from this table.
"""

import uuid
from enum import Enum

from sqlalchemy import Date, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database.base import KrovaBase


class AnalysisStatus(str, Enum):
    """Per-business processing state for the nightly job — enables resumability."""
    pending = "pending"       # Not yet processed tonight
    processing = "processing" # Currently being sent to Claude Batch API
    completed = "completed"   # Claude returned results, saved to DB
    failed = "failed"         # All retries exhausted — needs manual review


class CustomerUrgency(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class SuggestedAction(str, Enum):
    follow_up = "follow_up"    # Send a follow-up message
    check_in = "check_in"      # Casual check-in, not pushy
    close = "close"            # Ask for the decision
    nothing = "nothing"        # Leave them alone


class AnalysisResult(KrovaBase):
    """
    Claude's per-customer decision from the nightly batch run.
    Created fresh every night — historical rows are kept for trend analysis.
    The dashboard always reads the latest row per customer per business.
    """

    __tablename__ = "analysis_results"

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

    # Which night this analysis is for (YYYY-MM-DD in IST)
    analysis_date: Mapped[str] = mapped_column(Date, nullable=False)

    # The batch request ID from Anthropic — used to poll for results
    batch_request_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Processing state — enables resumable nightly job
    status: Mapped[AnalysisStatus] = mapped_column(
        String(20), nullable=False, default=AnalysisStatus.pending
    )

    # ── Claude's decisions ───────────────────────────────────────────────────
    # These fields are null until status = completed

    customer_status: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="hot | warm | cold | lost | converted — mirrors CustomerStatus enum",
    )

    urgency: Mapped[CustomerUrgency | None] = mapped_column(
        String(10), nullable=True
    )

    suggested_action: Mapped[SuggestedAction | None] = mapped_column(
        String(20), nullable=True
    )

    # The exact message Claude recommends sending to this customer
    # Written in the customer's language and tone
    suggested_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Claude's reasoning — shown to owner in the mobile app if they ask "why?"
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Business-level analysis ──────────────────────────────────────────────
    # Only populated on the "summary row" (customer_id = NULL) — one per business per night

    morning_briefing: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Plain language WhatsApp briefing sent to owner at 8 AM",
    )

    # Full structured output from Claude — preserved for debugging
    raw_claude_output: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # ── Relationships ────────────────────────────────────────────────────────
    business: Mapped["Business"] = relationship(  # noqa: F821
        "Business", back_populates="analysis_results", lazy="noload"
    )
    customer: Mapped["Customer"] = relationship(  # noqa: F821
        "Customer", back_populates="analysis_results", lazy="noload"
    )

    # ── Indexes ──────────────────────────────────────────────────────────────
    __table_args__ = (
        # The Bible's required index: latest analysis for a business
        Index("idx_analysis_business_date", "business_id", "analysis_date"),
        Index("idx_analysis_business_customer", "business_id", "customer_id", "analysis_date"),
        Index("idx_analysis_status", "status"),
        Index("idx_analysis_batch", "batch_request_id"),
    )
