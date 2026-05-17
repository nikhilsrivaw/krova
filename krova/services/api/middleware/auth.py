"""
KROVA — CORS Configuration
Controls which origins can call the KROVA API.
Strict in production — only the dashboard and mobile app origins allowed.
Permissive in development — localhost on any port works.
"""

from shared.config.settings import settings

# Origins allowed to make cross-origin requests to the API
ALLOWED_ORIGINS: list[str] = (
    # Development — allow all localhost ports the apps run on
    [
        "http://localhost:3000",   # Web dashboard (Next.js)
        "http://localhost:3001",   # Mobile PWA (Next.js)
        "http://localhost:5173",   # Alternative Vite port
        "http://localhost:8081",   # Expo dev (legacy)
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
    ]
    if settings.is_development
    # Production — only the deployed app origins
    else [
        "https://dashboard.krova.ai",
        "https://app.krova.ai",
        "https://krova.ai",
        "https://www.krova.ai",
    ]
)

CORS_CONFIG = {
    "allow_origins": ALLOWED_ORIGINS,
    # Only the methods our API actually uses
    "allow_methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    "allow_headers": [
        "Authorization",
        "Content-Type",
        "X-Request-ID",
        "X-Webhook-Signature",  # Meta webhook signature header
    ],
    # Expose X-Request-ID so the frontend can log it for debugging
    "expose_headers": ["X-Request-ID"],
    # Allow Authorization header — required for JWT auth
    "allow_credentials": True,
    # Cache preflight response for 10 minutes
    "max_age": 600,
}
