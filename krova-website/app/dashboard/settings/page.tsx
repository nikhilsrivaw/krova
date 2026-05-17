"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Settings, User, Globe, Zap, Bell, Shield, AlertTriangle, Check, ChevronRight, MessageSquare, Mail, Instagram, RefreshCw, Unplug, Plus, X, Users, Send, Download } from "lucide-react";
import { api } from "@/lib/api";
import { AuroraText } from "@/components/magicui/aurora-text";

interface ConnectedPlatform {
  id: string;
  platform: string;
  api_key_masked: string;
  account_id: string | null;
  source_phone: string | null;
  is_active: boolean;
  template_count: number;
  last_synced_at: string | null;
  connected_at: string;
}

const BSP_PLATFORMS = [
  {
    id: "interakt",
    name: "Interakt",
    desc: "Most popular WhatsApp BSP in India. Paste your API key from Interakt dashboard.",
    docsHint: "Settings → Developer → API Key",
    needsAccount: false,
    needsPhone: false,
  },
  {
    id: "wati",
    name: "Wati",
    desc: "Enterprise WhatsApp platform. Requires your API token and Tenant Account ID.",
    docsHint: "Settings → API → Access Token + Account ID",
    needsAccount: true,
    needsPhone: false,
  },
  {
    id: "gupshup",
    name: "Gupshup",
    desc: "Enterprise messaging. Requires API key and your registered sender phone number.",
    docsHint: "Dashboard → API Key + Sender Phone",
    needsAccount: false,
    needsPhone: true,
  },
];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  has_accepted: boolean;
  invited_at: string;
  accepted_at: string | null;
  assigned_customer_count: number;
}

interface Business {
  id: string;
  name: string;
  business_type: string;
  plan: string;
  briefing_phone: string | null;
  context: string | null;
  good_lead_description: string | null;
  lost_customer_description: string | null;
}

const SECTIONS = [
  { id: "profile", label: "Business Profile", icon: <User size={14} /> },
  { id: "channels", label: "Connected Channels", icon: <Globe size={14} /> },
  { id: "platforms", label: "BSP Integrations", icon: <MessageSquare size={14} /> },
  { id: "team", label: "Team", icon: <Users size={14} /> },
  { id: "ai", label: "AI Preferences", icon: <Zap size={14} /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={14} /> },
  { id: "export", label: "Export Report", icon: <Download size={14} /> },
  { id: "security", label: "Security", icon: <Shield size={14} /> },
  { id: "danger", label: "Danger Zone", icon: <AlertTriangle size={14} /> },
];

const CHANNELS = [
  { id: "whatsapp", name: "WhatsApp Business", icon: <MessageSquare size={16} className="text-green-400" />, color: "border-green-500/30 bg-green-500/5" },
  { id: "instagram", name: "Instagram Direct", icon: <Instagram size={16} className="text-pink-400" />, color: "border-pink-500/30 bg-pink-500/5" },
  { id: "gmail", name: "Gmail", icon: <Mail size={16} className="text-red-400" />, color: "border-red-500/30 bg-red-500/5" },
  { id: "outlook", name: "Outlook / Office 365", icon: <Mail size={16} className="text-blue-400" />, color: "border-blue-500/30 bg-blue-500/5" },
];

const NOTIFICATION_ITEMS = [
  { id: "morning", label: "Morning Briefing", desc: "Daily WhatsApp summary at 8 AM IST" },
  { id: "hot", label: "Hot Lead Alerts", desc: "Instant notification when a HOT lead is detected" },
  { id: "approval", label: "Approval Reminders", desc: "Remind me if approvals are pending for > 4 hours" },
  { id: "weekly", label: "Weekly Report", desc: "Analytics summary every Monday morning" },
];

const BUSINESS_TYPES = [
  "retail", "clothing_fashion", "food_restaurant", "education", "salon_beauty",
  "healthcare", "real_estate", "legal_ca", "freelancer", "ecommerce", "other",
];

// ── Connected Channels Section ────────────────────────────────────────────────

type ChannelStatus = {
  gmail: boolean;
  instagram: boolean;
  whatsapp: boolean;
  outlook: boolean;
  gmail_email: string | null;
  instagram_username: string | null;
  whatsapp_phone_number_id: string | null;
  outlook_email: string | null;
};

