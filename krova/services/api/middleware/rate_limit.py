"""
KROVA — Rate Limiting Middleware
Two separate limits:
  - API endpoints: 60 req/min per authenticated user
  - Webhook endpoints: 1000 req/min per IP (Meta fires lots of webhooks)
Uses slowapi (Limits library) backed by Redis for distributed rate limiting.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from shared.config.settings import settings

# Key function for API endpoints — rate limit per authenticated user IP.
# In the future this can be changed to limit per user_id by reading the JWT.
# In dev: in-memory storage (no Redis dependency). In prod: Redis-backed
# so multiple workers share counts.
_storage_uri = "memory://" if settings.is_development else settings.redis_url
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.api_rate_limit_per_minute}/minute"],
    storage_uri=_storage_uri,
)

# Webhook limit — separate, much higher, applied only on /webhooks/* routes
WEBHOOK_LIMIT = f"{settings.webhook_rate_limit_per_minute}/minute"

# API limit — applied on all other routes
API_LIMIT = f"{settings.api_rate_limit_per_minute}/minute"
