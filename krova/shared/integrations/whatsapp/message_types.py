"""
KROVA — WhatsApp Webhook Payload Parser
Typed models for the Meta WhatsApp Cloud API webhook payload.
Meta's payload is deeply nested — these models flatten it into something usable.
"""

from typing import Any

from pydantic import BaseModel


# ── Raw Meta Payload Models ────────────────────────────────────────────────────
# Reflect the exact structure Meta sends. Used for validation only.

class WhatsAppTextContent(BaseModel):
    body: str


class WhatsAppMediaContent(BaseModel):
    id: str
    mime_type: str | None = None
    sha256: str | None = None
    caption: str | None = None


class WhatsAppRawMessage(BaseModel):
    """One message inside the Meta webhook payload."""
    id: str
    from_: str                    # Sender phone in E.164 (aliased — 'from' is a Python keyword)
    timestamp: str
    type: str                     # text | image | audio | video | document | sticker
    text: WhatsAppTextContent | None = None
    image: WhatsAppMediaContent | None = None
    audio: WhatsAppMediaContent | None = None
    video: WhatsAppMediaContent | None = None
    document: WhatsAppMediaContent | None = None

    model_config = {"populate_by_name": True}

    @classmethod
    def from_raw(cls, data: dict[str, Any]) -> "WhatsAppRawMessage":
        # 'from' is a reserved word — remap to from_
        if "from" in data:
            data = {**data, "from_": data.pop("from")}
        return cls(**data)


class WhatsAppContact(BaseModel):
    wa_id: str
    profile: dict[str, Any] = {}

    @property
    def name(self) -> str | None:
        return self.profile.get("name")


class WhatsAppMetadata(BaseModel):
    display_phone_number: str
    phone_number_id: str


class WhatsAppValue(BaseModel):
    messaging_product: str
    metadata: WhatsAppMetadata
    contacts: list[WhatsAppContact] = []
    messages: list[dict[str, Any]] = []   # Keep as dict — parse each individually
    statuses: list[dict[str, Any]] = []   # Delivery receipts — we log but don't store


class WhatsAppChange(BaseModel):
    value: WhatsAppValue
    field: str


class WhatsAppEntry(BaseModel):
    id: str
    changes: list[WhatsAppChange]


class WhatsAppWebhookPayload(BaseModel):
    """Top-level Meta webhook payload."""
    object: str
    entry: list[WhatsAppEntry]

    def is_whatsapp_message_event(self) -> bool:
        """Returns True only if this payload contains incoming messages (not status updates)."""
        for entry in self.entry:
            for change in entry.changes:
                if change.field == "messages" and change.value.messages:
                    return True
        return False


# ── Parsed / Flattened Models ─────────────────────────────────────────────────
# After parsing we work with these clean models instead of the nested raw payload.

class ParsedWhatsAppMessage:
    """
    A single incoming WhatsApp message extracted from the webhook payload.
    One webhook can contain multiple messages — we produce one of these per message.
    """

    def __init__(
        self,
        phone_number_id: str,
        sender_phone: str,
        sender_name: str | None,
        message_id: str,
        message_type: str,
        content: str | None,
        timestamp: str,
        raw_payload: dict[str, Any],
    ) -> None:
        self.phone_number_id = phone_number_id
        self.sender_phone = sender_phone
        self.sender_name = sender_name
        self.message_id = message_id
        self.message_type = message_type
        self.content = content
        self.timestamp = timestamp
        self.raw_payload = raw_payload

    @classmethod
    def extract_all(
        cls, payload: WhatsAppWebhookPayload
    ) -> list["ParsedWhatsAppMessage"]:
        """
        Walk the nested Meta payload and extract every incoming message.
        Returns an empty list if payload contains only status updates (delivery receipts).
        """
        results: list[ParsedWhatsAppMessage] = []

        for entry in payload.entry:
            for change in entry.changes:
                if change.field != "messages":
                    continue

                value = change.value
                phone_number_id = value.metadata.phone_number_id

                # Build a lookup from wa_id → contact name
                contact_names: dict[str, str | None] = {
                    c.wa_id: c.name for c in value.contacts
                }

                for raw_msg in value.messages:
                    try:
                        msg = WhatsAppRawMessage.from_raw(dict(raw_msg))
                    except Exception:
                        continue  # Skip malformed messages — don't crash the whole batch

                    # Extract text content
                    content: str | None = None
                    if msg.type == "text" and msg.text:
                        content = msg.text.body
                    elif msg.image and msg.image.caption:
                        content = msg.image.caption
                    elif msg.video and msg.video.caption:
                        content = msg.video.caption
                    elif msg.document and msg.document.caption:
                        content = msg.document.caption

                    results.append(
                        cls(
                            phone_number_id=phone_number_id,
                            sender_phone=msg.from_,
                            sender_name=contact_names.get(msg.from_),
                            message_id=msg.id,
                            message_type=msg.type,
                            content=content,
                            timestamp=msg.timestamp,
                            raw_payload=raw_msg,
                        )
                    )

        return results
