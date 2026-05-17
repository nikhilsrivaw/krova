"""
KROVA — Instagram Webhook Payload Parser
Instagram DMs arrive via the Messenger Platform webhook format.
Instagram comments arrive via the Changes webhook format.
Both are handled here and flattened into ParsedInstagramMessage.
"""

from typing import Any

from pydantic import BaseModel


# ── Raw Instagram DM Payload ──────────────────────────────────────────────────

class InstagramSender(BaseModel):
    id: str


class InstagramRecipient(BaseModel):
    id: str


class InstagramMessageContent(BaseModel):
    mid: str
    text: str | None = None
    attachments: list[dict[str, Any]] = []


class InstagramMessagingEvent(BaseModel):
    """One DM event inside entry.messaging[]"""
    sender: InstagramSender
    recipient: InstagramRecipient
    timestamp: int
    message: InstagramMessageContent | None = None


class InstagramEntry(BaseModel):
    id: str                                        # Instagram Business Account ID
    time: int | None = None
    messaging: list[InstagramMessagingEvent] = []  # DMs come here
    changes: list[dict[str, Any]] = []            # Comments come here


class InstagramWebhookPayload(BaseModel):
    object: str   # "instagram"
    entry: list[InstagramEntry]

    def has_messages(self) -> bool:
        return any(e.messaging for e in self.entry)

    def has_comments(self) -> bool:
        return any(
            c.get("field") == "comments"
            for e in self.entry
            for c in e.changes
        )


# ── Parsed / Flattened ────────────────────────────────────────────────────────

class ParsedInstagramMessage:
    """
    A single Instagram DM or comment extracted from the webhook payload.
    The instagram_account_id identifies which business this belongs to.
    """

    def __init__(
        self,
        instagram_account_id: str,
        sender_instagram_id: str,
        sender_name: str | None,
        message_id: str,
        message_type: str,
        content: str | None,
        timestamp: str,
        raw_payload: dict[str, Any],
    ) -> None:
        self.instagram_account_id = instagram_account_id
        self.sender_instagram_id = sender_instagram_id
        self.sender_name = sender_name
        self.message_id = message_id
        self.message_type = message_type
        self.content = content
        self.timestamp = timestamp
        self.raw_payload = raw_payload

    @classmethod
    def extract_all(
        cls, payload: InstagramWebhookPayload
    ) -> list["ParsedInstagramMessage"]:
        """
        Walk the Instagram webhook payload and extract all DMs and comments.
        Comments are included — a comment on a business post is a lead signal.
        """
        results: list[ParsedInstagramMessage] = []

        for entry in payload.entry:
            account_id = entry.id

            # ── DMs ───────────────────────────────────────────────────────────
            for event in entry.messaging:
                if event.message is None:
                    continue  # Echo, read receipts, typing indicators — skip

                msg = event.message
                content: str | None = None

                if msg.text:
                    content = msg.text
                elif msg.attachments:
                    # Image/video/audio attachment — note it but no text content
                    attachment_type = msg.attachments[0].get("type", "attachment")
                    content = f"[{attachment_type}]"

                results.append(
                    cls(
                        instagram_account_id=account_id,
                        sender_instagram_id=event.sender.id,
                        sender_name=None,  # Instagram DMs don't include sender name
                        message_id=msg.mid,
                        message_type="dm",
                        content=content,
                        timestamp=str(event.timestamp),
                        raw_payload=event.model_dump(),
                    )
                )

            # ── Comments ──────────────────────────────────────────────────────
            for change in entry.changes:
                if change.get("field") != "comments":
                    continue

                value = change.get("value", {})
                comment_id = value.get("id")
                if not comment_id:
                    continue

                from_ = value.get("from", {})
                results.append(
                    cls(
                        instagram_account_id=account_id,
                        sender_instagram_id=from_.get("id", "unknown"),
                        sender_name=from_.get("username"),
                        message_id=comment_id,
                        message_type="comment",
                        content=value.get("text"),
                        timestamp=str(value.get("timestamp", "")),
                        raw_payload=change,
                    )
                )

        return results
