"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Check, Zap, AlertCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Particles } from "@/components/magicui/particles";
import { AnimatedGridPattern } from "@/components/magicui/animated-grid-pattern";
import { Meteors } from "@/components/magicui/meteors";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { GlowCard } from "@/components/spectrum/glow-card";

const STEPS = ["Business Profile", "Connect Channels", "AI Setup", "Launch"];

const BUSINESS_TYPES = [
  { value: "retail", label: "Retail / Kirana Store" },
  { value: "clothing_fashion", label: "Clothing & Fashion" },
  { value: "food_restaurant", label: "Food & Restaurant" },
  { value: "education", label: "Education / Tutor" },
  { value: "salon_beauty", label: "Salon & Beauty" },
  { value: "healthcare", label: "Healthcare / Clinic" },
  { value: "real_estate", label: "Real Estate" },
  { value: "legal_ca", label: "Legal / CA" },
  { value: "freelancer", label: "Freelancer" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "other", label: "Other" },
];

const CHANNELS = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    desc: "Get leads from WhatsApp automatically",
    color: "text-green-400",
    glow: "from-green-400/30 via-emerald-400/20 to-teal-400/30",
  },
  {
    id: "instagram",
    name: "Instagram Direct",
    desc: "Capture DMs and comments",
    color: "text-pink-400",
    glow: "from-pink-400/30 via-fuchsia-400/20 to-rose-400/30",
  },
  {
    id: "gmail",
    name: "Gmail",
    desc: "Process business emails",
    color: "text-red-400",
    glow: "from-red-400/30 via-orange-400/20 to-amber-400/30",
  },
  {
    id: "outlook",
    name: "Outlook",
    desc: "Office 365 and Outlook emails",
    color: "text-blue-400",
    glow: "from-blue-400/30 via-cyan-400/20 to-sky-400/30",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [connected, setConnected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bizName, setBizName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [bizType, setBizType] = useState("other");

  const [context, setContext] = useState("");
  const [goodLead, setGoodLead] = useState("");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-os-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  const toggleChannel = (id: string) =>
    setConnected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const handleContinue = async () => {
    if (step === 0) {
      if (!bizName.trim()) {
        setError("Business name is required.");
        return;
      }
      setError(null);
      setSaving(true);
      try {
        await api.post("/businesses", {
          name: bizName,
          business_type: bizType,
          briefing_phone: phone || undefined,
          context: undefined,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (!msg.includes("409") && !msg.includes("already")) {
          setError(msg || "Failed to create business profile.");
          setSaving(false);
          return;
        }
      } finally {
        setSaving(false);
      }
    }

    if (step === 2 && context) {
      try {
        await api.patch("/businesses/me", {
          context,
          good_lead_description: goodLead || undefined,
        });
      } catch {
        /* non-fatal */
      }
    }

    setStep((s) => s + 1);
  };

  return (
    <div className="min-h-screen bg-os-bg flex flex-col items-center justify-center px-6 relative py-12 overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <AnimatedGridPattern
          numSquares={24}
          maxOpacity={0.08}
          duration={3}
          className="[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
        />
        <Particles className="absolute inset-0" quantity={60} ease={80} color="#ffffff" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 blur-[120px] rounded-full" />
      </div>

      <Meteors number={8} />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-3.5 h-3.5 bg-black rounded-sm" />
          </div>
          <span className="font-bold tracking-tighter text-2xl">KROVA</span>
        </div>

        {/* Progress with animated connector */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <motion.div
                animate={{
                  scale: i === step ? [1, 1.1, 1] : 1,
                  boxShadow:
                    i === step
                      ? "0 0 20px rgba(94, 234, 212, 0.4)"
                      : "0 0 0 rgba(0,0,0,0)",
                }}
                transition={{ duration: 0.6, repeat: i === step ? Infinity : 0, repeatDelay: 1 }}
                className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                  i < step
                    ? "bg-white text-black"
                    : i === step
                      ? "bg-gradient-to-br from-teal-400/40 to-violet-400/40 text-white border border-teal-400/40"
                      : "bg-os-border text-os-text-dim"
                }`}
              >
                {i < step ? <Check size={11} /> : i + 1}
              </motion.div>
              <span
                className={`text-[10px] font-bold uppercase tracking-widest hidden sm:block ${
                  i === step ? "text-white" : "text-os-text-dim"
                }`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px bg-os-border relative overflow-hidden">
                  <motion.div
                    animate={{ width: i < step ? "100%" : "0%" }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-teal-400 to-violet-400"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="relative os-window overflow-visible"
          >
            <div className="relative overflow-hidden rounded-[inherit]">
              <BorderBeam size={200} duration={12} colorFrom="#5EEAD4" colorTo="#A78BFA" />
              <BorderBeam size={200} duration={12} delay={6} colorFrom="#FB7185" colorTo="#FCD34D" />

              <div className="h-9 border-b border-os-border flex items-center px-4 bg-os-bg/50">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
                </div>
                <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">
                  Setup / Step {step + 1} of {STEPS.length}
                </span>
              </div>

              <div className="p-8 relative">
                <DotPattern className="opacity-20 [mask-image:radial-gradient(300px_circle_at_top,white,transparent)]" />

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4 relative">
                    <AlertCircle size={12} className="text-red-400 shrink-0" />
                    <p className="text-[11px] text-red-400">{error}</p>
                  </div>
                )}

                {/* Step 1 — Business Profile */}
                {step === 0 && (
                  <div className="space-y-5 relative">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight mb-1">
                        Create your <AuroraText>business profile.</AuroraText>
                      </h2>
                      <p className="text-xs text-os-text-dim">
                        KROVA uses this to personalise your AI workspace.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                        Business Name *
                      </label>
                      <input
                        value={bizName}
                        onChange={(e) => setBizName(e.target.value)}
                        placeholder="Mehta Interiors"
                        className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                        City
                      </label>
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Mumbai"
                        className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                        WhatsApp for Briefings
                      </label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        type="tel"
                        className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                        Business Type
                      </label>
                      <select
                        value={bizType}
                        onChange={(e) => setBizType(e.target.value)}
                        className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-os-border-bright transition-colors font-mono"
                      >
                        {BUSINESS_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Step 2 — Connect Channels */}
                {step === 1 && (
                  <div className="space-y-5 relative">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight mb-1">
                        Connect your <AuroraText>channels.</AuroraText>
                      </h2>
                      <p className="text-xs text-os-text-dim">
                        Connect at least one. You can add more in Settings.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {CHANNELS.map((ch) => {
                        const isConnected = connected.includes(ch.id);
                        return (
                          <div
                            key={ch.id}
                            onClick={() => toggleChannel(ch.id)}
                            className="cursor-pointer"
                          >
                            <GlowCard
                              glowColor={isConnected ? ch.glow : "from-os-border to-os-border"}
                            >
                              <div className="p-4 flex items-center justify-between">
                                <div>
                                  <p
                                    className={`text-sm font-bold ${isConnected ? ch.color : "text-white"}`}
                                  >
                                    {ch.name}
                                  </p>
                                  <p className="text-[11px] text-os-text-dim mt-0.5">
                                    {ch.desc}
                                  </p>
                                </div>
                                {isConnected ? (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center"
                                  >
                                    <Check size={13} className="text-emerald-400" />
                                  </motion.div>
                                ) : (
                                  <button className="os-badge text-[10px] px-2.5 py-1 border-os-border bg-os-bg">
                                    Connect
                                  </button>
                                )}
                              </div>
                            </GlowCard>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-os-text-dim text-center">
                      <span
                        className="cursor-pointer hover:text-white underline"
                        onClick={() => setStep(2)}
                      >
                        Skip for now →
                      </span>
                    </p>
                  </div>
                )}

                {/* Step 3 — AI Setup */}
                {step === 2 && (
                  <div className="space-y-5 relative">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight mb-1">
                        Configure your <AuroraText>AI.</AuroraText>
                      </h2>
                      <p className="text-xs text-os-text-dim">
                        Help KROVA write replies that sound like you.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                        Products / Services
                      </label>
                      <textarea
                        rows={3}
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder="Interior design, home renovation, modular kitchens..."
                        className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                        What makes a good lead? (optional)
                      </label>
                      <textarea
                        rows={2}
                        value={goodLead}
                        onChange={(e) => setGoodLead(e.target.value)}
                        placeholder="Someone asking about pricing and ready to buy within 2 weeks..."
                        className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Step 4 — Launch */}
                {step === 3 && (
                  <div className="text-center space-y-6 py-4 relative">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", duration: 0.8 }}
                      className="relative w-20 h-20 mx-auto"
                    >
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-400/40 to-violet-400/40 blur-2xl" />
                      <div className="relative w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.2)] overflow-hidden">
                        <BorderBeam size={60} duration={6} colorFrom="#5EEAD4" colorTo="#A78BFA" />
                        <Zap size={40} className="text-black relative z-10" />
                      </div>
                    </motion.div>
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight mb-2">
                        You&apos;re <AuroraText>live.</AuroraText>
                      </h2>
                      <p className="text-sm text-os-text-dim leading-relaxed max-w-sm mx-auto">
                        KROVA is watching your channels. Your first AI analysis runs tonight at
                        10 PM IST.
                      </p>
                    </div>
                    <div className="relative">
                      <GlowCard glowColor="from-teal-400/30 via-violet-400/20 to-pink-400/30">
                        <div className="p-4 text-left space-y-3">
                          {[
                            {
                              label: "AI Analysis",
                              value: "Tonight at 10:00 PM IST",
                              dot: "bg-yellow-500",
                            },
                            {
                              label: "Morning Briefing",
                              value: "Tomorrow at 8:00 AM IST",
                              dot: "bg-emerald-500",
                            },
                            {
                              label: "Channels Active",
                              value:
                                connected.length > 0
                                  ? `${connected.length} selected`
                                  : "Add in Settings",
                              dot: connected.length > 0 ? "bg-emerald-500" : "bg-os-border",
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${item.dot} animate-pulse`} />
                                <span className="text-[11px] text-os-text-dim uppercase tracking-widest font-bold">
                                  {item.label}
                                </span>
                              </div>
                              <span className="text-[11px] text-white font-mono">
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </GlowCard>
                    </div>
                    <Link href="/dashboard">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="os-button os-button-primary w-full justify-center py-3 font-bold gap-2"
                      >
                        Open Workspace <ArrowRight size={16} />
                      </motion.button>
                    </Link>
                  </div>
                )}

                {/* Navigation */}
                {step < 3 && (
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-os-border relative">
                    <button
                      onClick={() => setStep(Math.max(0, step - 1))}
                      className={`text-[11px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors ${
                        step === 0 ? "opacity-0 pointer-events-none" : ""
                      }`}
                    >
                      ← Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleContinue}
                      disabled={saving}
                      className="os-button os-button-primary px-6 py-2 text-sm font-bold disabled:opacity-50 gap-2"
                    >
                      {saving ? (
                        "Saving..."
                      ) : (
                        <>
                          Continue <ArrowRight size={14} />
                        </>
                      )}
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim inline-flex items-center gap-1.5">
            <Sparkles size={10} className="text-violet-400" />
            Powered by KROVA AI
          </span>
        </motion.div>
      </div>
    </div>
  );
}
