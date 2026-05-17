"""
KROVA — Redis Token Bucket Rate Limiter for Claude API
Prevents hitting Anthropic's token-per-minute rate limits.
Every Claude API call checks the bucket before sending — waits if empty.

Token bucket algorithm:
  - Bucket holds up to CLAUDE_RATE_LIMIT_TPM tokens
  - Refills at CLAUDE_RATE_LIMIT_TPM tokens per 60 seconds
  - Each call estimates token cost and consumes that amount
  - Atomic via Lua script — no race conditions between workers
"""

import asyncio
import time

from shared.cache.redis_client import redis
from shared.cache.keys import CacheKeys
from shared.config.settings import settings
from shared.utils.logging import get_logger

logger = get_logger(__name__)

# Lua script for atomic token bucket check-and-consume
# Returns 1 if tokens were consumed, 0 if not enough tokens available
_CONSUME_SCRIPT = """
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])    -- tokens per second
local requested = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now

-- Refill based on elapsed time
local elapsed = now - last_refill
local refill = elapsed * refill_rate
tokens = math.min(capacity, tokens + refill)

if tokens >= requested then
    tokens = tokens - requested
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, 120)
    return 1
else
    -- Update last_refill even on failure so refill continues accumulating
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, 120)
    return 0
end
"""

_CAPACITY = settings.claude_rate_limit_tpm
_REFILL_RATE = _CAPACITY / 60.0  # tokens per second


async def consume_tokens(estimated_tokens: int, max_wait_seconds: int = 60) -> bool:
    """
    Consume tokens from the Claude API rate limiter bucket.
    Waits up to max_wait_seconds for tokens to become available.

    If Redis is unreachable (dev mode, transient prod outage), we degrade
    gracefully and let the call through — Anthropic's own rate limits will
    catch any actual overage. The bucket is an optimisation, not a hard gate.

    Args:
        estimated_tokens: Rough estimate of how many tokens this call will use.
                          Use prompt_chars / 4 as a rough estimate.
        max_wait_seconds: How long to wait before giving up.

    Returns:
        True if tokens were consumed and the call can proceed.
        False if we timed out waiting.
    """
    key = CacheKeys.claude_token_bucket()
    deadline = time.monotonic() + max_wait_seconds

    while time.monotonic() < deadline:
        now = time.time()
        try:
            result = await redis.eval(
                _CONSUME_SCRIPT,
                1,
                key,
                _CAPACITY,
                _REFILL_RATE,
                estimated_tokens,
                now,
            )
        except Exception as exc:
            # Redis is down — let the call through. Better to risk one extra
            # API call than to block every Claude request.
            logger.debug(
                "Claude token bucket unavailable — bypassing rate limit",
                extra={"error": str(exc)},
            )
            return True

        if result == 1:
            return True

        # Not enough tokens — wait a bit and retry
        # Calculate how long until enough tokens are available
        wait = estimated_tokens / _REFILL_RATE
        wait = min(wait, deadline - time.monotonic(), 5.0)  # cap at 5 seconds per wait
        if wait > 0:
            logger.debug(
                "Claude rate limit — waiting for token bucket",
                extra={"estimated_tokens": estimated_tokens, "wait_seconds": round(wait, 2)},
            )
            await asyncio.sleep(wait)

    logger.warning(
        "Claude rate limit — timed out waiting for tokens",
        extra={"estimated_tokens": estimated_tokens, "max_wait": max_wait_seconds},
    )
    return False


def estimate_tokens(text: str) -> int:
    """
    Rough token estimate for rate limiting purposes.
    1 token ≈ 4 characters in English. Use 3 for mixed Hindi/English.
    Overestimates slightly to be safe.
    """
    return max(100, len(text) // 3)
