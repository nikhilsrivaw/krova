"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  DollarSign,
  RefreshCw,
  Check,
  AlertTriangle,
  TrendingDown,
  FileText,
  RotateCcw,
  Search,
  Inbox,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShinyText } from "@/components/magicui/shiny-text";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { SpotlightCard } from "@/components/spectrum/spotlight-card";

interface RevenueSignal {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  signal_type: string;
  estimated_amount: number | null;
  description: string | null;
  is_resolved: boolean;
  created_at: string;
}

type Accent = "rose" | "amber" | "emerald" | "teal" | "violet" | "dim";

const ACCENT_TEXT: Record<Accent, string> = {
  rose: "text-rose-400",
  amber: "text-amber-400",
  emerald: "text-emerald-400",
  teal: "text-teal-400",
  violet: "text-violet-400",
  dim: "text-os-text-dim",
};
const ACCENT_DOT: Record<Accent, string> = {
  rose: "bg-rose-400",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  teal: "bg-teal-400",
  violet: "bg-violet-400",
  dim: "bg-os-border",
};
const ACCENT_STRIP: Record<Accent, string> = {
  rose: "before:bg-rose-400",
  amber: "before:bg-amber-400",
  emerald: "before:bg-emerald-400",
  teal: "before:bg-teal-400",
  violet: "before:bg-violet-400",
  dim: "before:bg-os-border",
};

const SIGNAL_META: Record<
  string,
  {
    label: string;
    accent: Accent;
    icon: React.ElementType;
    hint: string;
  }
> = {
  scope_creep: {
    label: "Scope Creep",
    accent: "amber",
    icon: TrendingDown,
    hint: "Work delivered beyond the original agreement — bill it.",
  },
  forgotten_invoice: {
    label: "Forgotten Invoice",
    accent: "rose",
    icon: FileText,
    hint: "An invoice you mentioned but never created or sent.",
  },
  ghost_invoice: {
    label: "Ghost Invoice",
    accent: "amber",
    icon: AlertTriangle,
    hint: "Invoice sent but never followed up after no payment.",
  },
  retainer_mismatch: {
    label: "Retainer Mismatch",
    accent: "violet",
    icon: RotateCcw,
    hint: "Work delivered doesn't match the retainer amount agreed.",
  },
};

