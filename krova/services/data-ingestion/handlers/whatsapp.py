"""
KROVA — WhatsApp Message Handler (data-ingestion service)
Called by the message_processor worker after it dequeues a WhatsAppMessageJob.
Responsible for the DB side: find/create customer, save message.

Note: this file is part of the data-ingestion service which runs as a standalone
process. All imports are from shared/ — never cross-import between services.
"""

# This module's logic is implemented inside services/workers/message_processor.py
# because the worker is the entry point that runs independently.
# This file kept for service boundary documentation.
