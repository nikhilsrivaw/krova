"""
KROVA — Custom Exception Hierarchy
All application exceptions live here.
Never raise a bare Exception — always use one of these.
Specific types allow callers to handle exactly what they need.
"""

from http import HTTPStatus
from uuid import UUID


class KrovaError(Exception):
    """
    Base exception for all KROVA errors.
    Carries an HTTP status code and a machine-readable code string
    so FastAPI exception handlers can return consistent API responses.
    """

    status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR
    code: str = "internal_error"

    def __init__(self, message: str, **context: object) -> None:
        super().__init__(message)
        self.message = message
        # Extra context (business_id, customer_id, etc.) for structured logging
        self.context = context

    def __repr__(self) -> str:
        ctx = ", ".join(f"{k}={v}" for k, v in self.context.items())
        return f"{self.__class__.__name__}({self.message!r}{', ' + ctx if ctx else ''})"


# ── Configuration ────────────────────────────────────────────────────────────

class ConfigurationError(KrovaError):
    """Raised when required configuration is missing or invalid at startup."""

    status_code = HTTPStatus.INTERNAL_SERVER_ERROR
    code = "configuration_error"


# ── Authentication & Authorization ───────────────────────────────────────────

class AuthenticationError(KrovaError):
    """Raised when a request cannot be authenticated (missing or invalid token)."""

    status_code = HTTPStatus.UNAUTHORIZED
    code = "authentication_error"


class AuthorizationError(KrovaError):
    """Raised when an authenticated user tries to access a resource they do not own."""

    status_code = HTTPStatus.FORBIDDEN
    code = "authorization_error"


# ── Webhook Validation ────────────────────────────────────────────────────────

class WebhookValidationError(KrovaError):
    """
    Raised when a webhook payload fails signature verification.
    Could be a replay attack or a misconfigured secret.
    Always return 403 — never 400 — to avoid giving attackers info.
    """

    status_code = HTTPStatus.FORBIDDEN
    code = "webhook_validation_error"


class WebhookParseError(KrovaError):
    """Raised when a webhook payload is structurally invalid or missing required fields."""

    status_code = HTTPStatus.BAD_REQUEST
    code = "webhook_parse_error"


# ── Database ─────────────────────────────────────────────────────────────────

class DatabaseError(KrovaError):
    """Raised on unexpected database errors (connection failure, query error)."""

    status_code = HTTPStatus.INTERNAL_SERVER_ERROR
    code = "database_error"


class NotFoundError(KrovaError):
    """
    Raised when a requested resource does not exist.
    Always pass the resource type and id for clear logging.
    """

    status_code = HTTPStatus.NOT_FOUND
    code = "not_found"

    def __init__(self, resource: str, resource_id: UUID | str) -> None:
        super().__init__(
            f"{resource} not found: {resource_id}",
            resource=resource,
            resource_id=str(resource_id),
        )


class BusinessNotFoundError(NotFoundError):
    """Raised when a business_id does not match any active business."""

    code = "business_not_found"

    def __init__(self, business_id: UUID) -> None:
        super().__init__("Business", business_id)


class CustomerNotFoundError(NotFoundError):
    """Raised when a customer cannot be found for a given business."""

    code = "customer_not_found"

    def __init__(self, customer_id: UUID) -> None:
        super().__init__("Customer", customer_id)


# ── Queue ────────────────────────────────────────────────────────────────────

class QueueError(KrovaError):
    """Raised when a job cannot be enqueued or a worker encounters an unrecoverable error."""

    status_code = HTTPStatus.INTERNAL_SERVER_ERROR
    code = "queue_error"


# ── AI / Claude ──────────────────────────────────────────────────────────────

class ClaudeError(KrovaError):
    """Base error for all Claude API failures."""

    status_code = HTTPStatus.BAD_GATEWAY
    code = "claude_error"


class ClaudeRateLimitError(ClaudeError):
    """Raised when the Claude API returns a rate limit response."""

    status_code = HTTPStatus.TOO_MANY_REQUESTS
    code = "claude_rate_limit"


class ClaudeResponseParseError(ClaudeError):
    """Raised when Claude returns a response that cannot be parsed as expected JSON."""

    status_code = HTTPStatus.INTERNAL_SERVER_ERROR
    code = "claude_parse_error"


class AnalysisError(KrovaError):
    """Raised when nightly analysis fails for a specific business."""

    status_code = HTTPStatus.INTERNAL_SERVER_ERROR
    code = "analysis_error"


# ── Integrations ─────────────────────────────────────────────────────────────

class IntegrationError(KrovaError):
    """Base error for external API failures (Meta, Google, Microsoft)."""

    status_code = HTTPStatus.BAD_GATEWAY
    code = "integration_error"


class WhatsAppError(IntegrationError):
    """Raised when the Meta WhatsApp Cloud API returns an error."""

    code = "whatsapp_error"


class InstagramError(IntegrationError):
    """Raised when the Instagram Graph API returns an error."""

    code = "instagram_error"


class GmailError(IntegrationError):
    """Raised when the Gmail API returns an error."""

    code = "gmail_error"


class OutlookError(IntegrationError):
    """Raised when the Microsoft Graph API returns an error."""

    code = "outlook_error"


# ── Encryption ───────────────────────────────────────────────────────────────

class EncryptionError(KrovaError):
    """Raised when encrypting or decrypting an API token fails."""

    status_code = HTTPStatus.INTERNAL_SERVER_ERROR
    code = "encryption_error"


# ── Rate Limiting ─────────────────────────────────────────────────────────────

class RateLimitError(KrovaError):
    """Raised when the caller has exceeded the API rate limit."""

    status_code = HTTPStatus.TOO_MANY_REQUESTS
    code = "rate_limit_exceeded"
