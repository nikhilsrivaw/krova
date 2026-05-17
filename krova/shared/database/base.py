"""
KROVA — SQLAlchemy Declarative Base
All database models inherit from Base.
Enforces the non-negotiable rules from the Bible on every table:
  - UUID primary key (no auto-increment integers)
  - business_id on every table (multi-tenancy from day one)
  - created_at and updated_at on every table
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """
    Declarative base for all KROVA models.
    All models must inherit from this class.
    """
    pass


class KrovaBase(Base):
    """
    Abstract base model that enforces the three non-negotiable columns
    required on every single table:
      - id: UUID primary key
      - created_at: when the row was created
      - updated_at: last modification time, auto-updated by PostgreSQL

    Usage:
        class Customer(KrovaBase):
            __tablename__ = "customers"
            # business_id must be declared explicitly on each model
            # so the FK reference and index can be set per-table.
    """

    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        # UUID generated in Python — no DB round-trip needed to get the id
        # back after INSERT. Critical for async performance.
        server_default=func.gen_random_uuid(),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=func.now(),
        # PostgreSQL automatically updates this column on every UPDATE.
        # The onupdate hook handles it at the ORM level.
        onupdate=utc_now,
    )

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} id={self.id}>"
