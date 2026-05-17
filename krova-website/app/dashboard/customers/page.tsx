"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ReactElement } from "react";
import {
  Users,
  Search,
  MessageSquare,
  Mail,
  Instagram,
  Clock,
  UserPlus,
  RefreshCw,
  Inbox,
  Flame,
} from "lucide-react";
import { api } from "@/lib/api";
import CustomerDrawer from "@/app/dashboard/_components/CustomerDrawer";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShinyText } from "@/components/magicui/shiny-text";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { SpotlightCard } from "@/components/spectrum/spotlight-card";

interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  instagram_id: string | null;
  primary_channel: string;
  status: string;
  health_score: number;
  last_contact_at: string | null;
  created_at: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
}

interface TeamMember {
  member_id: string;
  name: string;
  email: string;
}

interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

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
const ACCENT_DOT: Record<Accent, string> = {
  rose: "bg-rose-400",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  teal: "bg-teal-400",
  violet: "bg-violet-400",
  sky: "bg-sky-400",
  dim: "bg-os-border",
};
const ACCENT_STRIP: Record<Accent, string> = {
  rose: "before:bg-rose-400",
  amber: "before:bg-amber-400",
  emerald: "before:bg-emerald-400",
  teal: "before:bg-teal-400",
  violet: "before:bg-violet-400",
  sky: "before:bg-sky-400",
  dim: "before:bg-os-border",
};
const ACCENT_BAR: Record<Accent, string> = {
  rose: "bg-rose-400",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  teal: "bg-teal-400",
  violet: "bg-violet-400",
  sky: "bg-sky-400",
  dim: "bg-os-text-dim/40",
};

const STATUS_META: Record<string, { label: string; accent: Accent }> = {
  hot: { label: "Hot", accent: "rose" },
  warm: { label: "Warm", accent: "amber" },
  new: { label: "New", accent: "teal" },
  cold: { label: "Cold", accent: "sky" },
  converted: { label: "Converted", accent: "emerald" },
  lost: { label: "Lost", accent: "dim" },
};

const CHANNEL_ICON: Record<string, ReactElement> = {
  whatsapp: <MessageSquare size={11} className="text-emerald-400" />,
  instagram: <Instagram size={11} className="text-pink-400" />,
  gmail: <Mail size={11} className="text-rose-400" />,
  outlook: <Mail size={11} className="text-sky-400" />,
};

