"""Growth report model — the growth blocker report generated after 90 days of data."""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.database.base import KrovaBase


class GrowthReport(KrovaBase):
    __tablename__ = "growth_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    blockers: Mapped[list] = mapped_column(JSONB, default=list)
    # Each blocker: {title, description, revenue_impact, action_item, priority}
    total_revenue_leakage_estimate: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    top_blocker: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
