"""
KROVA — Redis Queue Client
Redis List-based job queue — conceptually identical to BullMQ but in pure Python.
No extra dependencies beyond redis-py which we already use for caching.

Pattern per queue:
  - Active jobs:   LPUSH  krova:queue:{name}
  - Worker reads:  BRPOP  krova:queue:{name}  (blocking, 5-second timeout)
  - Retry:         LPUSH  krova:queue:{name}  (re-enqueue with attempts+1)
  - Dead letter:   LPUSH  krova:queue:{name}:dead  (after max_attempts)

Priority (actions queue):
  Workers poll krova:queue:actions before other queues — giving it effective priority.
"""

import json
from typing import Any

from shared.cache.redis_client import redis
from shared.queue.job_types import BaseJob
from shared.utils.logging import get_logger

logger = get_logger(__name__)


# ── Queue Names ───────────────────────────────────────────────────────────────
class Queues:
    INGESTION     = "krova:queue:ingestion"    # WhatsApp + Instagram messages
    EMAIL         = "krova:queue:email"         # Gmail + Outlook emails
    ANALYSIS      = "krova:queue:analysis"      # Nightly AI analysis per business
    NOTIFICATIONS = "krova:queue:notifications" # Morning briefings
    ACTIONS       = "krova:queue:actions"       # HIGH PRIORITY — owner approved messages

    @classmethod
    def dead_letter(cls, queue: str) -> str:
        return f"{queue}:dead"


# ── Producer ──────────────────────────────────────────────────────────────────

async def enqueue(queue: str, job: BaseJob) -> None:
    """
    Push a job onto the left side of the Redis list.
    Workers BRPOP from the right — FIFO ordering.
    """
    payload = job.model_dump_json()
    await redis.lpush(queue, payload)
    logger.info(
        "Job enqueued",
        extra={
            "queue": queue,
            "job_id": str(job.id),
            "job_type": job.type,
        },
    )


async def enqueue_raw(queue: str, data: dict[str, Any]) -> None:
    """Enqueue a raw dict — used when re-enqueuing retry jobs."""
    await redis.lpush(queue, json.dumps(data, default=str))


# ── Consumer ──────────────────────────────────────────────────────────────────

async def dequeue(queue: str, timeout: int = 5) -> dict[str, Any] | None:
    """
    Block until a job is available or timeout expires.
    Returns the job dict or None on timeout.
    timeout=5 means workers loop every 5 seconds checking for a graceful shutdown signal.
    """
    result = await redis.brpop(queue, timeout=timeout)
    if result is None:
        return None
    _, raw = result  # brpop returns (key, value) tuple
    return json.loads(raw)


async def dequeue_priority(
    *queues: str, timeout: int = 5
) -> tuple[str, dict[str, Any]] | tuple[None, None]:
    """
    Block on multiple queues simultaneously — Redis serves whichever has a job first.
    Pass high-priority queues first: dequeue_priority(Queues.ACTIONS, Queues.INGESTION)
    Returns (queue_name, job_dict) or (None, None) on timeout.
    """
    result = await redis.brpop(list(queues), timeout=timeout)
    if result is None:
        return None, None
    queue_key, raw = result
    return queue_key, json.loads(raw)


# ── Retry / Dead Letter ────────────────────────────────────────────────────────

async def retry_or_dead_letter(queue: str, job_data: dict[str, Any], error: str) -> None:
    """
    Called by a worker when a job fails.
    If attempts < max_attempts: re-enqueue with incremented attempts.
    If attempts >= max_attempts: move to dead letter queue for manual review.
    """
    job_data["attempts"] = job_data.get("attempts", 0) + 1
    job_data["last_error"] = error
    max_attempts = job_data.get("max_attempts", 3)

    if job_data["attempts"] >= max_attempts:
        dead_queue = Queues.dead_letter(queue)
        await redis.lpush(dead_queue, json.dumps(job_data, default=str))
        logger.error(
            "Job moved to dead letter queue",
            extra={
                "queue": queue,
                "dead_queue": dead_queue,
                "job_id": job_data.get("id"),
                "job_type": job_data.get("type"),
                "attempts": job_data["attempts"],
                "error": error,
            },
        )
    else:
        await redis.lpush(queue, json.dumps(job_data, default=str))
        logger.warning(
            "Job re-enqueued for retry",
            extra={
                "queue": queue,
                "job_id": job_data.get("id"),
                "job_type": job_data.get("type"),
                "attempts": job_data["attempts"],
                "max_attempts": max_attempts,
                "error": error,
            },
        )


# ── Queue Stats ───────────────────────────────────────────────────────────────

async def queue_length(queue: str) -> int:
    """Returns the number of jobs currently waiting in a queue."""
    return await redis.llen(queue)
