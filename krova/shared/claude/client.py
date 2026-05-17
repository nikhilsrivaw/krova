"""
KROVA — Claude Standard API Client
Used for: real-time mobile app conversations, email classification.
NOT used for nightly analysis — that uses the Batch API (50% cheaper).

Features:
  - Async via anthropic.AsyncAnthropic
  - Automatic retry on rate limit and transient errors
  - Token bucket rate limiting via Redis (prevents hitting API limits)
  - Structured error types that map to KrovaError hierarchy
"""

import asyncio
from typing import AsyncGenerator

import anthropic
import httpx

from shared.config.settings import settings
from shared.queue.rate_limiter import consume_tokens, estimate_tokens
from shared.utils.errors import ClaudeError, ClaudeRateLimitError, ClaudeResponseParseError
from shared.utils.logging import get_logger

logger = get_logger(__name__)

_MAX_RETRIES = 3
_RETRY_DELAYS = [2, 5, 10]


def _build_http_client() -> httpx.AsyncClient | None:
    """
    Build the httpx client used by the Anthropic SDK.
    On Windows in dev, the Python SSL cert chain often can't verify
    Anthropic's certificate. Set SKIP_SSL_VERIFY=1 in .env to bypass.
    """
    if settings.skip_ssl_verify and settings.is_development:
        logger.warning(
            "SKIP_SSL_VERIFY=1 — Claude SDK will NOT verify Anthropic's SSL cert. "
            "Dev convenience only. Never set this in production."
        )
        return httpx.AsyncClient(verify=False)
    return None


class ClaudeClient:
    """
    Async wrapper around the Anthropic SDK for standard (non-batch) calls.
    One singleton shared across all workers — the SDK manages connection pooling.
    """

    def __init__(self) -> None:
        http_client = _build_http_client()
        if http_client:
            self._client = anthropic.AsyncAnthropic(
                api_key=settings.anthropic_api_key,
                http_client=http_client,
            )
        else:
            self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def complete(
        self,
        prompt: str,
        model: str | None = None,
        max_tokens: int = 1024,
        system: str | None = None,
    ) -> str:
        """
        Send a single prompt and return the text response.
        Checks rate limiter, retries on transient errors.

        Args:
            prompt: User message content
            model: Defaults to claude-haiku for cost-efficiency
            max_tokens: Max tokens in response
            system: Optional system prompt
        """
        model = model or settings.claude_haiku_model

        # Rate limit check — wait if bucket empty
        estimated = estimate_tokens(prompt) + max_tokens
        if not await consume_tokens(estimated):
            raise ClaudeRateLimitError(
                "Claude token budget exhausted — try again in a moment"
            )

        messages = [{"role": "user", "content": prompt}]
        last_exc: Exception | None = None

        for attempt, delay in enumerate([0] + _RETRY_DELAYS, start=1):
            if delay:
                await asyncio.sleep(delay)
            try:
                kwargs: dict = {
                    "model": model,
                    "max_tokens": max_tokens,
                    "messages": messages,
                }
                if system:
                    kwargs["system"] = system

                response = await self._client.messages.create(**kwargs)
                text = response.content[0].text

                logger.info(
                    "Claude complete",
                    extra={
                        "model": model,
                        "input_tokens": response.usage.input_tokens,
                        "output_tokens": response.usage.output_tokens,
                        "attempt": attempt,
                    },
                )
                return text

            except anthropic.RateLimitError as exc:
                last_exc = ClaudeRateLimitError(
                    "Claude API rate limit hit", attempt=attempt, error=str(exc)
                )
                logger.warning("Claude rate limited", extra={"attempt": attempt})

            except anthropic.APIStatusError as exc:
                if exc.status_code and exc.status_code < 500:
                    raise ClaudeError(
                        f"Claude API client error {exc.status_code}",
                        error=str(exc),
                    ) from exc
                last_exc = ClaudeError(
                    f"Claude API server error {exc.status_code}", attempt=attempt
                )

            except anthropic.APIConnectionError as exc:
                last_exc = ClaudeError(
                    "Claude API connection error", attempt=attempt, error=str(exc)
                )

            logger.warning(
                "Claude call failed — retrying",
                extra={"attempt": attempt, "max": _MAX_RETRIES + 1, "error": str(last_exc)},
            )

        raise last_exc or ClaudeError("Claude call failed after all retries")

    async def stream(
        self,
        messages: list[dict],
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        """
        Stream a response word-by-word.
        Used by the mobile app conversation endpoint.
        Yields text deltas as they arrive from Claude.

        Args:
            messages: Full conversation history in Anthropic format
            system: System prompt
            model: Defaults to claude-sonnet for quality
        """
        model = model or settings.claude_sonnet_model

        estimated = sum(estimate_tokens(m.get("content", "")) for m in messages) + max_tokens
        if not await consume_tokens(estimated):
            raise ClaudeRateLimitError("Claude token budget exhausted")

        kwargs: dict = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system

        try:
            async with self._client.messages.stream(**kwargs) as stream:
                async for text in stream.text_stream:
                    yield text
        except anthropic.RateLimitError as exc:
            raise ClaudeRateLimitError("Claude rate limited during stream") from exc
        except anthropic.APIError as exc:
            raise ClaudeError("Claude stream error", error=str(exc)) from exc


# Module-level singleton
claude_client = ClaudeClient()
