"""
KROVA — Job Producer (data-ingestion service)
Thin wrapper around shared/queue/bullmq_client.py with typed helpers
for each job type this service produces.

Note: all imports from shared/ only — no cross-service imports.
"""

from shared.integrations.whatsapp.message_types import ParsedWhatsAppMessage
from shared.queue.bullmq_client import Queues, enqueue
from shared.queue.job_types import WhatsAppMessageJob
from shared.utils.logging import get_logger

logger = get_logger(__name__)


async def enqueue_whatsapp_message(msg: ParsedWhatsAppMessage) -> None:
    """Enqueue one parsed WhatsApp message for the message_processor worker."""
    job = WhatsAppMessageJob(
        phone_number_id=msg.phone_number_id,
        sender_phone=msg.sender_phone,
        sender_name=msg.sender_name,
        message_id=msg.message_id,
        message_type=msg.message_type,
        content=msg.content,
        timestamp=msg.timestamp,
        raw_payload=msg.raw_payload,
    )
    await enqueue(Queues.INGESTION, job)