function timeAgo(iso: string): string {
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function RevenuePage() {
  const [signals, setSignals] = useState<RevenueSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<RevenueSignal[]>("/intelligence/revenue-signals")
      .then((data) => setSignals(data))
      .catch(() => setSignals([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (id: string) => {
    setResolvingId(id);
    try {
      await api.patch(`/intelligence/revenue-signals/${id}/resolve`, {});
      setSignals((prev) => prev.filter((s) => s.id !== id));
    } catch {
      /* silent */
    } finally {
      setResolvingId(null);
    }
  };

  const totalLeakage = signals.reduce((sum, s) => sum + (s.estimated_amount ?? 0), 0);
  const signalTypes = useMemo(
    () => Array.from(new Set(signals.map((s) => s.signal_type))),
    [signals],
  );
  const countByType = useMemo(
    () =>
      Object.fromEntries(
        signalTypes.map((t) => [t, signals.filter((s) => s.signal_type === t).length]),
      ),
    [signalTypes, signals],
  );
  const amountByType = useMemo(
    () =>
      Object.fromEntries(
        signalTypes.map((t) => [
          t,
          signals
            .filter((s) => s.signal_type === t)
            .reduce((sum, s) => sum + (s.estimated_amount ?? 0), 0),
        ]),
      ),
    [signalTypes, signals],
  );

  const visible = useMemo(
    () =>
      signals.filter((s) => {
        if (filter !== "all" && s.signal_type !== filter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            (s.customer_name || "").toLowerCase().includes(q) ||
            (s.description || "").toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [signals, filter, search],
  );

  // Group by signal type for sectioned display when filter === "all"
  const grouped = useMemo(() => {
    const out: Record<string, RevenueSignal[]> = {};
    visible.forEach((s) => {
      out[s.signal_type] = out[s.signal_type] || [];
      out[s.signal_type].push(s);
    });
    // Order: rose (most urgent) first, then amber, then violet, then dim
    const order: Accent[] = ["rose", "amber", "violet", "dim"];
    const sortedKeys = Object.keys(out).sort((a, b) => {
      const ai = order.indexOf(SIGNAL_META[a]?.accent ?? "dim");
      const bi = order.indexOf(SIGNAL_META[b]?.accent ?? "dim");
      return ai - bi;
    });
    return sortedKeys.map((k) => ({ type: k, items: out[k] }));
  }, [visible]);

  return (
    <div className="space-y-8">
      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <header className="relative rounded-3xl border border-os-border bg-os-card/40 overflow-hidden p-6 md:p-7">
        <BorderBeam size={220} duration={14} colorFrom="#5EEAD4" colorTo="#A78BFA" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim mb-3">
              <DollarSign size={10} className="text-rose-400" />
              <ShinyText shimmerWidth={70} className="text-os-text-dim">
                Money You&apos;re Losing
              </ShinyText>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              Revenue <AuroraText>leaks.</AuroraText>
            </h1>
            <p className="text-os-text-dim text-sm max-w-xl">
              Money you&apos;ve earned but haven&apos;t collected — surfaced from your conversations
              automatically. Nothing falls through the cracks.
            </p>
          </div>
          <button
            onClick={load}
            className="px-3 py-2 rounded-xl border border-os-border bg-os-bg/60 text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white hover:border-os-border-bright transition-colors flex items-center gap-1.5 shrink-0 self-start md:self-auto"
          >
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </header>

      {/* ─── HERO TOTAL ─────────────────────────────────────────────────────── */}
      {!loading && signals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl border border-rose-500/30 bg-rose-500/5 overflow-hidden p-6 md:p-8"
        >
          <BorderBeam size={200} duration={14} colorFrom="#FB7185" colorTo="#FCD34D" />
          <div className="relative flex items-center justify-between gap-6 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-rose-400 mb-2">
                Total uncollected
              </p>
              <p className="text-5xl md:text-6xl font-bold tracking-tight tabular-nums text-white">
                ₹<NumberTicker value={totalLeakage} />
              </p>
              <p className="text-xs text-os-text-dim mt-2 font-mono">
                across {signals.length} unresolved signal{signals.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="relative w-20 h-20 shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-rose-400/30 to-amber-400/30 blur-xl" />
              <div className="relative w-20 h-20 rounded-2xl bg-os-bg border border-rose-500/40 flex items-center justify-center">
                <DollarSign size={32} className="text-rose-400" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── BREAKDOWN BY TYPE — clickable filter tiles ─────────────────────── */}
      {!loading && signalTypes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {signalTypes.map((t) => {
            const meta = SIGNAL_META[t] || {
              label: t,
              accent: "dim" as Accent,
              icon: AlertTriangle,
              hint: "",
            };
            const Icon = meta.icon;
            const isActive = filter === t;
            return (
              <button
                key={t}
                onClick={() => setFilter(isActive ? "all" : t)}
                className="text-left"
              >
                <SpotlightCard
                  className={`h-full transition-colors ${isActive ? "border-os-border-bright" : ""}`}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={13} className={ACCENT_TEXT[meta.accent]} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim truncate">
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-2xl font-bold tabular-nums tracking-tight">
                      ₹{amountByType[t]?.toLocaleString("en-IN") || "0"}
                    </div>
                    <p className="text-[10px] text-os-text-dim mt-1 font-mono">
                      {countByType[t]} signal{countByType[t] !== 1 ? "s" : ""}
                    </p>
                  </div>
                </SpotlightCard>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── SEARCH + FILTER ──────────────────────────────────────────────── */}
      {!loading && signals.length > 0 && (
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-os-text-dim"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer or description…"
              className="w-full bg-os-card border border-os-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright font-mono"
            />
          </div>
          <div className="flex gap-1 p-1 rounded-xl border border-os-border bg-os-card/60 overflow-x-auto">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                filter === "all" ? "bg-white text-black" : "text-os-text-dim hover:text-white"
              }`}
            >
              All ({signals.length})
            </button>
            {signalTypes.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                  filter === t ? "bg-white text-black" : "text-os-text-dim hover:text-white"
                }`}
              >
                {SIGNAL_META[t]?.label || t} ({countByType[t]})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── LIST ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-os-border bg-os-card/40 animate-pulse h-28"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          hasAny={signals.length > 0}
          onClear={() => {
            setFilter("all");
            setSearch("");
          }}
        />
      ) : (
        <div className="space-y-8">
          {grouped.map((g) => {
            const meta = SIGNAL_META[g.type] || {
              label: g.type,
              accent: "dim" as Accent,
              icon: AlertTriangle,
              hint: "",
            };
            return (
              <section key={g.type}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-2 h-2 rounded-full ${ACCENT_DOT[meta.accent]}`} />
                  <h2
                    className={`text-[10px] font-bold uppercase tracking-[0.3em] ${ACCENT_TEXT[meta.accent]}`}
                  >
                    {meta.label}
                  </h2>
                  <div className="h-px flex-1 bg-os-border" />
                  <span className="text-[10px] font-mono text-os-text-dim">
                    {g.items.length} ·{" "}
                    <span className="text-white font-bold">
                      ₹
                      {g.items
                        .reduce((s, x) => s + (x.estimated_amount ?? 0), 0)
                        .toLocaleString("en-IN")}
                    </span>
                  </span>
                </div>

                <div className="rounded-2xl border border-os-border bg-os-card/40 overflow-hidden divide-y divide-os-border/60">
                  <AnimatePresence>
                    {g.items.map((s, i) => (
                      <SignalRow
                        key={s.id}
                        s={s}
                        meta={meta}
                        delay={i * 0.03}
                        resolving={resolvingId === s.id}
                        onResolve={resolve}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SignalRow({
  s,
  meta,
  delay,
  resolving,
  onResolve,
}: {
  s: RevenueSignal;
  meta: { label: string; accent: Accent; icon: React.ElementType; hint: string };
  delay: number;
  resolving: boolean;
  onResolve: (id: string) => void;
}) {
  const Icon = meta.icon;
  const initial = (s.customer_name || "?")[0].toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      transition={{ delay }}
      className={`relative pl-5 pr-4 py-4 flex items-start gap-4 hover:bg-white/[0.02] transition-colors group before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 ${ACCENT_STRIP[meta.accent]}`}
    >
      {/* Avatar */}
      <div className="relative w-9 h-9 shrink-0 mt-0.5">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400/25 to-violet-400/25 blur" />
        <div className="relative w-9 h-9 rounded-xl bg-os-bg border border-os-border flex items-center justify-center font-bold text-xs">
          {initial}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Icon size={11} className={`shrink-0 ${ACCENT_TEXT[meta.accent]}`} />
            <span
              className={`text-[9px] font-bold uppercase tracking-widest ${ACCENT_TEXT[meta.accent]}`}
            >
              {meta.label}
            </span>
            {s.customer_name && (
              <>
                <span className="text-os-border">·</span>
                <span className="text-sm font-semibold text-white truncate">
                  {s.customer_name}
                </span>
              </>
            )}
          </div>
          {s.estimated_amount !== null && (
            <span className="text-lg font-bold font-mono tabular-nums text-white shrink-0">
              ₹{s.estimated_amount.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        <p className="text-xs text-os-text-dim leading-relaxed">
          {s.description || meta.hint}
        </p>

        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] text-os-text-dim font-mono flex items-center gap-1">
            <Clock size={9} />
            Detected {timeAgo(s.created_at)}
          </span>
          <button
            onClick={() => onResolve(s.id)}
            disabled={resolving}
            className="px-3 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/25 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {resolving ? (
              <RefreshCw size={11} className="animate-spin" />
            ) : (
              <>
                <Check size={11} /> Mark resolved
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({
  hasAny,
  onClear,
}: {
  hasAny: boolean;
  onClear: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl border border-os-border bg-os-card/40 p-16 text-center overflow-hidden"
    >
      <BorderBeam size={200} duration={14} colorFrom="#5EEAD4" colorTo="#A78BFA" />
      <div className="relative w-16 h-16 mx-auto mb-6">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-teal-400/30 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-os-bg border border-emerald-500/30 flex items-center justify-center">
          <Inbox size={26} className="text-emerald-400" />
        </div>
      </div>
      <h3 className="relative text-xl font-bold mb-2">
        {hasAny ? "No matches" : "No revenue leaks detected"}
      </h3>
      <p className="relative text-os-text-dim text-sm max-w-sm mx-auto leading-relaxed">
        {hasAny
          ? "No signals match your filter or search. Try clearing them."
          : "KROVA monitors your conversations for uncollected scope, forgotten invoices, ghost invoices, and retainer gaps. You're not leaving money on the table."}
      </p>
      {hasAny && (
        <button
          onClick={onClear}
          className="relative mt-6 px-4 py-2 rounded-xl border border-os-border bg-os-bg text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white hover:border-os-border-bright transition-colors"
        >
          Clear filters
        </button>
      )}
    </motion.div>
  );
}
