"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, MessageSquare, Phone, Mail, Instagram, Clock,
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckSquare, DollarSign, ChevronRight, Brain, Zap,
  Check, RefreshCw, UserPlus,
} from "lucide-react";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LatestAnalysis {
  urgency: string | null;
  suggested_action: string | null;
  suggested_message: string | null;
  reasoning: string | null;
  analysis_date: string | null;
}

interface Intelligence {
  relationship_trajectory: string | null;
  churn_probability: number | null;
  energy_score: number | null;
  current_recommendation: string | null;
  message_template: string | null;
  confidence: number;
}

interface CustomerDetail {
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
  ai_notes: string | null;
  latest_analysis: LatestAnalysis | null;
  intelligence: Intelligence | null;
}

interface Commitment {
  id: string;
  commitment_text: string;
  due_date: string | null;
  source_channel: string | null;
  is_fulfilled: boolean;
  is_dismissed: boolean;
}

interface RevenueSignal {
  id: string;
  signal_type: string;
  estimated_amount: number | null;
  description: string | null;
}

interface ContextBrief {
  brief: string;
  opening_suggestion: string | null;
  avoid: string | null;
  priority_action: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  has_accepted: boolean;
  assigned_customer_count: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  hot: "text-red-400", warm: "text-yellow-400", new: "text-blue-400",
  cold: "text-cyan-400", converted: "text-green-400", lost: "text-os-text-dim",
};

const STATUS_LABEL: Record<string, string> = {
  hot: "HOT", warm: "WARM", new: "NEW", cold: "COLD", converted: "CONVERTED", lost: "LOST",
};

const STAGES = ["new", "hot", "warm", "cold", "converted", "lost"];
const STAGE_DOT: Record<string, string> = {
  hot: "bg-red-500", warm: "bg-yellow-500", new: "bg-blue-500",
  cold: "bg-cyan-500", converted: "bg-green-500", lost: "bg-os-border",
};

