"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckSquare,
  Check,
  X,
  MessageSquare,
  Mail,
  Instagram,
  RefreshCw,
  Inbox,
  Clock,
  Send,
  Sparkles,
} from "lucide-react";
import { api, Action, PendingResponse } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

const CHANNEL_META: Record<string, { label: string; icon: React.ReactNode; accent: string }> = {
  whatsapp: {
    label: "WhatsApp",
    icon: <MessageSquare size={11} className="text-emerald-400" />,
    accent: "text-emerald-400",
  },
  instagram: {
    label: "Instagram",
    icon: <Instagram size={11} className="text-pink-400" />,
    accent: "text-pink-400",
  },
  gmail: {
    label: "Gmail",
    icon: <Mail size={11} className="text-rose-400" />,
    accent: "text-rose-400",
  },
  outlook: {
    label: "Outlook",
    icon: <Mail size={11} className="text-sky-400" />,
    accent: "text-sky-400",
  },
};

export default function ActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    api
      .get<PendingResponse>("/actions/pending")
      .then((data) => setActions(data.actions))
      .catch(() => setActions([]))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    setRefreshing(true);
    load();
  };

  const handleApprove = async (id: string) => {
    setDismissed((p) => new Set(p).add(id));
    try {
      await api.post(`/actions/${id}/approve`);
    } catch {
      /* keep dismissed even on error */
    }
  };

  const handleReject = async (id: string) => {
    setDismissed((p) => new Set(p).add(id));
    try {
      await api.post(`/actions/${id}/reject`);
    } catch {
      /* same */
    }
  };

  const visible = actions.filter((a) => !dismissed.has(a.id));

  if (loading) {
    return (
      <div className="px-5 pt-6 space-y-4">
        <div className="h-20 rounded-2xl bg-os-card animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-44 rounded-2xl bg-os-card animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim mb-1.5">
            <CheckSquare size={10} className="text-teal-400" /> One tap to send
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
          <p className="text-[11px] text-os-text-dim mt-1">
            <span className="text-white font-bold">{visible.length}</span> drafts waiting for HAAN
          </p>
        </div>
        <button
          onClick={refresh}
          className="w-10 h-10 rounded-xl border border-os-border bg-os-card flex items-center justify-center text-os-text-dim active:scale-95 transition-transform"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Empty state */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-os-border bg-os-card/40 p-10 text-center mt-6">
          <div className="w-14 h-14 rounded-2xl bg-os-bg border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <Inbox size={22} className="text-emerald-400" />
          </div>
          <h3 className="text-base font-bold mb-1.5">All caught up</h3>
          <p className="text-xs text-os-text-dim max-w-xs mx-auto">
            No drafts pending. KROVA will have new suggestions after tonight's 10 PM analysis.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {visible.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ActionCard({
  action,
  onApprove,
  onReject,
}: {
  action: Action;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const channel = CHANNEL_META[action.channel] || {
    label: action.channel,
    icon: <MessageSquare size={11} />,
    accent: "text-os-text-dim",
  };
  const initial = (action.customer_name || "?")[0].toUpperCase();

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
      className="rounded-2xl border border-os-border bg-os-card/40 p-4 space-y-3"
    >
      {/* Top */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400/30 to-violet-400/30 blur" />
            <div className="relative w-10 h-10 rounded-xl bg-os-bg border border-os-border flex items-center justify-center font-bold text-sm">
              {initial}
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate">
              {action.customer_name || "Unknown"}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {channel.icon}
              <span className={`text-[10px] font-bold uppercase tracking-widest ${channel.accent}`}>
                {channel.label}
              </span>
              <span className="text-[10px] text-os-text-dim">·</span>
              <span className="text-[10px] text-os-text-dim font-mono flex items-center gap-1">
                <Clock size={9} />
                {timeAgo(action.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Draft */}
      <div className="relative rounded-xl border border-os-border bg-os-bg/40 p-3.5">
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-os-text-dim mb-1.5">
          <Sparkles size={9} className="text-violet-400" /> AI Draft
        </div>
        <p className="text-sm text-white leading-relaxed">"{action.message_content}"</p>
      </div>

      {/* Actions — bible: one-tap HAAN to send */}
      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <button
          onClick={() => onReject(action.id)}
          className="h-12 rounded-xl border border-os-border bg-os-bg text-os-text-dim text-xs font-bold uppercase tracking-widest active:scale-[0.97] transition-transform flex items-center justify-center gap-2 hover:text-rose-400 hover:border-rose-500/30"
        >
          <X size={14} /> NAHIN
        </button>
        <button
          onClick={() => onApprove(action.id)}
          className="h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold uppercase tracking-widest active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
        >
          <Send size={14} /> HAAN — send
        </button>
      </div>
    </motion.article>
  );
}
