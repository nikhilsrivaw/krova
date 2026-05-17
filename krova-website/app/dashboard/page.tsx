"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Clock, CheckSquare, Zap, Users, DollarSign,
  GitBranch, ShieldAlert, AlertTriangle, ChevronRight,
  RefreshCw, Brain, TrendingUp, Target, Check, X, Sun,
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { TeamMemberCard, type TeamMemberStats } from "./_components/TeamMemberCard";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { ShinyText } from "@/components/magicui/shiny-text";
import { SpotlightCard } from "@/components/spectrum/spotlight-card";
import { GlowCard } from "@/components/spectrum/glow-card";

interface PriorityItem {
  id: string;
  area: string;
  urgency: string;
  title: string;
  description: string;
  action_label: string;
  action_href: string;
  customer_name: string | null;
  amount: number | null;
}

interface PriorityBrief {
  items: PriorityItem[];
  business_health_score: number;
  greeting: string;
}

interface OverviewStats {
  total_customers: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  messages_this_week: number;
  pending_approvals: number;
  actions_sent_this_month: number;
  reply_rate_percent: number;
  converted_this_month: number;
}

interface PredictionItem {
  id: string;
  customer_name: string | null;
  prediction_type: string;
  probability: number;
  confidence: number;
  prediction_text: string;
  recommended_action: string | null;
}

interface PredictionAccuracy {
  total_resolved: number;
  correct: number;
  incorrect: number;
  accuracy_percent: number;
}

interface PredictionsData {
  predictions: PredictionItem[];
  count: number;
  accuracy: PredictionAccuracy;
}

const AREA_ICON: Record<string, React.ReactNode> = {
  commitment: <Clock size={14} className="text-os-text-dim" />,
  relationship: <Users size={14} className="text-os-text-dim" />,
  sales: <GitBranch size={14} className="text-os-text-dim" />,
  money: <DollarSign size={14} className="text-os-text-dim" />,
  competitor: <ShieldAlert size={14} className="text-os-text-dim" />,
};

// Single subtle left-accent strip — color is the ONLY signal of urgency.
const URGENCY_ACCENT: Record<string, string> = {
  critical: "before:bg-rose-400",
  high: "before:bg-amber-400",
  medium: "before:bg-os-border",
};

const URGENCY_LABEL: Record<string, string> = {
  critical: "Now",
  high: "Soon",
  medium: "Today",
};

const URGENCY_LABEL_COLOR: Record<string, string> = {
  critical: "text-rose-400",
  high: "text-amber-400",
  medium: "text-os-text-dim",
};

function HealthScore({ score }: { score: number }) {
  const color = score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400";
  const label = score >= 75 ? "Healthy" : score >= 50 ? "Needs attention" : "Critical";
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-2xl border border-os-border bg-os-card/40">
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor"
            strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 94.2} 94.2`}
            className={color} />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${color}`}>
          {score}
        </span>
      </div>
      <div className="leading-tight">
        <p className={`text-[11px] font-bold ${color}`}>{label}</p>
        <p className="text-[9px] text-os-text-dim font-bold uppercase tracking-widest">Business health</p>
      </div>
    </div>
  );
}

const PRED_TYPE_LABEL: Record<string, string> = {
  churn_risk: "Churn Risk",
  conversion_window: "Ready to Convert",
  upsell_opportunity: "Upsell Opportunity",
  reactivation: "Reactivation Signal",
  revenue_at_risk: "Revenue at Risk",
  referral_likely: "Referral Likely",
};

// Prediction types share one base style — accent only on the type label itself.
const PRED_TYPE_ACCENT: Record<string, string> = {
  churn_risk: "text-rose-400",
  conversion_window: "text-emerald-400",
  upsell_opportunity: "text-teal-400",
  reactivation: "text-amber-400",
  revenue_at_risk: "text-rose-400",
  referral_likely: "text-violet-400",
};

