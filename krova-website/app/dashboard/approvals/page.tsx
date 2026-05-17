"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckSquare,
  Check,
  X,
  Edit2,
  MessageSquare,
  Mail,
  Instagram,
  RefreshCw,
  Search,
  Inbox,
  Sparkles,
  Clock,
  Send,
} from "lucide-react";
import { api } from "@/lib/api";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShinyText } from "@/components/magicui/shiny-text";
import { GlowCard } from "@/components/spectrum/glow-card";

interface Action {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  channel: string;
  status: string;
  message_content: string;
  action_type: string;
  created_at: string;
}

interface PendingResponse {
  actions: Action[];
  count: number;
}

const CHANNEL_META: Record<
  string,
  { label: string; icon: React.ReactNode; accent: string }
> = {
  whatsapp: {
    label: "WhatsApp",
    icon: <MessageSquare size={12} className="text-emerald-400" />,
    accent: "text-emerald-400",
  },
  instagram: {
    label: "Instagram",
    icon: <Instagram size={12} className="text-pink-400" />,
    accent: "text-pink-400",
  },
  gmail: {
    label: "Gmail",
    icon: <Mail size={12} className="text-rose-400" />,
    accent: "text-rose-400",
  },
  outlook: {
    label: "Outlook",
    icon: <Mail size={12} className="text-sky-400" />,
    accent: "text-sky-400",
  },
};

