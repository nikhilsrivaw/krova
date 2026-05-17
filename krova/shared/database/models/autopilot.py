"""
KROVA — Autopilot Rule Model (Layer 9: Autopilot Layer)
Owner defines intent once. KROVA executes forever.
Rules are written in the owner's own communication style — learned over months.
The configuration represents their business logic. Cannot be exported or replicated elsewhere.
"""

import uuid
from enum import Enum

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database.base import KrovaBase


class AutopilotTrigger(str, Enum):
    no_reply_days = "no_reply_days"          # Customer hasn't replied in N days
    no_contact_days = "no_contact_days"      # Business hasn't contacted in N days
    status_changed_to = "status_changed_to"  # Customer moved to a specific status
    new_lead = "new_lead"                    # New customer created
    health_score_below = "health_score_below"  # Health score drops below threshold
    converted = "converted"                  # Customer just converted
    scheduled_weekly = "scheduled_weekly"    # Every week on a specific day
    scheduled_daily = "scheduled_daily"      # Every day at a specific time


class AutopilotAction(str, Enum):
    send_message = "send_message"       # Send a follow-up message
    create_action = "create_action"     # Create a pending action for owner approval
    send_briefing = "send_briefing"     # Send a summary to owner on WhatsApp
    update_status = "update_status"     # Change customer status


class AutopilotRule(KrovaBase):
    """
    One rule = one automated behaviour.
    The owner sets it once; KROVA evaluates it every night and executes when triggered.

    Example rules:
    - "If lead hasn't replied in 3 days → send follow-up automatically"
    - "If customer just converted → send thank you + ask for review"
    - "Every Friday → send me a weekly summary"
    - "If health score drops below 30 → alert me immediately"
    """

    __tablename__ = "autopilot_rules"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Human-readable name the owner gave this rule
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # What triggers this rule
    trigger_type: Mapped[AutopilotTrigger] = mapped_column(String(30), nullable=False)

    # Trigger configuration — depends on trigger_type:
    # no_reply_days: {"days": 3}
    # status_changed_to: {"status": "cold"}
    # health_score_below: {"threshold": 30}
    # scheduled_weekly: {"day": "friday", "time": "08:00"}
    trigger_config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # What action to take when triggered
    action_type: Mapped[AutopilotAction] = mapped_column(String(30), nullable=False)

    # For send_message: the message template (written in owner's voice by KROVA)
    # For send_briefing: null (KROVA generates it fresh)
    # Supports {{customer_name}}, {{days_since_contact}} etc.
    message_template: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Channel to use when sending (whatsapp | instagram | gmail)
    channel: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Whether to require owner approval before executing (false = fully autonomous)
    requires_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Is this rule currently active?
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # How many times this rule has fired
    execution_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Cooldown: don't fire this rule for the same customer within N days
    cooldown_days: Mapped[int] = mapped_column(Integer, nullable=False, default=7)

    # Optional: only apply to customers matching this status
    applies_to_status: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # ── Relationships ────────────────────────────────────────────────────────
    business: Mapped["Business"] = relationship(  # noqa: F821
        "Business", lazy="noload"
    )

    # ── Indexes ──────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("idx_autopilot_business_active", "business_id", "is_active"),
        Index("idx_autopilot_trigger", "business_id", "trigger_type", "is_active"),
    )
