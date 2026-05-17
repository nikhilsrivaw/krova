"""
KROVA  Development Seed Script
================================
Populates the database with realistic test data so you can test every
dashboard page, mobile screen, and intelligence feature without a live
WhatsApp/Gmail/Instagram pipeline.

What it creates:
  - 1 business (owned by your Supabase user)
  - 18 customers across all pipeline stages
  - 120+ realistic WhatsApp/Gmail message threads
  - Nightly analysis results (customer status, AI reasoning)
  - 12 active predictions with varied types
  - 8 pending approvals (action queue)
  - 6 commitments (mix of overdue + upcoming)
  - 5 revenue signals (scope creep, forgotten invoices)
  - 4 competitor mentions
  - Business DNA profile
  - Customer intelligence profiles for top 5
  - Weekly insight
  - Revenue entries
  - Benchmark data

Usage:
  cd krova
  python -m scripts.seed_dev --email you@example.com

  # To wipe and reseed:
  python -m scripts.seed_dev --email you@example.com --reset

The --email must match the Supabase account you log in with.
"""

import argparse
import asyncio
import random
import uuid
from datetime import date, datetime, timedelta, timezone

#  Bootstrap path 
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database.connection import AsyncSessionLocal
from shared.database.models.action import Action, ActionStatus, ActionType
from shared.database.models.analysis import AnalysisResult, AnalysisStatus
from shared.database.models.benchmark import Benchmark
from shared.database.models.business import Business
from shared.database.models.commitment import Commitment
from shared.database.models.competitor import CompetitorMention
from shared.database.models.customer import Channel, Customer, CustomerStatus
from shared.database.models.dna import BusinessDNA
from shared.database.models.growth_report import GrowthReport
from shared.database.models.intelligence import CustomerIntelligence
from shared.database.models.message import Message, MessageChannel, MessageDirection, MessageType
from shared.database.models.prediction import Prediction, PredictionStatus, PredictionType
from shared.database.models.revenue import RevenueEntry, RevenueStatus
from shared.database.models.revenue_signal import RevenueSignal
from shared.database.models.user import User
from shared.database.models.weekly_insight import WeeklyInsight
from shared.utils.logging import get_logger

logger = get_logger(__name__)

#  Fake data pools 

CUSTOMER_POOL = [
    {"name": "Rahul Sharma",    "phone": "+919876543210", "email": "rahul@sharma.in",     "channel": "whatsapp", "status": "hot",       "health": 85},
    {"name": "Priya Mehta",     "phone": "+919812345678", "email": "priya@mehta.co",      "channel": "whatsapp", "status": "hot",       "health": 80},
    {"name": "Amit Joshi",      "phone": "+919898765432", "email": "amit@joshi.biz",      "channel": "gmail",    "status": "warm",      "health": 65},
    {"name": "Sneha Kulkarni",  "phone": "+919765432100", "email": "sneha@kulkarni.com",  "channel": "whatsapp", "status": "warm",      "health": 60},
    {"name": "Vikram Singh",    "phone": "+919711223344", "email": "vikram@singh.net",    "channel": "instagram","status": "warm",      "health": 55},
    {"name": "Deepa Nair",      "phone": "+919600112233", "email": "deepa@nair.in",       "channel": "whatsapp", "status": "new",       "health": 50},
    {"name": "Ravi Verma",      "phone": "+919500445566", "email": "ravi@verma.co.in",    "channel": "gmail",    "status": "new",       "health": 48},
    {"name": "Anita Desai",     "phone": "+919400778899", "email": "anita@desai.com",     "channel": "whatsapp", "status": "new",       "health": 45},
    {"name": "Suresh Patel",    "phone": "+919300990011", "email": "suresh@patel.biz",    "channel": "whatsapp", "status": "cold",      "health": 25},
    {"name": "Kavita Rao",      "phone": "+919200334455", "email": "kavita@rao.net",      "channel": "gmail",    "status": "cold",      "health": 20},
    {"name": "Manish Agarwal",  "phone": "+919100667788", "email": "manish@agarwal.in",   "channel": "whatsapp", "status": "converted", "health": 100},
    {"name": "Pooja Gupta",     "phone": "+918900223344", "email": "pooja@gupta.co",      "channel": "whatsapp", "status": "converted", "health": 100},
    {"name": "Arjun Kapoor",    "phone": "+918800556677", "email": "arjun@kapoor.com",    "channel": "gmail",    "status": "converted", "health": 95},
    {"name": "Sunita Reddy",    "phone": "+918700889900", "email": "sunita@reddy.biz",    "channel": "whatsapp", "status": "lost",      "health": 5},
    {"name": "Kiran Nambiar",   "phone": "+918600112233", "email": "kiran@nambiar.net",   "channel": "instagram","status": "lost",      "health": 5},
    {"name": "Neha Sharma",     "phone": "+918500445566", "email": "neha@neha.in",        "channel": "whatsapp", "status": "hot",       "health": 78},
    {"name": "Rajesh Kumar",    "phone": "+918400778899", "email": "rajesh@kumar.co.in",  "channel": "gmail",    "status": "warm",      "health": 62},
    {"name": "Divya Pillai",    "phone": "+918300990011", "email": "divya@pillai.com",    "channel": "whatsapp", "status": "new",       "health": 47},
]