// Display order — most actionable at the top
const STATUS_ORDER = ["hot", "warm", "new", "cold", "converted", "lost"];
const FILTERS = ["all", ...STATUS_ORDER];

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function healthAccent(score: number): Accent {
  if (score >= 75) return "emerald";
  if (score >= 50) return "amber";
  if (score >= 25) return "rose";
  return "dim";
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100", page: "1" });
    if (statusFilter !== "all") params.set("status", statusFilter);
    api
      .get<CustomerListResponse>(`/customers?${params}`)
      .then((data) => {
        setCustomers(data.customers);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    api
      .get<TeamMember[]>("/analytics/team")
      .then((data) => setTeamMembers(data))
      .catch(() => {});
  }, []);

  const assignCustomer = async (customerId: string, memberId: string | null) => {
    setAssigningId(customerId);
    try {
      await api.patch(`/customers/${customerId}/assign`, { assigned_to: memberId });
      const member = teamMembers.find((m) => m.member_id === memberId);
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? { ...c, assigned_to: memberId, assigned_to_name: member?.name || null }
            : c,
        ),
      );
    } catch {
      /* ignore */
    } finally {
      setAssigningId(null);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  // Filter + search
  const visible = useMemo(() => {
    return customers.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(search) ||
        (c.instagram_id || "").toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  // Count per status (from full set, not the filtered view)
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { hot: 0, warm: 0, new: 0, cold: 0, converted: 0, lost: 0 };
    customers.forEach((x) => {
      if (c[x.status] !== undefined) c[x.status]++;
    });
    return c;
  }, [customers]);

  // Group filtered customers by status — for sectioned display when filter=all
  const grouped = useMemo(() => {
    if (statusFilter !== "all") {
      // Single bucket: the current status filter
      const meta = STATUS_META[statusFilter] || { label: statusFilter, accent: "dim" as Accent };
      return [
        {
          key: statusFilter,
          label: meta.label,
          accent: meta.accent,
          items: [...visible].sort(
            (a, b) =>
              new Date(b.last_contact_at || 0).getTime() -
              new Date(a.last_contact_at || 0).getTime(),
          ),
        },
      ];
    }
    const out: Record<string, Customer[]> = {};
    visible.forEach((c) => {
      out[c.status] = out[c.status] || [];
      out[c.status].push(c);
    });
    return STATUS_ORDER.filter((k) => out[k]?.length).map((k) => {
      const meta = STATUS_META[k];
      return {
        key: k,
        label: meta.label,
        accent: meta.accent,
        items: out[k].sort(
          (a, b) =>
            new Date(b.last_contact_at || 0).getTime() -
            new Date(a.last_contact_at || 0).getTime(),
        ),
      };
    });
  }, [visible, statusFilter]);

  const hasAnyVisible = visible.length > 0;

  return (
    <div className="space-y-8">
      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <header className="relative rounded-3xl border border-os-border bg-os-card/40 overflow-hidden p-6 md:p-7">
        <BorderBeam size={220} duration={14} colorFrom="#5EEAD4" colorTo="#A78BFA" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim mb-3">
              <Users size={10} className="text-teal-400" />
              <ShinyText shimmerWidth={70} className="text-os-text-dim">
                People Graph
              </ShinyText>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              <AuroraText>Relationships.</AuroraText>
            </h1>
            <p className="text-os-text-dim text-sm max-w-xl">
              Every person who has ever messaged you — built automatically from your
              conversations. <span className="text-white font-semibold">{visible.length}</span> of{" "}
              <span className="text-white font-semibold">{total}</span> tracked.
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

      {/* ─── STATUS STAT TILES ─────────────────────────────────────────────── */}
      {!loading && customers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {STATUS_ORDER.map((s) => {
            const meta = STATUS_META[s];
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(isActive ? "all" : s)}
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
                        <div className={`w-1.5 h-1.5 rounded-full ${ACCENT_DOT[meta.accent]}`} />
                        {s === "hot" && statusCounts[s] > 0 && (
                          <div
                            className={`absolute inset-0 w-1.5 h-1.5 rounded-full ${ACCENT_DOT[meta.accent]} animate-ping opacity-75`}
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-2xl font-bold tabular-nums">
                      <NumberTicker value={statusCounts[s] ?? 0} />
                    </div>
                  </div>
                </SpotlightCard>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── SEARCH + FILTER TOOLBAR ───────────────────────────────────────── */}
      {!loading && customers.length > 0 && (
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-os-text-dim"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, or handle…"
              className="w-full bg-os-card border border-os-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright font-mono"
            />
          </div>
          <div className="flex gap-1 p-1 rounded-xl border border-os-border bg-os-card/60 overflow-x-auto">
            {FILTERS.map((f) => {
              const label = f === "all" ? "All" : STATUS_META[f]?.label || f;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                    statusFilter === f
                      ? "bg-white text-black"
                      : "text-os-text-dim hover:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── LIST (grouped by status when filter = all) ────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-os-border bg-os-card/40 animate-pulse h-20"
            />
          ))}
        </div>
      ) : !hasAnyVisible ? (
        <EmptyState
          hasAny={customers.length > 0}
          onClear={() => {
            setStatusFilter("all");
            setSearch("");
          }}
        />
      ) : (
        <div className="space-y-8">
          {grouped.map((g) => (
            <section key={g.key}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-2 h-2 rounded-full ${ACCENT_DOT[g.accent]}`}>
                  {g.key === "hot" && (
                    <div
                      className={`absolute w-2 h-2 rounded-full ${ACCENT_DOT[g.accent]} animate-ping opacity-75`}
                    />
                  )}
                </div>
                <h2
                  className={`text-[10px] font-bold uppercase tracking-[0.3em] ${ACCENT_TEXT[g.accent]}`}
                >
                  {g.label}
                </h2>
                <div className="h-px flex-1 bg-os-border" />
                <span className="text-[10px] font-mono text-os-text-dim">{g.items.length}</span>
              </div>
              <div className="rounded-2xl border border-os-border bg-os-card/40 overflow-hidden divide-y divide-os-border/60">
                <AnimatePresence>
                  {g.items.map((c, i) => (
                    <PersonRow
                      key={c.id}
                      c={c}
                      delay={i * 0.02}
                      teamMembers={teamMembers}
                      assigning={assigningId === c.id}
                      onAssign={assignCustomer}
                      onClick={() => setSelected(c)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Drawer */}
      <AnimatePresence>
        {selected && (
          <CustomerDrawer
            customerId={selected.id}
            customerName={selected.name}
            customerStatus={selected.status}
            onClose={() => setSelected(null)}
            onStatusChange={(newStatus) => {
              setCustomers((prev) =>
                prev.map((c) =>
                  c.id === selected.id ? { ...c, status: newStatus } : c,
                ),
              );
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PersonRow({
  c,
  delay,
  teamMembers,
  assigning,
  onAssign,
  onClick,
}: {
  c: Customer;
  delay: number;
  teamMembers: TeamMember[];
  assigning: boolean;
  onAssign: (customerId: string, memberId: string | null) => void;
  onClick: () => void;
}) {
  const status = STATUS_META[c.status] || { label: c.status, accent: "dim" as Accent };
  const hAccent = healthAccent(c.health_score);
  const channelIcon = CHANNEL_ICON[c.primary_channel] || (
    <MessageSquare size={11} className="text-os-text-dim" />
  );
  const initial = (c.name || c.email || "?")[0].toUpperCase();
  const contact = c.email || c.phone || c.instagram_id || "—";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={`relative pl-5 pr-4 py-3.5 flex items-center gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors group before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 ${ACCENT_STRIP[status.accent]}`}
    >
      {/* Avatar */}
      <div className="relative w-10 h-10 shrink-0">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400/30 to-violet-400/30 blur" />
        <div className="relative w-10 h-10 rounded-xl bg-os-bg border border-os-border flex items-center justify-center font-bold text-sm">
          {initial}
        </div>
      </div>

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-white truncate">{c.name || "Unknown"}</p>
          {c.status === "hot" && (
            <Flame size={11} className="text-rose-400 shrink-0" />
          )}
        </div>
        <p className="text-[10px] text-os-text-dim font-mono truncate">{contact}</p>
      </div>

      {/* Channel + last-seen (hidden on small screens) */}
      <div className="hidden md:flex flex-col items-end gap-1 shrink-0 min-w-[100px]">
        <div className="flex items-center gap-1.5">
          {channelIcon}
          <span className="text-[10px] text-os-text-dim capitalize">{c.primary_channel}</span>
        </div>
        <div className="flex items-center gap-1 text-os-text-dim">
          <Clock size={9} />
          <span className="text-[10px] font-mono">{timeAgo(c.last_contact_at)}</span>
        </div>
      </div>

      {/* Health score */}
      <div className="hidden sm:flex flex-col gap-1 shrink-0 w-24">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">
            Health
          </span>
          <span className={`text-[10px] font-mono font-bold tabular-nums ${ACCENT_TEXT[hAccent]}`}>
            {c.health_score}
          </span>
        </div>
        <div className="h-1.5 bg-os-border rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${c.health_score}%` }}
            transition={{ duration: 0.6, delay }}
            className={`h-full rounded-full ${ACCENT_BAR[hAccent]}`}
          />
        </div>
      </div>

      {/* Assigned */}
      <div className="hidden lg:block shrink-0" onClick={(e) => e.stopPropagation()}>
        {teamMembers.length > 0 ? (
          <select
            value={c.assigned_to || ""}
            onChange={(e) => onAssign(c.id, e.target.value || null)}
            disabled={assigning}
            className="bg-os-bg border border-os-border rounded-lg text-[10px] text-os-text-dim px-2 py-1.5 focus:outline-none focus:border-os-border-bright cursor-pointer hover:text-white transition-colors disabled:opacity-50 min-w-[110px]"
          >
            <option value="">Unassigned</option>
            {teamMembers.map((m) => (
              <option key={m.member_id} value={m.member_id}>
                {m.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-1 text-os-text-dim min-w-[110px]">
            <UserPlus size={10} />
            <span className="text-[10px]">{c.assigned_to_name || "—"}</span>
          </div>
        )}
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
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-400/30 to-violet-400/30 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-os-bg border border-teal-500/30 flex items-center justify-center">
          <Inbox size={26} className="text-teal-400" />
        </div>
      </div>
      <h3 className="relative text-xl font-bold mb-2">
        {hasAny ? "No matches" : "No people yet"}
      </h3>
      <p className="relative text-os-text-dim text-sm max-w-sm mx-auto leading-relaxed">
        {hasAny
          ? "No people match your filter or search. Try clearing them."
          : "Connect a channel — your relationships will appear here automatically the moment someone messages you."}
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
