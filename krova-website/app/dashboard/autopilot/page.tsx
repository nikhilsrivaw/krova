"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  X,
  Clock,
  UserPlus,
  TrendingDown,
  CheckCircle,
  Calendar,
  CalendarClock,
  Send,
  CheckSquare,
  Bell,
  ArrowRight,
  Inbox,
  ShieldCheck,
  Activity,
  Sparkles,
} from "lucide-react";
import { api, AutopilotRule } from "@/lib/api";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShinyText } from "@/components/magicui/shiny-text";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { SpotlightCard } from "@/components/spectrum/spotlight-card";

type Accent = "rose" | "amber" | "emerald" | "teal" | "violet" | "sky" | "dim";
const ACCENT_TEXT: Record<Accent, string> = {
  rose: "text-rose-400",
  amber: "text-amber-400",
  emerald: "text-emerald-400",
  teal: "text-teal-400",
  violet: "text-violet-400",
  sky: "text-sky-400",
  dim: "text-os-text-dim",
};

interface TriggerMeta {
  label: string;
  short: string;
  icon: React.ElementType;
  accent: Accent;
  hint: string;
}

const TRIGGER_META: Record<string, TriggerMeta> = {
  no_reply_days: {
    label: "Lead hasn't replied in N days",
    short: "No reply",
    icon: Clock,
    accent: "amber",
    hint: "Triggers when a customer goes silent after you've sent something.",
  },
  no_contact_days: {
    label: "No contact made in N days",
    short: "No contact",
    icon: Clock,
    accent: "amber",
    hint: "Triggers when YOU haven't reached out to a customer for a while.",
  },
  status_changed_to: {
    label: "Customer status changes to",
    short: "Status change",
    icon: Activity,
    accent: "violet",
    hint: "Triggers the moment a customer enters a specific bucket.",
  },
  new_lead: {
    label: "New lead arrives",
    short: "New lead",
    icon: UserPlus,
    accent: "teal",
    hint: "Triggers on the very first inbound from someone new.",
  },
  health_score_below: {
    label: "Health score drops below N",
    short: "Score drops",
    icon: TrendingDown,
    accent: "rose",
    hint: "Triggers when relationship strength falls under your threshold.",
  },
  converted: {
    label: "Customer converts",
    short: "Converts",
    icon: CheckCircle,
    accent: "emerald",
    hint: "Triggers when a lead becomes a paying customer.",
  },
  scheduled_weekly: {
    label: "Every week on a specific day",
    short: "Weekly",
    icon: Calendar,
    accent: "violet",
    hint: "Fires on a fixed weekday — useful for summaries and check-ins.",
  },
  scheduled_daily: {
    label: "Every day at a specific time",
    short: "Daily",
    icon: CalendarClock,
    accent: "violet",
    hint: "Fires every day at a fixed time.",
  },
};

interface ActionMeta {
  label: string;
  short: string;
  icon: React.ElementType;
  accent: Accent;
  hint: string;
}

const ACTION_META: Record<string, ActionMeta> = {
  send_message: {
    label: "Send message automatically",
    short: "Send message",
    icon: Send,
    accent: "rose",
    hint: "Sends a real message to the customer. No human review.",
  },
  create_action: {
    label: "Create pending action for my approval",
    short: "Draft for approval",
    icon: CheckSquare,
    accent: "emerald",
    hint: "Drafts a reply and puts it in your approval queue. Safe default.",
  },
  send_briefing: {
    label: "Send me a summary",
    short: "Notify me",
    icon: Bell,
    accent: "teal",
    hint: "Pings YOU on WhatsApp. Customer hears nothing.",
  },
  update_status: {
    label: "Update customer status",
    short: "Update status",
    icon: Activity,
    accent: "violet",
    hint: "Moves the customer to a different bucket (e.g. mark cold automatically).",
  },
};

