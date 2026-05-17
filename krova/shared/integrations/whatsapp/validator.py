"""
KROVA — Meta Webhook Signature Verification
Lives in shared/ so both the API server and any data-ingestion workers can use it
without crossing the hyphenated directory boundary.
"""

import hashlib
import hmac

from shared.config.settings import settings
from shared.utils.errors import WebhookValidationError
from shared.utils.logging import get_logger

logger = get_logger(__name__)


def verify_meta_signature(raw_body: bytes, signature_header: str | None) -> None:
    """
    Verify the X-Hub-Signature-256 header from a Meta webhook request.
    Must be called with the raw bytes body — before JSON parsing.

    Raises WebhookValidationError on any failure.
    Always returns 403 (not 400) on failure — different codes help attackers debug.
    """
    if not signature_header:
        logger.warning("Meta webhook received with no signature header")
        raise WebhookValidationError("Missing X-Hub-Signature-256 header")

    if not signature_header.startswith("sha256="):
        raise WebhookValidationError("Invalid signature format")

    received_sig = signature_header[len("sha256="):]
    expected_sig = hmac.new(
        settings.meta_app_secret.encode(),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    # compare_digest prevents timing attacks — never use == to compare MACs
    if not hmac.compare_digest(expected_sig, received_sig):
        logger.warning("Meta webhook signature mismatch — possible spoofed request")
        raise WebhookValidationError("Webhook signature verification failed")