INBOUND_MESSAGES = [
    "Hi, I'm interested in your services. Can you tell me more?",
    "Kya aap mujhe pricing details de sakte hain?",
    "I saw your post on Instagram. Looks great! What are your charges?",
    "Bhai, pehle wali package ka kya hoga? Still waiting.",
    "Hello, can we schedule a call this week?",
    "Mujhe digital marketing services chahiye for my startup.",
    "Your proposal looks good. Can we start next month?",
    "Price thoda zyada lag raha hai. Koi discount milega?",
    "I'll get back to you after discussing with my partner.",
    "Payment kar diya hai. Please confirm receipt.",
    "Aaj shaam tak reply kar do. Urgent hai.",
    "We are comparing 3 agencies. Will decide by Friday.",
    "Your competitor Studio X is offering same at lower price.",
    "Can you share some case studies from similar businesses?",
    "Logo design aur social media management dono chahiye.",
    "Monthly retainer model me kaam karte ho?",
    "Great work on last month's campaign! Happy with results.",
    "Need to talk about expanding the scope of work.",
    "Invoice received. Processing payment this week.",
    "Thank you so much! Referring my friend also to you.",
    "When will the report be ready? Said it would come Thursday.",
    "I think we need to pause the project for now.",
    "Budget approval aa gaya. Let's move forward!",
    "Can you handle the Google Ads campaign also?",
    "Very disappointed with last month's performance.",
]

OUTBOUND_MESSAGES = [
    "Rahul ji, main aapke saath kaam karna chahta hun. Let's connect tomorrow?",
    "Hi! Thanks for reaching out. I'll send you our detailed proposal today.",
    "Following up on our last conversation. Have you had a chance to review?",
    "Priya ji, aapka project shuru karne ke liye ek call schedule karte hain?",
    "Just checking in  any questions about the proposal?",
    "Aaj hamare paas ek slot available hai. Kya aap free hain?",
    "I wanted to share some results from a similar client  very promising!",
    "Reminder: our offer expires this Friday. Let me know if you're in!",
]

#  Seeder 