export default function AutopilotPage() {
  const [rules, setRules] = useState<AutopilotRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    api
      .get<AutopilotRule[]>("/intelligence/autopilot")
      .then(setRules)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleRule = async (id: string, active: boolean) => {
    await api.patch(`/intelligence/autopilot/${id}`, { is_active: active });
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: active } : r)));
  };

  const deleteRule = async (id: string) => {
    await api.delete(`/intelligence/autopilot/${id}`);
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const stats = useMemo(() => {
    const active = rules.filter((r) => r.is_active).length;
    const totalFires = rules.reduce((s, r) => s + (r.execution_count ?? 0), 0);
    const autoSend = rules.filter((r) => !r.requires_approval && r.is_active).length;
    return { total: rules.length, active, totalFires, autoSend };
  }, [rules]);

  return (
    <>
      <div className="space-y-8">
        {/* ─── HEADER ─────────────────────────────────────────────────────── */}
        <header className="relative rounded-3xl border border-os-border bg-os-card/40 overflow-hidden p-6 md:p-7">
          <BorderBeam size={220} duration={14} colorFrom="#5EEAD4" colorTo="#A78BFA" />
          <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim mb-3">
                <Zap size={10} className="text-amber-400" />
                <ShinyText shimmerWidth={70} className="text-os-text-dim">
                  Set & Forget
                </ShinyText>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                Rules on <AuroraText>autopilot.</AuroraText>
              </h1>
              <p className="text-os-text-dim text-sm max-w-xl">
                <span className="text-white font-semibold">When X happens</span>, KROVA does{" "}
                <span className="text-white font-semibold">Y</span> — forever. Set a rule
                once and stop doing the same task by hand.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2.5 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-colors flex items-center gap-1.5 shrink-0 self-start md:self-auto"
            >
              <Plus size={12} /> New rule
            </button>
          </div>
        </header>

        {/* ─── HOW IT WORKS PRIMER ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-os-border bg-os-card/40 p-6">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim mb-4">
            <Sparkles size={10} className="text-violet-400" /> How a rule works
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                step: "1. Trigger",
                title: "When something happens",
                body: "Lead goes silent · status changes · new person messages · score drops · scheduled time.",
                accent: "teal" as Accent,
                icon: Activity,
              },
              {
                step: "2. Action",
                title: "KROVA does something",
                body: "Send a real message · draft for your approval · ping you with a summary · update a status.",
                accent: "violet" as Accent,
                icon: ArrowRight,
              },
              {
                step: "3. Cooldown",
                title: "It doesn't spam",
                body: "Cooldown stops the rule firing twice for the same customer in N days.",
                accent: "emerald" as Accent,
                icon: ShieldCheck,
              },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.step}
                  className="rounded-xl border border-os-border bg-os-bg/40 p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-os-card border border-os-border flex items-center justify-center">
                      <Icon size={13} className={ACCENT_TEXT[c.accent]} />
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-widest ${ACCENT_TEXT[c.accent]}`}
                    >
                      {c.step}
                    </span>
                  </div>
                  <p className="text-sm font-bold">{c.title}</p>
                  <p className="text-xs text-os-text-dim leading-relaxed">{c.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 flex items-center gap-2">
            <AlertCircle size={12} className="text-rose-400 shrink-0" />
            <p className="text-[11px] text-rose-400">{error}</p>
          </div>
        )}

        {/* ─── STAT TILES ──────────────────────────────────────────────────── */}
        {!loading && rules.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total rules", value: stats.total, accent: "teal" as Accent, icon: Zap },
              {
                label: "Active",
                value: stats.active,
                accent: "emerald" as Accent,
                icon: Activity,
              },
              {
                label: "Total fires",
                value: stats.totalFires,
                accent: "violet" as Accent,
                icon: TrendingDown,
              },
              {
                label: "Auto-send",
                value: stats.autoSend,
                accent: "rose" as Accent,
                icon: Send,
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <SpotlightCard key={s.label} className="h-full">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={13} className={ACCENT_TEXT[s.accent]} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                        {s.label}
                      </span>
                    </div>
                    <div className="text-3xl font-bold tabular-nums">
                      <NumberTicker value={s.value} />
                    </div>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        )}

        {/* ─── LIST ────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-os-border bg-os-card/40 animate-pulse h-32"
              />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-teal-400">
                Your rules
              </h2>
              <div className="h-px flex-1 bg-os-border" />
              <span className="text-[10px] font-mono text-os-text-dim">
                {rules.length}
              </span>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {rules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onToggle={toggleRule}
                    onDelete={deleteRule}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateRuleModal
            onClose={() => setShowCreate(false)}
            onCreate={(rule) => setRules((prev) => [rule, ...prev])}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── RULE CARD ────────────────────────────────────────────────────────────────
function RuleCard({
  rule,
  onToggle,
  onDelete,
}: {
  rule: AutopilotRule;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const trigger = TRIGGER_META[rule.trigger_type] || {
    label: rule.trigger_type,
    short: rule.trigger_type,
    icon: Clock,
    accent: "dim" as Accent,
    hint: "",
  };
  const action = ACTION_META[rule.action_type] || {
    label: rule.action_type,
    short: rule.action_type,
    icon: Send,
    accent: "dim" as Accent,
    hint: "",
  };

  const TriggerIcon = trigger.icon;
  const ActionIcon = action.icon;

  // Build trigger detail like "3 days" / "cold" / "below 30"
  const cfg = rule.trigger_config as Record<string, unknown> | null | undefined;
  const triggerDetail: string | null =
    cfg?.days !== undefined
      ? `${cfg.days} days`
      : cfg?.status
        ? String(cfg.status)
        : cfg?.threshold !== undefined
          ? `below ${cfg.threshold}`
          : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={`rounded-2xl border border-os-border bg-os-card/40 p-5 ${
        rule.is_active ? "" : "opacity-60"
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-base font-bold text-white truncate">{rule.name}</p>
            {!rule.is_active && (
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-os-bg border border-os-border text-os-text-dim">
                Paused
              </span>
            )}
            {!rule.requires_approval && rule.is_active && (
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400">
                Auto-send
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch on={rule.is_active} onChange={(v) => onToggle(rule.id, v)} />
          <button
            onClick={() => onDelete(rule.id)}
            className="w-8 h-8 rounded-lg border border-os-border bg-os-bg flex items-center justify-center text-os-text-dim hover:text-rose-400 hover:border-rose-500/30 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* When → Then visual */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
        {/* When */}
        <div className={`rounded-xl border border-os-border bg-os-bg/40 p-3.5`}>
          <div className="flex items-center gap-2 mb-2">
            <TriggerIcon size={11} className={ACCENT_TEXT[trigger.accent]} />
            <span
              className={`text-[9px] font-bold uppercase tracking-widest ${ACCENT_TEXT[trigger.accent]}`}
            >
              When
            </span>
          </div>
          <p className="text-xs text-white leading-snug">{trigger.label}</p>
          {triggerDetail && (
            <p className="text-[10px] font-mono text-os-text-dim mt-1">→ {triggerDetail}</p>
          )}
        </div>

        {/* Arrow */}
        <div className="hidden md:flex items-center justify-center px-2">
          <div className="w-8 h-8 rounded-full bg-os-bg border border-os-border flex items-center justify-center">
            <ArrowRight size={13} className="text-os-text-dim" />
          </div>
        </div>

        {/* Then */}
        <div className={`rounded-xl border border-os-border bg-os-bg/40 p-3.5`}>
          <div className="flex items-center gap-2 mb-2">
            <ActionIcon size={11} className={ACCENT_TEXT[action.accent]} />
            <span
              className={`text-[9px] font-bold uppercase tracking-widest ${ACCENT_TEXT[action.accent]}`}
            >
              Then
            </span>
          </div>
          <p className="text-xs text-white leading-snug">{action.label}</p>
          {rule.channel && (
            <p className="text-[10px] font-mono text-os-text-dim mt-1 capitalize">
              → via {rule.channel}
            </p>
          )}
        </div>
      </div>

      {/* Template */}
      {rule.message_template && (
        <div className="mt-3 rounded-lg border border-os-border bg-os-bg/40 p-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400 mb-1">
            Template
          </p>
          <p className="text-xs text-white font-mono leading-relaxed">"{rule.message_template}"</p>
        </div>
      )}

      {/* Footer stats */}
      <div className="mt-3 pt-3 border-t border-os-border flex items-center justify-between text-[10px] font-mono text-os-text-dim">
        <span>
          Fired <span className="text-white font-bold">{rule.execution_count}</span> times
        </span>
        <span>
          Cooldown: <span className="text-white font-bold">{rule.cooldown_days}d</span>
        </span>
      </div>
    </motion.div>
  );
}

// ── CUSTOM SWITCH ────────────────────────────────────────────────────────────
function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        on ? "bg-emerald-500/30 border border-emerald-500/40" : "bg-os-border border border-os-border"
      }`}
    >
      <motion.div
        animate={{ x: on ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full ${
          on ? "bg-emerald-400" : "bg-os-text-dim"
        }`}
      />
    </button>
  );
}

// ── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl border border-os-border bg-os-card/40 p-16 text-center overflow-hidden"
    >
      <BorderBeam size={200} duration={14} colorFrom="#5EEAD4" colorTo="#A78BFA" />
      <div className="relative w-16 h-16 mx-auto mb-6">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/30 to-orange-400/30 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-os-bg border border-amber-500/30 flex items-center justify-center">
          <Zap size={26} className="text-amber-400" />
        </div>
      </div>
      <h3 className="relative text-xl font-bold mb-2">No rules yet</h3>
      <p className="relative text-os-text-dim text-sm max-w-md mx-auto leading-relaxed mb-6">
        Create rules that run automatically — follow up cold leads, greet new arrivals, alert
        you when health scores drop, send weekly summaries.
      </p>
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-2 max-w-md mx-auto mb-6 text-left">
        {[
          { when: "No reply in 3 days", then: "Draft a follow-up" },
          { when: "New lead arrives", then: "Send a Hinglish greeting" },
          { when: "Score drops below 40", then: "Notify me" },
          { when: "Customer converts", then: "Thank-you draft after 30m" },
        ].map((r) => (
          <div
            key={r.when}
            className="rounded-xl border border-os-border bg-os-bg/40 p-3 text-[11px]"
          >
            <span className="text-teal-400">When</span>{" "}
            <span className="text-white">{r.when}</span>
            <br />
            <span className="text-violet-400">Then</span>{" "}
            <span className="text-os-text-dim">{r.then}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onCreate}
        className="relative px-5 py-2.5 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-colors inline-flex items-center gap-1.5"
      >
        <Plus size={12} /> Create your first rule
      </button>
    </motion.div>
  );
}

