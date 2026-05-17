"""
KROVA — Redis Client
Single async Redis connection pool shared across the entire application.
Used for: caching, BullMQ queues, Claude API rate limiter token bucket.
"""

import json
from typing import Any
from uuid import UUID

import redis.asyncio as aioredis

from shared.config.settings import settings
from shared.utils.logging import get_logger

logger = get_logger(__name__)

# ── Connection pool ───────────────────────────────────────────────────────────
# Created once at module import. All parts of the app share this pool.
# decode_responses=True — all keys and values come back as strings, not bytes.
_pool = aioredis.ConnectionPool.from_url(
    settings.redis_url,
    decode_responses=True,
    max_connections=20,
)

redis: aioredis.Redis = aioredis.Redis(connection_pool=_pool)


async def check_redis_connection() -> bool:
    """Health check — verifies Redis is reachable. Called by /health endpoint."""
    try:
        await redis.ping()
        logger.info("Redis connection OK")
        return True
    except Exception as exc:
        logger.error("Redis connection failed", extra={"error": str(exc)})
        return False


# ── Typed cache helpers ───────────────────────────────────────────────────────

def _serialize(value: Any) -> str:
    """Serialize any value to a JSON string for storage in Redis."""
    return json.dumps(value, default=str)


def _deserialize(raw: str | None) -> Any:
    """Deserialize a JSON string from Redis. Returns None if raw is None."""
    if raw is None:
        return None
    return json.loads(raw)


# Cache calls must NEVER break the request. If Redis is unreachable (dev mode,
# transient prod outage, network blip), we degrade gracefully: read becomes a
# cache miss, write becomes a no-op. The endpoint still serves real data from
# the source of truth (Postgres).

async def get_cached(key: str) -> Any:
    """
    Fetch a value from Redis cache.
    Returns None on cache miss, expiry, or any Redis error.
    """
    try:
        raw = await redis.get(key)
        return _deserialize(raw)
    except Exception as exc:
        logger.debug("Cache read failed — treating as miss", extra={"key": key, "error": str(exc)})
        return None


async def set_cached(key: str, value: Any, ttl_seconds: int) -> None:
    """
    Store a value in Redis with an expiry time.
    ttl_seconds=0 means no expiry (use sparingly).
    Silently no-ops on Redis errors so the request keeps moving.
    """
    try:
        serialized = _serialize(value)
        if ttl_seconds > 0:
            await redis.setex(key, ttl_seconds, serialized)
        else:
            await redis.set(key, serialized)
    except Exception as exc:
        logger.debug("Cache write failed — skipping", extra={"key": key, "error": str(exc)})


async def invalidate(key: str) -> None:
    """Delete a cache key immediately. No-ops on Redis errors."""
    try:
        await redis.delete(key)
    except Exception as exc:
        logger.debug("Cache invalidate failed", extra={"key": key, "error": str(exc)})


async def invalidate_pattern(pattern: str) -> None:
    """
    Delete all keys matching a pattern (e.g. "krova:business:*").
    Uses SCAN — never KEYS — so safe in production. No-ops on Redis errors.
    """
    try:
        cursor = 0
        while True:
            cursor, keys = await redis.scan(cursor, match=pattern, count=100)
            if keys:
                await redis.delete(*keys)
            if cursor == 0:
                break
    except Exception as exc:
        logger.debug("Cache scan failed", extra={"pattern": pattern, "error": str(exc)})
