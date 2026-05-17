"""
KROVA — Analysis Worker
The most important worker in KROVA. Runs nightly.

Full flow per business:
1. Build complete business context (all customers + recent messages)
2. Submit main analysis to Claude Batch API → save customer decisions
3. Layer 1: Update Business DNA (Memory Layer)
4. Layer 2: Generate Predictions
5. Layer 3: Update Customer Intelligence profiles (top customers only)
6. Layer 12: Generate Weekly Insight (Sundays only)
7. Queue morning briefing for 8 AM delivery

Runs as: python -m services.workers.analysis_worker
"""

import asyncio
import json
import signal
import sys
import uuid
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from shared.cache.redis_client import check_redis_connection
from shared.claude.batch import BatchRequest, batch_client
from shared.claude.client import claude_client
from shared.context.builder import build_business_context
from shared.database.connection import AsyncSessionLocal, check_db_connection
from shared.database.models.analysis import AnalysisResult, AnalysisStatus
from shared.database.models.autopilot import AutopilotRule, AutopilotTrigger
from shared.database.models.business import Business
from shared.database.models.customer import Customer
from shared.database.models.dna import BusinessDNA
from shared.database.models.intelligence import CustomerIntelligence
from shared.database.models.message import Message, MessageSignalType
from shared.database.models.prediction import Prediction, PredictionStatus, PredictionType
from shared.database.models.weekly_insight import WeeklyInsight
from shared.prompts.business_dna import DNAUpdateContext, build_dna_update_prompt
from shared.prompts.customer_intelligence import CustomerIntelligenceContext, build_customer_intelligence_prompt
from shared.prompts.nightly_analysis import build_nightly_prompt
from shared.prompts.predictions import PredictionContext, build_predictions_prompt
from shared.prompts.weekly_insight import WeeklyInsightContext, build_weekly_insight_prompt
from shared.queue.bullmq_client import Queues, dequeue, retry_or_dead_letter
from shared.queue.job_types import BusinessAnalysisJob, JobType, MorningBriefingJob
from shared.utils.errors import ClaudeError, ClaudeResponseParseError
from shared.utils.logging import get_logger

logger = get_logger(__name__)
_shutdown = False


def _handle_signal(sig: int, frame: Any) -> None:
    global _shutdown
    logger.info("Analysis worker shutdown signal", extra={"signal": sig})
    _shutdown = True


# ── Response Parsing ──────────────────────────────────────────────────────────

