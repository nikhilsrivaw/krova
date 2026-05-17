"""
KROVA — Gmail API Client
Fetches new emails from a business owner's Gmail account.
Uses the Gmail API with OAuth2 credentials stored (encrypted) in the database.
Push notifications arrive via Google Cloud Pub/Sub — we fetch the actual email
content only when notified, not by polling.

Auth flow: owner completes Google OAuth → we store refresh_token encrypted in DB
→ we trade refresh_token for access_token on each API call.
"""

import base64
import email
from typing import Any

import httpx

from shared.utils.errors import GmailError
from shared.utils.logging import get_logger

logger = get_logger(__name__)

_GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1"
_TOKEN_URL = "https://oauth2.googleapis.com/token"


class ParsedEmail:
    """Flattened email — extracted from Gmail API response."""

    def __init__(
        self,
        message_id: str,
        thread_id: str,
        sender_email: str,
        sender_name: str | None,
        subject: str | None,
        body: str | None,
        timestamp_ms: str,
        raw: dict[str, Any],
    ) -> None:
        self.message_id = message_id
        self.thread_id = thread_id
        self.sender_email = sender_email
        self.sender_name = sender_name
        self.subject = subject
        self.body = body
        self.timestamp_ms = timestamp_ms
        self.raw = raw


class GmailClient:
    """
    Async Gmail API client.
    All methods take an access_token — the caller is responsible for refreshing it.
    """

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0))

    async def refresh_access_token(
        self,
        client_id: str,
        client_secret: str,
        refresh_token: str,
    ) -> str:
        """
        Exchange a refresh token for a fresh access token.
        Access tokens expire after 1 hour — call this before every API request.
        """
        try:
            response = await self._client.post(
                _TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                },
            )
            if response.status_code != 200:
                raise GmailError(
                    "Failed to refresh Gmail access token",
                    status_code=response.status_code,
                    error=response.text,
                )
            return response.json()["access_token"]
        except GmailError:
            raise
        except Exception as exc:
            raise GmailError("Token refresh network error", error=str(exc)) from exc

    async def list_messages(
        self,
        access_token: str,
        after_epoch_seconds: int,
        max_results: int = 100,
    ) -> list[str]:
        """
        List inbound message IDs received after the given epoch timestamp.
        Used by the nightly pull worker — no Pub/Sub dependency.
        Returns message IDs only — call get_message() for content.
        """
        url = f"{_GMAIL_API_BASE}/users/me/messages"
        query = f"in:inbox after:{after_epoch_seconds}"
        try:
            response = await self._client.get(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                params={"q": query, "maxResults": max_results},
            )
            if response.status_code != 200:
                raise GmailError(
                    f"Gmail list messages failed: {response.status_code}",
                    error=response.text,
                )
            data = response.json()
            return [m["id"] for m in data.get("messages", [])]
        except GmailError:
            raise
        except Exception as exc:
            raise GmailError("Gmail list messages error", error=str(exc)) from exc

    async def list_history(
        self,
        access_token: str,
        start_history_id: str,
    ) -> list[str]:
        """
        List message IDs added since the given historyId.
        Called after receiving a Pub/Sub push notification.
        Returns a list of Gmail message IDs to fetch.
        """
        url = f"{_GMAIL_API_BASE}/users/me/history"
        try:
            response = await self._client.get(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "startHistoryId": start_history_id,
                    "historyTypes": "messageAdded",
                },
            )
            if response.status_code != 200:
                raise GmailError(
                    f"Gmail history list failed: {response.status_code}",
                    error=response.text,
                )

            data = response.json()
            message_ids: list[str] = []
            for history_item in data.get("history", []):
                for added in history_item.get("messagesAdded", []):
                    msg_id = added.get("message", {}).get("id")
                    if msg_id:
                        message_ids.append(msg_id)
            return message_ids

        except GmailError:
            raise
        except Exception as exc:
            raise GmailError("Gmail history list error", error=str(exc)) from exc

    async def get_message(
        self,
        access_token: str,
        message_id: str,
    ) -> ParsedEmail:
        """
        Fetch and parse a single Gmail message.
        Extracts sender, subject, and plain-text body.
        """
        url = f"{_GMAIL_API_BASE}/users/me/messages/{message_id}"
        try:
            response = await self._client.get(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                params={"format": "full"},
            )
            if response.status_code != 200:
                raise GmailError(
                    f"Gmail get message failed: {response.status_code}",
                    message_id=message_id,
                    error=response.text,
                )

            raw = response.json()
            return self._parse_message(raw)

        except GmailError:
            raise
        except Exception as exc:
            raise GmailError(
                "Gmail get message error", message_id=message_id, error=str(exc)
            ) from exc

    def _parse_message(self, raw: dict[str, Any]) -> ParsedEmail:
        """Extract sender, subject, body from the Gmail API response."""
        headers = {
            h["name"].lower(): h["value"]
            for h in raw.get("payload", {}).get("headers", [])
        }

        from_header = headers.get("from", "")
        sender_name, sender_email = _parse_email_address(from_header)

        subject = headers.get("subject")
        body = _extract_body(raw.get("payload", {}))

        return ParsedEmail(
            message_id=raw["id"],
            thread_id=raw.get("threadId", ""),
            sender_email=sender_email,
            sender_name=sender_name,
            subject=subject,
            body=body,
            timestamp_ms=raw.get("internalDate", ""),
            raw=raw,
        )

    async def close(self) -> None:
        await self._client.aclose()


def _parse_email_address(header: str) -> tuple[str | None, str]:
    """
    Parse 'Name <email@example.com>' or 'email@example.com' format.
    Returns (name, email).
    """
    parsed = email.headerregistry.Address(addr_spec=header)
    try:
        # Try parsing as 'Name <email>' format
        if "<" in header and ">" in header:
            name = header[:header.index("<")].strip().strip('"')
            addr = header[header.index("<") + 1:header.index(">")].strip()
            return name or None, addr
        return None, header.strip()
    except Exception:
        return None, header.strip()


def _extract_body(payload: dict[str, Any]) -> str | None:
    """
    Recursively extract plain text body from Gmail message payload.
    Prefers text/plain over text/html.
    """
    mime_type = payload.get("mimeType", "")

    if mime_type == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")

    parts = payload.get("parts", [])
    # Search parts for plain text first
    for part in parts:
        if part.get("mimeType") == "text/plain":
            data = part.get("body", {}).get("data", "")
            if data:
                return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")

    # Fallback: recurse into multipart
    for part in parts:
        result = _extract_body(part)
        if result:
            return result

    return None


gmail_client = GmailClient()