async def seed(email: str, reset: bool, db: AsyncSession) -> None:
    print(f"\nSeeding KROVA dev database for {email}...")

    #  Find or create user 
    user_result = await db.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()
    if not user:
        user = User(
            email=email,
            supabase_user_id=str(uuid.uuid4()),  # Fake Supabase ID for dev
        )
        db.add(user)
        await db.flush()
        print(f"  [OK] Created user: {email}")
    else:
        print(f"  [OK] Found user: {email} (id={user.id})")

    #  Find or create business 
    biz_result = await db.execute(
        select(Business).where(Business.owner_user_id == user.supabase_user_id)
    )
    business = biz_result.scalar_one_or_none()

    if reset and business:
        print("    Reset mode  clearing existing seed data...")
        await _wipe_business_data(business.id, db)
        await db.flush()

    if not business:
        business = Business(
            owner_user_id=user.supabase_user_id,
            name="Rahul's Digital Agency",
            business_type="digital_agency",
            context=(
                "A boutique digital marketing agency based in Pune serving SMB clients. "
                "Specialises in social media management, Google Ads, and content creation. "
                "Typical clients: D2C brands, coaching businesses, local service providers. "
                "Team of 3  Rahul (owner), one account manager, one designer."
            ),
            good_lead_description="Someone who has a monthly ad budget of Rs.15,000+, responds within 24 hours, and has a clear business goal.",
            lost_customer_description="Someone who ghosts after the first proposal, or has budget under Rs.5,000/month.",
            briefing_phone="+919876500000",
            is_active=True,
            extra_data={},
        )
        db.add(business)
        await db.flush()
        print(f"  [OK] Created business: {business.name} (id={business.id})")
    else:
        print(f"  [OK] Found business: {business.name} (id={business.id})")

    biz_id = business.id
    now = datetime.now(timezone.utc)
    today = date.today()

    #  Customers 
    print("   Creating customers...")
    customers: list[Customer] = []

    for i, cd in enumerate(CUSTOMER_POOL):
        channel_map = {"whatsapp": Channel.whatsapp, "gmail": Channel.gmail, "instagram": Channel.instagram}
        days_ago = random.randint(1, 60)
        last_contact = now - timedelta(days=days_ago, hours=random.randint(0, 23))

        cust = Customer(
            business_id=biz_id,
            name=cd["name"],
            phone=cd["phone"],
            email=cd["email"],
            primary_channel=channel_map[cd["channel"]],
            status=cd["status"],
            health_score=cd["health"] + random.randint(-5, 5),
            last_contact_at=last_contact.isoformat(),
            ai_notes=_ai_note_for_status(cd["status"], cd["name"]),
            metadata={},
        )
        db.add(cust)
        customers.append(cust)

    await db.flush()
    print(f"  [OK] {len(customers)} customers created")

    #  Messages 
    print("   Creating message threads...")
    msg_count = 0
    channel_map2 = {
        Channel.whatsapp: MessageChannel.whatsapp,
        Channel.gmail: MessageChannel.gmail,
        Channel.instagram: MessageChannel.instagram,
    }

    for cust in customers:
        n_threads = random.randint(4, 10)
        thread_start = now - timedelta(days=random.randint(5, 45))

        for j in range(n_threads):
            msg_time = thread_start + timedelta(hours=j * random.randint(2, 48))
            direction = MessageDirection.inbound if j % 3 != 2 else MessageDirection.outbound
            content = random.choice(INBOUND_MESSAGES if direction == MessageDirection.inbound else OUTBOUND_MESSAGES)
            ch = channel_map2.get(cust.primary_channel, MessageChannel.whatsapp)
            msg_type = MessageType.email if ch == MessageChannel.gmail else MessageType.text

            msg = Message(
                business_id=biz_id,
                customer_id=cust.id,
                channel=ch,
                message_type=msg_type,
                direction=direction,
                content=content,
                subject=f"Re: Services inquiry  {cust.name}" if msg_type == MessageType.email else None,
                external_id=f"dev_{cust.id}_{j}_{uuid.uuid4().hex[:8]}",
                sent_at=msg_time.isoformat(),
                is_analysed=True,
                raw_payload={},
            )
            db.add(msg)
            msg_count += 1

    await db.flush()
    print(f"  [OK] {msg_count} messages created")

    #  Analysis results
    print("   Creating analysis results...")
    analysis_date_str = today  # Date object for asyncpg
    morning_briefing_text = (
        "Good morning! 3 hot leads need follow-up today. "
        "Rahul Sharma hasn't heard back in 2 days - high close probability. "
        "Manish Agarwal just converted - send a welcome message. "
        "Revenue leaks detected: Rs.45,000 in unbilled scope creep across 2 clients."
    )
    for idx, cust in enumerate(customers):
        ar = AnalysisResult(
            business_id=biz_id,
            customer_id=cust.id,
            analysis_date=analysis_date_str,
            status=AnalysisStatus.completed,
            customer_status=cust.status,
            urgency=_urgency_for_status(cust.status),
            suggested_action=_action_for_status(cust.status),
            suggested_message=_message_for_status(cust.status, cust.name),
            reasoning=_ai_note_for_status(cust.status, cust.name),
            # Attach morning briefing to the first (top-priority hot) row
            morning_briefing=morning_briefing_text if idx == 0 else None,
            raw_claude_output={"customer_priority": idx + 1},
        )
        db.add(ar)
    # Business-level briefing attached to the first customer row (DB requires customer_id)
    # (The morning briefing is a "summary" field — first row serves as the summary carrier)
    await db.flush()
    print(f"  [OK] Analysis results created")

    #  Predictions 
    print("   Creating predictions...")
    prediction_seeds = [
        (customers[0], PredictionType.conversion_window, 0.84, 0.9, "Rahul Sharma is showing strong buying signals  3 price inquiries in 5 days. Likely to convert within 3 days if you reach out today."),
        (customers[1], PredictionType.conversion_window, 0.71, 0.8, "Priya Mehta viewed the proposal twice and asked about payment options. Conversion window is open."),
        (customers[2], PredictionType.churn_risk, 0.67, 0.75, "Amit Joshi hasn't responded in 8 days after asking for a discount. Likely comparing competitors."),
        (customers[8], PredictionType.churn_risk, 0.88, 0.85, "Suresh Patel's response time has tripled  from 2 hours to 6 days. Relationship is cooling fast."),
        (customers[10], PredictionType.upsell_opportunity, 0.79, 0.82, "Manish Agarwal just converted and mentioned wanting Google Ads next. Strike while hot."),
        (customers[11], PredictionType.referral_likely, 0.72, 0.78, "Pooja Gupta said she would 'tell her friends'  follow up with a referral ask."),
        (customers[4], PredictionType.reactivation, 0.61, 0.7, "Vikram Singh went cold 3 weeks ago but liked your last 2 Instagram posts  showing passive interest."),
        (None, PredictionType.revenue_at_risk, 0.73, 0.8, "2 warm leads have gone silent simultaneously  pipeline health dropping. Investigate immediately."),
        (customers[15], PredictionType.conversion_window, 0.69, 0.75, "Neha Sharma asked for a revised proposal with smaller scope  still engaged, just budget-conscious."),
        (customers[3], PredictionType.churn_risk, 0.58, 0.65, "Sneha Kulkarni mentioned a competitor by name. Risk of switch if you don't act this week."),
        (customers[12], PredictionType.upsell_opportunity, 0.75, 0.8, "Arjun Kapoor is paying on time and growing fast. Ready for premium package upsell."),
        (customers[6], PredictionType.reactivation, 0.55, 0.6, "Ravi Verma replied to your last follow-up with 'maybe next quarter'. Not dead  set a reminder."),
    ]

    for cust, ptype, prob, conf, text in prediction_seeds:
        pred = Prediction(
            business_id=biz_id,
            customer_id=cust.id if cust else None,
            prediction_type=ptype,
            probability=prob,
            confidence=conf,
            prediction_text=text,
            recommended_action=_recommended_action(ptype),
            predicted_for_date=(today + timedelta(days=random.randint(1, 7))).isoformat(),
            status=PredictionStatus.active,
            is_acknowledged=False,
            evidence={"data_points": random.randint(3, 8), "signal_strength": "high" if prob > 0.7 else "medium"},
        )
        db.add(pred)

    # A few resolved predictions for accuracy tracking
    for ptype, correct in [(PredictionType.conversion_window, True), (PredictionType.churn_risk, True),
                           (PredictionType.conversion_window, False), (PredictionType.churn_risk, True),
                           (PredictionType.upsell_opportunity, True)]:
        db.add(Prediction(
            business_id=biz_id,
            customer_id=random.choice(customers).id,
            prediction_type=ptype,
            probability=0.7,
            confidence=0.75,
            prediction_text="Historical prediction (resolved).",
            status=PredictionStatus.correct if correct else PredictionStatus.incorrect,
            is_acknowledged=True,
            evidence={},
        ))

    await db.flush()
    print(f"  [OK] {len(prediction_seeds) + 5} predictions created")

    #  Pending actions (Approvals queue) 
    print("  [OK] Creating pending approvals...")
    action_seeds = [
        (customers[0], "Hi Rahul ji, just checking in on the proposal I sent. Any questions? Happy to hop on a quick call today.", "whatsapp"),
        (customers[1], "Hey Priya, following up! Would love to get started on your project this week. Shall we confirm?", "whatsapp"),
        (customers[2], "Amit bhai, I understand budget is a concern. Let me offer a scaled-down package to get started. Interested?", "gmail"),
        (customers[3], "Sneha ji, wanted to share a case study from a similar client  3x engagement in 60 days. Would this help?", "whatsapp"),
        (customers[7], "Hi Anita, welcome! I'd love to understand your business better. Are you free for a 15-min call this week?", "whatsapp"),
        (customers[15], "Neha, I've revised the proposal as requested. Smaller scope, same quality. Check your email!", "whatsapp"),
        (customers[4], "Vikram, saw you liked our recent posts  are you still exploring digital marketing options?", "instagram"),
        (customers[6], "Ravi ji, Q2 has started! Would this be a good time to pick up where we left off?", "gmail"),
    ]

    for cust, msg_content, channel in action_seeds:
        db.add(Action(
            business_id=biz_id,
            customer_id=cust.id,
            action_type=ActionType.follow_up,
            channel=channel,
            message_content=msg_content,
            status=ActionStatus.pending,
            raw_response={"generated_by": "seed"},
        ))

    await db.flush()
    print(f"  [OK] {len(action_seeds)} pending approvals created")

    #  Commitments 
    print("   Creating commitments...")
    commitment_seeds = [
        (customers[0], "Send revised proposal with Q2 pricing", today - timedelta(days=2), False),
        (customers[2], "Share case studies from similar B2B clients", today - timedelta(days=5), False),
        (customers[10], "Onboarding call scheduled for this Wednesday", today + timedelta(days=2), False),
        (customers[11], "Send April performance report", today - timedelta(days=1), False),
        (customers[1], "Follow up after their internal budget meeting", today + timedelta(days=3), False),
        (customers[12], "Upsell proposal for Google Ads package", today + timedelta(days=7), False),
    ]

    for cust, text, due, fulfilled in commitment_seeds:
        db.add(Commitment(
            business_id=biz_id,
            customer_id=cust.id,
            commitment_text=text,
            due_date=due,
            source_channel="whatsapp",
            is_fulfilled=fulfilled,
            is_dismissed=False,
        ))

    await db.flush()
    print(f"  [OK] {len(commitment_seeds)} commitments created")

    #  Revenue signals 
    print("   Creating revenue signals...")
    rev_signal_seeds = [
        (customers[10], "scope_creep", 18000, "Manish Agarwal requested 4 extra reels not in original scope. Unbilled for 3 weeks."),
        (customers[11], "forgotten_invoice", 25000, "Pooja Gupta's March invoice was never sent. Amount: Rs.25,000."),
        (customers[12], "retainer_mismatch", 8000, "Arjun Kapoor's actual work this month was Rs.38,000 but retainer is only Rs.30,000."),
        (customers[0], "scope_creep", 12000, "Rahul requested competitor analysis reports not in SOW. 6 hours of unbilled work."),
        (customers[1], "ghost_invoice", 15000, "Invoice #47 sent 30 days ago to Priya Mehta  no response or payment."),
    ]

    for cust, sig_type, amount, evidence in rev_signal_seeds:
        db.add(RevenueSignal(
            business_id=biz_id,
            customer_id=cust.id,
            signal_type=sig_type,
            estimated_amount=amount,
            evidence=evidence,
            is_resolved=False,
        ))

    await db.flush()
    print(f"  [OK] {len(rev_signal_seeds)} revenue signals created (total leakage: Rs.{sum(s[2] for s in rev_signal_seeds):,})")

    #  Competitor mentions 
    print("    Creating competitor mentions...")
    competitor_seeds = [
        (customers[2], "Studio X", "Amit said Studio X is offering same services at 30% lower cost"),
        (customers[3], "Studio X", "Sneha mentioned Studio X when asking for discount"),
        (customers[8], "DigitalPro", "Suresh brought up DigitalPro  they pitched him last week"),
        (customers[14], "Studio X", "Kiran went with Studio X  confirmed lost deal"),
    ]

    for cust, comp_name, context in competitor_seeds:
        db.add(CompetitorMention(
            business_id=biz_id,
            customer_id=cust.id,
            competitor_name=comp_name,
            channel="whatsapp",
            context=context,
            mentioned_at=now - timedelta(days=random.randint(1, 30)),
        ))

    await db.flush()
    print(f"  [OK] {len(competitor_seeds)} competitor mentions created")

    #  Revenue entries 
    print("   Creating revenue entries...")
    rev_seeds = [
        (customers[10], 30000, "Monthly retainer  April", RevenueStatus.received, -5),
        (customers[11], 25000, "Social media package  April", RevenueStatus.received, -10),
        (customers[12], 38000, "Full digital package  April", RevenueStatus.received, -3),
        (customers[0], 20000, "Proposal accepted  May advance", RevenueStatus.expected, 7),
        (customers[1], 18000, "Project kickoff payment", RevenueStatus.expected, 14),
        (customers[13], 15000, "March invoice  overdue", RevenueStatus.overdue, -35),
    ]

    for cust, amount, desc, status, days_offset in rev_seeds:
        due = today + timedelta(days=days_offset)
        db.add(RevenueEntry(
            business_id=biz_id,
            customer_id=cust.id,
            amount=amount,
            description=desc,
            status=status,
            due_date=due.isoformat(),
        ))

    await db.flush()
    print(f"  [OK] {len(rev_seeds)} revenue entries created")

    #  Business DNA 
    print("   Creating Business DNA...")
    db.add(BusinessDNA(
        business_id=biz_id,
        profile={
            "conversion_patterns": {
                "avg_days_to_convert": 14,
                "conversion_triggers": ["case study shared", "referral", "urgency close"],
                "best_channels": {"whatsapp": 0.68, "gmail": 0.45, "instagram": 0.38},
            },
            "channel_insights": {
                "primary": "whatsapp",
                "best_response_time_hours": 2,
                "response_rate": 0.74,
            },
            "pricing_intelligence": {
                "common_objection": "price",
                "discount_request_rate": 0.42,
                "avg_deal_size": 28000,
            },
            "communication_style": {
                "tone": "friendly_professional",
                "language_mix": "hinglish",
                "best_close_time": "Tuesday-Thursday 10am-12pm",
            },
            "problem_patterns": {
                "high_churn_segments": ["solo_founders_under_10k_budget", "one_time_project_seekers"],
                "avg_ghost_day": 4,
            },
        },
        narrative=(
            "Rahul's Digital Agency converts best through personal trust  case studies and "
            "referrals outperform cold outreach 3:1. WhatsApp is the power channel: 68% of "
            "conversions start there. Price objections are common but rarely fatal  42% of "
            "leads ask for discount, but only 12% actually churn on price. The biggest risk "
            "is ghosting on day 4: if a lead doesn't respond within 96 hours of a follow-up, "
            "the chance of recovery drops below 20%. Act fast on warm leads."
        ),
        analysis_count=47,
    ))
    await db.flush()
    print(f"  [OK] Business DNA created")

    #  Customer Intelligence 
    print("    Creating customer intelligence profiles...")
    intel_seeds = [
        (customers[0], "improving", 0.15, 85, "Close within 3 days with a clear deadline offer. He responds best on WhatsApp between 7-9 PM."),
        (customers[1], "stable", 0.22, 78, "Decision-maker but cautious. Send social proof  a case study from a similar client will tip her."),
        (customers[2], "declining", 0.61, 55, "Price-sensitive. Comparing with 2 other agencies. Offer a trial month at reduced rate."),
        (customers[10], "improving", 0.05, 95, "Converted and happy. Upsell window is open  mention Google Ads casually on the onboarding call."),
        (customers[11], "stable", 0.08, 92, "Loyal client. Likely to refer 1-2 people this month. Send a 'thank you for being a great client' message."),
    ]

    for cust, trajectory, churn_prob, energy, recommendation in intel_seeds:
        db.add(CustomerIntelligence(
            business_id=biz_id,
            customer_id=cust.id,
            profile={
                "relationship_trajectory": trajectory,
                "churn_probability": churn_prob,
                "energy_score": energy,
                "personality": "analytical" if "case study" in recommendation else "relationship_driven",
                "best_contact_time": "evening" if energy > 80 else "morning",
                "confidence": 0.82,
            },
            relationship_trajectory=trajectory,
            churn_probability=churn_prob,
            energy_score=energy,
            current_recommendation=recommendation,
            message_template=f"Hi {cust.name.split()[0]}, quick question  are you free for a 10-min call this week?",
            confidence=0.82,
            interaction_count=random.randint(5, 15),
        ))

    await db.flush()
    print(f"  [OK] {len(intel_seeds)} intelligence profiles created")

    #  Weekly Insight 
    print("   Creating weekly insight...")
    week_str = today.strftime("W%W-%Y")
    db.add(WeeklyInsight(
        business_id=biz_id,
        week=week_str,
        category="conversion",
        headline="You lose 70% of leads that don't hear from you within 4 days",
        body=(
            "Analysis of your last 47 nightly reports shows a clear pattern: "
            "leads that receive a follow-up within 96 hours convert at 34%. "
            "Leads that wait longer than 96 hours convert at only 9%. "
            "This week, 3 of your warm leads are approaching that 4-day window."
        ),
        action_item="Set a personal rule: any lead that hasn't heard from you in 3 days gets a WhatsApp today.",
        data_evidence={"fast_followup_rate": 0.34, "slow_followup_rate": 0.09, "threshold_days": 4},
        estimated_impact="Rs.40,000Rs.60,000 additional monthly revenue if response time improves",
        confidence=0.87,
    ))
    await db.flush()
    print(f"  [OK] Weekly insight created for {week_str}")

    #  Benchmarks 
    print("   Creating benchmark data...")
    db.add(Benchmark(
        business_type="digital_agency",
        city_tier="tier1",
        period_type="weekly",
        period_date=today.isoformat(),
        sample_size=523,
        metrics={
            "conversion_rate": {"median": 0.28, "top_quartile": 0.45},
            "avg_response_time_hours": {"median": 6.1, "top_quartile": 1.8},
            "monthly_revenue_per_client": {"median": 22000, "top_quartile": 45000},
            "retention_rate": {"median": 0.65, "top_quartile": 0.88},
            "lead_to_first_response_hours": {"median": 4.2, "top_quartile": 0.8},
            "active_channels": {"median": 2, "top_quartile": 4},
        },
    ))
    await db.flush()
    print(f"  [OK] Benchmark data created")

    #  Growth report 
    print("   Creating growth report...")
    db.add(GrowthReport(
        business_id=biz_id,
        report_date=today,
        blockers=[
            {
                "rank": 1,
                "title": "Slow follow-up is killing conversion",
                "description": "You have 11 leads that waited more than 4 days for a follow-up. At a 25% conversion rate, that's 23 lost clients.",
                "revenue_impact": 75000,
                "action": "Implement a same-day follow-up rule for all new leads.",
            },
            {
                "rank": 2,
                "title": "Scope creep costing Rs.78,000/quarter",
                "description": "3 clients have exceeded agreed scope by 1535%. None have been billed for extra work.",
                "revenue_impact": 78000,
                "action": "Add a scope change clause to contracts. Bill Manish and Arjun this week.",
            },
            {
                "rank": 3,
                "title": "No referral system despite happy clients",
                "description": "Pooja Gupta and Arjun Kapoor are promoter-level clients but have never been formally asked for referrals.",
                "revenue_impact": 50000,
                "action": "Send a referral ask to your top 3 converted clients this week.",
            },
        ],
        total_revenue_leakage_estimate=203000,
        top_blocker="Slow follow-up is killing conversion",
    ))
    await db.flush()
    print(f"  [OK] Growth report created")

    #  Commit 
    await db.commit()
    print(f"\n[OK] Seed complete!\n")
    print(f"   Business:       {business.name}")
    print(f"   Customers:      {len(customers)}")
    print(f"   Messages:       {msg_count}")
    print(f"   Predictions:    {len(prediction_seeds) + 5}")
    print(f"   Approvals:      {len(action_seeds)} pending")
    print(f"   Commitments:    {len(commitment_seeds)} (some overdue)")
    print(f"   Revenue leaks:  Rs.{sum(s[2] for s in rev_signal_seeds):,}")
    print(f"   Competitors:    {len(competitor_seeds)} mentions")
    print()
    print(f"    Log in as {email} to see the data")
    print(f"    Run migrations first if DB is empty: cd krova && alembic upgrade head")