def _parse_claude_response(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ClaudeResponseParseError(
            "Claude returned invalid JSON",
            error=str(exc),
            preview=cleaned[:200],
        ) from exc


# ── Core Analysis Logic ───────────────────────────────────────────────────────

async def analyse_business(job: BusinessAnalysisJob, db: AsyncSession) -> None:
    business_id = job.business_id
    analysis_date = job.analysis_date

    logger.info("Analysing business", extra={"business_id": str(business_id), "date": analysis_date})

    # ── Mark as processing ────────────────────────────────────────────────────
    await db.execute(
        update(AnalysisResult)
        .where(
            AnalysisResult.business_id == business_id,
            AnalysisResult.customer_id == None,  # noqa: E711
            AnalysisResult.analysis_date == analysis_date,
        )
        .values(status=AnalysisStatus.processing)
    )
    await db.flush()

    # ── Build context ─────────────────────────────────────────────────────────
    ctx = await build_business_context(business_id, db)
    if ctx is None:
        logger.warning("Business not found", extra={"business_id": str(business_id)})
        return

    if not ctx.customers:
        await _mark_completed(business_id, analysis_date, db,
                               morning_briefing="Aaj koi naya customer nahi aaya. Apne existing leads ko follow up karo!")
        return

    # ── Step 0: Classify untagged messages ───────────────────────────────────
    try:
        await _classify_untagged_messages(business_id, db)
    except Exception as exc:
        logger.warning("Message classification failed (non-fatal)", extra={"business_id": str(business_id), "error": str(exc)})

    # ── Main Analysis (Claude Batch) ──────────────────────────────────────────
    prompt = build_nightly_prompt(ctx)
    batch_request = BatchRequest(
        custom_id=f"business-{business_id}-{analysis_date}",
        prompt=prompt,
        max_tokens=8192,
    )

    try:
        batch_id = await batch_client.submit_batch([batch_request])
    except ClaudeError as exc:
        logger.error("Failed to submit batch", extra={"business_id": str(business_id), "error": str(exc)})
        raise

    await db.execute(
        update(AnalysisResult)
        .where(
            AnalysisResult.business_id == business_id,
            AnalysisResult.customer_id == None,  # noqa: E711
            AnalysisResult.analysis_date == analysis_date,
        )
        .values(batch_request_id=batch_id)
    )
    await db.flush()

    try:
        results = await batch_client.poll_until_complete(batch_id)
    except ClaudeError as exc:
        logger.error("Batch polling failed", extra={"business_id": str(business_id), "error": str(exc)})
        raise

    if not results or not results[0].succeeded:
        error = results[0].error if results else "No results returned"
        raise ClaudeError("Batch result failed", business_id=str(business_id), error=error)

    try:
        data = _parse_claude_response(results[0].text)
    except ClaudeResponseParseError as exc:
        logger.error("Failed to parse Claude response", extra={"business_id": str(business_id), "error": str(exc)})
        raise

    # ── Save per-customer analysis results ────────────────────────────────────
    customers_data = data.get("customers", [])
    summary_data = data.get("business_summary", {})

    for customer_result in customers_data:
        customer_id_str = customer_result.get("customer_id")
        if not customer_id_str:
            continue
        try:
            customer_id = uuid.UUID(customer_id_str)
        except ValueError:
            continue

        existing_result = await db.execute(
            select(AnalysisResult).where(
                AnalysisResult.business_id == business_id,
                AnalysisResult.customer_id == customer_id,
                AnalysisResult.analysis_date == analysis_date,
            )
        )
        ar = existing_result.scalar_one_or_none()

        if ar is None:
            ar = AnalysisResult(
                business_id=business_id,
                customer_id=customer_id,
                analysis_date=analysis_date,
                status=AnalysisStatus.completed,
                raw_claude_output=customer_result,
            )
            db.add(ar)

        ar.status = AnalysisStatus.completed
        ar.customer_status = customer_result.get("status")
        ar.urgency = customer_result.get("urgency")
        ar.suggested_action = customer_result.get("suggested_action")
        ar.suggested_message = customer_result.get("suggested_message")
        ar.reasoning = customer_result.get("reasoning")
        ar.raw_claude_output = customer_result

        new_status = customer_result.get("status")
        if new_status:
            await db.execute(
                update(Customer)
                .where(Customer.id == customer_id)
                .values(
                    status=new_status,
                    ai_notes=customer_result.get("reasoning"),
                    health_score=_status_to_health_score(new_status),
                )
            )

    await db.flush()

    # ── Save business summary ─────────────────────────────────────────────────
    morning_briefing = summary_data.get("morning_briefing", "")
    await _mark_completed(business_id, analysis_date, db, morning_briefing, summary_data, batch_id)

    # ── Layer 1: Update Business DNA ──────────────────────────────────────────
    try:
        await _update_business_dna(business_id, ctx, customers_data, data, db)
    except Exception as exc:
        logger.error("DNA update failed (non-fatal)", extra={"business_id": str(business_id), "error": str(exc)})

    # ── Layer 2: Generate Predictions ─────────────────────────────────────────
    try:
        await _generate_predictions(business_id, ctx, customers_data, db)
    except Exception as exc:
        logger.error("Predictions failed (non-fatal)", extra={"business_id": str(business_id), "error": str(exc)})

    # ── Layer 3: Update Customer Intelligence (top 10 active customers) ───────
    try:
        await _update_customer_intelligence(business_id, ctx, db)
    except Exception as exc:
        logger.error("Customer intelligence failed (non-fatal)", extra={"business_id": str(business_id), "error": str(exc)})

    # ── Layer 9: Evaluate Autopilot Rules ─────────────────────────────────────
    try:
        await _evaluate_autopilot_rules(business_id, customers_data, db)
    except Exception as exc:
        logger.error("Autopilot evaluation failed (non-fatal)", extra={"business_id": str(business_id), "error": str(exc)})

    # ── Phase 1: Full Business Intelligence Extraction ────────────────────────
    try:
        from services.workers.intelligence_worker import run_intelligence_extraction
        await run_intelligence_extraction(business_id, db)
    except Exception as exc:
        logger.error("Intelligence extraction failed (non-fatal)", extra={"business_id": str(business_id), "error": str(exc)})

    # ── Gmail Nightly Sync ────────────────────────────────────────────────────
    try:
        from services.workers.gmail_worker import run_gmail_sync
        await run_gmail_sync(business_id, db)
    except Exception as exc:
        logger.error("Gmail sync failed (non-fatal)", extra={"business_id": str(business_id), "error": str(exc)})

    # ── Outlook Nightly Sync ──────────────────────────────────────────────────
    try:
        from services.workers.outlook_worker import run_outlook_sync
        await run_outlook_sync(business_id, db)
    except Exception as exc:
        logger.error("Outlook sync failed (non-fatal)", extra={"business_id": str(business_id), "error": str(exc)})

    # ── BSP Template Sync (weekly on Mondays) ────────────────────────────────
    today_date = date.fromisoformat(analysis_date)
    if today_date.weekday() == 0:  # Monday
        try:
            await _sync_bsp_templates(business_id, db)
        except Exception as exc:
            logger.error("BSP template sync failed (non-fatal)", extra={"business_id": str(business_id), "error": str(exc)})

    # ── Layer 12: Weekly Insight (Sundays only) ───────────────────────────────
    today = date.fromisoformat(analysis_date)
    if today.weekday() == 6:  # Sunday
        try:
            await _generate_weekly_insight(business_id, ctx, db)
        except Exception as exc:
            logger.error("Weekly insight failed (non-fatal)", extra={"business_id": str(business_id), "error": str(exc)})

    # ── Queue morning briefing ────────────────────────────────────────────────
    business_result = await db.execute(select(Business).where(Business.id == business_id))
    business = business_result.scalar_one_or_none()

    if business and business.briefing_phone and morning_briefing:
        briefing_job = MorningBriefingJob(
            business_id=business_id,
            briefing_text=morning_briefing,
            owner_phone=business.briefing_phone,
        )
        await _enqueue_briefing(briefing_job)

    logger.info(
        "Business analysis complete",
        extra={"business_id": str(business_id), "customers_analysed": len(customers_data), "date": analysis_date},
    )


# ── Layer 1: Business DNA Update ─────────────────────────────────────────────

async def _update_business_dna(
    business_id: uuid.UUID,
    ctx: Any,
    customers_data: list[dict],
    analysis_data: dict,
    db: AsyncSession,
) -> None:
    """Update the business personality DNA profile after nightly analysis."""
    # Get existing DNA
    existing_result = await db.execute(
        select(BusinessDNA).where(BusinessDNA.business_id == business_id)
    )
    dna = existing_result.scalar_one_or_none()
    existing_profile = dna.profile if dna else {}
    analysis_count = dna.analysis_count if dna else 0

    # Build action outcomes from tonight's analysis
    action_outcomes: list[dict] = []
    customer_summaries = [
        {
            "name": c.name,
            "status": next((cd.get("status") for cd in customers_data if cd.get("customer_id") == str(c.customer_id) if hasattr(c, 'customer_id')), "unknown"),
            "channel": c.primary_channel if hasattr(c, 'primary_channel') else "unknown",
            "reasoning": next((cd.get("reasoning", "") for cd in customers_data), ""),
        }
        for c in ctx.customers[:50]
    ]
    # Use customers_data for summaries (already parsed)
    customer_summaries = [
        {
            "name": cd.get("customer_id", ""),
            "status": cd.get("status", ""),
            "channel": "unknown",
            "reasoning": cd.get("reasoning", ""),
        }
        for cd in customers_data
    ]

    summary = analysis_data.get("business_summary", {})
    conversions = sum(1 for cd in customers_data if cd.get("status") == "converted")
    losses = sum(1 for cd in customers_data if cd.get("status") == "lost")
    new_leads = sum(1 for c in ctx.customers if c.status == "new")

    dna_ctx = DNAUpdateContext(
        business_id=str(business_id),
        business_name=ctx.name,
        business_type=ctx.business_type,
        existing_profile=existing_profile,
        analysis_count=analysis_count,
        customers_analysed=len(customers_data),
        conversions_this_week=conversions,
        losses_this_week=losses,
        new_leads_this_week=new_leads,
        customer_summaries=customer_summaries,
        action_outcomes=action_outcomes,
        business_context=ctx.context,
        good_lead_description=ctx.good_lead_description,
        lost_customer_description=ctx.lost_customer_description,
    )

    prompt = build_dna_update_prompt(dna_ctx)

    try:
        response = await claude_client.complete(prompt, max_tokens=2048)
        dna_data = _parse_claude_response(response)
    except Exception as exc:
        logger.warning("DNA Claude call failed", extra={"error": str(exc)})
        return

    new_profile = dna_data.get("profile", {})
    narrative = dna_data.get("narrative", "")

    if dna is None:
        dna = BusinessDNA(
            business_id=business_id,
            profile=new_profile,
            narrative=narrative,
            analysis_count=1,
        )
        db.add(dna)
    else:
        dna.profile = new_profile
        dna.narrative = narrative
        dna.analysis_count = analysis_count + 1

    await db.flush()
    logger.info("Business DNA updated", extra={"business_id": str(business_id), "run": analysis_count + 1})


# ── Layer 2: Predictions ──────────────────────────────────────────────────────

async def _generate_predictions(
    business_id: uuid.UUID,
    ctx: Any,
    customers_data: list[dict],
    db: AsyncSession,
) -> None:
    """Generate predictions for customers showing clear signals."""
    # Get DNA for context
    dna_result = await db.execute(select(BusinessDNA).where(BusinessDNA.business_id == business_id))
    dna = dna_result.scalar_one_or_none()
    dna_narrative = dna.narrative if dna else None
    dna_profile = dna.profile if dna else {}

    # Build customer signals
    customer_signals = []
    for cd in customers_data:
        customer_signals.append({
            "id": cd.get("customer_id"),
            "name": "customer",
            "status": cd.get("status", "unknown"),
            "health_score": _status_to_health_score(cd.get("status", "new")),
            "days_since_contact": None,
            "health_trend": "stable",
            "reasoning": cd.get("reasoning", ""),
        })

    conversion_patterns = dna_profile.get("conversion_patterns", {})
    problem_patterns = dna_profile.get("problem_patterns", {})

    pred_ctx = PredictionContext(
        business_id=str(business_id),
        business_name=ctx.name,
        business_type=ctx.business_type,
        dna_narrative=dna_narrative,
        customers=customer_signals,
        avg_days_to_convert=conversion_patterns.get("avg_days_to_convert"),
        common_churn_patterns=problem_patterns.get("high_churn_segments", []),
        conversion_triggers=conversion_patterns.get("conversion_triggers", []),
        total_pipeline_value_estimate=None,
        current_month_conversions=sum(1 for cd in customers_data if cd.get("status") == "converted"),
    )

    prompt = build_predictions_prompt(pred_ctx)

    try:
        response = await claude_client.complete(prompt, max_tokens=2048)
        pred_data = _parse_claude_response(response)
    except Exception as exc:
        logger.warning("Predictions Claude call failed", extra={"error": str(exc)})
        return

    # Expire old active predictions that are now resolved
    await db.execute(
        update(Prediction)
        .where(
            Prediction.business_id == business_id,
            Prediction.status == PredictionStatus.active,
        )
        .values(status=PredictionStatus.expired)
    )

    # Save new predictions
    for p in pred_data.get("predictions", []):
        customer_id_str = p.get("customer_id")
        customer_id = None
        if customer_id_str:
            try:
                customer_id = uuid.UUID(customer_id_str)
            except ValueError:
                pass

        prediction = Prediction(
            business_id=business_id,
            customer_id=customer_id,
            prediction_type=p.get("prediction_type", "churn_risk"),
            probability=float(p.get("probability", 0.5)),
            confidence=float(p.get("confidence", 0.5)),
            prediction_text=p.get("prediction_text", ""),
            recommended_action=p.get("recommended_action"),
            predicted_for_date=p.get("predicted_for_date"),
            status=PredictionStatus.active,
            evidence=p.get("evidence", {}),
        )
        db.add(prediction)

    await db.flush()
    logger.info("Predictions generated", extra={"business_id": str(business_id), "count": len(pred_data.get("predictions", []))})


# ── Layer 3: Customer Intelligence ───────────────────────────────────────────

async def _update_customer_intelligence(
    business_id: uuid.UUID,
    ctx: Any,
    db: AsyncSession,
) -> None:
    """Update relationship intelligence for hot/warm customers."""
    # Only update intelligence for the most active customers (top 10)
    priority_customers = [c for c in ctx.customers if c.status in ("hot", "warm")][:10]

    dna_result = await db.execute(select(BusinessDNA).where(BusinessDNA.business_id == business_id))
    dna = dna_result.scalar_one_or_none()
    dna_narrative = dna.narrative if dna else None

    for customer_ctx in priority_customers:
        try:
            customer_id = uuid.UUID(customer_ctx.customer_id)

            # Get all messages for this customer
            msgs_result = await db.execute(
                select(Message)
                .where(Message.customer_id == customer_id)
                .order_by(Message.created_at.desc())
                .limit(50)
            )
            messages = msgs_result.scalars().all()

            # Get existing intelligence
            intel_result = await db.execute(
                select(CustomerIntelligence).where(CustomerIntelligence.customer_id == customer_id)
            )
            intel = intel_result.scalar_one_or_none()
            existing_profile = intel.profile if intel else {}

            messages_list = [
                {
                    "direction": m.direction,
                    "content": m.content,
                    "channel": m.channel,
                    "sent_at": m.sent_at or str(m.created_at),
                }
                for m in reversed(messages)
            ]

            intel_ctx = CustomerIntelligenceContext(
                customer_id=customer_ctx.customer_id,
                customer_name=customer_ctx.name,
                customer_phone=customer_ctx.phone,
                primary_channel=getattr(customer_ctx, 'primary_channel', 'whatsapp'),
                current_status=customer_ctx.status,
                health_score=customer_ctx.health_score,
                days_since_first_contact=0,  # Simplified
                interaction_count=len(messages),
                existing_profile=existing_profile,
                messages=messages_list,
                action_outcomes=[],
                business_type=ctx.business_type,
                dna_narrative=dna_narrative,
            )

            prompt = build_customer_intelligence_prompt(intel_ctx)
            response = await claude_client.complete(prompt, max_tokens=1024)
            intel_data = _parse_claude_response(response)

            if intel is None:
                intel = CustomerIntelligence(
                    business_id=business_id,
                    customer_id=customer_id,
                    profile=intel_data.get("profile", {}),
                    current_recommendation=intel_data.get("current_recommendation"),
                    message_template=intel_data.get("message_template"),
                    confidence=intel_data.get("profile", {}).get("confidence", 0.0),
                    interaction_count=len(messages),
                )
                db.add(intel)
            else:
                intel.profile = intel_data.get("profile", {})
                intel.current_recommendation = intel_data.get("current_recommendation")
                intel.message_template = intel_data.get("message_template")
                intel.confidence = intel_data.get("profile", {}).get("confidence", 0.0)
                intel.interaction_count = len(messages)

            await db.flush()

        except Exception as exc:
            logger.warning(
                "Customer intelligence update failed",
                extra={"customer_id": customer_ctx.customer_id, "error": str(exc)},
            )
            continue

    logger.info("Customer intelligence updated", extra={"business_id": str(business_id), "count": len(priority_customers)})


# ── Layer 9: Autopilot Rule Evaluation ───────────────────────────────────────

async def _evaluate_autopilot_rules(
    business_id: uuid.UUID,
    customers_data: list[dict],
    db: AsyncSession,
) -> None:
    """Evaluate active autopilot rules and create actions where triggered."""
    from shared.database.models.action import Action, ActionStatus, ActionType

    rules_result = await db.execute(
        select(AutopilotRule).where(
            AutopilotRule.business_id == business_id,
            AutopilotRule.is_active == True,  # noqa: E712
        )
    )
    rules = rules_result.scalars().all()

    if not rules:
        return

    for rule in rules:
        if rule.trigger_type == AutopilotTrigger.status_changed_to:
            target_status = rule.trigger_config.get("status")
            if not target_status:
                continue

            triggered_customers = [
                cd for cd in customers_data
                if cd.get("status") == target_status
            ]

            for cd in triggered_customers:
                customer_id_str = cd.get("customer_id")
                if not customer_id_str:
                    continue
                try:
                    customer_id = uuid.UUID(customer_id_str)
                except ValueError:
                    continue

                if rule.message_template and rule.channel:
                    action = Action(
                        business_id=business_id,
                        customer_id=customer_id,
                        action_type=ActionType.follow_up,
                        channel=rule.channel,
                        message_content=rule.message_template,
                        status=ActionStatus.pending if rule.requires_approval else ActionStatus.auto_sent,
                        raw_response={"triggered_by_rule": str(rule.id)},
                    )
                    db.add(action)
                    rule.execution_count += 1

                    # Auto-send via BSP if no approval needed
                    if not rule.requires_approval and rule.channel == "whatsapp":
                        await _bsp_auto_send(business_id, customer_id, rule.message_template, db)

    await db.flush()
    logger.info("Autopilot rules evaluated", extra={"business_id": str(business_id), "rules": len(rules)})


# ── BSP Auto-Send ─────────────────────────────────────────────────────────────

async def _bsp_auto_send(
    business_id: uuid.UUID,
    customer_id: uuid.UUID,
    message_text: str,
    db: AsyncSession,
) -> None:
    """
    Send a WhatsApp message via the connected BSP for autopilot rules
    where requires_approval=False.
    Picks the best matching approved template. Silently skips if no BSP connected.
    """
    from sqlalchemy import select as _select
    from shared.database.models.customer import Customer
    from shared.database.models.platform import ConnectedPlatform, MessageTemplate
    from shared.utils.encryption import decrypt
    from services.workers.bsp_sender import send_whatsapp_message
    import difflib

    # Load customer phone
    cust_result = await db.execute(_select(Customer).where(Customer.id == customer_id))
    customer = cust_result.scalar_one_or_none()
    if not customer or not customer.phone:
        return  # No phone — can't send WhatsApp

    # Load connected BSP
    plat_result = await db.execute(
        _select(ConnectedPlatform).where(
            ConnectedPlatform.business_id == business_id,
            ConnectedPlatform.is_active == True,  # noqa: E712
        ).limit(1)
    )
    platform = plat_result.scalar_one_or_none()
    if not platform:
        return  # No BSP connected

    # Find best matching approved template
    tmpl_result = await db.execute(
        _select(MessageTemplate).where(
            MessageTemplate.platform_id == platform.id,
            MessageTemplate.is_active == True,  # noqa: E712
            MessageTemplate.status == "APPROVED",
        )
    )
    templates = tmpl_result.scalars().all()
    if not templates:
        return

    # Pick template whose body is most similar to the intended message
    best = max(
        templates,
        key=lambda t: difflib.SequenceMatcher(None, message_text.lower(), t.body.lower()).ratio(),
    )

    # Fill template variables with customer name as first variable
    variables = [customer.name or "there"] + [""] * max(0, len(best.variables) - 1)

    try:
        api_key = decrypt(platform.api_key_encrypted)
        result = await send_whatsapp_message(
            platform=platform.platform,
            api_key=api_key,
            to_phone=customer.phone,
            template_name=best.template_name,
            variables=variables,
            account_id=platform.account_id,
            source_phone=platform.source_phone,
            template_id=best.template_id,
        )
        if result.success:
            logger.info(
                "BSP auto-send success",
                extra={
                    "customer_id": str(customer_id),
                    "template": best.template_name,
                    "platform": platform.platform,
                    "message_id": result.message_id,
                },
            )
        else:
            logger.warning(
                "BSP auto-send failed",
                extra={"customer_id": str(customer_id), "error": result.error},
            )
    except Exception as exc:
        logger.warning("BSP auto-send exception", extra={"error": str(exc)})


# ── BSP Template Sync ─────────────────────────────────────────────────────────

async def _sync_bsp_templates(business_id: uuid.UUID, db: AsyncSession) -> None:
    """
    Re-fetch WhatsApp templates from connected BSPs.
    Runs weekly (Mondays) so KROVA always has the latest approved templates.
    """
    from sqlalchemy import select as _select
    from shared.database.models.platform import ConnectedPlatform
    from shared.utils.encryption import decrypt
    from services.workers.bsp_sender import fetch_templates
    from services.api.routers.platforms import _upsert_templates
    from datetime import datetime, timezone

    result = await db.execute(
        _select(ConnectedPlatform).where(
            ConnectedPlatform.business_id == business_id,
            ConnectedPlatform.is_active == True,  # noqa: E712
        )
    )
    platforms = result.scalars().all()

    for p in platforms:
        try:
            api_key = decrypt(p.api_key_encrypted)
            fetch_result = await fetch_templates(
                platform=p.platform,
                api_key=api_key,
                account_id=p.account_id,
                source_phone=p.source_phone,
            )
            if fetch_result.templates:
                await _upsert_templates(db, business_id, p.id, fetch_result.templates)
                p.template_count = len(fetch_result.templates)
                p.last_synced_at = datetime.now(timezone.utc)
        except Exception as exc:
            logger.warning(
                "BSP template sync failed for platform",
                extra={"platform": p.platform, "business_id": str(business_id), "error": str(exc)},
            )


# ── Layer 12: Weekly Insight ──────────────────────────────────────────────────

async def _generate_weekly_insight(
    business_id: uuid.UUID,
    ctx: Any,
    db: AsyncSession,
) -> None:
    """Generate the weekly learning insight (runs on Sundays)."""
    from datetime import date as date_type
    today = date_type.today()
    week_str = today.strftime("W%W-%Y")

    # Check if already generated this week
    existing = await db.execute(
        select(WeeklyInsight).where(
            WeeklyInsight.business_id == business_id,
            WeeklyInsight.week == week_str,
        )
    )
    if existing.scalar_one_or_none():
        return

    dna_result = await db.execute(select(BusinessDNA).where(BusinessDNA.business_id == business_id))
    dna = dna_result.scalar_one_or_none()

    # Get previous insight categories (last 8 weeks)
    prev_result = await db.execute(
        select(WeeklyInsight.category)
        .where(WeeklyInsight.business_id == business_id)
        .order_by(WeeklyInsight.created_at.desc())
        .limit(8)
    )
    prev_categories = [row[0] for row in prev_result.all()]

    insight_ctx = WeeklyInsightContext(
        business_id=str(business_id),
        business_name=ctx.name,
        business_type=ctx.business_type,
        week=week_str,
        new_leads_this_week=len([c for c in ctx.customers if c.status == "new"]),
        new_leads_last_week=0,
        conversions_this_week=len([c for c in ctx.customers if c.status == "converted"]),
        conversions_last_week=0,
        reply_rate_this_week=0.0,
        reply_rate_last_week=0.0,
        channel_conversion_rates={},
        channel_lead_volumes={},
        avg_first_response_hours=4.0,
        best_response_time_hours=1.0,
        best_performing_days=[],
        best_performing_hours=[],
        benchmark_conversion_rate=None,
        benchmark_response_time_hours=None,
        benchmark_context=None,
        previous_insight_categories=prev_categories,
        dna_narrative=dna.narrative if dna else None,
    )

    prompt = build_weekly_insight_prompt(insight_ctx)

    try:
        response = await claude_client.complete(prompt, max_tokens=1024)
        insight_data = _parse_claude_response(response)
    except Exception as exc:
        logger.warning("Weekly insight Claude call failed", extra={"error": str(exc)})
        return

    insight = WeeklyInsight(
        business_id=business_id,
        week=week_str,
        category=insight_data.get("category", "conversion"),
        headline=insight_data.get("headline", ""),
        body=insight_data.get("body", ""),
        action_item=insight_data.get("action_item", ""),
        data_evidence=insight_data.get("data_evidence", {}),
        estimated_impact=insight_data.get("estimated_impact"),
        benchmark_comparison=insight_data.get("benchmark_comparison"),
        confidence=float(insight_data.get("confidence", 0.5)),
    )
    db.add(insight)
    await db.flush()
    logger.info("Weekly insight generated", extra={"business_id": str(business_id), "week": week_str})


# ── Step 0: Message Signal Classification ────────────────────────────────────

_SIGNAL_KEYWORDS: list[tuple[MessageSignalType, list[str]]] = [
    (MessageSignalType.money_signal, [
        "invoice", "payment", "paid", "pay", "bill", "receipt", "refund",
        "amount due", "outstanding", "transfer", "upi", "neft", "amount",
        "charge", "fee", "price", "quote", "quotation",
    ]),
    (MessageSignalType.sales_signal, [
        "interested", "want to buy", "when can", "how much", "pricing",
        "book", "order", "purchase", "available", "availability",
        "can you", "need", "looking for", "enquir", "inquiry", "urgent",
    ]),
    (MessageSignalType.complaint_signal, [
        "problem", "issue", "not working", "broken", "wrong", "disappointed",
        "unhappy", "complaint", "refund", "cancel", "terrible", "bad service",
        "delay", "late", "didn't receive", "not satisfied",
    ]),
    (MessageSignalType.vendor_signal, [
        "partnership", "collaborate", "supply", "wholesale", "bulk",
        "distributor", "vendor", "b2b", "business proposal", "tie-up",
        "agency", "outsource", "freelance",
    ]),
    (MessageSignalType.relationship_signal, [
        "thank you", "thanks", "great job", "loved it", "recommend",
        "refer", "friend of mine", "told me about you", "happy with",
        "excellent", "wonderful", "amazing", "appreciated",
    ]),
]


def _classify_text(text: str) -> MessageSignalType:
    """Fast keyword-based signal classifier. First match wins by priority order."""
    lower = text.lower()
    for signal_type, keywords in _SIGNAL_KEYWORDS:
        if any(kw in lower for kw in keywords):
            return signal_type
    return MessageSignalType.none


async def _classify_untagged_messages(business_id: uuid.UUID, db: AsyncSession) -> int:
    """
    Tag all inbound messages that haven't been classified yet.
    Runs before nightly analysis so Claude gets pre-filtered context.
    Returns count of messages tagged.
    """
    from sqlalchemy import update as _update

    result = await db.execute(
        select(Message.id, Message.content, Message.subject)
        .where(
            Message.business_id == business_id,
            Message.signal_type == None,  # noqa: E711
            Message.content != None,  # noqa: E711
        )
        .limit(500)  # Cap per run — catches up nightly
    )
    rows = result.all()

    if not rows:
        return 0

    tagged = 0
    for msg_id, content, subject in rows:
        combined = f"{subject or ''} {content or ''}".strip()
        if not combined:
            continue
        signal = _classify_text(combined)
        await db.execute(
            _update(Message)
            .where(Message.id == msg_id)
            .values(signal_type=signal)
        )
        tagged += 1

    await db.flush()
    logger.info("Messages tagged", extra={"business_id": str(business_id), "tagged": tagged})
    return tagged


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _mark_completed(
    business_id: uuid.UUID,
    analysis_date: str,
    db: AsyncSession,
    morning_briefing: str = "",
    summary_data: dict | None = None,
    batch_id: str | None = None,
) -> None:
    await db.execute(
        update(AnalysisResult)
        .where(
            AnalysisResult.business_id == business_id,
            AnalysisResult.customer_id == None,  # noqa: E711
            AnalysisResult.analysis_date == analysis_date,
        )
        .values(
            status=AnalysisStatus.completed,
            morning_briefing=morning_briefing,
            batch_request_id=batch_id,
            raw_claude_output=summary_data or {},
        )
    )
    await db.flush()


async def _enqueue_briefing(job: MorningBriefingJob) -> None:
    from shared.queue.bullmq_client import enqueue
    await enqueue(Queues.NOTIFICATIONS, job)


def _status_to_health_score(status: str) -> int:
    return {
        "hot": 90,
        "warm": 65,
        "cold": 30,
        "converted": 100,
        "lost": 5,
        "new": 50,
    }.get(status, 50)


# ── Worker Loop ───────────────────────────────────────────────────────────────

async def run_worker() -> None:
    logger.info("Analysis worker starting")

    db_ok = await check_db_connection()
    redis_ok = await check_redis_connection()
    if not db_ok or not redis_ok:
        logger.critical("Analysis worker startup failed")
        sys.exit(1)

    logger.info("Analysis worker ready", extra={"queue": Queues.ANALYSIS})

    while not _shutdown:
        job_data = await dequeue(Queues.ANALYSIS, timeout=5)
        if job_data is None:
            continue

        if job_data.get("type") != JobType.run_business_analysis:
            logger.warning("Unknown job type in analysis queue", extra={"type": job_data.get("type")})
            continue

        job = BusinessAnalysisJob(**job_data)

        async with AsyncSessionLocal() as db:
            try:
                await analyse_business(job, db)
                await db.commit()
            except Exception as exc:
                await db.rollback()
                logger.error(
                    "Analysis failed",
                    extra={"business_id": str(job.business_id), "error": str(exc)},
                    exc_info=True,
                )
                async with AsyncSessionLocal() as err_db:
                    await err_db.execute(
                        update(AnalysisResult)
                        .where(
                            AnalysisResult.business_id == job.business_id,
                            AnalysisResult.customer_id == None,  # noqa: E711
                            AnalysisResult.analysis_date == job.analysis_date,
                        )
                        .values(status=AnalysisStatus.failed)
                    )
                    await err_db.commit()

                await retry_or_dead_letter(Queues.ANALYSIS, job_data, str(exc))

    logger.info("Analysis worker shut down cleanly")


if __name__ == "__main__":
    from shared.utils.sentry import init_sentry
    init_sentry("worker-analysis")
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)
    asyncio.run(run_worker())
