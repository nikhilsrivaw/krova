"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSearchParams } from "next/navigation";
import {
  Brain, Target, Lightbulb, Star, DollarSign, RefreshCw,
  CheckCircle, Check, X,
  MessageSquare, ShieldAlert, BarChart3, Zap, Heart,
  Shield, Clock, Mic, Users2, GraduationCap,
} from "lucide-react";
import {
  api, DNAProfile, Prediction, WeeklyInsight,
  FinancialOverview, ReputationOverview,
  Commitment, RevenueSignal, CompetitorSummary, GrowthBlocker,
  GratitudeCandidate, AntiSpamAlert, RelationshipDebtItem,
  VoiceOfCustomerResponse, ClusterIntelligenceResponse, KROVACoachResponse,
} from "@/lib/api";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShinyText } from "@/components/magicui/shiny-text";

// ── Unified primitives ────────────────────────────────────────────────────────
// All lens content uses these instead of per-lens colored borders/backgrounds.
// Palette is strict: rose=negative · amber=warning · emerald=positive ·
// teal=info/brand · violet=AI · os-text-dim=neutral.

const ACCENT_TEXT: Record<string, string> = {
  rose: "text-rose-400",
  amber: "text-amber-400",
  emerald: "text-emerald-400",
  teal: "text-teal-400",
  violet: "text-violet-400",
  dim: "text-os-text-dim",
};
const ACCENT_DOT: Record<string, string> = {
  rose: "bg-rose-400",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  teal: "bg-teal-400",
  violet: "bg-violet-400",
  dim: "bg-os-text-dim",
};

type Accent = "rose" | "amber" | "emerald" | "teal" | "violet" | "dim";

