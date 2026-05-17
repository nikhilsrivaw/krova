"""
KROVA — Job Type Definitions
Every job pushed to a queue is one of these Pydantic models.
Typed jobs mean a typo in the producer causes an error at enqueue time,
not a silent failure deep inside the worker.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class JobType(str, Enum):
    # Ingestion queue — save incoming messages
    process_whatsapp_message = "process_whatsapp_message"
    process_instagram_message = "process_instagram_message"

    # Email queue — classify and save emails
    process_gmail_email = "process_gmail_email"
    process_outlook_email = "process_outlook_email"

    # Analysis queue — nightly AI analysis
    run_business_analysis = "run_business_analysis"

    # Notification queue — morning briefings to owner
    send_morning_briefing = "send_morning_briefing"

    # Action queue — HIGH PRIORITY: send an approved message
    execute_action = "execute_action"


class BaseJob(BaseModel):
    """Every job carries an id, type, attempt count, and creation time."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    type: JobType
    attempts: int = 0
    max_attempts: int = 3
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def model_dump_json_str(self) -> str:
        return self.model_dump_json()


# ── Ingestion Jobs ─────────────────────────────────────────────────────────────

class WhatsAppMessageJob(BaseJob):
    """
    Enqueued for every incoming WhatsApp message.
    Contains everything the message_processor needs to save it without
    making any external API calls.
    """
    type: JobType = JobType.process_whatsapp_message

    # Which business this message belongs to — looked up by phone_number_id
    phone_number_id: str       # Meta's phone number ID for this business
    sender_phone: str          # E.164 format e.g. +919876543210
    sender_name: str | None    # From Meta contacts block — may be None
    message_id: str            # Meta's message ID — prevents duplicate processing
    message_type: str          # text | image | audio | video | document
    content: str | None        # Text content — None for media messages
    timestamp: str             # Unix timestamp string from Meta
    raw_payload: dict[str, Any]  # Full Meta webhook payload for debugging


class InstagramMessageJob(BaseJob):
    """Enqueued for every incoming Instagram DM or comment."""
    type: JobType = JobType.process_instagram_message

    instagram_account_id: str  # Business's Instagram account ID
    sender_instagram_id: str
    sender_name: str | None
    message_id: str
    message_type: str          # dm | comment
    content: str | None
    timestamp: str
    raw_payload: dict[str, Any]


# ── Email Jobs ─────────────────────────────────────────────────────────────────

class GmailEmailJob(BaseJob):
    """Enqueued when Google Pub/Sub notifies us of a new Gmail message."""
    type: JobType = JobType.process_gmail_email

    email_address: str         # Gmail address of the connected business account
    history_id: str            # Gmail history ID from the push notification — used to list new message IDs


# ── Analysis Jobs ──────────────────────────────────────────────────────────────

class BusinessAnalysisJob(BaseJob):
    """Enqueued for each business during the nightly batch analysis run."""
    type: JobType = JobType.run_business_analysis

    business_id: uuid.UUID
    analysis_date: str         # YYYY-MM-DD in IST
    max_attempts: int = 5      # More retries for analysis — expensive to miss


# ── Notification Jobs ──────────────────────────────────────────────────────────

class MorningBriefingJob(BaseJob):
    """Enqueued after analysis completes — sends briefing to owner's WhatsApp."""
    type: JobType = JobType.send_morning_briefing

    business_id: uuid.UUID
    briefing_text: str         # Plain language summary from Claude
    owner_phone: str           # WhatsApp number to send to


# ── Action Jobs ────────────────────────────────────────────────────────────────

class ExecuteActionJob(BaseJob):
    """
    Enqueued immediately when owner taps HAAN (approve).
    HIGH PRIORITY queue — must be processed within 5 seconds.
    """
    type: JobType = JobType.execute_action
    max_attempts: int = 5      # Never lose a message the owner approved

    action_id: uuid.UUID
    business_id: uuid.UUID
    customer_id: uuid.UUID
    channel: str               # whatsapp | instagram
    message_content: str
    # Channel-specific recipient identifier
    recipient_phone: str | None = None      # For WhatsApp
    recipient_instagram_id: str | None = None  # For Instagram
    # Business's channel credentials (encrypted tokens fetched before enqueue)
    phone_number_id: str | None = None      # Meta phone number ID for sending