#  Helper text generators 

def _ai_note_for_status(status: str, name: str = "Customer") -> str:
    first = name.split()[0]
    return {
        "hot":       f"{first} is actively evaluating. Has asked about pricing twice. High intent  needs one more touchpoint to close.",
        "warm":      f"{first} showed interest but went quiet after initial inquiry. Needs a value-add follow-up, not just a check-in.",
        "new":       f"{first} just reached out. Needs qualifying call to understand budget and timeline.",
        "cold":      f"{first} hasn't responded in 15+ days. Low priority  try one final reactivation message.",
        "converted": f"{first} converted successfully. Happy client. Good upsell candidate in 30-60 days.",
        "lost":      f"{first} chose a competitor citing lower price. Note: they mentioned Studio X specifically.",
    }.get(status, f"{first} is in {status} stage.")


def _urgency_for_status(status: str) -> str:
    return {"hot": "high", "warm": "medium", "new": "low", "cold": "low", "converted": "low", "lost": "none"}.get(status, "low")


def _action_for_status(status: str) -> str:
    return {
        "hot":       "Send personalized follow-up with case study today",
        "warm":      "Re-engage with a value-add message  share a result or tip",
        "new":       "Schedule qualification call within 24 hours",
        "cold":      "Send one final reactivation message then close lead",
        "converted": "Schedule 30-day check-in call",
        "lost":      "Document loss reason and close lead",
    }.get(status, "Follow up")