function LensSectionHeader({
  label,
  accent = "dim",
  count,
  trailing,
}: {
  label: string;
  accent?: Accent;
  count?: number;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-2 h-2 rounded-full ${ACCENT_DOT[accent]}`} />
      <h3
        className={`text-[10px] font-bold uppercase tracking-[0.3em] ${ACCENT_TEXT[accent]}`}
      >
        {label}
      </h3>
      <div className="h-px flex-1 bg-os-border" />
      {count !== undefined && (
        <span className="text-[10px] font-mono text-os-text-dim">{count}</span>
      )}
      {trailing}
    </div>
  );
}

function LensCard({
  children,
  className = "",
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: Accent;
}) {
  return (
    <div
      className={`relative rounded-2xl border border-os-border bg-os-card/40 ${
        accent ? `before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:rounded-l-2xl before:${ACCENT_DOT[accent]} pl-1` : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

function StatTile({
  label,
  value,
  accent = "dim",
}: {
  label: string;
  value: React.ReactNode;
  accent?: Accent;
}) {
  return (
    <div className="rounded-xl border border-os-border bg-os-card/40 p-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim mb-1.5">
        {label}
      </p>
      <p className={`text-sm font-bold font-mono ${ACCENT_TEXT[accent]}`}>{value}</p>
    </div>
  );
}

function LensEmpty({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative rounded-2xl border border-os-border bg-os-card/40 p-12 text-center">
      <div className="relative w-14 h-14 mx-auto mb-5">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-400/20 to-violet-400/20 blur-xl" />
        <div className="relative w-14 h-14 rounded-2xl bg-os-bg border border-os-border flex items-center justify-center">
          <Icon size={22} className="text-os-text-dim" />
        </div>
      </div>
      <h3 className="text-base font-bold mb-1.5">{title}</h3>
      <p className="text-xs text-os-text-dim max-w-sm mx-auto leading-relaxed">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function MetaPill({
  accent = "dim",
  children,
}: {
  accent?: Accent;
  children: React.ReactNode;
}) {
  const bg: Record<Accent, string> = {
    rose: "bg-rose-500/10 border-rose-500/30",
    amber: "bg-amber-500/10 border-amber-500/30",
    emerald: "bg-emerald-500/10 border-emerald-500/30",
    teal: "bg-teal-500/10 border-teal-500/30",
    violet: "bg-violet-500/10 border-violet-500/30",
    dim: "bg-os-bg border-os-border",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${bg[accent]} ${ACCENT_TEXT[accent]}`}
    >
      {children}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const accent: Accent = pct >= 70 ? "emerald" : pct >= 40 ? "amber" : "rose";
  return <MetaPill accent={accent}>{pct}% confidence</MetaPill>;
}

function isOverdue(dueDateStr: string | null): boolean {
  if (!dueDateStr) return false;
  return new Date(dueDateStr) < new Date();
}

// Map raw signal_type to unified accent + label
const SIGNAL_META: Record<string, { label: string; accent: Accent }> = {
  scope_creep: { label: "Scope Creep", accent: "amber" },
  forgotten_invoice: { label: "Forgotten Invoice", accent: "rose" },
  ghost_invoice: { label: "Ghost Invoice", accent: "amber" },
  retainer_mismatch: { label: "Retainer Mismatch", accent: "violet" },
};

// ── Predictions ───────────────────────────────────────────────────────────────

const PREDICTION_META: Record<string, { label: string; accent: Accent }> = {
  churn_risk: { label: "Churn Risk", accent: "rose" },
  conversion_window: { label: "Conversion Window", accent: "emerald" },
  upsell_opportunity: { label: "Upsell Opportunity", accent: "teal" },
  reactivation: { label: "Reactivating", accent: "amber" },
  revenue_at_risk: { label: "Revenue at Risk", accent: "rose" },
  referral_likely: { label: "Referral Likely", accent: "violet" },
};

function PredictionCard({
  p,
  onAck,
  onOutcome,
}: {
  p: Prediction;
  onAck: (id: string) => void;
  onOutcome: (id: string, outcome: "correct" | "incorrect") => void;
}) {
  const meta = PREDICTION_META[p.prediction_type] || { label: p.prediction_type, accent: "dim" as Accent };
  const impactScore = Math.round(p.probability * p.confidence * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-os-border bg-os-card/40 p-5 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <MetaPill accent={meta.accent}>{meta.label}</MetaPill>
            {p.customer_name && (
              <span className="text-[11px] font-semibold text-white">{p.customer_name}</span>
            )}
          </div>
          <p className="text-sm text-white leading-snug">{p.prediction_text}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-white tabular-nums">
            {Math.round(p.probability * 100)}%
          </div>
          <div className="text-[9px] text-os-text-dim uppercase tracking-widest">probability</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ConfidenceBadge confidence={p.confidence} />
        <span className="text-[9px] font-mono text-os-text-dim">
          impact {impactScore}/100
        </span>
      </div>

      {p.recommended_action && (
        <div className="rounded-lg border border-os-border bg-os-bg/40 p-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-teal-400 mb-1">
            Recommended action
          </p>
          <p className="text-xs text-white leading-relaxed">{p.recommended_action}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-os-border">
        <span className="text-[9px] text-os-text-dim font-mono">Did this happen?</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOutcome(p.id, "correct")}
            className="px-2 h-7 rounded-lg border border-os-border bg-os-bg text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-emerald-400 hover:border-emerald-500/30 transition-colors flex items-center gap-1"
          >
            <Check size={10} /> Yes
          </button>
          <button
            onClick={() => onOutcome(p.id, "incorrect")}
            className="px-2 h-7 rounded-lg border border-os-border bg-os-bg text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-rose-400 hover:border-rose-500/30 transition-colors flex items-center gap-1"
          >
            <X size={10} /> No
          </button>
          <button
            onClick={() => onAck(p.id)}
            className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors px-1"
          >
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── DNA ───────────────────────────────────────────────────────────────────────

function DNASection({ dna }: { dna: DNAProfile | null }) {
  if (!dna || dna.analysis_count === 0) {
    return (
      <LensEmpty
        icon={Brain}
        title="Business DNA is building"
        body="After the first nightly analysis the DNA starts forming. By day 90 it will know your business better than you consciously do."
      />
    );
  }
  const profile = dna.profile as Record<string, Record<string, unknown>>;
  const conversion = profile?.conversion_patterns || {};
  const channel = profile?.channel_insights || {};
  const pricing = profile?.pricing_intelligence || {};
  const comms = profile?.communication_style || {};
  return (
    <div className="space-y-6">
      {dna.narrative && (
        <div className="rounded-2xl border border-os-border bg-os-card/40 p-5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-teal-400 mb-2">
            What KROVA learned
          </p>
          <p className="text-sm text-white leading-relaxed">"{dna.narrative}"</p>
          <p className="text-[10px] text-os-text-dim mt-3 font-mono">
            {dna.analysis_count} analysis runs · last updated {dna.last_updated}
          </p>
        </div>
      )}

      <div>
        <LensSectionHeader label="Fingerprint" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatTile
            label="Communication"
            value={`${comms?.language || "—"} · ${comms?.formality || "—"}`}
            accent="teal"
          />
          <StatTile
            label="Win Rate"
            value={
              conversion?.win_rate
                ? `${Math.round((conversion.win_rate as number) * 100)}%`
                : "Building…"
            }
            accent="emerald"
          />
          <StatTile
            label="Best for Leads"
            value={(channel?.best_for_leads as string) || "Building…"}
          />
          <StatTile
            label="Best to Close"
            value={(channel?.best_for_conversion as string) || "Building…"}
          />
          <StatTile
            label="Avg Deal Size"
            value={
              pricing?.avg_deal_size
                ? `₹${(pricing.avg_deal_size as number).toLocaleString("en-IN")}`
                : "Building…"
            }
            accent="emerald"
          />
          <StatTile
            label="Avg Days to Close"
            value={
              conversion?.avg_days_to_convert
                ? `${conversion.avg_days_to_convert} days`
                : "Building…"
            }
          />
        </div>
      </div>

      {(profile?.conversion_patterns?.conversion_triggers as string[])?.length > 0 && (
        <div>
          <LensSectionHeader label="What closes your deals" accent="emerald" />
          <div className="flex flex-wrap gap-2">
            {(profile.conversion_patterns.conversion_triggers as string[]).map((t, i) => (
              <MetaPill key={i} accent="emerald">
                {t}
              </MetaPill>
            ))}
          </div>
        </div>
      )}

      {(profile?.problem_patterns?.red_flags as string[])?.length > 0 && (
        <div>
          <LensSectionHeader label="Red flags to watch" accent="rose" />
          <div className="flex flex-wrap gap-2">
            {(profile.problem_patterns.red_flags as string[]).map((f, i) => (
              <MetaPill key={i} accent="rose">
                {f}
              </MetaPill>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Weekly Insight ────────────────────────────────────────────────────────────

const INSIGHT_ACCENT: Record<string, Accent> = {
  response_time: "amber",
  channel_performance: "teal",
  conversion: "emerald",
  retention: "violet",
  pricing: "amber",
  pipeline: "teal",
  timing: "violet",
};

function WeeklyInsightCard({ insight, onRead, onCommit }: {
  insight: WeeklyInsight; onRead: (id: string) => void; onCommit: (id: string) => void;
}) {
  const accent = INSIGHT_ACCENT[insight.category] || "dim";
  return (
    <div className="rounded-2xl border border-os-border bg-os-card/40 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <MetaPill accent={accent}>
              <Lightbulb size={10} /> {insight.category.replace("_", " ")}
            </MetaPill>
            <span className="text-[10px] font-mono text-os-text-dim">{insight.week}</span>
          </div>
          <h3 className="text-base font-bold text-white leading-snug">{insight.headline}</h3>
        </div>
        <ConfidenceBadge confidence={insight.confidence} />
      </div>

      <p className="text-sm text-os-text-dim leading-relaxed">{insight.body}</p>

      {insight.benchmark_comparison && (
        <div className="rounded-lg border border-os-border bg-os-bg/40 p-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim mb-1">
            Benchmark
          </p>
          <p className="text-xs text-white">{insight.benchmark_comparison}</p>
        </div>
      )}

      <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-teal-400 mb-1">
          This week's action
        </p>
        <p className="text-sm text-white leading-snug">{insight.action_item}</p>
        {insight.estimated_impact && (
          <p className="text-[10px] text-emerald-400 mt-2">→ {insight.estimated_impact}</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        {!insight.is_read && (
          <button
            onClick={() => onRead(insight.id)}
            className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors"
          >
            Mark as read
          </button>
        )}
        {!insight.owner_committed ? (
          <button
            onClick={() => onCommit(insight.id)}
            className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/25 transition-colors"
          >
            I'll act on this
          </button>
        ) : (
          <div className="ml-auto flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
            <CheckCircle size={11} /> Committed
          </div>
        )}
      </div>
    </div>
  );
}

// ── Commitments ───────────────────────────────────────────────────────────────

function CommitmentsTab({ commitments, onFulfill, onDismiss }: {
  commitments: Commitment[];
  onFulfill: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const overdue = commitments.filter(c => isOverdue(c.due_date));
  const upcoming = commitments.filter(c => !isOverdue(c.due_date));

  if (commitments.length === 0) {
    return (
      <LensEmpty
        icon={CheckCircle}
        title="No outstanding commitments"
        body="KROVA will surface promises you've made across WhatsApp, Gmail, and Instagram automatically."
      />
    );
  }

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <div>
          <LensSectionHeader label="Overdue" accent="rose" count={overdue.length} />
          <div className="rounded-2xl border border-os-border bg-os-card/40 overflow-hidden divide-y divide-os-border/60">
            {overdue.map(c => (
              <CommitmentRow key={c.id} c={c} onFulfill={onFulfill} onDismiss={onDismiss} overdue />
            ))}
          </div>
        </div>
      )}
      {upcoming.length > 0 && (
        <div>
          <LensSectionHeader label="Upcoming" accent="emerald" count={upcoming.length} />
          <div className="rounded-2xl border border-os-border bg-os-card/40 overflow-hidden divide-y divide-os-border/60">
            {upcoming.map(c => (
              <CommitmentRow key={c.id} c={c} onFulfill={onFulfill} onDismiss={onDismiss} overdue={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CommitmentRow({ c, onFulfill, onDismiss, overdue }: {
  c: Commitment; onFulfill: (id: string) => void; onDismiss: (id: string) => void; overdue: boolean;
}) {
  return (
    <div
      className={`relative pl-5 pr-4 py-4 flex items-start gap-4 hover:bg-white/[0.02] transition-colors before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 ${
        overdue ? "before:bg-rose-400" : "before:bg-os-border"
      }`}
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm text-white leading-snug">{c.commitment_text}</p>
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[10px]">
          {c.customer_name && (
            <span className="font-semibold text-white/80">{c.customer_name}</span>
          )}
          {c.due_date && (
            <span className={`font-mono font-semibold ${overdue ? "text-rose-400" : "text-os-text-dim"}`}>
              {overdue ? "Was due " : "Due "}
              {c.due_date}
            </span>
          )}
          {c.source_channel && (
            <span className="text-os-text-dim capitalize">via {c.source_channel}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onDismiss(c.id)}
          title="Dismiss"
          className="w-8 h-8 rounded-lg border border-os-border bg-os-bg flex items-center justify-center text-os-text-dim hover:text-rose-400 hover:border-rose-500/30 transition-colors"
        >
          <X size={12} />
        </button>
        <button
          onClick={() => onFulfill(c.id)}
          title="Mark done"
          className="px-3 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/25 transition-colors flex items-center gap-1.5"
        >
          <Check size={11} /> Done
        </button>
      </div>
    </div>
  );
}

// ── Revenue Leaks ─────────────────────────────────────────────────────────────

function RevenueLeaksTab({ signals, onResolve }: {
  signals: RevenueSignal[];
  onResolve: (id: string) => void;
}) {
  const total = signals.reduce((sum, s) => sum + (s.estimated_amount || 0), 0);

  if (signals.length === 0) {
    return (
      <LensEmpty
        icon={DollarSign}
        title="No revenue leaks detected"
        body="KROVA watches for unbilled work, forgotten invoices, and ghost invoices automatically. Nothing is slipping right now."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero stat */}
      <div className="rounded-2xl border border-os-border bg-os-card/40 p-5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-rose-400 mb-2">
          Total estimated leakage
        </p>
        <p className="text-4xl font-bold text-white tabular-nums">
          ₹{total.toLocaleString("en-IN")}
        </p>
        <p className="text-[10px] text-os-text-dim mt-1.5 font-mono">
          across {signals.length} signal{signals.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div>
        <LensSectionHeader label="Signals" count={signals.length} />
        <div className="rounded-2xl border border-os-border bg-os-card/40 overflow-hidden divide-y divide-os-border/60">
          {signals.map(s => {
            const meta = SIGNAL_META[s.signal_type] || { label: s.signal_type, accent: "dim" as Accent };
            const accentColor = `before:${ACCENT_DOT[meta.accent]}`;
            return (
              <div
                key={s.id}
                className={`relative pl-5 pr-4 py-4 hover:bg-white/[0.02] transition-colors before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 ${accentColor}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <MetaPill accent={meta.accent}>{meta.label}</MetaPill>
                      {s.customer_name && (
                        <span className="text-[11px] font-semibold text-white">{s.customer_name}</span>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-sm text-os-text-dim leading-snug">{s.description}</p>
                    )}
                  </div>
                  {s.estimated_amount && (
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-white tabular-nums">
                        ₹{s.estimated_amount.toLocaleString("en-IN")}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onResolve(s.id)}
                  className="mt-3 text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-emerald-400 transition-colors"
                >
                  Mark resolved →
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Competitors ───────────────────────────────────────────────────────────────

function CompetitorsTab({ competitors }: { competitors: CompetitorSummary[] }) {
  if (competitors.length === 0) {
    return (
      <LensEmpty
        icon={ShieldAlert}
        title="No competitors mentioned"
        body="KROVA detects every competitor mention across all your channels automatically. Your customers haven't named anyone — yet."
      />
    );
  }

  const sentimentAccent: Record<string, Accent> = {
    comparing: "amber",
    switched: "rose",
    neutral: "dim",
  };

  return (
    <div className="space-y-3">
      <LensSectionHeader
        label="Mentions"
        count={competitors.length}
      />
      {competitors.map(c => (
        <div
          key={c.competitor_name}
          className="rounded-2xl border border-os-border bg-os-card/40 p-5 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-white">{c.competitor_name}</p>
              <p className="text-[10px] text-os-text-dim mt-0.5 font-mono">
                Last mentioned {c.last_mentioned}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-white tabular-nums">{c.mention_count}</p>
              <p className="text-[9px] text-os-text-dim uppercase tracking-widest">
                {c.mention_count !== 1 ? "mentions" : "mention"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {c.sentiments.map(s => (
              <MetaPill key={s} accent={sentimentAccent[s] || "dim"}>
                {s}
              </MetaPill>
            ))}
          </div>

          {c.customers_mentioning.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-os-border">
              <span className="text-[9px] text-os-text-dim font-bold uppercase tracking-widest mt-1.5 mr-1">
                Mentioned by:
              </span>
              {c.customers_mentioning.map(name => (
                <span
                  key={name}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-os-bg border border-os-border text-os-text-dim"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Growth Blockers ───────────────────────────────────────────────────────────

function GrowthBlockersTab({ report }: { report: GrowthBlocker | null }) {
  if (!report) {
    return (
      <LensEmpty
        icon={BarChart3}
        title="Growth report building"
        body="Available after 90 days of business data. KROVA needs enough history to identify real growth patterns and bottlenecks."
      />
    );
  }

  return (
    <div className="space-y-5">
      {report.top_blocker && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <MetaPill accent="rose">Top blocker</MetaPill>
          </div>
          <p className="text-base font-bold text-white leading-snug">{report.top_blocker}</p>
          {report.total_revenue_leakage_estimate && (
            <p className="text-xs text-os-text-dim mt-3">
              Annual impact:{" "}
              <span className="text-rose-400 font-bold tabular-nums">
                ₹{report.total_revenue_leakage_estimate.toLocaleString("en-IN")}
              </span>
            </p>
          )}
        </div>
      )}

      <div>
        <LensSectionHeader
          label="Ranked blockers"
          count={report.blockers.length}
        />
        <div className="space-y-3">
          {report.blockers.sort((a, b) => a.priority - b.priority).map((blocker, i) => (
            <div
              key={i}
              className="rounded-2xl border border-os-border bg-os-card/40 p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-mono text-os-text-dim font-bold">
                      #{blocker.priority}
                    </span>
                    <p className="text-sm font-bold text-white">{blocker.title}</p>
                  </div>
                  <p className="text-xs text-os-text-dim leading-relaxed">
                    {blocker.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-bold text-rose-400 tabular-nums">
                    ₹{(blocker.revenue_impact_annual ?? 0).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[9px] text-os-text-dim uppercase tracking-widest">
                    annual
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-teal-400 mb-1">
                  Fix this week
                </p>
                <p className="text-xs text-white leading-snug">{blocker.action_item}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-os-text-dim text-center font-mono">
        Generated {report.report_date} · Updated monthly
      </p>
    </div>
  );
}

// ── Gratitude Engine ──────────────────────────────────────────────────────────

function GratitudeTab({ candidates, loading }: { candidates: GratitudeCandidate[]; loading: boolean }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (loading)
    return (
      <div className="rounded-2xl border border-os-border bg-os-card/40 p-12 text-center">
        <RefreshCw size={16} className="text-os-text-dim animate-spin mx-auto" />
      </div>
    );
  if (candidates.length === 0)
    return (
      <LensEmpty
        icon={Heart}
        title="No gratitude candidates right now"
        body="KROVA watches for clients who deserve genuine appreciation but haven't received it. Nobody is waiting on a thank-you."
      />
    );
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4">
        <p className="text-sm text-white font-bold">
          {candidates.length} client{candidates.length !== 1 ? "s" : ""} deserve appreciation
        </p>
        <p className="text-[11px] text-os-text-dim mt-1">
          Real messages based on actual relationship history — not templates.
        </p>
      </div>
      {candidates.map(c => (
        <div
          key={c.customer_id}
          className="rounded-2xl border border-os-border bg-os-card/40 p-5 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <p className="text-sm font-bold text-white">{c.customer_name || "Unknown"}</p>
              <p className="text-[11px] text-os-text-dim">{c.gratitude_reason}</p>
              <div className="flex items-center gap-2">
                <MetaPill accent={c.status === "converted" ? "emerald" : "teal"}>
                  {c.status}
                </MetaPill>
                <span className="text-[10px] text-os-text-dim capitalize">{c.channel}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-white tabular-nums">{c.health_score}</p>
              <p className="text-[9px] text-os-text-dim uppercase tracking-widest">health</p>
            </div>
          </div>
          <div className="rounded-lg border border-os-border bg-os-bg/40 p-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400 mb-1.5">
              Suggested message
            </p>
            <p className="text-sm text-white leading-snug">"{c.suggested_message}"</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(c.suggested_message);
              setCopied(c.customer_id);
              setTimeout(() => setCopied(null), 2000);
            }}
            className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-violet-400 transition-colors flex items-center gap-1"
          >
            {copied === c.customer_id ? (
              <>
                <Check size={11} className="text-emerald-400" /> Copied
              </>
            ) : (
              <>Copy message →</>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Anti-Spam Guardian ────────────────────────────────────────────────────────

function AntiSpamTab({ alerts, loading }: { alerts: AntiSpamAlert[]; loading: boolean }) {
  if (loading)
    return (
      <div className="rounded-2xl border border-os-border bg-os-card/40 p-12 text-center">
        <RefreshCw size={16} className="text-os-text-dim animate-spin mx-auto" />
      </div>
    );
  if (alerts.length === 0)
    return (
      <LensEmpty
        icon={Shield}
        title="No over-messaging detected"
        body="KROVA watches for one-sided conversations where you're doing all the talking. You're keeping a healthy rhythm."
      />
    );
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <p className="text-sm text-white font-bold">
          {alerts.length} customer{alerts.length !== 1 ? "s" : ""} · you may be over-messaging
        </p>
        <p className="text-[11px] text-os-text-dim mt-1">
          Silence protects the relationship better than another follow-up.
        </p>
      </div>
      {alerts.map(a => (
        <div
          key={a.customer_id}
          className="rounded-2xl border border-os-border bg-os-card/40 p-5 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <p className="text-sm font-bold text-white">{a.customer_name || "Unknown"}</p>
              <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[10px]">
                <span className="font-mono text-amber-400">
                  {a.outbound_count} messages sent
                </span>
                <span className="font-mono text-rose-400">
                  {a.days_since_last_reply}d no reply
                </span>
                <span className="text-os-text-dim capitalize">{a.channel}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-amber-400 tabular-nums">{a.pause_days}d</p>
              <p className="text-[9px] text-os-text-dim uppercase tracking-widest">pause</p>
            </div>
          </div>
          <div className="rounded-lg border border-os-border bg-os-bg/40 p-3">
            <p className="text-xs text-white leading-relaxed">{a.recommendation}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Relationship Debt ─────────────────────────────────────────────────────────

function RelationshipDebtTab({ items, loading }: { items: RelationshipDebtItem[]; loading: boolean }) {
  if (loading)
    return (
      <div className="rounded-2xl border border-os-border bg-os-card/40 p-12 text-center">
        <RefreshCw size={16} className="text-os-text-dim animate-spin mx-auto" />
      </div>
    );
  if (items.length === 0)
    return (
      <LensEmpty
        icon={Clock}
        title="No relationship debt"
        body="KROVA watches for clients you haven't contacted in 30+ days who deserve personal attention. You're keeping up with everyone."
      />
    );
  const relTypeLabel: Record<string, string> = {
    loyal_client: "Loyal Client",
    former_hot_lead: "Former Hot Lead",
    warm_prospect: "Warm Prospect",
  };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4">
        <p className="text-sm text-white font-bold">
          {items.length} relationship{items.length !== 1 ? "s" : ""} · growing debt
        </p>
        <p className="text-[11px] text-os-text-dim mt-1">
          Real humans who trusted you. Not a template — a personal message.
        </p>
      </div>
      {items.map(item => {
        const debtAccent: Accent =
          item.debt_score >= 80 ? "rose" : item.debt_score >= 60 ? "amber" : "amber";
        return (
          <div
            key={item.customer_id}
            className="rounded-2xl border border-os-border bg-os-card/40 p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <p className="text-sm font-bold text-white">{item.customer_name || "Unknown"}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <MetaPill accent="violet">
                    {relTypeLabel[item.relationship_type] || item.relationship_type}
                  </MetaPill>
                  <span className="text-[10px] text-os-text-dim font-mono">
                    {item.days_since_contact}d of silence
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-2xl font-bold tabular-nums ${ACCENT_TEXT[debtAccent]}`}>
                  {item.debt_score}
                </p>
                <p className="text-[9px] text-os-text-dim uppercase tracking-widest">debt</p>
              </div>
            </div>
            <div className="rounded-lg border border-os-border bg-os-bg/40 p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-teal-400 mb-1">
                Suggested action
              </p>
              <p className="text-xs text-white leading-relaxed">{item.suggested_action}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Voice of Customer ─────────────────────────────────────────────────────────

function VoiceOfCustomerTab({ data, loading, onLoad }: { data: VoiceOfCustomerResponse | null; loading: boolean; onLoad: () => void }) {
  if (loading)
    return (
      <div className="rounded-2xl border border-os-border bg-os-card/40 p-12 text-center">
        <RefreshCw size={16} className="text-os-text-dim animate-spin mx-auto" />
      </div>
    );
  if (!data)
    return (
      <LensEmpty
        icon={Mic}
        title="What are your customers saying?"
        body="KROVA analyzes your last 30 days of inbound messages and finds recurring themes."
        action={
          <button
            onClick={onLoad}
            className="px-4 py-2 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-colors"
          >
            Generate Report
          </button>
        }
      />
    );
  const moodAccent: Record<string, Accent> = {
    happy: "emerald",
    neutral: "dim",
    frustrated: "rose",
    mixed: "amber",
  };
  const sentimentAccent: Record<string, Accent> = {
    positive: "emerald",
    negative: "rose",
    neutral: "dim",
    mixed: "amber",
  };
  return (
    <div className="space-y-5">
      <div>
        <LensSectionHeader label="Overview" />
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            label="Overall mood"
            value={<span className="capitalize">{data.overall_mood}</span>}
            accent={moodAccent[data.overall_mood] || "dim"}
          />
          <StatTile label="Messages analyzed" value={data.total_messages_analyzed} accent="teal" />
          <StatTile label="Themes found" value={data.themes.length} accent="violet" />
        </div>
      </div>

      {(data.top_request || data.top_complaint || data.top_praise) && (
        <div className="rounded-2xl border border-os-border bg-os-card/40 p-5 space-y-4">
          {data.top_request && (
            <div>
              <MetaPill accent="teal">Top request</MetaPill>
              <p className="text-sm text-white mt-2 leading-snug">{data.top_request}</p>
            </div>
          )}
          {data.top_complaint && (
            <div>
              <MetaPill accent="rose">Top complaint</MetaPill>
              <p className="text-sm text-white mt-2 leading-snug">{data.top_complaint}</p>
            </div>
          )}
          {data.top_praise && (
            <div>
              <MetaPill accent="emerald">Top praise</MetaPill>
              <p className="text-sm text-white mt-2 leading-snug">{data.top_praise}</p>
            </div>
          )}
        </div>
      )}

      <div>
        <LensSectionHeader label="Recurring themes" count={data.themes.length} />
        <div className="space-y-3">
          {data.themes.map((t, i) => (
            <div
              key={i}
              className="rounded-2xl border border-os-border bg-os-card/40 p-5 space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-white">{t.theme}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <MetaPill accent={sentimentAccent[t.sentiment] || "dim"}>
                    {t.sentiment}
                  </MetaPill>
                  <span className="text-[9px] font-mono text-os-text-dim">×{t.frequency}</span>
                </div>
              </div>
              {t.example_quote && (
                <p className="text-xs text-os-text-dim leading-relaxed">
                  "{t.example_quote}"
                </p>
              )}
              {t.action && (
                <div className="rounded-lg border border-os-border bg-os-bg/40 p-3 mt-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-teal-400 mb-1">
                    Action
                  </p>
                  <p className="text-xs text-white">{t.action}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-os-text-dim text-center font-mono">
        Generated {data.generated_at} · Based on last 30 days
      </p>
    </div>
  );
}

// ── Cluster Intelligence ──────────────────────────────────────────────────────

function ClustersTab({ data, loading, onLoad }: { data: ClusterIntelligenceResponse | null; loading: boolean; onLoad: () => void }) {
  if (loading)
    return (
      <div className="rounded-2xl border border-os-border bg-os-card/40 p-12 text-center">
        <RefreshCw size={16} className="text-os-text-dim animate-spin mx-auto" />
      </div>
    );
  if (!data)
    return (
      <LensEmpty
        icon={Users2}
        title="Discover your real customer types"
        body="KROVA groups your customers by actual behaviour patterns — not manual tags."
        action={
          <button
            onClick={onLoad}
            className="px-4 py-2 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-colors"
          >
            Analyze Clusters
          </button>
        }
      />
    );
  if (data.clusters.length === 0)
    return (
      <LensEmpty
        icon={Users2}
        title="Not enough data"
        body={data.insight || "Need more customer data to find behavioural patterns."}
      />
    );
  const energyAccent: Record<string, Accent> = { high: "rose", medium: "amber", low: "emerald" };
  const revenueAccent: Record<string, Accent> = { high: "emerald", medium: "teal", low: "dim" };
  return (
    <div className="space-y-5">
      {data.insight && (
        <div className="rounded-2xl border border-os-border bg-os-card/40 p-5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-teal-400 mb-2">
            Insight
          </p>
          <p className="text-sm text-white leading-relaxed">"{data.insight}"</p>
          <p className="text-[10px] text-os-text-dim mt-3 font-mono">
            Based on {data.total_customers_analyzed} customers · Generated {data.generated_at}
          </p>
        </div>
      )}
      {data.most_valuable_cluster && (
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Most valuable"
            value={data.most_valuable_cluster}
            accent="emerald"
          />
          <StatTile
            label="Highest effort"
            value={data.highest_effort_cluster || "—"}
            accent="rose"
          />
        </div>
      )}
      <div>
        <LensSectionHeader label="Clusters" count={data.clusters.length} />
        <div className="space-y-3">
          {data.clusters.map((cl, i) => (
            <div
              key={i}
              className="rounded-2xl border border-os-border bg-os-card/40 p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{cl.cluster_name}</p>
                  <p className="text-xs text-os-text-dim mt-1 leading-relaxed">{cl.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-white tabular-nums">{cl.customer_count}</p>
                  <p className="text-[9px] text-os-text-dim">{cl.percentage}%</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <StatTile
                  label="Conversion"
                  value={`${Math.round(cl.conversion_rate * 100)}%`}
                  accent="teal"
                />
                <StatTile
                  label="Energy"
                  value={<span className="capitalize">{cl.energy_level}</span>}
                  accent={energyAccent[cl.energy_level] || "dim"}
                />
                <StatTile
                  label="Revenue"
                  value={<span className="capitalize">{cl.revenue_potential}</span>}
                  accent={revenueAccent[cl.revenue_potential] || "dim"}
                />
              </div>
              {cl.characteristics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {cl.characteristics.map((ch, j) => (
                    <span
                      key={j}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-os-bg border border-os-border text-os-text-dim"
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              )}
              {cl.strategy && (
                <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-teal-400 mb-1">
                    Strategy
                  </p>
                  <p className="text-xs text-white">{cl.strategy}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── KROVA Coach ───────────────────────────────────────────────────────────────

function KROVACoachTab({ data, loading }: { data: KROVACoachResponse | null; loading: boolean }) {
  if (loading)
    return (
      <div className="rounded-2xl border border-os-border bg-os-card/40 p-12 text-center">
        <RefreshCw size={16} className="text-os-text-dim animate-spin mx-auto" />
      </div>
    );
  if (!data)
    return (
      <LensEmpty
        icon={GraduationCap}
        title="KROVA Coach is loading"
        body="The coach analyses your patterns and tells you what to change."
      />
    );
  if (!data.has_enough_data) {
    const pct = Math.min(100, (data.days_of_data / 30) * 100);
    return (
      <div className="rounded-2xl border border-os-border bg-os-card/40 p-10 text-center">
        <div className="relative w-14 h-14 mx-auto mb-5">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-400/20 to-violet-400/20 blur-xl" />
          <div className="relative w-14 h-14 rounded-2xl bg-os-bg border border-os-border flex items-center justify-center">
            <GraduationCap size={22} className="text-teal-400" />
          </div>
        </div>
        <h3 className="text-base font-bold mb-2">KROVA Coach needs more data</h3>
        <p className="text-xs text-os-text-dim max-w-sm mx-auto leading-relaxed mb-5">
          You have {data.days_of_data} days of data. KROVA needs 30+ days to identify reliable
          patterns in your behaviour.
        </p>
        <div className="max-w-xs mx-auto">
          <div className="w-full bg-os-border rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-teal-400 to-violet-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-os-text-dim mt-2 font-mono">
            {data.days_of_data} / 30 days
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400 mb-2">
          Based on {data.days_of_data} days of your actual behaviour
        </p>
        {data.top_habit_to_change && (
          <p className="text-base text-white font-bold leading-snug">
            Top habit to change: {data.top_habit_to_change}
          </p>
        )}
        {data.estimated_uplift && (
          <p className="text-xs text-emerald-400 mt-2">→ {data.estimated_uplift}</p>
        )}
      </div>

      <div>
        <LensSectionHeader label="Your numbers" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatTile
            label="Avg response time"
            value={`${data.avg_response_time_hours}h`}
            accent={
              data.avg_response_time_hours <= 2
                ? "emerald"
                : data.avg_response_time_hours <= 6
                  ? "amber"
                  : "rose"
            }
          />
          <StatTile
            label="Follow-up consistency"
            value={`${Math.round(data.follow_up_consistency * 100)}%`}
            accent={
              data.follow_up_consistency >= 0.7
                ? "emerald"
                : data.follow_up_consistency >= 0.4
                  ? "amber"
                  : "rose"
            }
          />
          <StatTile label="Conversion rate" value={`${Math.round(data.conversion_rate * 100)}%`} accent="teal" />
          <StatTile label="Best day" value={data.best_response_day || "—"} accent="emerald" />
          <StatTile label="Worst day" value={data.worst_response_day || "—"} accent="rose" />
          <StatTile label="Data age" value={`${data.days_of_data}d`} />
        </div>
      </div>

      {data.patterns.length > 0 && (
        <div>
          <LensSectionHeader label="Patterns detected" accent="amber" count={data.patterns.length} />
          <div className="space-y-3">
            {data.patterns.map((p, i) => (
              <div
                key={i}
                className="rounded-2xl border border-os-border bg-os-card/40 p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-white">{p.pattern}</p>
                  <MetaPill accent="amber">{p.data_point}</MetaPill>
                </div>
                <p className="text-xs text-os-text-dim leading-relaxed">{p.impact}</p>
                <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-teal-400 mb-1">
                    Recommendation
                  </p>
                  <p className="text-xs text-white">{p.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-os-text-dim text-center font-mono">
        Generated {data.generated_at}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "predictions" | "dna" | "commitments" | "revenue" | "competitors" | "growth" | "financial" | "learning" | "reputation" | "gratitude" | "antispam" | "reldebt" | "voice" | "clusters" | "coach";

export default function IntelligencePage() {
  const [dna, setDna] = useState<DNAProfile | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [predAccuracy, setPredAccuracy] = useState<{ total_resolved: number; correct: number; accuracy_percent: number } | null>(null);
  const [weeklyInsight, setWeeklyInsight] = useState<WeeklyInsight | null>(null);
  const [financial, setFinancial] = useState<FinancialOverview | null>(null);
  const [reputation, setReputation] = useState<ReputationOverview | null>(null);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [revenueSignals, setRevenueSignals] = useState<RevenueSignal[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorSummary[]>([]);
  const [growthReport, setGrowthReport] = useState<GrowthBlocker | null>(null);
  // New tabs state
  const [gratitudeCandidates, setGratitudeCandidates] = useState<GratitudeCandidate[]>([]);
  const [antiSpamAlerts, setAntiSpamAlerts] = useState<AntiSpamAlert[]>([]);
  const [relationshipDebt, setRelationshipDebt] = useState<RelationshipDebtItem[]>([]);
  const [voiceData, setVoiceData] = useState<VoiceOfCustomerResponse | null>(null);
  const [clusterData, setClusterData] = useState<ClusterIntelligenceResponse | null>(null);
  const [coachData, setCoachData] = useState<KROVACoachResponse | null>(null);
  // Loading states per lazy tab
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [gratitudeLoading, setGratitudeLoading] = useState(false);
  const [antispamLoading, setAntispamLoading] = useState(false);
  const [reldebtLoading, setReldebtLoading] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const lensParam = searchParams.get("lens") as Tab | null;
  const validLenses: Tab[] = [
    "predictions", "dna", "commitments", "revenue", "competitors",
    "growth", "financial", "learning", "reputation", "gratitude",
    "antispam", "reldebt", "voice", "clusters", "coach",
  ];
  const activeTab: Tab =
    lensParam && validLenses.includes(lensParam) ? lensParam : "predictions";

  useEffect(() => {
    const load = async () => {
      const results = await Promise.allSettled([
        api.get<DNAProfile>("/intelligence/dna"),
        api.get<{ predictions: Prediction[]; accuracy: { total_resolved: number; correct: number; accuracy_percent: number } }>("/intelligence/predictions"),
        api.get<WeeklyInsight | null>("/intelligence/weekly-insight"),
        api.get<FinancialOverview>("/intelligence/financial"),
        api.get<ReputationOverview>("/intelligence/reputation"),
        api.get<Commitment[]>("/intelligence/commitments"),
        api.get<RevenueSignal[]>("/intelligence/revenue-signals"),
        api.get<CompetitorSummary[]>("/intelligence/competitors"),
        api.get<GrowthBlocker | null>("/intelligence/growth-blockers"),
      ]);

      if (results[0].status === "fulfilled") setDna(results[0].value);
      if (results[1].status === "fulfilled") {
        const predData = results[1].value as { predictions: Prediction[]; accuracy: { total_resolved: number; correct: number; accuracy_percent: number } };
        setPredictions(predData.predictions);
        if (predData.accuracy) setPredAccuracy(predData.accuracy);
      }
      if (results[2].status === "fulfilled") setWeeklyInsight(results[2].value as WeeklyInsight | null);
      if (results[3].status === "fulfilled") setFinancial(results[3].value as FinancialOverview);
      if (results[4].status === "fulfilled") setReputation(results[4].value as ReputationOverview);
      if (results[5].status === "fulfilled") setCommitments(results[5].value as Commitment[]);
      if (results[6].status === "fulfilled") setRevenueSignals(results[6].value as RevenueSignal[]);
      if (results[7].status === "fulfilled") setCompetitors(results[7].value as CompetitorSummary[]);
      if (results[8].status === "fulfilled") setGrowthReport(results[8].value as GrowthBlocker | null);
      setLoading(false);
    };
    load();
  }, []);

  // Lazy-load tabs that are triggered on first visit or on demand
  useEffect(() => {
    if (activeTab === "gratitude" && !gratitudeCandidates.length && !gratitudeLoading) {
      setGratitudeLoading(true);
      api.get<GratitudeCandidate[]>("/intelligence/gratitude")
        .then(d => setGratitudeCandidates(d))
        .finally(() => setGratitudeLoading(false));
    }
    if (activeTab === "antispam" && !antiSpamAlerts.length && !antispamLoading) {
      setAntispamLoading(true);
      api.get<AntiSpamAlert[]>("/intelligence/anti-spam")
        .then(d => setAntiSpamAlerts(d))
        .finally(() => setAntispamLoading(false));
    }
    if (activeTab === "reldebt" && !relationshipDebt.length && !reldebtLoading) {
      setReldebtLoading(true);
      api.get<RelationshipDebtItem[]>("/intelligence/relationship-debt")
        .then(d => setRelationshipDebt(d))
        .finally(() => setReldebtLoading(false));
    }
    if (activeTab === "coach" && !coachData && !coachLoading) {
      setCoachLoading(true);
      api.get<KROVACoachResponse>("/intelligence/coach")
        .then(d => setCoachData(d))
        .finally(() => setCoachLoading(false));
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const acknowledgePrediction = async (id: string) => {
    await api.patch(`/intelligence/predictions/${id}/acknowledge`, {});
    setPredictions(prev => prev.filter(p => p.id !== id));
  };

  const markPredictionOutcome = async (id: string, outcome: "correct" | "incorrect") => {
    await api.patch(`/intelligence/predictions/${id}/outcome`, { outcome });
    setPredictions(prev => prev.filter(p => p.id !== id));
    setPredAccuracy(prev => {
      if (!prev) return prev;
      const newCorrect = prev.correct + (outcome === "correct" ? 1 : 0);
      const newTotal = prev.total_resolved + 1;
      return { total_resolved: newTotal, correct: newCorrect, accuracy_percent: Math.round((newCorrect / newTotal) * 100 * 10) / 10 };
    });
  };
  const markInsightRead = async (id: string) => {
    await api.patch(`/intelligence/weekly-insight/${id}/read`, {});
    setWeeklyInsight(prev => prev ? { ...prev, is_read: true } : null);
  };
  const commitToInsight = async (id: string) => {
    await api.patch(`/intelligence/weekly-insight/${id}/commit`, {});
    setWeeklyInsight(prev => prev ? { ...prev, owner_committed: true } : null);
  };
  const fulfillCommitment = async (id: string) => {
    await api.patch(`/intelligence/commitments/${id}/fulfill`, {});
    setCommitments(prev => prev.filter(c => c.id !== id));
  };
  const dismissCommitment = async (id: string) => {
    await api.patch(`/intelligence/commitments/${id}/dismiss`, {});
    setCommitments(prev => prev.filter(c => c.id !== id));
  };
  const resolveSignal = async (id: string) => {
    await api.patch(`/intelligence/revenue-signals/${id}/resolve`, {});
    setRevenueSignals(prev => prev.filter(s => s.id !== id));
  };

  const loadVoice = async () => {
    setVoiceLoading(true);
    api.get<VoiceOfCustomerResponse>("/intelligence/voice-of-customer")
      .then(d => setVoiceData(d))
      .finally(() => setVoiceLoading(false));
  };
  const loadClusters = async () => {
    setClusterLoading(true);
    api.get<ClusterIntelligenceResponse>("/intelligence/clusters")
      .then(d => setClusterData(d))
      .finally(() => setClusterLoading(false));
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "predictions", label: "Predictions", icon: Target, count: predictions.length },
    { id: "dna", label: "DNA", icon: Brain, count: dna?.analysis_count ?? 0 },
    { id: "commitments", label: "Commitments", icon: CheckCircle, count: commitments.filter(c => isOverdue(c.due_date)).length },
    { id: "revenue", label: "Revenue Leaks", icon: DollarSign, count: revenueSignals.length },
    { id: "competitors", label: "Competitors", icon: ShieldAlert, count: competitors.length },
    { id: "growth", label: "Growth", icon: BarChart3, count: growthReport ? 1 : 0 },
    { id: "financial", label: "Financial", icon: Zap, count: financial?.overdue_count ?? 0 },
    { id: "learning", label: "This Week", icon: Lightbulb, count: weeklyInsight && !weeklyInsight.is_read ? 1 : 0 },
    { id: "reputation", label: "Reputation", icon: Star, count: reputation?.unresponded_negative ?? 0 },
    { id: "gratitude", label: "Gratitude", icon: Heart },
    { id: "antispam", label: "Anti-Spam", icon: Shield },
    { id: "reldebt", label: "Rel. Debt", icon: Clock },
    { id: "voice", label: "Voice", icon: Mic },
    { id: "clusters", label: "Clusters", icon: Users2 },
    { id: "coach", label: "Coach", icon: GraduationCap },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={16} className="text-os-text-dim animate-spin" />
      </div>
    );
  }

  const current = tabs.find((t) => t.id === activeTab) ?? tabs[0];
  const CurrentIcon = current.icon;

  return (
    <div className="space-y-6">
      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <header className="relative rounded-3xl border border-os-border bg-os-card/40 overflow-hidden p-6 md:p-7">
        <BorderBeam size={220} duration={14} colorFrom="#5EEAD4" colorTo="#A78BFA" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim mb-3">
              <Brain size={10} className="text-teal-400" />
              <ShinyText shimmerWidth={70} className="text-os-text-dim">
                Intelligence
              </ShinyText>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              Business <AuroraText>Intelligence.</AuroraText>
            </h1>
            <p className="text-os-text-dim text-sm max-w-xl">
              What KROVA learned about your business overnight. Pick a lens from the sidebar.
            </p>
          </div>
          {/* Current lens chip */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-os-border bg-os-bg/60 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-os-card border border-os-border flex items-center justify-center">
              <CurrentIcon size={14} className="text-teal-400" />
            </div>
            <div className="text-left">
              <div className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">
                Current lens
              </div>
              <div className="text-sm font-bold text-white">{current.label}</div>
            </div>
            {(current.count ?? 0) > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300">
                {current.count}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

          {activeTab === "predictions" && (
            <div className="space-y-5">
              {predAccuracy && predAccuracy.total_resolved > 0 && (
                <div className="rounded-2xl border border-os-border bg-os-card/40 p-5 flex items-center gap-5">
                  <div className="shrink-0">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim mb-1">
                      Prediction Accuracy
                    </p>
                    <p
                      className={`text-3xl font-bold tabular-nums ${
                        predAccuracy.accuracy_percent >= 70
                          ? "text-emerald-400"
                          : predAccuracy.accuracy_percent >= 50
                            ? "text-amber-400"
                            : "text-rose-400"
                      }`}
                    >
                      {predAccuracy.accuracy_percent}%
                    </p>
                  </div>
                  <div className="flex-1 h-2 bg-os-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all"
                      style={{ width: `${predAccuracy.accuracy_percent}%` }}
                    />
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-white">{predAccuracy.correct} correct</p>
                    <p className="text-[10px] text-os-text-dim font-mono">
                      {predAccuracy.total_resolved} resolved
                    </p>
                  </div>
                </div>
              )}
              {predictions.length === 0 ? (
                <LensEmpty
                  icon={Target}
                  title="No active predictions yet"
                  body="Predictions appear after the first nightly analysis with customer data."
                />
              ) : (
                <div className="space-y-3">
                  {predictions.map(p => (
                    <PredictionCard
                      key={p.id}
                      p={p}
                      onAck={acknowledgePrediction}
                      onOutcome={markPredictionOutcome}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "dna" && <DNASection dna={dna} />}

          {activeTab === "commitments" && (
            <CommitmentsTab commitments={commitments} onFulfill={fulfillCommitment} onDismiss={dismissCommitment} />
          )}

          {activeTab === "revenue" && (
            <RevenueLeaksTab signals={revenueSignals} onResolve={resolveSignal} />
          )}

          {activeTab === "competitors" && <CompetitorsTab competitors={competitors} />}

          {activeTab === "growth" && <GrowthBlockersTab report={growthReport} />}

          {activeTab === "financial" && (
            <div className="space-y-5">
              {!financial ? (
                <LensEmpty
                  icon={DollarSign}
                  title="No financial data yet"
                  body="Log your first revenue entry to start getting financial intelligence."
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <StatTile
                      label="Received this month"
                      value={`₹${financial.total_received_this_month.toLocaleString("en-IN")}`}
                      accent="emerald"
                    />
                    <StatTile
                      label="Expected this month"
                      value={`₹${financial.total_expected_this_month.toLocaleString("en-IN")}`}
                      accent="teal"
                    />
                    <StatTile
                      label="Overdue"
                      value={`₹${financial.total_overdue.toLocaleString("en-IN")}`}
                      accent="rose"
                    />
                  </div>

                  {financial.overdue_clients.length > 0 && (
                    <div>
                      <LensSectionHeader
                        label="Overdue clients"
                        accent="rose"
                        count={financial.overdue_clients.length}
                      />
                      <div className="rounded-2xl border border-os-border bg-os-card/40 overflow-hidden divide-y divide-os-border/60">
                        {financial.overdue_clients.map((c, i) => (
                          <div
                            key={i}
                            className="relative pl-5 pr-4 py-3.5 flex items-center justify-between gap-3 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-rose-400"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-white font-semibold">
                                {c.customer_name}
                              </p>
                              <p className="text-[10px] text-os-text-dim font-mono">
                                {c.days_overdue}d overdue
                              </p>
                            </div>
                            <p className="text-sm font-bold text-rose-400 tabular-nums">
                              ₹{c.amount.toLocaleString("en-IN")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {financial.recent_entries.length > 0 && (
                    <div>
                      <LensSectionHeader label="Recent entries" />
                      <div className="rounded-2xl border border-os-border bg-os-card/40 overflow-hidden divide-y divide-os-border/60">
                        {financial.recent_entries.map(e => (
                          <div
                            key={e.id}
                            className="px-5 py-3.5 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-white font-semibold">
                                {e.customer_name}
                              </p>
                              <p className="text-[10px] text-os-text-dim">
                                {e.description || e.status}
                              </p>
                            </div>
                            <p
                              className={`text-sm font-bold font-mono tabular-nums ${
                                e.status === "received" ? "text-emerald-400" : "text-os-text-dim"
                              }`}
                            >
                              ₹{e.amount.toLocaleString("en-IN")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "learning" && (
            <div className="space-y-4">
              {!weeklyInsight ? (
                <LensEmpty
                  icon={Lightbulb}
                  title="Weekly insights generate every Sunday"
                  body="Each week KROVA picks one big pattern from your data and turns it into one action."
                />
              ) : (
                <WeeklyInsightCard
                  insight={weeklyInsight}
                  onRead={markInsightRead}
                  onCommit={commitToInsight}
                />
              )}
            </div>
          )}

          {activeTab === "gratitude" && <GratitudeTab candidates={gratitudeCandidates} loading={gratitudeLoading} />}
          {activeTab === "antispam" && <AntiSpamTab alerts={antiSpamAlerts} loading={antispamLoading} />}
          {activeTab === "reldebt" && <RelationshipDebtTab items={relationshipDebt} loading={reldebtLoading} />}
          {activeTab === "voice" && <VoiceOfCustomerTab data={voiceData} loading={voiceLoading} onLoad={loadVoice} />}
          {activeTab === "clusters" && <ClustersTab data={clusterData} loading={clusterLoading} onLoad={loadClusters} />}
          {activeTab === "coach" && <KROVACoachTab data={coachData} loading={coachLoading} />}

          {activeTab === "reputation" && (
            <div className="space-y-5">
              {!reputation ? (
                <LensEmpty
                  icon={Star}
                  title="No reputation data yet"
                  body="Once customers leave reviews or feedback, KROVA aggregates sentiment here."
                />
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatTile
                      label="Avg Rating"
                      value={reputation.avg_rating ? `${reputation.avg_rating}★` : "—"}
                      accent="amber"
                    />
                    <StatTile
                      label="Positive"
                      value={reputation.positive_count}
                      accent="emerald"
                    />
                    <StatTile label="Neutral" value={reputation.neutral_count} />
                    <StatTile
                      label="Negative"
                      value={reputation.negative_count}
                      accent="rose"
                    />
                  </div>

                  {reputation.unresponded_negative > 0 && (
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
                      <p className="text-sm text-white font-bold">
                        {reputation.unresponded_negative} negative review
                        {reputation.unresponded_negative !== 1 ? "s" : ""} need your response
                      </p>
                      <p className="text-[11px] text-os-text-dim mt-1">
                        Replying within 24h prevents most reputation damage.
                      </p>
                    </div>
                  )}

                  {reputation.recent_events.length === 0 ? (
                    <LensEmpty
                      icon={Star}
                      title="No reputation events yet"
                      body="Connect your review channels in Settings to start tracking."
                    />
                  ) : (
                    <div>
                      <LensSectionHeader
                        label="Recent events"
                        count={reputation.recent_events.length}
                      />
                      <div className="rounded-2xl border border-os-border bg-os-card/40 overflow-hidden divide-y divide-os-border/60">
                        {reputation.recent_events.map(e => {
                          const sentimentAccent: Accent =
                            e.sentiment === "positive"
                              ? "emerald"
                              : e.sentiment === "negative"
                                ? "rose"
                                : "dim";
                          return (
                            <div key={e.id} className="px-5 py-4 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <MetaPill accent={sentimentAccent}>
                                  {e.type.replace("_", " ")}
                                </MetaPill>
                                {e.rating && (
                                  <span className="text-[10px] text-amber-400 font-mono">
                                    {e.rating}★
                                  </span>
                                )}
                                <span className="text-[9px] text-os-text-dim font-mono ml-auto">
                                  {e.created_at}
                                </span>
                              </div>
                              {e.content && (
                                <p className="text-xs text-white leading-relaxed">{e.content}</p>
                              )}
                              {e.suggested_response && !e.is_responded && (
                                <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-3">
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-teal-400 mb-1">
                                    Suggested response
                                  </p>
                                  <p className="text-xs text-white">{e.suggested_response}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