// ── CREATE RULE MODAL ────────────────────────────────────────────────────────
function CreateRuleModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (rule: AutopilotRule) => void;
}) {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("no_reply_days");
  const [triggerDays, setTriggerDays] = useState("3");
  const [triggerStatus, setTriggerStatus] = useState("cold");
  const [triggerThreshold, setTriggerThreshold] = useState("30");
  const [actionType, setActionType] = useState("create_action");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [cooldownDays, setCooldownDays] = useState("7");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trigger = TRIGGER_META[triggerType];
  const action = ACTION_META[actionType];

  const getTriggerConfig = () => {
    if (triggerType === "no_reply_days" || triggerType === "no_contact_days")
      return { days: parseInt(triggerDays) };
    if (triggerType === "status_changed_to") return { status: triggerStatus };
    if (triggerType === "health_score_below")
      return { threshold: parseInt(triggerThreshold) };
    return {};
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Rule name is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rule = await api.post<AutopilotRule>("/intelligence/autopilot", {
        name,
        trigger_type: triggerType,
        trigger_config: getTriggerConfig(),
        action_type: actionType,
        message_template: messageTemplate || null,
        channel: actionType === "send_message" ? channel : null,
        requires_approval: requiresApproval,
        cooldown_days: parseInt(cooldownDays),
      });
      onCreate(rule);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create rule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="relative rounded-3xl border border-os-border bg-os-card w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <BorderBeam size={250} duration={12} colorFrom="#5EEAD4" colorTo="#A78BFA" />

        <div className="h-12 border-b border-os-border flex items-center justify-between px-5 bg-os-bg/40">
          <div className="flex items-center gap-2">
            <Zap size={11} className="text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
              New Autopilot Rule
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-os-border bg-os-bg flex items-center justify-center text-os-text-dim hover:text-white"
          >
            <X size={12} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 flex items-center gap-2">
              <AlertCircle size={12} className="text-rose-400" />
              <p className="text-[11px] text-rose-400">{error}</p>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
              Rule name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Follow up cold leads"
              className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors"
            />
          </div>

          {/* Trigger */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400">
                When
              </span>
              <span className="text-[10px] text-os-text-dim">(trigger)</span>
            </div>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-os-border-bright transition-colors"
            >
              {Object.entries(TRIGGER_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            {trigger?.hint && (
              <p className="text-[10px] text-os-text-dim">{trigger.hint}</p>
            )}

            {/* Trigger details */}
            {(triggerType === "no_reply_days" || triggerType === "no_contact_days") && (
              <input
                type="number"
                value={triggerDays}
                onChange={(e) => setTriggerDays(e.target.value)}
                min="1"
                max="90"
                placeholder="Number of days"
                className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-os-border-bright transition-colors"
              />
            )}
            {triggerType === "status_changed_to" && (
              <select
                value={triggerStatus}
                onChange={(e) => setTriggerStatus(e.target.value)}
                className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-os-border-bright transition-colors capitalize"
              >
                {["new", "hot", "warm", "cold", "converted", "lost"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
            {triggerType === "health_score_below" && (
              <input
                type="number"
                value={triggerThreshold}
                onChange={(e) => setTriggerThreshold(e.target.value)}
                min="0"
                max="100"
                placeholder="Threshold (0–100)"
                className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-os-border-bright transition-colors"
              />
            )}
          </div>

          {/* Arrow divider */}
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-os-bg border border-os-border flex items-center justify-center">
              <ArrowRight size={13} className="text-os-text-dim" />
            </div>
          </div>

          {/* Action */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                Then
              </span>
              <span className="text-[10px] text-os-text-dim">(action)</span>
            </div>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-os-border-bright transition-colors"
            >
              {Object.entries(ACTION_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            {action?.hint && <p className="text-[10px] text-os-text-dim">{action.hint}</p>}
          </div>

          {actionType === "send_message" && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                  Channel
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-os-border-bright transition-colors capitalize"
                >
                  {["whatsapp", "instagram", "gmail"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                  Message template
                </label>
                <textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={3}
                  placeholder="Hi {{customer_name}}, just checking in…"
                  className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright resize-none font-mono"
                />
                <p className="text-[10px] text-os-text-dim">
                  Use <code className="text-teal-400">{"{{customer_name}}"}</code> as a placeholder.
                </p>
              </div>
            </>
          )}

          {/* Approval + Cooldown */}
          <div className="rounded-xl border border-os-border bg-os-bg/40 p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  Require my approval
                </p>
                <p className="text-[10px] text-os-text-dim mt-0.5">
                  Drafts go to your queue instead of sending immediately.
                </p>
              </div>
              <Switch on={requiresApproval} onChange={setRequiresApproval} />
            </div>

            <div className="space-y-1.5 border-t border-os-border pt-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                Cooldown (days)
              </label>
              <input
                type="number"
                value={cooldownDays}
                onChange={(e) => setCooldownDays(e.target.value)}
                min="0"
                max="90"
                className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-os-border-bright transition-colors"
              />
              <p className="text-[10px] text-os-text-dim">
                Same rule won't fire twice for the same customer within this window.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white text-black text-[11px] font-bold uppercase tracking-widest hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw size={12} className="animate-spin" /> Creating…
              </>
            ) : (
              <>
                <Plus size={12} /> Create rule
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// keep Inbox import alive (used elsewhere in palette consistency)
void Inbox;
