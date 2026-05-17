"""
KROVA — Conversation Session Model
Tracks the mobile app chat sessions between the owner and KROVA.
Each session stores up to 20 messages of context for Claude.
Sessions are per-business — starting a new chat creates a new session.
"""

import uuid

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.database.base import KrovaBase


class ConversationSession(KrovaBase):
    """
    Represents one mobile app chat session.
    The last 20 messages of the active session are fetched and included
    in every Claude Sonnet prompt for real-time conversation continuity.
    """

    __tablename__ = "conversation_sessions"

    # Multi-tenancy
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Who started this session
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Session messages stored as a JSON array — [{role, content, timestamp}, ...]
    # Max 20 entries, oldest dropped when limit reached.
    # Stored in JSON for simplicity — no need for a separate messages table here.
    messages: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    # Human-readable title — derived from the first message (e.g. "Aaj kya hua?")
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Is this the currently active session? Only one active session per business at a time.
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)

    # ── Indexes ──────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("idx_sessions_business_active", "business_id", "is_active"),
        Index("idx_sessions_user", "user_id"),
    )
