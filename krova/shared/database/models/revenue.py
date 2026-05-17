"""
KROVA — Revenue Entry Model (Layer 10: Financial Intelligence Layer)
Simple income tracking — not a bookkeeping tool, not GST filing.
The intelligence layer that tells owners what their money means in plain language.
Connects financial data with relationship data — KROVA knows if the slow-paying
client is also the difficult client, and can say so.
"""

import uuid
from enum import Enum

from sqlalchemy import Float, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database.base import KrovaBase


class RevenueStatus(str, Enum):
    expected = "expected"   # Invoice raised, not yet paid
    received = "received"   # Money in account
    overdue = "overdue"     # Past due date, not paid
    cancelled = "cancelled" # Cancelled / refunded


class PaymentMethod(str, Enum):
    upi = "upi"
    bank_transfer = "bank_transfer"
    cash = "cash"
    razorpay = "razorpay"
    cheque = "cheque"
    other = "other"


class RevenueEntry(KrovaBase):
    """
    One row = one income event (invoice, payment, or expected revenue).
    Linked to a customer so KROVA can say: "This client owes you ₹45,000 and
    hasn't responded to messages in 8 days."

    Can be created manually by the owner or via Razorpay webhook (future).
    """

    __tablename__ = "revenue_entries"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )

    # NULL = general business income not tied to a specific customer
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Amount in INR (paise stored as float rupees for simplicity)
    amount: Mapped[float] = mapped_column(Float, nullable=False)

    status: Mapped[RevenueStatus] = mapped_column(
        String(20), nullable=False, default=RevenueStatus.expected
    )

    payment_method: Mapped[PaymentMethod | None] = mapped_column(
        String(20), nullable=True
    )

    # ISO date string — when the money was or is expected to be received
    payment_date: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # ISO date string — when payment becomes overdue
    due_date: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # Free text — what this payment is for
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # For Razorpay / UPI reference
    external_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Additional metadata (Razorpay response, UPI transaction ID, etc.)
    extra_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # ── Relationships ────────────────────────────────────────────────────────
    business: Mapped["Business"] = relationship(  # noqa: F821
        "Business", lazy="noload"
    )
    customer: Mapped["Customer"] = relationship(  # noqa: F821
        "Customer", lazy="noload"
    )

    # ── Indexes ──────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("idx_revenue_business_status", "business_id", "status"),
        Index("idx_revenue_business_date", "business_id", "payment_date"),
        Index("idx_revenue_customer", "customer_id"),
        Index("idx_revenue_overdue", "business_id", "due_date", "status"),
    )
