"""
KROVA — CORS Configuration

Origins allowed to call the KROVA API.

Production allow-list can be overridden at runtime via the CORS_ORIGINS env var
(comma-separated). This lets us add/remove origins from Railway's env panel
without a code change — and setting any env var on Railway forces a redeploy,
which doubles as the kick we need when Watch Paths doesn't trigger.
"""

import os

from shared.config.settings import settings

DEFAULT_PROD_ORIGINS = [
    "https://krova.space",
    "https://www.krova.space",
    "https://app.krova.space",
]

DEFAULT_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:8081",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:5173",
]


def _origins_from_env() -> list[str] | None:
    raw = os.getenv("CORS_ORIGINS", "").strip()
    if not raw:
        return None
    return [o.strip() for o in raw.split(",") if o.strip()]


ALLOWED_ORIGINS: list[str] = (
    _origins_from_env()
    or (DEFAULT_DEV_ORIGINS if settings.is_development else DEFAULT_PROD_ORIGINS)
)

# Vercel preview deployments (krova-xxxxx-yyyyy.vercel.app) — allowed via regex
ALLOWED_ORIGIN_REGEX = r"https://[a-zA-Z0-9-]+\.vercel\.app"

CORS_CONFIG = {
    "allow_origins": ALLOWED_ORIGINS,
    "allow_origin_regex": ALLOWED_ORIGIN_REGEX if not settings.is_development else None,
    "allow_methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    "allow_headers": [
        "Authorization",
        "Content-Type",
        "X-Request-ID",
        "X-Webhook-Signature",
    ],
    "expose_headers": ["X-Request-ID"],
    "allow_credentials": True,
    "max_age": 600,
}
