"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckSquare,
  Clock,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Search,
  Inbox,
  CalendarDays,
  MessageSquare,
  Mail,
  Instagram,
  ArrowDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShinyText } from "@/components/magicui/shiny-text";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { SpotlightCard } from "@/components/spectrum/spotlight-card";

interface Commitment {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  commitment_text: string;
  due_date: string | null;
  source_channel: string | null;
  is_fulfilled: boolean;
  is_dismissed: boolean;
  created_at: string;
}

type Bucket = "overdue" | "today" | "upcoming" | "no_due";
type FilterKey = "all" | "overdue" | "today" | "upcoming";

function bucketOf(c: Commitment): Bucket {
  if (!c.due_date) return "no_due";
  const today = new Date(new Date().toDateString());
  const due = new Date(c.due_date);
  if (due < today) return "overdue";
  if (c.due_date === new Date().toISOString().split("T")[0]) return "today";
  return "upcoming";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function daysFromToday(dateStr: string): number {
  const today = new Date(new Date().toDateString());
  const due = new Date(dateStr);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function relativeDue(dateStr: string | null): string {
  if (!dateStr) return "No due date";
  const diff = daysFromToday(dateStr);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff < 7) return `In ${diff} days`;
  return formatDate(dateStr);
}

function timeAgo(iso: string): string {
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare size={10} className="text-emerald-400" />,
  instagram: <Instagram size={10} className="text-pink-400" />,
  gmail: <Mail size={10} className="text-rose-400" />,
  outlook: <Mail size={10} className="text-sky-400" />,
};

const BUCKET_META: Record<
  Bucket,
  { label: string; accent: string; dot: string; dotColor: string }
> = {
  overdue: {
    label: "Overdue",
    accent: "text-rose-400",
    dot: "before:bg-rose-400",
    dotColor: "bg-rose-400",
  },
  today: {
    label: "Due today",
    accent: "text-amber-400",
    dot: "before:bg-amber-400",
    dotColor: "bg-amber-400",
  },
  upcoming: {
    label: "Upcoming",
    accent: "text-emerald-400",
    dot: "before:bg-emerald-400",
    dotColor: "bg-emerald-400",
  },
  no_due: {
    label: "No due date",
    accent: "text-os-text-dim",
    dot: "before:bg-os-border",
    dotColor: "bg-os-text-dim",
  },
};

export default function CommitmentsPage() {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Commitment[]>("/intelligence/commitments")
      .then((data) => setCommitments(data))
      .catch(() => setCommitments([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fulfill = async (id: string) => {
    setActingOn(id);
    try {
      await api.patch(`/intelligence/commitments/${id}/fulfill`, {});
      setCommitments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      /* silent */
    } finally {
      setActingOn(null);
    }
  };

  const dismiss = async (id: string) => {
    setActingOn(id);
    try {
      await api.patch(`/intelligence/commitments/${id}/dismiss`, {});
      setCommitments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      /* silent */
    } finally {
      setActingOn(null);
    }
  };

  // Filter + search
  const filtered = useMemo(() => {
    return commitments.filter((c) => {
      const b = bucketOf(c);
      if (filter === "upcoming" && b !== "upcoming" && b !== "no_due") return false;
      if (filter !== "all" && filter !== "upcoming" && b !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.commitment_text.toLowerCase().includes(q) ||
          (c.customer_name || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [commitments, filter, search]);

  // Group by bucket — only when showing all
  const grouped = useMemo(() => {
    const buckets: Record<Bucket, Commitment[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      no_due: [],
    };
    filtered.forEach((c) => {
      buckets[bucketOf(c)].push(c);
    });
    // sort each by due date ascending (closest first)
    (["overdue", "today", "upcoming"] as Bucket[]).forEach((k) => {
      buckets[k].sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));
    });
    return buckets;
  }, [filtered]);

  const counts = useMemo(() => {
    const c = { all: 0, overdue: 0, today: 0, upcoming: 0 };
    commitments.forEach((x) => {
      const b = bucketOf(x);
      c.all++;
      if (b === "overdue") c.overdue++;
      else if (b === "today") c.today++;
      else c.upcoming++;
    });
    return c;
  }, [commitments]);

  const orderedBuckets: Bucket[] = ["overdue", "today", "upcoming", "no_due"];
  const visibleGroups = orderedBuckets.filter((b) => grouped[b].length > 0);

  return (
    <div className="space-y-8">
      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <header className="relative rounded-3xl border border-os-border bg-os-card/40 overflow-hidden p-6 md:p-7">
        <BorderBeam size={220} duration={14} colorFrom="#5EEAD4" colorTo="#A78BFA" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim mb-3">
              <CheckSquare size={10} className="text-teal-400" />
              <ShinyText shimmerWidth={70} className="text-os-text-dim">
                Promises
              </ShinyText>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              Open <AuroraText>commitments.</AuroraText>
            </h1>
            <p className="text-os-text-dim text-sm max-w-xl">
              Every promise you&apos;ve made — pulled automatically from your conversations.
              Nothing falls through the cracks.
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

      {/* ─── STATS GRID ───────────────────────────────────────────────────── */}
      {!loading && commitments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(
            [
              { key: "all" as FilterKey, label: "Total Open", value: counts.all, dot: "bg-teal-400" },
              {
                key: "overdue" as FilterKey,
                label: "Overdue",
                value: counts.overdue,
                dot: "bg-rose-400",
              },
              {
                key: "today" as FilterKey,
                label: "Due Today",
                value: counts.today,
                dot: "bg-amber-400",
              },
              {
                key: "upcoming" as FilterKey,
                label: "Upcoming",
                value: counts.upcoming,
                dot: "bg-emerald-400",
              },
            ]
          ).map((item) => {
            const isActive = filter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className="text-left"
              >
                <SpotlightCard
                  className={`h-full transition-colors ${
                    isActive ? "border-os-border-bright" : ""
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="relative">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                        {item.key === "overdue" && item.value > 0 && (
                          <div
                            className={`absolute inset-0 w-1.5 h-1.5 rounded-full ${item.dot} animate-ping opacity-75`}
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                        {item.label}
                      </span>
                    </div>
                    <div className="text-3xl font-bold tracking-tight tabular-nums">
                      <NumberTicker value={item.value} />
                    </div>
                  </div>
                </SpotlightCard>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── SEARCH + FILTER ──────────────────────────────────────────────── */}
      {!loading && commitments.length > 0 && (
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-os-text-dim"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by promise or customer…"
              className="w-full bg-os-card border border-os-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright font-mono"
            />
          </div>
          <div className="flex gap-1 p-1 rounded-xl border border-os-border bg-os-card/60">
            {(["all", "overdue", "today", "upcoming"] as FilterKey[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  filter === f ? "bg-white text-black" : "text-os-text-dim hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── LIST ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-os-border bg-os-card/40 animate-pulse h-24"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} hasAny={commitments.length > 0} onClear={() => { setFilter("all"); setSearch(""); }} />
      ) : (
        <div className="space-y-8">
          {visibleGroups.map((bucket) => {
            const items = grouped[bucket];
            const meta = BUCKET_META[bucket];
            return (
              <section key={bucket}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-2 h-2 rounded-full ${meta.dotColor}`} />
                  <h2
                    className={`text-[10px] font-bold uppercase tracking-[0.3em] ${meta.accent}`}
                  >
                    {meta.label}
                  </h2>
                  <div className="h-px flex-1 bg-os-border" />
                  <span className="text-[10px] font-mono text-os-text-dim">
                    {items.length}
                  </span>
                </div>
                <div className="rounded-2xl border border-os-border bg-os-card/40 overflow-hidden divide-y divide-os-border/60">
                  <AnimatePresence>
                    {items.map((c, i) => (
                      <CommitmentRow
                        key={c.id}
                        c={c}
                        delay={i * 0.03}
                        actingOn={actingOn}
                        onFulfill={fulfill}
                        onDismiss={dismiss}
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

function CommitmentRow({
  c,
  delay,
  actingOn,
  onFulfill,
  onDismiss,
}: {
  c: Commitment;
  delay: number;
  actingOn: string | null;
  onFulfill: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const bucket = bucketOf(c);
  const meta = BUCKET_META[bucket];
  const initial = (c.customer_name || "?")[0].toUpperCase();
  const acting = actingOn === c.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      transition={{ delay }}
      className={`relative pl-5 pr-4 py-4 flex items-start gap-4 hover:bg-white/[0.02] transition-colors group before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 ${meta.dot}`}
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
        <p className="text-sm text-white leading-relaxed mb-1.5">{c.commitment_text}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-os-text-dim">
          {c.customer_name && (
            <span className="font-semibold text-white/80">{c.customer_name}</span>
          )}
          {c.due_date && (
            <span className={`font-mono font-semibold ${meta.accent}`}>
              <CalendarDays size={10} className="inline -mt-0.5 mr-1" />
              {relativeDue(c.due_date)} · {formatDate(c.due_date)}
            </span>
          )}
          {!c.due_date && (
            <span className="font-mono text-os-text-dim/70">No due date</span>
          )}
          {c.source_channel && (
            <span className="flex items-center gap-1 capitalize">
              {CHANNEL_ICON[c.source_channel] || <MessageSquare size={10} />}
              via {c.source_channel}
            </span>
          )}
          <span className="font-mono text-os-text-dim/70">
            <Clock size={9} className="inline -mt-0.5 mr-1" />
            promised {timeAgo(c.created_at)} ago
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onDismiss(c.id)}
          disabled={acting}
          title="Dismiss"
          className="w-8 h-8 rounded-lg border border-os-border bg-os-bg flex items-center justify-center text-os-text-dim hover:text-rose-400 hover:border-rose-500/30 transition-colors disabled:opacity-40"
        >
          <X size={12} />
        </button>
        <button
          onClick={() => onFulfill(c.id)}
          disabled={acting}
          title="Mark as done"
          className="px-3 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/25 transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          {acting ? (
            <RefreshCw size={11} className="animate-spin" />
          ) : (
            <>
              <Check size={11} /> Done
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

function EmptyState({
  filter,
  hasAny,
  onClear,
}: {
  filter: FilterKey;
  hasAny: boolean;
  onClear: () => void;
}) {
  const titles: Record<FilterKey, string> = {
    all: "Inbox zero on promises.",
    overdue: "No overdue commitments.",
    today: "Nothing due today.",
    upcoming: "No upcoming commitments.",
  };
  const subs: Record<FilterKey, string> = {
    all: "KROVA didn't find any open promises in your recent conversations. New ones appear here automatically.",
    overdue: "You're all caught up. Anything you missed would have shown here.",
    today: "Looking ahead — check the upcoming filter for what's coming this week.",
    upcoming: "Nothing on the horizon. Promises typically show up here as soon as you make them.",
  };
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
          {filter === "overdue" ? (
            <AlertTriangle size={24} className="text-emerald-400" />
          ) : (
            <Inbox size={24} className="text-emerald-400" />
          )}
        </div>
      </div>
      <h3 className="relative text-xl font-bold mb-2">{titles[filter]}</h3>
      <p className="relative text-os-text-dim text-sm max-w-sm mx-auto leading-relaxed">
        {subs[filter]}
      </p>
      {hasAny && filter !== "all" && (
        <button
          onClick={onClear}
          className="relative mt-6 px-4 py-2 rounded-xl border border-os-border bg-os-bg text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white hover:border-os-border-bright transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowDown size={11} className="rotate-[-45deg]" />
          Show all commitments
        </button>
      )}
    </motion.div>
  );
}
