"""Connected platform model — BSP integrations (Interakt, Wati, Gupshup)."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, LargeBinary, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.database.base import KrovaBase


class ConnectedPlatform(KrovaBase):
    __tablename__ = "connected_platforms"
    __table_args__ = (
        UniqueConstraint("business_id", "platform", name="uq_platform_per_business"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)       # interakt | wati | gupshup
    api_key_encrypted: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    account_id: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Wati account ID
    source_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)  # Gupshup sender phone
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    template_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class MessageTemplate(KrovaBase):
    __tablename__ = "message_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    platform_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("connected_platforms.id", ondelete="CASCADE"), nullable=False)
    template_id: Mapped[str] = mapped_column(String(255), nullable=False)   # BSP's own template ID
    template_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)  # marketing | utility | authentication
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    body: Mapped[str] = mapped_column(String, nullable=False)                # full text with {{1}} variables
    variables: Mapped[list] = mapped_column(JSONB, default=list)             # extracted variable names
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)   # APPROVED | PENDING | REJECTED
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