function ChannelsSection() {
  const [status, setStatus] = useState<ChannelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waDisplay, setWaDisplay] = useState("");
  const [showWaForm, setShowWaForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check URL params for OAuth callback result
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const oauthError = params.get("error");
    if (connected || oauthError) {
      window.history.replaceState({}, "", "/dashboard/settings?tab=channels");
    }
    if (oauthError) setError(oauthError.replace(/_/g, " "));

    api.get<ChannelStatus>("/channels/status")
      .then(d => setStatus(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const connectGmail = async () => {
    setConnecting("gmail");
    try {
      const { url } = await api.get<{ url: string }>("/channels/gmail/oauth-url");
      window.location.href = url;
    } catch { setConnecting(null); }
  };

  const connectInstagram = async () => {
    setConnecting("instagram");
    try {
      const { url } = await api.get<{ url: string }>("/channels/instagram/oauth-url");
      window.location.href = url;
    } catch { setConnecting(null); }
  };

  const connectOutlook = async () => {
    setConnecting("outlook");
    try {
      const { url } = await api.get<{ url: string }>("/channels/outlook/oauth-url");
      window.location.href = url;
    } catch { setConnecting(null); }
  };

  const connectWhatsApp = async () => {
    if (!waPhoneId.trim()) return;
    setConnecting("whatsapp");
    try {
      await api.post("/channels/whatsapp", { phone_number_id: waPhoneId.trim(), display_phone_number: waDisplay.trim() || null });
      setStatus(prev => prev ? { ...prev, whatsapp: true, whatsapp_phone_number_id: waPhoneId.trim() } : prev);
      setShowWaForm(false);
      setWaPhoneId("");
    } catch { /* ignore */ } finally { setConnecting(null); }
  };

  const disconnect = async (channel: "gmail" | "instagram" | "whatsapp" | "outlook") => {
    setDisconnecting(channel);
    try {
      await api.delete(`/channels/${channel}`);
      setStatus(prev => {
        if (!prev) return prev;
        const next = { ...prev, [channel]: false };
        if (channel === "gmail") { next.gmail_email = null; }
        if (channel === "instagram") { next.instagram_username = null; }
        if (channel === "whatsapp") { next.whatsapp_phone_number_id = null; }
        if (channel === "outlook") { next.outlook_email = null; }
        return next;
      });
    } catch { /* ignore */ } finally { setDisconnecting(null); }
  };

  if (loading) return (
    <div className="os-window">
      <div className="h-9 border-b border-os-border flex items-center px-4 bg-os-bg/50">
        <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">Settings / Connected Channels</span>
      </div>
      <div className="p-6 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-os-border rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  const channels = [
    {
      id: "gmail",
      name: "Gmail",
      description: "Read customer emails, extract intelligence, detect payment threads.",
      icon: <Mail size={16} className="text-red-400" />,
      color: "border-red-500/30 bg-red-500/5",
      connected: status?.gmail || false,
      subtitle: status?.gmail_email || null,
      onConnect: connectGmail,
    },
    {
      id: "outlook",
      name: "Outlook / Office 365",
      description: "Sync customer emails from your Microsoft Outlook or Office 365 inbox.",
      icon: <Mail size={16} className="text-blue-400" />,
      color: "border-blue-500/30 bg-blue-500/5",
      connected: status?.outlook || false,
      subtitle: status?.outlook_email || null,
      onConnect: connectOutlook,
    },
    {
      id: "instagram",
      name: "Instagram Direct",
      description: "Read DMs and comments from your Instagram Business account.",
      icon: <Instagram size={16} className="text-pink-400" />,
      color: "border-pink-500/30 bg-pink-500/5",
      connected: status?.instagram || false,
      subtitle: status?.instagram_username ? `@${status.instagram_username}` : null,
      onConnect: connectInstagram,
    },
    {
      id: "whatsapp",
      name: "WhatsApp Business API",
      description: "Connect your WhatsApp Cloud API for sending briefings and auto-replies.",
      icon: <MessageSquare size={16} className="text-green-400" />,
      color: "border-green-500/30 bg-green-500/5",
      connected: status?.whatsapp || false,
      subtitle: status?.whatsapp_phone_number_id ? `Phone ID: ${status.whatsapp_phone_number_id}` : null,
      onConnect: () => setShowWaForm(true),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="os-window">
        <div className="h-9 border-b border-os-border flex items-center px-4 bg-os-bg/50">
          <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">Settings / Connected Channels</span>
        </div>
        <div className="p-5 space-y-2">
          <p className="text-xs text-os-text-dim leading-relaxed">
            Connect the channels your customers use. KROVA reads conversations from these accounts to build intelligence.
            More channels connected = richer intelligence = more accurate predictions.
          </p>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/5">
              <AlertTriangle size={12} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400 capitalize">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto"><X size={12} className="text-red-400" /></button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {channels.map(ch => (
          <div key={ch.id} className={`os-card p-4 border ${ch.connected ? "border-green-500/20" : "border-os-border"}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${ch.connected ? ch.color : "bg-os-border border-transparent"}`}>
                  {ch.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white">{ch.name}</p>
                    {ch.connected && (
                      <span className="text-[9px] font-bold text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded uppercase tracking-widest">Connected</span>
                    )}
                  </div>
                  <p className="text-[10px] text-os-text-dim mt-0.5">{ch.subtitle || ch.description}</p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {ch.connected ? (
                  <button onClick={() => disconnect(ch.id as "gmail" | "instagram" | "whatsapp" | "outlook")}
                    disabled={disconnecting === ch.id}
                    className="os-button text-[9px] px-3 py-1.5 font-bold text-red-400 border-red-500/20 hover:bg-red-500/5 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                    <Unplug size={10} />
                    {disconnecting === ch.id ? "..." : "Disconnect"}
                  </button>
                ) : (
                  <button onClick={ch.onConnect}
                    disabled={connecting === ch.id}
                    className="os-button os-button-secondary text-[10px] px-3 py-1.5 font-bold flex items-center gap-1.5 disabled:opacity-50">
                    {connecting === ch.id ? <RefreshCw size={10} className="animate-spin" /> : <ChevronRight size={10} />}
                    {connecting === ch.id ? "Opening..." : "Connect"}
                  </button>
                )}
              </div>
            </div>
            {ch.id === "whatsapp" && showWaForm && !ch.connected && (
              <div className="mt-4 pt-4 border-t border-os-border space-y-3">
                <p className="text-[10px] text-os-text-dim">Find your Phone Number ID in Meta Business Manager → WhatsApp → Phone Numbers.</p>
                <div className="space-y-2">
                  <input
                    value={waPhoneId}
                    onChange={e => setWaPhoneId(e.target.value)}
                    placeholder="Phone Number ID (e.g. 123456789012345)"
                    className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
                  />
                  <input
                    value={waDisplay}
                    onChange={e => setWaDisplay(e.target.value)}
                    placeholder="Display number (optional, e.g. +91 98765 43210)"
                    className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={connectWhatsApp} disabled={!waPhoneId.trim() || connecting === "whatsapp"}
                    className="os-button os-button-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5 disabled:opacity-50">
                    {connecting === "whatsapp" ? <RefreshCw size={10} className="animate-spin" /> : <Check size={10} />}
                    Save Phone Number ID
                  </button>
                  <button onClick={() => setShowWaForm(false)} className="text-[10px] text-os-text-dim hover:text-white transition-colors">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="os-card p-4 space-y-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">How channel sync works</p>
        <p className="text-[10px] text-os-text-dim leading-relaxed">
          KROVA syncs Gmail and Outlook every night (26h window). Instagram DMs arrive in real-time via webhooks.
          WhatsApp messages arrive via your BSP webhooks. KROVA never stores message content on client devices — everything is analyzed server-side and only insights are surfaced.
        </p>
      </div>
    </div>
  );
}

// ── Memory Export Section ─────────────────────────────────────────────────────

function ExportSection() {
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const data = await api.get<Record<string, unknown>>("/export/business-report");
      setReport(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `krova-business-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const fin = report?.financial_summary as { received_this_month: number; total_overdue: number; estimated_revenue_leakage: number } | undefined;
  const pipe = report?.pipeline_breakdown as Record<string, number> | undefined;

  return (
    <div className="os-window">
      <div className="h-9 border-b border-os-border flex items-center px-4 bg-os-bg/50">
        <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">Settings / Export Report</span>
      </div>
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-white">KROVA Memory Export</h3>
          <p className="text-[11px] text-os-text-dim leading-relaxed">
            Everything KROVA knows about your business in one structured document.
            Share with your accountant, investor, bank, or business partner.
            No consultant generates this automatically from unstructured data.
          </p>
        </div>

        {!report ? (
          <button onClick={generateReport} disabled={loading}
            className="os-button os-button-primary text-xs px-6 py-2.5 font-bold flex items-center gap-2 disabled:opacity-50">
            {loading ? <><RefreshCw size={12} className="animate-spin" /> Generating...</> : <><Download size={12} /> Generate Report</>}
          </button>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            <div className="grid grid-cols-2 gap-3">
              {fin && [
                { label: "Received this month", value: `₹${(fin.received_this_month || 0).toLocaleString("en-IN")}`, color: "text-green-400" },
                { label: "Total overdue", value: `₹${(fin.total_overdue || 0).toLocaleString("en-IN")}`, color: "text-red-400" },
                { label: "Revenue leakage", value: `₹${(fin.estimated_revenue_leakage || 0).toLocaleString("en-IN")}`, color: "text-orange-400" },
              ].map(s => (
                <div key={s.label} className="os-card p-3 space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">{s.label}</p>
                  <p className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</p>
                </div>
              ))}
              {pipe && (
                <div className="os-card p-3 space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">Pipeline</p>
                  <p className="text-xs text-white">
                    {pipe.hot || 0}🔥 · {pipe.warm || 0} warm · {pipe.converted || 0} converted
                  </p>
                </div>
              )}
            </div>
            <div className="p-3 rounded-lg bg-os-border/30 border border-os-border">
              <p className="text-[10px] text-os-text-dim">
                Report includes: customer summary, pipeline breakdown, financial overview, active predictions,
                overdue commitments, revenue leaks, competitor intelligence, Business DNA narrative.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={downloadReport}
                className="os-button os-button-primary text-xs px-6 py-2.5 font-bold flex items-center gap-2">
                {downloaded ? <><Check size={12} /> Downloaded!</> : <><Download size={12} /> Download JSON</>}
              </button>
              <button onClick={() => setReport(null)} className="text-[10px] font-bold text-os-text-dim hover:text-white transition-colors uppercase tracking-widest">
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  // Read ?tab= from URL so OAuth callbacks land on the right section
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) return tab;
    }
    return "profile";
  });
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({ morning: true, hot: true, approval: false, weekly: true });

  // BSP Platforms state
  const [platforms, setPlatforms] = useState<ConnectedPlatform[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [connectForm, setConnectForm] = useState<Record<string, { apiKey: string; accountId: string; sourcePhone: string }>>({
    interakt: { apiKey: "", accountId: "", sourcePhone: "" },
    wati: { apiKey: "", accountId: "", sourcePhone: "" },
    gupshup: { apiKey: "", accountId: "", sourcePhone: "" },
  });
  const [connectError, setConnectError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  // Team state
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("team_member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const loadTeam = () => {
    setTeamLoading(true);
    api.get<TeamMember[]>("/team")
      .then(data => setTeam(data))
      .catch(() => setTeam([]))
      .finally(() => setTeamLoading(false));
  };

  const inviteMember = async () => {
    if (!inviteName || !inviteEmail) return;
    setInviting(true);
    setInviteError(null);
    try {
      const member = await api.post<TeamMember>("/team/invite", { name: inviteName, email: inviteEmail, role: inviteRole });
      setTeam(prev => [member, ...prev]);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("team_member");
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (e) {
      setInviteError((e as Error).message || "Invite failed");
    } finally {
      setInviting(false);
    }
  };

  const deactivateMember = async (id: string) => {
    setDeactivatingId(id);
    try {
      await api.delete(`/team/${id}`);
      setTeam(prev => prev.filter(m => m.id !== id));
    } catch { /* silent */ } finally {
      setDeactivatingId(null);
    }
  };

  const loadPlatforms = () => {
    setPlatformsLoading(true);
    api.get<ConnectedPlatform[]>("/platforms")
      .then(data => setPlatforms(data))
      .catch(() => setPlatforms([]))
      .finally(() => setPlatformsLoading(false));
  };

  const connectBsp = async (platformId: string) => {
    setConnectingPlatform(platformId);
    setConnectError(null);
    const form = connectForm[platformId];
    try {
      const result = await api.post<ConnectedPlatform>("/platforms/connect", {
        platform: platformId,
        api_key: form.apiKey,
        account_id: form.accountId || undefined,
        source_phone: form.sourcePhone || undefined,
      });
      setPlatforms(prev => {
        const filtered = prev.filter(p => p.platform !== platformId);
        return [result, ...filtered];
      });
      setConnectForm(prev => ({ ...prev, [platformId]: { apiKey: "", accountId: "", sourcePhone: "" } }));
    } catch (e) {
      setConnectError((e as Error).message || "Connection failed");
    } finally {
      setConnectingPlatform(null);
    }
  };

  const syncPlatform = async (id: string) => {
    setSyncingId(id);
    try {
      const updated = await api.post<ConnectedPlatform>(`/platforms/${id}/sync`, {});
      setPlatforms(prev => prev.map(p => p.id === id ? updated : p));
    } catch { /* silent */ } finally {
      setSyncingId(null);
    }
  };

  const disconnectPlatform = async (id: string) => {
    setDisconnectingId(id);
    try {
      await api.delete(`/platforms/${id}`);
      setPlatforms(prev => prev.filter(p => p.id !== id));
    } catch { /* silent */ } finally {
      setDisconnectingId(null);
    }
  };

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessType, setBusinessType] = useState("other");
  const [context, setContext] = useState("");
  const [goodLead, setGoodLead] = useState("");
  const [lostDesc, setLostDesc] = useState("");

  useEffect(() => {
    if (activeSection === "platforms" && platforms.length === 0 && !platformsLoading) {
      loadPlatforms();
    }
    if (activeSection === "team" && team.length === 0 && !teamLoading) {
      loadTeam();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  useEffect(() => {
    api.get<Business>("/businesses/me")
      .then(b => {
        setBusiness(b);
        setName(b.name);
        setPhone(b.briefing_phone || "");
        setBusinessType(b.business_type);
        setContext(b.context || "");
        setGoodLead(b.good_lead_description || "");
        setLostDesc(b.lost_customer_description || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.patch<Business>("/businesses/me", {
        name: name || undefined,
        business_type: businessType || undefined,
        briefing_phone: phone || undefined,
        context: context || undefined,
        good_lead_description: goodLead || undefined,
        lost_customer_description: lostDesc || undefined,
      });
      setBusiness(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* show nothing on error */ } finally {
      setSaving(false);
    }
  };

  const SaveButton = () => (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
      onClick={handleSave} disabled={saving}
      className={`os-button text-xs px-6 py-2.5 font-bold transition-all disabled:opacity-50 flex items-center gap-2 ${saved ? "bg-green-500/20 border-green-500/40 text-green-400" : "os-button-primary"}`}>
      {saved ? <><Check size={12} /> Saved</> : saving ? "Saving..." : "Save Changes"}
    </motion.button>
  );

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim mb-2">
          <Settings size={10} /> Configuration
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          <AuroraText>Settings.</AuroraText>
        </h1>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0 space-y-1">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                activeSection === s.id
                  ? "bg-white/5 text-white border border-os-border-bright"
                  : s.id === "danger"
                    ? "text-red-400 hover:text-red-300 hover:bg-red-500/5 border border-transparent"
                    : "text-os-text-dim hover:text-white hover:bg-white/5 border border-transparent"
              }`}>
              <span>{s.icon}</span>
              <span className="text-xs font-medium">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Business Profile */}
          {activeSection === "profile" && (
            <div className="os-window">
              <div className="h-9 border-b border-os-border flex items-center px-4 bg-os-bg/50">
                <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">Settings / Business Profile</span>
              </div>
              <div className="p-6 space-y-5">
                {loading ? (
                  <div className="space-y-3 animate-pulse">
                    {[1,2,3].map(i => <div key={i} className="h-10 bg-os-border rounded" />)}
                  </div>
                ) : (
                  <>
                    {business && (
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-xl bg-os-border flex items-center justify-center text-2xl font-bold">
                          {name[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-bold">{business.name}</p>
                          <p className="text-xs text-os-text-dim capitalize">{business.plan} · {business.business_type}</p>
                        </div>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">Business Name</label>
                      <input value={name} onChange={e => setName(e.target.value)}
                        className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-os-border-bright transition-colors font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">WhatsApp for Briefings</label>
                      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210"
                        className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">Business Type</label>
                      <select value={businessType} onChange={e => setBusinessType(e.target.value)}
                        className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-os-border-bright transition-colors font-mono">
                        {BUSINESS_TYPES.map(t => (
                          <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
                        ))}
                      </select>
                    </div>
                    <div className="pt-4"><SaveButton /></div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Connected Channels */}
          {activeSection === "channels" && (
            <ChannelsSection />
          )}

          {/* BSP Integrations */}
          {activeSection === "platforms" && (
            <div className="space-y-4">
              <div className="os-window">
                <div className="h-9 border-b border-os-border flex items-center px-4 bg-os-bg/50">
                  <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">Settings / BSP Integrations</span>
                </div>
                <div className="p-5 space-y-2">
                  <p className="text-xs text-os-text-dim leading-relaxed">
                    Connect your WhatsApp Business Solution Provider to enable automated follow-ups.
                    Your API key is encrypted and never returned in plaintext. You keep paying your BSP directly.
                  </p>
                  {connectError && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/5">
                      <AlertTriangle size={12} className="text-red-400 shrink-0" />
                      <p className="text-xs text-red-400">{connectError}</p>
                      <button onClick={() => setConnectError(null)} className="ml-auto text-red-400 hover:text-red-300">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Connected platforms list */}
              {platformsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-16 bg-os-border rounded-xl animate-pulse" />)}
                </div>
              ) : platforms.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim px-1">Connected</p>
                  {platforms.map(p => (
                    <div key={p.id} className="os-card p-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-bold capitalize">{p.platform}</p>
                          <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest border border-green-500/30 px-1.5 py-0.5 rounded">Active</span>
                        </div>
                        <p className="text-[10px] text-os-text-dim font-mono">
                          {p.api_key_masked} · {p.template_count} templates
                          {p.last_synced_at && ` · Synced ${new Date(p.last_synced_at).toLocaleDateString("en-IN")}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => syncPlatform(p.id)} disabled={syncingId === p.id}
                          title="Sync templates"
                          className="w-8 h-8 rounded-lg border border-os-border flex items-center justify-center text-os-text-dim hover:text-white hover:border-os-border-bright transition-all disabled:opacity-50">
                          <RefreshCw size={12} className={syncingId === p.id ? "animate-spin" : ""} />
                        </button>
                        <button onClick={() => disconnectPlatform(p.id)} disabled={disconnectingId === p.id}
                          title="Disconnect"
                          className="w-8 h-8 rounded-lg border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50">
                          {disconnectingId === p.id ? <RefreshCw size={12} className="animate-spin" /> : <Unplug size={12} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Connect form per BSP */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim px-1">Connect a Platform</p>
                {BSP_PLATFORMS.filter(bsp => !platforms.some(p => p.platform === bsp.id)).map(bsp => (
                  <div key={bsp.id} className="os-card overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold">{bsp.name}</p>
                        <span className="text-[9px] font-mono text-os-text-dim">{bsp.docsHint}</span>
                      </div>
                      <p className="text-[11px] text-os-text-dim mb-3">{bsp.desc}</p>
                      <div className="space-y-2">
                        <input
                          type="password"
                          placeholder="Paste API key..."
                          value={connectForm[bsp.id].apiKey}
                          onChange={e => setConnectForm(prev => ({ ...prev, [bsp.id]: { ...prev[bsp.id], apiKey: e.target.value } }))}
                          className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
                        />
                        {bsp.needsAccount && (
                          <input
                            type="text"
                            placeholder="Account ID / Tenant ID..."
                            value={connectForm[bsp.id].accountId}
                            onChange={e => setConnectForm(prev => ({ ...prev, [bsp.id]: { ...prev[bsp.id], accountId: e.target.value } }))}
                            className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
                          />
                        )}
                        {bsp.needsPhone && (
                          <input
                            type="text"
                            placeholder="Sender phone (e.g. 919876543210)..."
                            value={connectForm[bsp.id].sourcePhone}
                            onChange={e => setConnectForm(prev => ({ ...prev, [bsp.id]: { ...prev[bsp.id], sourcePhone: e.target.value } }))}
                            className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
                          />
                        )}
                        <button
                          onClick={() => connectBsp(bsp.id)}
                          disabled={!connectForm[bsp.id].apiKey || connectingPlatform === bsp.id}
                          className="os-button os-button-primary text-xs px-4 py-2 gap-2 disabled:opacity-40">
                          {connectingPlatform === bsp.id
                            ? <><RefreshCw size={10} className="animate-spin" /> Verifying...</>
                            : <><Plus size={10} /> Connect {bsp.name}</>}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {BSP_PLATFORMS.every(bsp => platforms.some(p => p.platform === bsp.id)) && (
                  <div className="os-card p-6 text-center">
                    <Check size={20} className="text-green-400 mx-auto mb-2" />
                    <p className="text-sm font-bold">All platforms connected</p>
                    <p className="text-xs text-os-text-dim mt-1">Interakt, Wati, and Gupshup are all active.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Team */}
          {activeSection === "team" && (
            <div className="space-y-4">
              {/* Invite form */}
              <div className="os-window">
                <div className="h-9 border-b border-os-border flex items-center px-4 bg-os-bg/50">
                  <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">Settings / Team</span>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-xs text-os-text-dim">
                    Invite team members to access the workspace. They receive an email to set up their account.
                    Managers see everything. Team members see only their assigned customers.
                  </p>
                  {inviteError && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/5">
                      <AlertTriangle size={12} className="text-red-400 shrink-0" />
                      <p className="text-xs text-red-400">{inviteError}</p>
                      <button onClick={() => setInviteError(null)} className="ml-auto"><X size={12} className="text-red-400" /></button>
                    </div>
                  )}
                  {inviteSuccess && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-500/30 bg-green-500/5">
                      <Check size={12} className="text-green-400" />
                      <p className="text-xs text-green-400">Invite sent! They&apos;ll receive an email to set up their account.</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">Name</label>
                      <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Priya Sharma"
                        className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">Email</label>
                      <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="priya@company.com" type="email"
                        className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">Role</label>
                    <div className="flex gap-2">
                      {[
                        { id: "team_member", label: "Team Member", desc: "Sees only assigned customers" },
                        { id: "manager", label: "Manager", desc: "Sees everything, no billing access" },
                      ].map(r => (
                        <button key={r.id} onClick={() => setInviteRole(r.id)}
                          className={`flex-1 p-3 rounded-xl border text-left transition-all ${inviteRole === r.id ? "border-os-border-bright bg-white/5" : "border-os-border hover:border-os-border-bright"}`}>
                          <p className="text-xs font-bold mb-0.5">{r.label}</p>
                          <p className="text-[10px] text-os-text-dim">{r.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={inviteMember} disabled={!inviteName || !inviteEmail || inviting}
                    className="os-button os-button-primary text-xs px-5 py-2.5 gap-2 disabled:opacity-40">
                    {inviting
                      ? <><RefreshCw size={11} className="animate-spin" /> Sending...</>
                      : <><Send size={11} /> Send Invite</>}
                  </button>
                </div>
              </div>

              {/* Team member list */}
              {teamLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-16 bg-os-border rounded-xl animate-pulse" />)}
                </div>
              ) : team.length === 0 ? (
                <div className="os-card p-8 text-center">
                  <Users size={24} className="text-os-text-dim mx-auto mb-3" />
                  <p className="text-sm font-bold mb-1">No team members yet</p>
                  <p className="text-xs text-os-text-dim">Invite your first team member above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim px-1">
                    {team.length} member{team.length !== 1 ? "s" : ""}
                  </p>
                  {team.map(m => (
                    <div key={m.id} className="os-card p-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-os-border flex items-center justify-center font-bold text-sm shrink-0">
                        {m.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-bold truncate">{m.name}</p>
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                            m.role === "manager"
                              ? "text-blue-400 border-blue-500/30"
                              : "text-os-text-dim border-os-border"
                          }`}>{m.role === "manager" ? "Manager" : "Team Member"}</span>
                          {!m.has_accepted && (
                            <span className="text-[9px] text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">Pending</span>
                          )}
                        </div>
                        <p className="text-[10px] text-os-text-dim font-mono truncate">
                          {m.email} · {m.assigned_customer_count} assigned
                        </p>
                      </div>
                      <button onClick={() => deactivateMember(m.id)} disabled={deactivatingId === m.id}
                        title="Remove"
                        className="w-8 h-8 rounded-lg border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 shrink-0">
                        {deactivatingId === m.id ? <RefreshCw size={12} className="animate-spin" /> : <X size={12} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Preferences */}
          {activeSection === "ai" && (
            <div className="os-window">
              <div className="h-9 border-b border-os-border flex items-center px-4 bg-os-bg/50">
                <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">Settings / AI Preferences</span>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">Business Context</label>
                  <textarea rows={3} value={context} onChange={e => setContext(e.target.value)}
                    placeholder="Interior design, home renovation, modular kitchens..."
                    className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono resize-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">What makes a good lead?</label>
                  <textarea rows={2} value={goodLead} onChange={e => setGoodLead(e.target.value)}
                    placeholder="Someone asking about pricing, ready to buy within 2 weeks..."
                    className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono resize-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">Lost customer signals</label>
                  <textarea rows={2} value={lostDesc} onChange={e => setLostDesc(e.target.value)}
                    placeholder="Went quiet after pricing, mentioned a competitor..."
                    className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono resize-none" />
                </div>
                <div className="pt-4"><SaveButton /></div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeSection === "notifications" && (
            <div className="os-window">
              <div className="h-9 border-b border-os-border flex items-center px-4 bg-os-bg/50">
                <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">Settings / Notifications</span>
              </div>
              <div className="p-6 space-y-4">
                {NOTIFICATION_ITEMS.map(n => (
                  <div key={n.id} className="flex items-center justify-between py-3 border-b border-os-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-bold">{n.label}</p>
                      <p className="text-[11px] text-os-text-dim mt-0.5">{n.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications(prev => ({ ...prev, [n.id]: !prev[n.id as keyof typeof prev] }))}
                      className={`w-10 h-6 rounded-full border transition-all relative ${notifications[n.id as keyof typeof notifications] ? "bg-white/10 border-white/30" : "bg-os-border border-os-border"}`}
                    >
                      <motion.div
                        animate={{ x: notifications[n.id as keyof typeof notifications] ? 16 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className={`w-4 h-4 rounded-full absolute top-0.5 ${notifications[n.id as keyof typeof notifications] ? "bg-white" : "bg-os-text-dim"}`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security */}
          {activeSection === "security" && (
            <div className="os-window">
              <div className="h-9 border-b border-os-border flex items-center px-4 bg-os-bg/50">
                <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">Settings / Security</span>
              </div>
              <div className="p-6 space-y-5">
                {["Current Password", "New Password", "Confirm Password"].map(label => (
                  <div key={label} className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">{label}</label>
                    <input type="password" placeholder="••••••••"
                      className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-os-border-bright transition-colors font-mono" />
                  </div>
                ))}
                <button className="os-button os-button-secondary text-xs px-6 py-2.5 font-bold">Update Password</button>
              </div>
            </div>
          )}

          {/* Memory Export */}
          {activeSection === "export" && (
            <ExportSection />
          )}

          {/* Danger Zone */}
          {activeSection === "danger" && (
            <div className="os-window border-red-500/20">
              <div className="h-9 border-b border-red-500/20 flex items-center px-4 bg-red-500/5">
                <span className="mx-auto text-[10px] font-mono text-red-400 uppercase tracking-widest">Danger Zone</span>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { label: "Reset AI Preferences", desc: "Clears all context and guardrails. Cannot be undone.", action: "Reset AI" },
                  { label: "Disconnect All Channels", desc: "Removes all connected integrations.", action: "Disconnect All" },
                  { label: "Delete All Customer Data", desc: "Permanently deletes all leads, messages, and analysis.", action: "Delete Data" },
                  { label: "Delete Workspace", desc: "Permanently deletes your KROVA account. This cannot be undone.", action: "Delete Workspace" },
                ].map(item => (
                  <div key={item.label} className="flex items-start justify-between gap-4 py-4 border-b border-os-border/30 last:border-0">
                    <div>
                      <p className="text-sm font-bold">{item.label}</p>
                      <p className="text-[11px] text-os-text-dim mt-1">{item.desc}</p>
                    </div>
                    <button className="os-button text-[10px] px-3 py-1.5 font-bold text-red-400 border-red-500/30 hover:bg-red-500/5 shrink-0 transition-colors">
                      {item.action}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
