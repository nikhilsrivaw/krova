"""
KROVA — Claude Batch API Client
Used for nightly analysis — 50% cheaper than standard API.
Anthropic Batch API processes requests asynchronously (minutes to hours).
We submit all businesses at once, store the batch_id, poll until done.

Batch API limits (as of 2025):
  - Max 10,000 requests per batch
  - Max 24 hours processing time (usually 1-3 hours for small batches)
  - Results available for 29 days after completion
"""

import asyncio
from typing import Any

import anthropic
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request

from shared.config.settings import settings
from shared.utils.errors import ClaudeError
from shared.utils.logging import get_logger

logger = get_logger(__name__)

_POLL_INTERVAL_SECONDS = 30   # Check batch status every 30 seconds
_MAX_POLL_HOURS = 6           # Give up after 6 hours


class BatchRequest:
    """One request in a batch — one business's nightly analysis."""

    def __init__(self, custom_id: str, prompt: str, max_tokens: int = 4096) -> None:
        self.custom_id = custom_id
        self.prompt = prompt
        self.max_tokens = max_tokens

    def to_api_request(self, model: str) -> Request:
        return Request(
            custom_id=self.custom_id,
            params=MessageCreateParamsNonStreaming(
                model=model,
                max_tokens=self.max_tokens,
                messages=[{"role": "user", "content": self.prompt}],
            ),
        )


class BatchResult:
    """Result for one request in a completed batch."""

    def __init__(self, custom_id: str, text: str | None, error: str | None) -> None:
        self.custom_id = custom_id
        self.text = text
        self.error = error

    @property
    def succeeded(self) -> bool:
        return self.error is None and self.text is not None


class ClaudeBatchClient:
    """
    Submits and polls Anthropic Batch API jobs.
    All nightly analysis goes through here.
    """

    def __init__(self) -> None:
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def submit_batch(
        self,
        requests: list[BatchRequest],
        model: str | None = None,
    ) -> str:
        """
        Submit a batch of requests to the Anthropic Batch API.
        Returns the batch_id — store this to poll for results.

        Args:
            requests: One BatchRequest per business
            model: Defaults to claude-haiku for cost efficiency
        """
        model = model or settings.claude_haiku_model

        if not requests:
            raise ClaudeError("Cannot submit empty batch")

        api_requests = [r.to_api_request(model) for r in requests]

        try:
            batch = await self._client.messages.batches.create(requests=api_requests)
            logger.info(
                "Batch submitted to Claude",
                extra={
                    "batch_id": batch.id,
                    "request_count": len(requests),
                    "model": model,
                },
            )
            return batch.id

        except anthropic.APIError as exc:
            raise ClaudeError(
                "Failed to submit Claude batch", error=str(exc)
            ) from exc

    async def poll_until_complete(self, batch_id: str) -> list[BatchResult]:
        """
        Poll the batch until all results are ready.
        Blocks until complete or timeout.

        Returns a list of BatchResult — one per submitted request.
        """
        max_polls = int((_MAX_POLL_HOURS * 3600) / _POLL_INTERVAL_SECONDS)

        for poll_num in range(max_polls):
            try:
                batch = await self._client.messages.batches.retrieve(batch_id)
            except anthropic.APIError as exc:
                raise ClaudeError(
                    "Failed to retrieve batch status",
                    batch_id=batch_id,
                    error=str(exc),
                ) from exc

            counts = batch.request_counts
            logger.info(
                "Batch poll",
                extra={
                    "batch_id": batch_id,
                    "status": batch.processing_status,
                    "succeeded": counts.succeeded,
                    "errored": counts.errored,
                    "processing": counts.processing,
                    "poll": poll_num + 1,
                },
            )

            if batch.processing_status == "ended":
                return await self._collect_results(batch_id)

            await asyncio.sleep(_POLL_INTERVAL_SECONDS)

        raise ClaudeError(
            f"Batch timed out after {_MAX_POLL_HOURS} hours",
            batch_id=batch_id,
        )

    async def _collect_results(self, batch_id: str) -> list[BatchResult]:
        """Stream all results from a completed batch."""
        results: list[BatchResult] = []

        try:
            async for result in await self._client.messages.batches.results(batch_id):
                if result.result.type == "succeeded":
                    text = result.result.message.content[0].text
                    results.append(BatchResult(
                        custom_id=result.custom_id,
                        text=text,
                        error=None,
                    ))
                else:
                    error_msg = getattr(result.result, "error", {})
                    results.append(BatchResult(
                        custom_id=result.custom_id,
                        text=None,
                        error=str(error_msg),
                    ))
        except anthropic.APIError as exc:
            raise ClaudeError(
                "Failed to collect batch results",
                batch_id=batch_id,
                error=str(exc),
            ) from exc

        logger.info(
            "Batch results collected",
            extra={
                "batch_id": batch_id,
                "total": len(results),
                "succeeded": sum(1 for r in results if r.succeeded),
                "failed": sum(1 for r in results if not r.succeeded),
            },
        )
        return results


batch_client = ClaudeBatchClient()
