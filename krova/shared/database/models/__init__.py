"""
Import all models here so SQLAlchemy's metadata knows about every table.
Alembic reads this to generate migrations.
Order matters — base tables first, then tables with foreign keys.
"""

from shared.database.models.user import User
from shared.database.models.business import Business, BusinessType, SubscriptionPlan
from shared.database.models.customer import Customer, CustomerStatus, Channel
from shared.database.models.message import Message, MessageDirection, MessageChannel, MessageType
from shared.database.models.analysis import AnalysisResult, AnalysisStatus, CustomerUrgency, SuggestedAction
from shared.database.models.action import Action, ActionType, ActionStatus, ActionOutcome
from shared.database.models.conversation import ConversationSession

# ── Intelligence Layers ───────────────────────────────────────────────────────
from shared.database.models.dna import BusinessDNA
from shared.database.models.prediction import Prediction, PredictionType, PredictionStatus
from shared.database.models.intelligence import CustomerIntelligence
from shared.database.models.benchmark import Benchmark
from shared.database.models.autopilot import AutopilotRule, AutopilotTrigger, AutopilotAction
from shared.database.models.revenue import RevenueEntry, RevenueStatus, PaymentMethod
from shared.database.models.reputation import ReputationEvent, ReputationEventType, ReputationSentiment
from shared.database.models.weekly_insight import WeeklyInsight

# ── Phase 1: Full Business Intelligence ──────────────────────────────────────
from shared.database.models.commitment import Commitment
from shared.database.models.competitor import CompetitorMention
from shared.database.models.revenue_signal import RevenueSignal
from shared.database.models.growth_report import GrowthReport

# ── Phase 2: BSP Integration ──────────────────────────────────────────────────
from shared.database.models.platform import ConnectedPlatform, MessageTemplate

# ── Phase 4: Teams ────────────────────────────────────────────────────────────
from shared.database.models.team_member import TeamMember

__all__ = [
    "User",
    "Business", "BusinessType", "SubscriptionPlan",
    "Customer", "CustomerStatus", "Channel",
    "Message", "MessageDirection", "MessageChannel", "MessageType",
    "AnalysisResult", "AnalysisStatus", "CustomerUrgency", "SuggestedAction",
    "Action", "ActionType", "ActionStatus", "ActionOutcome",
    "ConversationSession",
    # Intelligence layers
    "BusinessDNA",
    "Prediction", "PredictionType", "PredictionStatus",
    "CustomerIntelligence",
    "Benchmark",
    "AutopilotRule", "AutopilotTrigger", "AutopilotAction",
    "RevenueEntry", "RevenueStatus", "PaymentMethod",
    "ReputationEvent", "ReputationEventType", "ReputationSentiment",
    "WeeklyInsight",
    # Phase 1
    "Commitment",
    "CompetitorMention",
    "RevenueSignal",
    "GrowthReport",
    # Phase 2
    "ConnectedPlatform",
    "MessageTemplate",
    # Phase 4
    "TeamMember",
]