const SIGNAL_LABEL: Record<string, string> = {
  scope_creep: "Scope Creep", forgotten_invoice: "Forgotten Invoice",
  ghost_invoice: "Ghost Invoice", retainer_mismatch: "Retainer Mismatch",
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function TrajectoryIcon({ t }: { t: string | null }) {
  if (t === "improving") return <TrendingUp size={12} className="text-green-400" />;
  if (t === "declining") return <TrendingDown size={12} className="text-red-400" />;
  return <Minus size={12} className="text-os-text-dim" />;
}

// ── CustomerDrawer ─────────────────────────────────────────────────────────────

interface CustomerDrawerProps {
  customerId: string;
  customerName: string | null;
  customerStatus: string;
  onClose: () => void;
  onStatusChange?: (newStatus: string) => void;
}

export default function CustomerDrawer({
  customerId,
  customerName,
  customerStatus,
  onClose,
  onStatusChange,
}: CustomerDrawerProps) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [signals, setSignals] = useState<RevenueSignal[]>([]);
  const [brief, setBrief] = useState<ContextBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [movingTo, setMovingTo] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "commitments" | "revenue" | "brief">("overview");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [det, comms, sigs, teamRes] = await Promise.allSettled([
        api.get<CustomerDetail>(`/customers/${customerId}`),
        api.get<Commitment[]>(`/intelligence/commitments?customer_id=${customerId}&include_fulfilled=true`),
        api.get<RevenueSignal[]>(`/intelligence/revenue-signals?customer_id=${customerId}`),
        api.get<TeamMember[]>("/team"),
      ]);
      if (det.status === "fulfilled") {
        setDetail(det.value);
        // assigned_to not in CustomerDetail yet — will be added; for now track separately
      }
      if (comms.status === "fulfilled") setCommitments(comms.value);
      if (sigs.status === "fulfilled") setSignals(sigs.value);
      if (teamRes.status === "fulfilled") setTeamMembers(teamRes.value.filter(m => m.has_accepted));
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const assignCustomer = async (memberId: string | null) => {
    setAssigning(true);
    try {
      await api.patch(`/customers/${customerId}/assign`, { assigned_to: memberId });
      setAssignedTo(memberId);
    } catch { /* silent */ } finally {
      setAssigning(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  const moveStage = async (newStatus: string) => {
    setMovingTo(newStatus);
    try {
      await api.patch(`/customers/${customerId}`, { status: newStatus });
      setDetail(prev => prev ? { ...prev, status: newStatus } : prev);
      onStatusChange?.(newStatus);
    } catch {
      // silent — user sees no change
    } finally {
      setMovingTo(null);
    }
  };

  const fulfillCommitment = async (id: string) => {
    try {
      await api.patch(`/intelligence/commitments/${id}/fulfill`, {});
      setCommitments(prev => prev.map(c => c.id === id ? { ...c, is_fulfilled: true } : c));
    } catch { /* silent */ }
  };

  const generateBrief = async () => {
    setBriefLoading(true);
    try {
      const b = await api.get<ContextBrief>(`/intelligence/customers/${customerId}/brief`);
      setBrief(b);
      setTab("brief");
    } catch { /* silent */ } finally {
      setBriefLoading(false);
    }
  };

  const currentStatus = detail?.status ?? customerStatus;
  const name = detail?.name ?? customerName ?? "Unknown";
  const intel = detail?.intelligence;
  const analysis = detail?.latest_analysis;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-os-bg border-l border-os-border z-50 flex flex-col"
      >
        {/* Header */}
        <div className="h-14 border-b border-os-border flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-os-border flex items-center justify-center font-bold text-sm">
              {name[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">{name}</p>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${STATUS_COLOR[currentStatus] || "text-os-text-dim"}`}>
                  {STATUS_LABEL[currentStatus] || currentStatus}
                </span>
                {intel?.relationship_trajectory && (
                  <>
                    <span className="text-os-border">·</span>
                    <div className="flex items-center gap-1">
                      <TrajectoryIcon t={intel.relationship_trajectory} />
                      <span className="text-[10px] capitalize text-os-text-dim">{intel.relationship_trajectory}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generateBrief}
              disabled={briefLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white hover:border-os-border-bright transition-all disabled:opacity-50"
            >
              {briefLoading ? <RefreshCw size={10} className="animate-spin" /> : <Brain size={10} />}
              Brief
            </button>
            <button onClick={onClose} className="text-os-text-dim hover:text-white transition-colors p-1.5">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-os-border shrink-0">
          {(["overview", "commitments", "revenue", "brief"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${tab === t ? "text-white border-b-2 border-white" : "text-os-text-dim hover:text-white"}`}>
              {t === "commitments" ? `Promises${commitments.length ? ` (${commitments.filter(c => !c.is_fulfilled).length})` : ""}` : t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-os-border rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {tab === "overview" && (
                <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="p-5 space-y-5">

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="os-card p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim mb-1">Health</p>
                      <p className="text-xl font-bold">{detail?.health_score ?? "—"}</p>
                    </div>
                    <div className="os-card p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim mb-1">Churn Risk</p>
                      <p className={`text-xl font-bold ${(intel?.churn_probability ?? 0) >= 0.6 ? "text-red-400" : (intel?.churn_probability ?? 0) >= 0.3 ? "text-yellow-400" : "text-green-400"}`}>
                        {intel?.churn_probability != null ? `${Math.round(intel.churn_probability * 100)}%` : "—"}
                      </p>
                    </div>
                    <div className="os-card p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim mb-1">Energy</p>
                      <p className={`text-xl font-bold ${(intel?.energy_score ?? 1) < 0.4 ? "text-red-400" : "text-white"}`}>
                        {intel?.energy_score != null ? `${Math.round(intel.energy_score * 100)}` : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1.5">
                    {detail?.email && (
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-os-border">
                        <Mail size={12} className="text-os-text-dim shrink-0" />
                        <span className="text-xs font-mono text-os-text-dim truncate">{detail.email}</span>
                      </div>
                    )}
                    {detail?.phone && (
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-os-border">
                        <Phone size={12} className="text-os-text-dim shrink-0" />
                        <span className="text-xs font-mono text-os-text-dim">{detail.phone}</span>
                      </div>
                    )}
                    {detail?.instagram_id && (
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-os-border">
                        <Instagram size={12} className="text-pink-400 shrink-0" />
                        <span className="text-xs font-mono text-os-text-dim">{detail.instagram_id}</span>
                      </div>
                    )}
                  </div>

                  {/* AI Recommendation */}
                  {(intel?.current_recommendation || analysis?.suggested_action) && (
                    <div className="rounded-xl border border-os-border p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Brain size={11} className="text-os-text-dim" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">AI Recommendation</p>
                      </div>
                      <p className="text-xs text-white leading-relaxed">
                        {intel?.current_recommendation || analysis?.suggested_action}
                      </p>
                      {intel?.message_template && (
                        <div className="mt-2 p-3 bg-os-border/40 rounded-lg">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim mb-1.5">Suggested Message</p>
                          <p className="text-xs text-os-text-dim italic leading-relaxed">&ldquo;{intel.message_template}&rdquo;</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Analysis urgency */}
                  {analysis?.urgency && (
                    <div className={`rounded-xl border p-3 flex items-center gap-3 ${
                      analysis.urgency === "critical" ? "border-red-500/30 bg-red-500/5" :
                      analysis.urgency === "high" ? "border-yellow-500/30 bg-yellow-500/5" :
                      "border-os-border"
                    }`}>
                      <AlertTriangle size={14} className={analysis.urgency === "critical" ? "text-red-400" : "text-yellow-400"} />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-0.5">
                          {analysis.urgency} urgency · {analysis.analysis_date}
                        </p>
                        <p className="text-xs text-white">{analysis.suggested_action}</p>
                      </div>
                    </div>
                  )}

                  {/* Last seen */}
                  <div className="flex items-center gap-2 text-os-text-dim">
                    <Clock size={11} />
                    <span className="text-[11px]">Last contact {timeAgo(detail?.last_contact_at ?? null)}</span>
                  </div>

                  {/* Move stage */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-2">Move to Stage</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {STAGES.filter(s => s !== currentStatus).map(s => (
                        <button key={s} onClick={() => moveStage(s)}
                          disabled={movingTo === s}
                          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-os-border hover:border-os-border-bright transition-all disabled:opacity-50">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STAGE_DOT[s]}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${STATUS_COLOR[s] || "text-os-text-dim"}`}>
                            {STATUS_LABEL[s] || s}
                          </span>
                          {movingTo === s && <RefreshCw size={9} className="animate-spin ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Team assignment */}
                  {teamMembers.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <UserPlus size={10} className="text-os-text-dim" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">Assign To</p>
                        {assigning && <RefreshCw size={9} className="animate-spin text-os-text-dim" />}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => assignCustomer(null)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                            !assignedTo ? "border-os-border-bright bg-white/5 text-white" : "border-os-border text-os-text-dim hover:border-os-border-bright hover:text-white"
                          }`}>
                          Unassigned
                        </button>
                        {teamMembers.map(m => (
                          <button key={m.id} onClick={() => assignCustomer(m.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                              assignedTo === m.id ? "border-os-border-bright bg-white/5 text-white" : "border-os-border text-os-text-dim hover:border-os-border-bright hover:text-white"
                            }`}>
                            <span className="w-4 h-4 rounded bg-os-border flex items-center justify-center text-[8px] font-bold shrink-0">
                              {m.name[0].toUpperCase()}
                            </span>
                            {m.name.split(" ")[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {tab === "commitments" && (
                <motion.div key="commitments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="p-5 space-y-2">
                  {commitments.length === 0 && (
                    <div className="py-12 text-center">
                      <CheckSquare size={24} className="text-os-text-dim mx-auto mb-3" />
                      <p className="text-sm font-bold mb-1">No commitments tracked</p>
                      <p className="text-xs text-os-text-dim">KROVA automatically detects promises from conversations.</p>
                    </div>
                  )}
                  {commitments.map(c => (
                    <div key={c.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                        c.is_fulfilled ? "border-os-border/40 opacity-50" :
                        c.due_date && new Date(c.due_date) < new Date() ? "border-red-500/30 bg-red-500/5" :
                        "border-os-border"
                      }`}>
                      <div className={`w-5 h-5 rounded-md shrink-0 mt-0.5 flex items-center justify-center border ${c.is_fulfilled ? "bg-green-500/20 border-green-500/30" : "border-os-border"}`}>
                        {c.is_fulfilled && <Check size={10} className="text-green-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-relaxed ${c.is_fulfilled ? "line-through text-os-text-dim" : "text-white"}`}>
                          {c.commitment_text}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {c.due_date && (
                            <span className={`text-[10px] font-mono ${!c.is_fulfilled && new Date(c.due_date) < new Date() ? "text-red-400 font-bold" : "text-os-text-dim"}`}>
                              Due {c.due_date}
                            </span>
                          )}
                          {c.source_channel && (
                            <span className="text-[10px] text-os-text-dim capitalize">· {c.source_channel}</span>
                          )}
                        </div>
                      </div>
                      {!c.is_fulfilled && (
                        <button onClick={() => fulfillCommitment(c.id)}
                          className="text-[10px] font-bold text-os-text-dim hover:text-green-400 transition-colors shrink-0 px-2 py-1 rounded border border-os-border hover:border-green-500/30">
                          Done
                        </button>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}

              {tab === "revenue" && (
                <motion.div key="revenue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="p-5 space-y-2">
                  {signals.length === 0 && (
                    <div className="py-12 text-center">
                      <DollarSign size={24} className="text-os-text-dim mx-auto mb-3" />
                      <p className="text-sm font-bold mb-1">No revenue signals</p>
                      <p className="text-xs text-os-text-dim">No scope creep, forgotten invoices, or payment gaps detected.</p>
                    </div>
                  )}
                  {signals.map(s => (
                    <div key={s.id} className="p-3.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
                          {SIGNAL_LABEL[s.signal_type] || s.signal_type}
                        </span>
                        {s.estimated_amount && (
                          <span className="text-sm font-bold font-mono text-white">
                            ₹{s.estimated_amount.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      {s.description && <p className="text-xs text-os-text-dim leading-relaxed">{s.description}</p>}
                    </div>
                  ))}
                </motion.div>
              )}

              {tab === "brief" && (
                <motion.div key="brief" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="p-5 space-y-4">
                  {!brief && !briefLoading && (
                    <div className="py-12 text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-os-border flex items-center justify-center mx-auto">
                        <Brain size={20} className="text-os-text-dim" />
                      </div>
                      <div>
                        <p className="text-sm font-bold mb-1">Context Brief</p>
                        <p className="text-xs text-os-text-dim max-w-xs mx-auto">
                          Get an AI-generated pre-call summary — what happened last time, what to say, what to avoid.
                        </p>
                      </div>
                      <button onClick={generateBrief}
                        className="os-button os-button-primary text-xs px-6 py-2.5 gap-2">
                        <Zap size={12} /> Generate Brief
                      </button>
                    </div>
                  )}
                  {briefLoading && (
                    <div className="py-12 text-center">
                      <RefreshCw size={20} className="text-os-text-dim mx-auto mb-3 animate-spin" />
                      <p className="text-xs text-os-text-dim">Reading conversation history...</p>
                    </div>
                  )}
                  {brief && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-os-border p-4">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim mb-2">Summary</p>
                        <p className="text-xs text-white leading-relaxed">{brief.brief}</p>
                      </div>
                      {brief.opening_suggestion && (
                        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-green-400 mb-2">Open With</p>
                          <p className="text-xs text-white italic leading-relaxed">&ldquo;{brief.opening_suggestion}&rdquo;</p>
                        </div>
                      )}
                      {brief.avoid && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-red-400 mb-2">Don&apos;t Mention</p>
                          <p className="text-xs text-os-text-dim leading-relaxed">{brief.avoid}</p>
                        </div>
                      )}
                      {brief.priority_action && (
                        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-yellow-400 mb-2">Priority Action</p>
                          <p className="text-xs text-white leading-relaxed">{brief.priority_action}</p>
                        </div>
                      )}
                      <button onClick={generateBrief} disabled={briefLoading}
                        className="w-full os-button os-button-secondary text-xs py-2 gap-2 justify-center">
                        <RefreshCw size={10} /> Regenerate
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-os-border grid grid-cols-2 gap-3 shrink-0">
          <button className="os-button os-button-secondary text-xs py-2.5 justify-center gap-2">
            <MessageSquare size={12} /> Message
          </button>
          <button className="os-button os-button-primary text-xs py-2.5 justify-center gap-2">
            <ChevronRight size={12} /> View History
          </button>
        </div>
      </motion.div>
    </>
  );
}