export default function DashboardOverview() {
  const [brief, setBrief] = useState<PriorityBrief | null>(null);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [teamStats, setTeamStats] = useState<TeamMemberStats[]>([]);
  const [predictions, setPredictions] = useState<PredictionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noBusiness, setNoBusiness] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [markingOutcome, setMarkingOutcome] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [briefResult, statsResult, teamResult, predResult] = await Promise.allSettled([
          api.get<PriorityBrief>("/analytics/priority-brief"),
          api.get<OverviewStats>("/analytics/overview"),
          api.get<TeamMemberStats[]>("/analytics/team"),
          api.get<PredictionsData>("/intelligence/predictions"),
        ]);
        if (briefResult.status === "fulfilled") setBrief(briefResult.value);
        if (statsResult.status === "fulfilled") setStats(statsResult.value);
        if (teamResult.status === "fulfilled") setTeamStats(teamResult.value);
        if (predResult.status === "fulfilled") setPredictions(predResult.value);
        if (statsResult.status === "rejected") {
          const msg = (statsResult.reason as Error).message || "";
          if (msg.includes("404") || msg.toLowerCase().includes("business not found")) {
            setNoBusiness(true);
          } else {
            setApiError(msg);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const markOutcome = async (predId: string, outcome: "correct" | "incorrect") => {
    setMarkingOutcome(predId);
    try {
      await api.patch(`/intelligence/predictions/${predId}/outcome`, { outcome });
      setPredictions(prev => prev ? {
        ...prev,
        predictions: prev.predictions.filter(p => p.id !== predId),
        count: prev.count - 1,
      } : prev);
    } catch { /* ignore */ } finally {
      setMarkingOutcome(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-os-border rounded w-48" />
          <div className="h-4 bg-os-border rounded w-72" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-os-border rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (noBusiness) {
    return (
      <div className="os-card p-12 text-center">
        <div className="w-14 h-14 bg-os-border rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Zap size={24} />
        </div>
        <h3 className="text-lg font-bold mb-2">Finish your setup</h3>
        <p className="text-os-text-dim text-sm mb-6 max-w-xs mx-auto">
          Your business profile hasn&apos;t been created yet. Complete the 4-step setup to activate your workspace.
        </p>
        <Link href="/onboarding">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="os-button os-button-primary px-8 py-2.5 font-bold">
            Complete Setup →
          </motion.button>
        </Link>
      </div>
    );
  }

  if (apiError && !brief && !stats) {
    return (
      <div className="os-card p-12 text-center space-y-4">
        <p className="text-sm font-bold text-white">Could not reach the backend</p>
        <p className="text-os-text-dim text-xs font-mono bg-os-bg px-3 py-2 rounded-lg inline-block">{apiError}</p>
        <button onClick={() => window.location.reload()}
          className="os-button os-button-secondary text-xs px-6 py-2">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* ─── HEADER — calm, single accent (aurora greeting) ─────────────────── */}
      <header className="relative rounded-3xl border border-os-border bg-os-card/40 overflow-hidden p-6 md:p-8">
        <BorderBeam size={220} duration={14} colorFrom="#5EEAD4" colorTo="#A78BFA" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim mb-3">
              <Sun size={10} className="text-amber-400" />
              <ShinyText shimmerWidth={70} className="text-os-text-dim">
                Today&apos;s Briefing
              </ShinyText>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              <AuroraText>{brief?.greeting || "Good morning."}</AuroraText>
            </h1>
            {stats && (
              <p className="text-os-text-dim text-sm">
                <span className="text-white font-semibold">{stats.messages_this_week}</span> conversations analyzed ·{" "}
                <span className="text-white font-semibold">{stats.pending_approvals}</span> drafts ready ·{" "}
                <span className="text-white font-semibold">{stats.total_customers}</span> people tracked
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {brief && <HealthScore score={brief.business_health_score} />}
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-os-border bg-os-bg/60">
              <div className="relative">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                AI Active
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── STAT GRID — same card style for all 4, accent only on dot ──────── */}
      {stats && (
        <section>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim">
              At a glance
            </h2>
            <div className="h-px flex-1 bg-os-border" />
            <Link
              href="/dashboard/intelligence"
              className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors"
            >
              All findings →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "At Risk",
                value: stats.cold_leads,
                dot: "bg-rose-400",
                href: "/dashboard/intelligence",
                sub: "going cold",
              },
              {
                label: "Hot Signals",
                value: stats.hot_leads,
                dot: "bg-amber-400",
                href: "/dashboard/intelligence",
                sub: "ready to act",
              },
              {
                label: "Drafts Ready",
                value: stats.pending_approvals,
                dot: "bg-emerald-400",
                href: "/dashboard/approvals",
                sub: "awaiting you",
              },
              {
                label: "Reply Rate",
                value: stats.reply_rate_percent,
                suffix: "%",
                dot: "bg-teal-400",
                href: "/dashboard/analytics",
                sub: "this week",
              },
            ].map((item) => (
              <Link key={item.label} href={item.href}>
                <SpotlightCard className="h-full cursor-pointer">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                        {item.label}
                      </span>
                    </div>
                    <div className="text-3xl font-bold tracking-tight tabular-nums">
                      <NumberTicker value={item.value} suffix={item.suffix} />
                    </div>
                    <p className="text-[10px] text-os-text-dim mt-1">{item.sub}</p>
                  </div>
                </SpotlightCard>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── PENDING ACTIONS CTA — single GlowCard, no yellow flood ─────────── */}
      {stats && stats.pending_approvals > 0 && (
        <section>
          <Link href="/dashboard/approvals">
            <GlowCard glowColor="from-teal-400/30 via-violet-400/20 to-pink-400/30">
              <motion.div
                whileHover={{ scale: 1.005 }}
                className="p-5 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-os-bg border border-os-border flex items-center justify-center">
                    <CheckSquare size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">
                      <span className="text-white">{stats.pending_approvals}</span>{" "}
                      <span className="text-os-text-dim font-medium">
                        AI drafts waiting for your approval
                      </span>
                    </p>
                    <p className="text-[11px] text-os-text-dim mt-0.5">
                      ~{Math.max(1, Math.ceil(stats.pending_approvals * 0.4))} minutes to review all
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-os-text-dim">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Review</span>
                  <ChevronRight size={14} />
                </div>
              </motion.div>
            </GlowCard>
          </Link>
        </section>
      )}

      {/* ─── PRIORITY BRIEF — single card, urgency = left accent strip only ─── */}
      {brief && brief.items.length > 0 && (
        <section>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim">
              Priorities
            </h2>
            <div className="h-px flex-1 bg-os-border" />
            <span className="text-[10px] text-os-text-dim font-mono">
              {brief.items.length} {brief.items.length === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="rounded-2xl border border-os-border bg-os-card/40 overflow-hidden divide-y divide-os-border/60">
            {brief.items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={item.action_href}>
                  <div
                    className={`relative pl-5 pr-4 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-white/[0.025] transition-colors group before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 ${URGENCY_ACCENT[item.urgency] || "before:bg-os-border"}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-os-bg border border-os-border flex items-center justify-center shrink-0">
                      {AREA_ICON[item.area] || <AlertTriangle size={14} className="text-os-text-dim" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-widest ${URGENCY_LABEL_COLOR[item.urgency] || "text-os-text-dim"}`}
                        >
                          {URGENCY_LABEL[item.urgency] || "Today"}
                        </span>
                        <span className="text-[9px] text-os-text-dim">·</span>
                        <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                        {item.amount && (
                          <span className="ml-auto text-xs font-mono text-white shrink-0">
                            ₹{item.amount.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-os-text-dim truncate">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-os-text-dim group-hover:text-white transition-colors">
                      <span className="text-[9px] font-bold uppercase tracking-widest hidden md:block">
                        {item.action_label}
                      </span>
                      <ChevronRight size={12} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ─── EMPTY STATE — calm, single emerald accent ──────────────────────── */}
      {brief && brief.items.length === 0 && (
        <section>
          <div className="rounded-2xl border border-os-border bg-os-card/40 p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-os-bg border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">All clear today.</p>
            <p className="text-xs text-os-text-dim max-w-xs mx-auto leading-relaxed">
              No urgent items across your business. KROVA is watching — you&apos;ll be
              notified when something needs attention.
            </p>
          </div>
        </section>
      )}

      {/* ─── KROVA PREDICT — unified cards, accent only on type label ───────── */}
      {predictions && predictions.count > 0 && (
        <section>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim flex items-center gap-2">
              <Target size={11} /> KROVA Predict
            </h2>
            <div className="h-px flex-1 bg-os-border" />
            {predictions.accuracy.total_resolved > 0 && (
              <span className="text-[10px] font-mono text-os-text-dim">
                {predictions.accuracy.accuracy_percent}% accurate ·{" "}
                <span className="text-os-text-dim/60">
                  {predictions.accuracy.total_resolved} resolved
                </span>
              </span>
            )}
            <Link
              href="/dashboard/intelligence"
              className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors"
            >
              All →
            </Link>
          </div>

          <div className="space-y-2">
            {predictions.predictions.slice(0, 5).map((pred, i) => {
              const accent = PRED_TYPE_ACCENT[pred.prediction_type] || "text-os-text-dim";
              const impactScore = Math.round(pred.probability * pred.confidence * 100);
              return (
                <motion.div
                  key={pred.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-os-border bg-os-card/40 p-4 flex items-start gap-4 hover:border-os-border-bright transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-widest ${accent}`}
                      >
                        {PRED_TYPE_LABEL[pred.prediction_type] || pred.prediction_type}
                      </span>
                      {pred.customer_name && (
                        <>
                          <span className="text-[9px] text-os-text-dim">·</span>
                          <span className="text-[11px] text-white font-semibold">
                            {pred.customer_name}
                          </span>
                        </>
                      )}
                      <span className="ml-auto text-[9px] font-mono text-os-text-dim shrink-0">
                        {impactScore}% impact
                      </span>
                    </div>
                    <p className="text-sm text-white leading-snug">{pred.prediction_text}</p>
                    {pred.recommended_action && (
                      <p className="text-[11px] text-os-text-dim mt-1.5 leading-snug">
                        → {pred.recommended_action}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => markOutcome(pred.id, "correct")}
                      disabled={markingOutcome === pred.id}
                      title="Mark correct"
                      className="w-7 h-7 rounded-lg bg-os-bg border border-os-border flex items-center justify-center text-os-text-dim hover:text-emerald-400 hover:border-emerald-500/30 transition-colors disabled:opacity-40"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => markOutcome(pred.id, "incorrect")}
                      disabled={markingOutcome === pred.id}
                      title="Mark incorrect"
                      className="w-7 h-7 rounded-lg bg-os-bg border border-os-border flex items-center justify-center text-os-text-dim hover:text-rose-400 hover:border-rose-500/30 transition-colors disabled:opacity-40"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── TEAM ──────────────────────────────────────────────────────────── */}
      {teamStats.length > 0 && (
        <section>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim flex items-center gap-2">
              <Users size={11} /> Team
            </h2>
            <div className="h-px flex-1 bg-os-border" />
            <Link
              href="/dashboard/settings"
              className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors"
            >
              Manage →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {teamStats.map((m) => (
              <TeamMemberCard key={m.member_id} m={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