def _message_for_status(status: str, name: str) -> str:
    first = name.split()[0]
    return {
        "hot":       f"Hi {first}, just checking in on the proposal. Happy to answer any questions or jump on a quick call today?",
        "warm":      f"Hi {first}, wanted to share a quick win from a similar client  3x engagement in 45 days. Thought it might be relevant for you!",
        "new":       f"Hi {first}, thanks for reaching out! I'd love to understand your goals better. Are you free for a 15-min call this week?",
        "cold":      f"Hi {first}, I know timing isn't always right. If things have changed and you'd like to explore working together, I'm here!",
        "converted": f"Hi {first}, checking in after our first month together. How are you feeling about the results so far?",
        "lost":      "",
    }.get(status, "")


def _recommended_action(ptype: PredictionType) -> str:
    return {
        PredictionType.churn_risk:          "Reach out personally today  don't delegate this one.",
        PredictionType.conversion_window:   "Send a closing message with a clear next step and deadline.",
        PredictionType.upsell_opportunity:  "Casually mention the additional service on your next call.",
        PredictionType.reactivation:        "Send a low-pressure check-in with a new piece of value.",
        PredictionType.revenue_at_risk:     "Review your pipeline and identify which leads need urgent attention.",
        PredictionType.referral_likely:     "Ask for a referral  they're primed to say yes right now.",
    }.get(ptype, "Follow up this week.")


#  Wipe helper 

async def _wipe_business_data(business_id: uuid.UUID, db: AsyncSession) -> None:
    """Delete all seeded data for a business (keeps the business itself)."""
    for model in [
        GrowthReport, WeeklyInsight, Benchmark, BusinessDNA,
        CustomerIntelligence, Prediction, Action, Commitment,
        RevenueSignal, RevenueEntry, CompetitorMention, AnalysisResult,
        Message, Customer,
    ]:
        await db.execute(delete(model).where(model.business_id == business_id))  # type: ignore[attr-defined]


#  Entry point 

async def main() -> None:
    parser = argparse.ArgumentParser(description="Seed KROVA dev database")
    parser.add_argument("--email", required=True, help="Your Supabase login email")
    parser.add_argument("--reset", action="store_true", help="Wipe existing seed data before seeding")
    args = parser.parse_args()

    async with AsyncSessionLocal() as db:
        try:
            await seed(args.email, args.reset, db)
        except Exception as exc:
            await db.rollback()
            print(f"\n[ERROR] Seed failed: {exc}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
