"""
KROVA — Cache Dependency
Provides the Redis client as a FastAPI dependency.
Routes that need to read/write cache import this.

Usage:
    from services.api.dependencies.cache import get_cache, CacheDep

    @router.get("/summary")
    async def get_summary(cache = Depends(get_cache)):
        cached = await cache.get_cached(CacheKeys.business_summary(business_id))
        ...
"""

from typing import Annotated

from fastapi import Depends

from shared.cache.redis_client import (
    redis,
    get_cached,
    set_cached,
    invalidate,
    invalidate_pattern,
)
from shared.cache.keys import CacheKeys


class CacheClient:
    """Thin wrapper that bundles the helpers and key factory for use in routes."""

    keys = CacheKeys

    async def get(self, key: str):
        return await get_cached(key)

    async def set(self, key: str, value, ttl_seconds: int) -> None:
        await set_cached(key, value, ttl_seconds)

    async def delete(self, key: str) -> None:
        await invalidate(key)

    async def delete_pattern(self, pattern: str) -> None:
        await invalidate_pattern(pattern)


_cache_client = CacheClient()


async def get_cache() -> CacheClient:
    """FastAPI dependency — yields the shared CacheClient instance."""
    return _cache_client


# Annotated shorthand for use in route signatures
CacheDep = Annotated[CacheClient, Depends(get_cache)]
