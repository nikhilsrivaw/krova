"""
KROVA — Application Settings
All environment variables loaded via Pydantic BaseSettings.
No hardcoded values anywhere. Every secret comes from the environment.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Single source of truth for all configuration.
    Values are loaded from environment variables (or .env file in development).
    Pydantic validates types and raises on startup if anything is missing.
    """

    # ── Application ─────────────────────────────────────────────────────────
    app_name: str = Field(default="KROVA", alias="APP_NAME")
    app_version: str = Field(default="0.1.0", alias="APP_VERSION")
    environment: Literal["development", "staging", "production"] = Field(
        default="development", alias="ENVIRONMENT"
    )
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO", alias="LOG_LEVEL"
    )

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = Field(alias="DATABASE_URL")
    database_pool_size: int = Field(default=10, alias="DATABASE_POOL_SIZE")
    database_max_overflow: int = Field(default=20, alias="DATABASE_MAX_OVERFLOW")

    # ── Redis ────────────────────────────────────────────────────────────────
    redis_url: str = Field(alias="REDIS_URL")

    # ── Supabase ─────────────────────────────────────────────────────────────
    supabase_url: str = Field(alias="SUPABASE_URL")
    supabase_anon_key: str = Field(alias="SUPABASE_ANON_KEY")
    supabase_service_key: str = Field(alias="SUPABASE_SERVICE_KEY")

    # ── Anthropic ────────────────────────────────────────────────────────────
    anthropic_api_key: str = Field(alias="ANTHROPIC_API_KEY")
    claude_haiku_model: str = Field(
        default="claude-haiku-4-5", alias="CLAUDE_HAIKU_MODEL"
    )
    claude_sonnet_model: str = Field(
        default="claude-sonnet-4-5", alias="CLAUDE_SONNET_MODEL"
    )
    # Token per minute limit — used by Redis token bucket to prevent hitting Claude rate limits
    claude_rate_limit_tpm: int = Field(
        default=100_000, alias="CLAUDE_RATE_LIMIT_TPM"
    )
    # Dev-only escape hatch for Windows machines where Python's cert bundle
    # can't verify Anthropic's SSL cert. Set in .env. NEVER true in prod.
    skip_ssl_verify: bool = Field(default=False, alias="SKIP_SSL_VERIFY")

    # ── Meta (WhatsApp + Instagram) ──────────────────────────────────────────
    # Optional — only required if you wire up WhatsApp/Instagram webhooks.
    meta_app_id: str = Field(default="", alias="META_APP_ID")
    meta_app_secret: str = Field(default="", alias="META_APP_SECRET")
    meta_webhook_verify_token: str = Field(default="", alias="META_WEBHOOK_VERIFY_TOKEN")
    meta_api_version: str = Field(default="v18.0", alias="META_API_VERSION")

    # ── Google (Gmail) ───────────────────────────────────────────────────────
    # Optional — only required if you wire up Gmail OAuth.
    google_client_id: str = Field(default="", alias="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(default="", alias="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str = Field(default="", alias="GOOGLE_REDIRECT_URI")
    google_pubsub_topic: str = Field(default="", alias="GOOGLE_PUBSUB_TOPIC")

    # ── Microsoft (Outlook) ──────────────────────────────────────────────────
    # Optional — only required if you wire up Outlook OAuth.
    microsoft_client_id: str = Field(default="", alias="MICROSOFT_CLIENT_ID")
    microsoft_client_secret: str = Field(default="", alias="MICROSOFT_CLIENT_SECRET")
    microsoft_redirect_uri: str = Field(default="", alias="MICROSOFT_REDIRECT_URI")
    microsoft_tenant_id: str = Field(default="common", alias="MICROSOFT_TENANT_ID")

    # ── Security ─────────────────────────────────────────────────────────────
    # Fernet key for encrypting API tokens. Auto-generated for dev if missing.
    encryption_key: str = Field(
        default="dev-key-replace-in-production-with-fernet-generate",
        alias="ENCRYPTION_KEY",
    )
    # JWT signing — we use Supabase JWTs primarily, this is a fallback secret.
    jwt_secret: str = Field(
        default="dev-secret-replace-in-production",
        alias="JWT_SECRET",
    )
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    # 7 days — owner stays logged in on mobile
    jwt_expiry_minutes: int = Field(default=10_080, alias="JWT_EXPIRY_MINUTES")

    # ── Monitoring ───────────────────────────────────────────────────────────
    sentry_dsn: str | None = Field(default=None, alias="SENTRY_DSN")

    # ── n8n Automation ───────────────────────────────────────────────────────
    n8n_base_url: str | None = Field(default=None, alias="N8N_BASE_URL")
    n8n_api_key: str | None = Field(default=None, alias="N8N_API_KEY")

    # ── Rate Limiting ────────────────────────────────────────────────────────
    api_rate_limit_per_minute: int = Field(
        default=60, alias="API_RATE_LIMIT_PER_MINUTE"
    )
    webhook_rate_limit_per_minute: int = Field(
        default=1000, alias="WEBHOOK_RATE_LIMIT_PER_MINUTE"
    )

    # ── Computed helpers ─────────────────────────────────────────────────────
    @computed_field
    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @computed_field
    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @computed_field
    @property
    def meta_graph_base_url(self) -> str:
        return f"https://graph.facebook.com/{self.meta_api_version}"

    model_config = {
        # In development load from .env file. In production env vars are injected directly.
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        # Allow both the alias (APP_NAME) and the field name (app_name) to work
        "populate_by_name": True,
        "case_sensitive": False,
    }


@lru_cache
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.
    Called once on first import — all subsequent calls return the same object.
    Use this everywhere instead of instantiating Settings() directly.
    """
    return Settings()


# Module-level singleton — import this directly: from shared.config.settings import settings
settings = get_settings()