function timeAgo(iso: string): string {
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ApprovalsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<PendingResponse>("/actions/pending")
      .then((data) => setActions(data.actions))
      .catch(() => setActions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    try {
      await api.post(`/actions/${id}/approve`);
    } catch {
      /* keep dismissed even on error */
    }
  };

  const handleReject = async (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    try {
      await api.post(`/actions/${id}/reject`);
    } catch {
      /* same */
    }
  };

  const handleApproveAll = async () => {
    const pending = visible.map((a) => a.id);
    setDismissed((prev) => new Set([...prev, ...pending]));
    await Promise.allSettled(pending.map((id) => api.post(`/actions/${id}/approve`)));
  };

  const saveEdit = async () => {
    if (!editing) return;
    setActions((prev) =>
      prev.map((a) => (a.id === editing.id ? { ...a, message_content: editing.text } : a)),
    );
    try {
      await api.patch(`/actions/${editing.id}`, { draft: editing.text });
    } catch {
      /* ignore */
    }
    setEditing(null);
  };

  const channels = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(actions.map((a) => CHANNEL_META[a.channel]?.label || a.channel)),
      ),
    ],
    [actions],
  );

  const visible = useMemo(
    () =>
      actions.filter((a) => {
        if (dismissed.has(a.id)) return false;
        const label = CHANNEL_META[a.channel]?.label || a.channel;
        if (channelFilter !== "All" && label !== channelFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            (a.customer_name || "").toLowerCase().includes(q) ||
            (a.customer_phone || "").includes(search) ||
            a.message_content.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [actions, dismissed, channelFilter, search],
  );

  const totalPending = actions.filter((a) => !dismissed.has(a.id)).length;
  const reviewMinutes = Math.max(1, Math.ceil(visible.length * 0.4));

  return (
    <div className="space-y-8">
      {/* ─── HEADER CARD ─────────────────────────────────────────────────── */}
      <header className="relative rounded-3xl border border-os-border bg-os-card/40 overflow-hidden p-6 md:p-7">
        <BorderBeam size={220} duration={14} colorFrom="#5EEAD4" colorTo="#A78BFA" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim mb-3">
              <CheckSquare size={10} className="text-teal-400" />
              <ShinyText shimmerWidth={70} className="text-os-text-dim">
                Action Queue
              </ShinyText>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              <AuroraText>Actions.</AuroraText>
            </h1>
            <p className="text-os-text-dim text-sm">
              <span className="text-white font-semibold">{visible.length}</span>{" "}
              AI-drafted{" "}
              {visible.length === 1 ? "action" : "actions"} waiting for your approval ·{" "}
              <span className="text-white font-semibold">~{reviewMinutes} min</span> to clear
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={load}
              className="px-3 py-2 rounded-xl border border-os-border bg-os-bg/60 text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white hover:border-os-border-bright transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={11} /> Refresh
            </button>
            {visible.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleApproveAll}
                className="relative overflow-hidden rounded-xl px-4 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-white/90 transition-colors"
              >
                <CheckSquare size={13} />
                Approve All ({visible.length})
              </motion.button>
            )}
          </div>
        </div>
      </header>

      {/* ─── FILTERS — search + segmented channel ─────────────────────────── */}
      {totalPending > 0 && (
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-os-text-dim"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or message…"
              className="w-full bg-os-card border border-os-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright font-mono"
            />
          </div>
          {channels.length > 1 && (
            <div className="flex gap-1 p-1 rounded-xl border border-os-border bg-os-card/60">
              {channels.map((c) => (
                <button
                  key={c}
                  onClick={() => setChannelFilter(c)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    channelFilter === c
                      ? "bg-white text-black"
                      : "text-os-text-dim hover:text-white"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── CARDS ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-os-border bg-os-card/40 animate-pulse h-44"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {visible.map((action, i) => {
              const channel = CHANNEL_META[action.channel] || {
                label: action.channel,
                icon: <MessageSquare size={12} />,
                accent: "text-os-text-dim",
              };
              const initial = (action.customer_name || "?")[0].toUpperCase();
              const isEditing = editing?.id === action.id;

              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                  transition={{ delay: i * 0.03 }}
                >
                  <GlowCard glowColor="from-teal-400/20 via-violet-400/15 to-pink-400/20">
                    <article className="p-5 md:p-6">
                      {/* Top row — customer + meta */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-10 h-10 shrink-0">
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400/30 to-violet-400/30 blur" />
                            <div className="relative w-10 h-10 rounded-xl bg-os-bg border border-os-border flex items-center justify-center font-bold text-sm">
                              {initial}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold truncate">
                              {action.customer_name || "Unknown Customer"}
                            </h3>
                            <p className="text-[10px] text-os-text-dim font-mono">
                              {action.customer_phone || "No phone"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-os-border bg-os-bg/60">
                            {channel.icon}
                            <span
                              className={`text-[9px] font-bold uppercase tracking-widest ${channel.accent}`}
                            >
                              {channel.label}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-os-text-dim flex items-center gap-1">
                            <Clock size={9} />
                            {timeAgo(action.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Draft body — the hero */}
                      <div className="relative rounded-xl border border-os-border bg-os-bg/40 p-4 mb-4">
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-os-text-dim">
                          <Sparkles size={9} className="text-violet-400" />
                          AI Draft
                        </div>
                        {isEditing ? (
                          <textarea
                            autoFocus
                            value={editing.text}
                            onChange={(e) =>
                              setEditing({ id: action.id, text: e.target.value })
                            }
                            rows={4}
                            className="w-full bg-transparent text-sm text-white leading-relaxed mt-5 focus:outline-none resize-none font-sans"
                          />
                        ) : (
                          <p className="text-sm text-white leading-relaxed mt-5">
                            “{action.message_content}”
                          </p>
                        )}
                      </div>

                      {/* Action footer */}
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-mono text-os-text-dim">
                          {action.action_type}
                        </div>
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => setEditing(null)}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={saveEdit}
                                className="px-3 py-1.5 rounded-lg bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-colors flex items-center gap-1.5"
                              >
                                <Check size={11} /> Save
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleReject(action.id)}
                                className="px-3 py-1.5 rounded-lg border border-os-border bg-os-bg text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-rose-400 hover:border-rose-500/30 transition-colors flex items-center gap-1.5"
                              >
                                <X size={11} /> Reject
                              </button>
                              <button
                                onClick={() =>
                                  setEditing({
                                    id: action.id,
                                    text: action.message_content,
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg border border-os-border bg-os-bg text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-teal-400 hover:border-teal-500/30 transition-colors flex items-center gap-1.5"
                              >
                                <Edit2 size={11} /> Edit
                              </button>
                              <button
                                onClick={() => handleApprove(action.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/25 transition-colors flex items-center gap-1.5"
                              >
                                <Send size={11} /> Approve & Send
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  </GlowCard>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Empty state */}
          {visible.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-3xl border border-os-border bg-os-card/40 p-16 text-center overflow-hidden"
            >
              <BorderBeam
                size={200}
                duration={14}
                colorFrom="#5EEAD4"
                colorTo="#A78BFA"
              />
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-teal-400/30 blur-xl" />
                <div className="relative w-16 h-16 rounded-2xl bg-os-bg border border-emerald-500/30 flex items-center justify-center">
                  <Inbox size={26} className="text-emerald-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">
                {totalPending === 0 ? "All caught up." : "No matches"}
              </h3>
              <p className="text-os-text-dim text-sm max-w-sm mx-auto leading-relaxed">
                {totalPending === 0 ? (
                  <>
                    No pending approvals. KROVA will have new suggestions after tonight&apos;s
                    analysis at <span className="text-white">10 PM IST</span>.
                  </>
                ) : (
                  "No actions match your current filter or search. Try clearing the filter."
                )}
              </p>
              {totalPending > 0 && (
                <button
                  onClick={() => {
                    setSearch("");
                    setChannelFilter("All");
                  }}
                  className="mt-6 px-4 py-2 rounded-xl border border-os-border bg-os-bg text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white hover:border-os-border-bright transition-colors"
                >
                  Clear filters
                </button>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
