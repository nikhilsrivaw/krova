"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
  Zap,
  ArrowRight,
  Clock,
  MessageSquare,
  Brain,
  CheckSquare,
  TrendingUp,
  Moon,
  Sun,
  Bell,
  Sparkles,
  Terminal,
  X,
  Lightbulb,
  AlertTriangle,
  DollarSign,
  Eye,
  Languages,
  Cpu,
  ShieldCheck,
  Check,
} from "lucide-react";

import { Navbar } from "@/components/spectrum/navbar";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Meteors } from "@/components/magicui/meteors";
import { Particles } from "@/components/magicui/particles";
import { Ripple } from "@/components/magicui/ripple";
import { ShinyText } from "@/components/magicui/shiny-text";
import { AnimatedGridPattern } from "@/components/magicui/animated-grid-pattern";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { MagicCard } from "@/components/magicui/magic-card";

import { GlowCard } from "@/components/spectrum/glow-card";
import { SpotlightCard } from "@/components/spectrum/spotlight-card";
import { HowItWorks } from "@/components/spectrum/how-it-works";

const TIMELINE = [
  {
    time: "10:00 PM",
    icon: <Moon size={18} />,
    title: "Nightly Scan",
    desc: "KROVA reads every message that came in today across all your connected channels.",
    color: "text-indigo-400",
    glow: "from-indigo-400/30 to-violet-400/20",
  },
  {
    time: "10:05 PM",
    icon: <Brain size={18} />,
    title: "AI Analysis",
    desc: "Each conversation is scored by intent, urgency, and value. The AI uses your catalogue and guardrails to draft the right reply.",
    color: "text-purple-400",
    glow: "from-purple-400/30 to-fuchsia-400/20",
  },
  {
    time: "10:20 PM",
    icon: <CheckSquare size={18} />,
    title: "Approval Queue Built",
    desc: "Replies are ranked HOT → WARM → COLD and loaded into your queue, ready for the morning.",
    color: "text-yellow-400",
    glow: "from-yellow-400/30 to-amber-400/20",
  },
  {
    time: "8:00 AM",
    icon: <Sun size={18} />,
    title: "Morning Briefing",
    desc: "You wake up to a WhatsApp from KROVA: overnight activity, hot leads to call, pending approvals.",
    color: "text-emerald-400",
    glow: "from-emerald-400/30 to-teal-400/20",
  },
  {
    time: "8:05 AM",
    icon: <Bell size={18} />,
    title: "You approve. KROVA sends.",
    desc: "Tap Approve. KROVA sends via the original channel — no copy-paste, no switching apps.",
    color: "text-white",
    glow: "from-white/30 to-zinc-400/20",
  },
];

const SCORING = [
  {
    label: "HOT 🔥",
    color: "text-red-400",
    glow: "from-red-400/40 via-rose-400/30 to-orange-400/30",
    dot: "bg-red-500",
    desc: "Asked about pricing, ready to buy, or explicitly requesting a follow-up. Needs a reply within hours.",
    signals: [
      "Mentioned price / cost / budget",
      "Asked about delivery / timeline",
      "Returning customer with new request",
      "Said \"interested\", \"let's do it\", \"send the link\"",
    ],
  },
  {
    label: "WARM ⚡",
    color: "text-yellow-400",
    glow: "from-yellow-400/40 via-amber-400/30 to-orange-400/30",
    dot: "bg-yellow-500",
    desc: "Showing genuine interest but hasn't committed. Needs nurturing — the right message at the right time.",
    signals: [
      "Viewed pricing multiple times",
      "Engaged with content",
      "Asked general product questions",
      "Existing customer exploring new services",
    ],
  },
  {
    label: "COLD 🧊",
    color: "text-cyan-400",
    glow: "from-cyan-400/40 via-sky-400/30 to-blue-400/30",
    dot: "bg-cyan-500",
    desc: "Went quiet, never replied, or low-intent browsing. Needs a re-engagement message, not a hard sell.",
    signals: [
      "No reply in 3+ days",
      "Only said \"hi\" or asked a vague question",
      "Bounced from the website",
      "Long-dormant contact",
    ],
  },
];

const CAPABILITIES = [
  {
    icon: <MessageSquare size={20} />,
    title: "Context-Aware Replies",
    desc: "The AI reads the full conversation thread — not just the last message — so replies are always contextually accurate.",
  },
  {
    icon: <TrendingUp size={20} />,
    title: "Intent Detection",
    desc: "Trained on buying signals, objections, and urgency cues specific to Indian SMB customer language.",
  },
  {
    icon: <CheckSquare size={20} />,
    title: "Guardrails",
    desc: "Define what the AI should never say — competitors, prices without approval, anything sensitive.",
  },
  {
    icon: <Zap size={20} />,
    title: "Brand Voice Cloning",
    desc: "Set your greeting style and tone once. The AI writes in your voice — formal, friendly, or Hinglish — every time.",
  },
  {
    icon: <Clock size={20} />,
    title: "Real-Time Mode (Pro)",
    desc: "On Pro, KROVA doesn't wait until 10 PM. It processes messages as they arrive and alerts you instantly.",
  },
  {
    icon: <Brain size={20} />,
    title: "Learns Over Time",
    desc: "The more you approve and reject, the sharper it gets. Every interaction makes it more you.",
  },
];

export default function IntelligencePage() {
  return (
    <div className="bg-os-bg min-h-screen relative">
      <Navbar />

      {/* HERO */}
      <section className="relative z-10 pt-36 pb-24 px-6 max-w-6xl mx-auto">
        <Meteors number={12} />
        <div className="text-center mb-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border bg-os-card/80 backdrop-blur text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-8"
          >
            <Brain size={10} className="text-teal-400" />
            <ShinyText shimmerWidth={80} className="text-os-text-dim">
              Intelligence Layer
            </ShinyText>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.05]"
          >
            The AI brain <br />
            <AuroraText>behind every reply.</AuroraText>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-os-text-dim text-lg max-w-2xl mx-auto mb-10"
          >
            KROVA doesn&apos;t just send auto-replies. It reads every conversation, scores every
            lead, drafts context-aware messages, and gets sharper every time you use it.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-4"
          >
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="os-button os-button-primary px-8 py-3 text-base font-bold gap-2"
              >
                See it in action <ArrowRight size={16} />
              </motion.button>
            </Link>
            <Link
              href="/pricing"
              className="text-[11px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors flex items-center gap-1"
            >
              View plans <ArrowRight size={12} />
            </Link>
          </motion.div>
        </div>

        {/* Brain visual */}
        <div className="relative h-[400px] flex items-center justify-center">
          <Ripple mainCircleSize={170} numCircles={7} />
          <div className="absolute z-20 w-24 h-24 rounded-3xl bg-os-card border border-os-border flex items-center justify-center overflow-hidden">
            <BorderBeam size={70} duration={6} colorFrom="#5EEAD4" colorTo="#A78BFA" />
            <Brain size={36} className="text-white relative z-10" />
          </div>
        </div>

        {/* Stats ticker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-8"
        >
          {[
            { label: "Messages Analyzed", value: 2840000, prefix: "" },
            { label: "Avg Accuracy", value: 94, suffix: "%" },
            { label: "Languages", value: 3 },
            { label: "Models Running", value: 7 },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold tracking-tight text-white">
                <NumberTicker
                  value={s.value}
                  prefix={s.prefix as string | undefined}
                  suffix={s.suffix as string | undefined}
                />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* LIVE AI TERMINAL — show the brain thinking */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Terminal size={10} className="text-emerald-400" /> Inside the brain
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Watch the AI <AuroraText>actually think.</AuroraText>
          </h2>
          <p className="text-os-text-dim max-w-lg mx-auto">
            Not a black box. Here&apos;s exactly how KROVA reads a conversation, scores it, and
            drafts your reply.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative os-window max-w-4xl mx-auto"
        >
          <BorderBeam size={250} duration={10} colorFrom="#5EEAD4" colorTo="#A78BFA" />

          <div className="h-9 border-b border-os-border flex items-center px-4 bg-os-bg/50">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
              <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
              <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
            </div>
            <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest flex items-center gap-2">
              krova-brain.exe
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </span>
          </div>

          <div className="p-6 bg-black/40 font-mono text-[12px] leading-relaxed space-y-2 min-h-[360px] relative">
            <DotPattern className="opacity-10" />
            <div className="relative space-y-2">
              <div className="text-emerald-400">
                $ krova analyze --conversation priya_d
              </div>
              <div className="text-os-text-dim">
                → reading 14 messages across whatsapp + instagram...
              </div>
              <div className="text-os-text-dim">
                → detecting intent signals...
              </div>
              <div>
                <span className="text-violet-400">[brain]</span>{" "}
                <span className="text-white">
                  found: "kitna lagega?" (pricing intent, 92% confidence)
                </span>
              </div>
              <div>
                <span className="text-violet-400">[brain]</span>{" "}
                <span className="text-white">
                  found: "kab tak deliver hoga?" (urgency, 88% confidence)
                </span>
              </div>
              <div>
                <span className="text-violet-400">[brain]</span>{" "}
                <span className="text-white">
                  cross-ref: pricing page viewed 3× last week
                </span>
              </div>
              <div className="text-os-text-dim">→ scoring lead...</div>
              <div>
                <span className="text-rose-400 font-bold">[score]</span>{" "}
                <span className="text-rose-400 font-bold">HOT 🔥</span>{" "}
                <span className="text-os-text-dim">(confidence: 0.94)</span>
              </div>
              <div className="text-os-text-dim">→ matching brand voice...</div>
              <div>
                <span className="text-amber-400">[voice]</span>{" "}
                <span className="text-white">
                  tone: friendly · register: hinglish · greeting: "Hi"
                </span>
              </div>
              <div className="text-os-text-dim">→ checking guardrails...</div>
              <div>
                <span className="text-emerald-400">[guardrail]</span>{" "}
                <span className="text-white">no pricing without approval ✓</span>
              </div>
              <div className="text-os-text-dim">→ drafting reply...</div>
              <div className="pt-2 px-3 py-2 rounded border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                  draft ready ↓
                </span>
                <div className="mt-2 text-white">
                  <TypingAnimation
                    text='"Hi Priya! Happy to share — our Elite plan is ₹2,499/mo. Can lock today, sharing payment link 🙌"'
                    duration={25}
                    loop
                  />
                </div>
              </div>
              <div className="pt-2">
                <span className="text-emerald-400">→ ready for approval ✓</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* HOW IT WORKS — beam diagram */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Zap size={10} className="text-yellow-400" /> Live flow
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Channels in. <AuroraText>Decisions out.</AuroraText>
          </h2>
        </div>
        <HowItWorks />
      </section>

      {/* TIMELINE */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Clock size={10} /> 10 PM → 8 AM
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            From inbox to <AuroraText>approval in one night.</AuroraText>
          </h2>
          <p className="text-os-text-dim max-w-lg mx-auto">
            The full intelligence cycle — every single day, automatically.
          </p>
        </div>

        <div className="space-y-4">
          {TIMELINE.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <GlowCard glowColor={step.glow}>
                <div className="p-6 flex items-center gap-5">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-os-bg border border-os-border flex items-center justify-center shrink-0 ${step.color}`}
                  >
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className={`text-[10px] font-bold font-mono ${step.color}`}>
                        {step.time}
                      </span>
                      <h3 className="font-bold text-base">{step.title}</h3>
                    </div>
                    <p className="text-sm text-os-text-dim leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* LEAD SCORING */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Zap size={10} /> Scoring
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Know who to call. <AuroraText>Right now.</AuroraText>
          </h2>
          <p className="text-os-text-dim max-w-lg mx-auto">
            KROVA classifies every lead into three tiers so you never waste time on the wrong
            conversation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SCORING.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <GlowCard glowColor={s.glow}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xl font-bold ${s.color}`}>{s.label}</span>
                    <div className={`w-2 h-2 rounded-full ${s.dot} animate-pulse`} />
                  </div>
                  <p className="text-sm text-os-text-dim leading-relaxed mb-5">{s.desc}</p>
                  <div className="space-y-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">
                      Signals
                    </p>
                    {s.signals.map((sig) => (
                      <div key={sig} className="flex items-start gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
                        <span className="text-xs text-os-text-dim">{sig}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* VOICE SAMPLES — three drafts in different tones */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Languages size={10} className="text-amber-400" /> Brand Voice
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Writes in <AuroraText>your voice.</AuroraText>
          </h2>
          <p className="text-os-text-dim max-w-lg mx-auto">
            Same customer message. Three different brand voices. KROVA matches yours from
            your first 50 sent messages.
          </p>
        </div>

        {/* Source message */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim mb-2 text-center">
            Customer message
          </div>
          <div className="rounded-2xl border border-os-border bg-os-card p-4 relative">
            <div className="absolute top-0 left-4 -translate-y-1/2 px-2 py-0.5 rounded bg-os-bg border border-os-border text-[9px] font-mono text-os-text-dim">
              Priya · WhatsApp
            </div>
            <p className="text-sm text-white pt-1">
              &quot;Hi, kitna lagega aapka Elite plan? Aur kab tak start ho sakta hai?&quot;
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              tone: "Formal",
              tag: "EN · Professional",
              glow: "from-blue-400/30 via-cyan-400/20 to-sky-400/30",
              body: "Hello Priya, thank you for reaching out. Our Elite plan is priced at ₹2,499/month. Onboarding typically begins within 2 business days. Would you like me to send the payment link?",
              accent: "text-blue-400",
            },
            {
              tone: "Friendly Hinglish",
              tag: "HI-EN · Warm",
              glow: "from-emerald-400/30 via-teal-400/20 to-cyan-400/30",
              body: "Hi Priya 🙌 Elite plan ₹2,499/mo hai — full access milta hai. Aaj lock kar lein toh kal hi start kar dete hain. Payment link bhej dun?",
              accent: "text-emerald-400",
              badge: "your voice",
            },
            {
              tone: "Casual Hindi",
              tag: "HI · Local",
              glow: "from-amber-400/30 via-orange-400/20 to-rose-400/30",
              body: "Priya ji namaste 🙏 Elite plan ka rate ₹2,499 maheene ka hai. Aaj confirm kar dijiye toh kal se hi service shuru ho jayegi. Payment link bhejun?",
              accent: "text-amber-400",
            },
          ].map((v) => (
            <GlowCard key={v.tone} glowColor={v.glow}>
              <div className="p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className={`text-sm font-bold ${v.accent}`}>{v.tone}</div>
                    <div className="text-[9px] font-mono text-os-text-dim uppercase tracking-widest mt-0.5">
                      {v.tag}
                    </div>
                  </div>
                  {v.badge && (
                    <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {v.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/90 leading-relaxed flex-1">{v.body}</p>
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-os-border text-[10px]">
                  <span className="text-os-text-dim font-mono">~ai drafted</span>
                  <button className={`font-bold uppercase tracking-widest ${v.accent}`}>
                    Approve →
                  </button>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </section>

      {/* CAPABILITIES — spotlight cards */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Sparkles size={10} className="text-violet-400" /> Capabilities
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            What the AI <AuroraText>actually does.</AuroraText>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CAPABILITIES.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <SpotlightCard>
                <div className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-os-bg border border-os-border flex items-center justify-center mb-4">
                    {cap.icon}
                  </div>
                  <h3 className="font-bold mb-2">{cap.title}</h3>
                  <p className="text-xs text-os-text-dim leading-relaxed">{cap.desc}</p>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* COMPARISON TABLE — AI vs Templates vs Manual */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Cpu size={10} className="text-violet-400" /> Why KROVA
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Not auto-replies. Not templates. <br />
            <AuroraText>An actual brain.</AuroraText>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Manual */}
          <div className="relative rounded-2xl border border-os-border bg-os-card p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-3">
              Doing it yourself
            </div>
            <h3 className="text-xl font-bold mb-4">Manual</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "Reads every message", ok: true },
                { label: "Tone matches you", ok: true },
                { label: "Catches every lead", ok: false },
                { label: "Works at 2 AM", ok: false },
                { label: "Scales with volume", ok: false },
                { label: "Hours/day saved", ok: false },
              ].map((r) => (
                <li key={r.label} className="flex items-center gap-2.5 text-os-text-dim">
                  {r.ok ? (
                    <Check size={14} className="text-emerald-400 shrink-0" />
                  ) : (
                    <X size={14} className="text-rose-400 shrink-0" />
                  )}
                  <span>{r.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 pt-4 border-t border-os-border text-[10px] text-os-text-dim">
              ~3 hrs/day lost
            </div>
          </div>

          {/* Templates */}
          <div className="relative rounded-2xl border border-os-border bg-os-card p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-3">
              Most automation tools
            </div>
            <h3 className="text-xl font-bold mb-4">Templates / Rules</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "Reads every message", ok: false },
                { label: "Tone matches you", ok: false },
                { label: "Catches every lead", ok: true },
                { label: "Works at 2 AM", ok: true },
                { label: "Scales with volume", ok: true },
                { label: "Hours/day saved", ok: true },
              ].map((r) => (
                <li key={r.label} className="flex items-center gap-2.5 text-os-text-dim">
                  {r.ok ? (
                    <Check size={14} className="text-emerald-400 shrink-0" />
                  ) : (
                    <X size={14} className="text-rose-400 shrink-0" />
                  )}
                  <span>{r.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 pt-4 border-t border-os-border text-[10px] text-rose-400">
              feels robotic · customers notice
            </div>
          </div>

          {/* KROVA */}
          <GlowCard glowColor="from-teal-400/40 via-violet-400/30 to-pink-400/40">
            <div className="p-6 relative">
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-teal-400/30 to-violet-400/30 border border-teal-400/30 text-[9px] font-bold uppercase tracking-widest text-teal-300">
                KROVA
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-3">
                AI Analyst
              </div>
              <h3 className="text-xl font-bold mb-4">KROVA Brain</h3>
              <ul className="space-y-2.5 text-sm">
                {[
                  "Reads every message",
                  "Tone matches you",
                  "Catches every lead",
                  "Works at 2 AM",
                  "Scales with volume",
                  "Hours/day saved",
                ].map((label) => (
                  <li key={label} className="flex items-center gap-2.5 text-white">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 pt-4 border-t border-emerald-500/20 text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                ~18 hrs/week back
              </div>
            </div>
          </GlowCard>
        </div>
      </section>

      {/* INTELLIGENCE OUTPUTS — what KROVA found this week */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Eye size={10} className="text-emerald-400" /> Real outputs
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            What KROVA <AuroraText>found this week.</AuroraText>
          </h2>
          <p className="text-os-text-dim max-w-lg mx-auto">
            Live examples from a sample workspace. This is what the brain surfaces — not
            metrics, decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              type: "Prediction",
              icon: <TrendingUp size={14} className="text-violet-400" />,
              accent: "text-violet-400",
              title: "Rahul will churn in 5–7 days",
              body: "Engagement dropped 60% · last 3 replies took 4h+ · price objection unresolved.",
              confidence: 87,
              action: "Send win-back offer",
            },
            {
              type: "Revenue Leak",
              icon: <DollarSign size={14} className="text-emerald-400" />,
              accent: "text-emerald-400",
              title: "₹47,000 in unpaid quotes",
              body: "3 quotes sent 12+ days ago, never followed up. Highest value: Mehta Interiors ₹22k.",
              confidence: 99,
              action: "Send reminders",
            },
            {
              type: "Hot Signal",
              icon: <AlertTriangle size={14} className="text-rose-400" />,
              accent: "text-rose-400",
              title: "Priya asked pricing twice",
              body: "First DM on Mon, follow-up on Wed. Strong intent + viewed pricing page 3×.",
              confidence: 94,
              action: "Approve draft",
            },
            {
              type: "Voice of Customer",
              icon: <MessageSquare size={14} className="text-cyan-400" />,
              accent: "text-cyan-400",
              title: "4 customers asked for EMI",
              body: "Repeated pattern this week — consider adding EMI tier or partner.",
              confidence: 76,
              action: "View cluster",
            },
            {
              type: "Competitor Mention",
              icon: <ShieldCheck size={14} className="text-amber-400" />,
              accent: "text-amber-400",
              title: '"Zoho karta tha pehle" — Anjali',
              body: "Switched from Zoho 2 weeks ago. Reason: too many features, no AI. Use as case study.",
              confidence: 91,
              action: "Tag as advocate",
            },
            {
              type: "Growth Opportunity",
              icon: <Lightbulb size={14} className="text-yellow-400" />,
              accent: "text-yellow-400",
              title: "12 dormant clients · 90+ days",
              body: "All used your service once. Avg ticket ₹8k. Win-back campaign opportunity.",
              confidence: 82,
              action: "Draft campaign",
            },
          ].map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <SpotlightCard>
                <div className="p-5 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-os-bg border border-os-border flex items-center justify-center">
                        {it.icon}
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${it.accent}`}>
                        {it.type}
                      </span>
                    </div>
                    <div className="text-[9px] font-mono text-os-text-dim">
                      {it.confidence}% conf
                    </div>
                  </div>
                  <h3 className="text-sm font-bold mb-2 leading-snug">{it.title}</h3>
                  <p className="text-xs text-os-text-dim leading-relaxed mb-4 flex-1">
                    {it.body}
                  </p>
                  <button
                    className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${it.accent}`}
                  >
                    {it.action} <ArrowRight size={11} />
                  </button>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PRIVACY + TRUST */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <MagicCard className="!rounded-3xl" gradientFrom="#5EEAD4" gradientTo="#A78BFA">
          <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
                <ShieldCheck size={10} className="text-emerald-400" /> Privacy
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-3 leading-tight">
                Your data, <AuroraText>your data.</AuroraText>
              </h2>
              <p className="text-os-text-dim text-sm leading-relaxed">
                Conversations never train shared models. Everything stays in Indian data centers.
                Delete it all with one click any time.
              </p>
            </div>
            <div className="space-y-3">
              {[
                {
                  k: "End-to-end encrypted",
                  v: "AES-256 at rest, TLS 1.3 in transit",
                },
                { k: "Indian data residency", v: "Mumbai region · DPDPA compliant" },
                {
                  k: "No model training on your data",
                  v: "Your conversations stay yours",
                },
                { k: "One-click data delete", v: "Full export · zero questions asked" },
              ].map((r) => (
                <div
                  key={r.k}
                  className="flex items-start gap-3 p-3 rounded-xl border border-os-border bg-os-bg/40"
                >
                  <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">{r.k}</div>
                    <div className="text-[10px] text-os-text-dim">{r.v}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MagicCard>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <div className="relative rounded-3xl overflow-hidden border border-os-border bg-os-card p-16 text-center">
          <Particles className="absolute inset-0" quantity={60} color="#5EEAD4" />
          <DotPattern className="opacity-30 [mask-image:radial-gradient(400px_circle_at_center,white,transparent)]" />
          <BorderBeam size={400} duration={12} colorFrom="#5EEAD4" colorTo="#A78BFA" />
          <BorderBeam size={400} duration={12} delay={6} colorFrom="#FB7185" colorTo="#FCD34D" />
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(255,255,255,0.15)]">
              <Zap size={32} className="text-black" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
              Start your <AuroraText>14-day free trial.</AuroraText>
            </h2>
            <p className="text-os-text-dim text-lg mb-8 max-w-xl mx-auto">
              Connect your first channel in minutes. KROVA delivers your first AI analysis
              tomorrow morning.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/signup">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="os-button os-button-primary px-8 py-3 font-bold gap-2"
                >
                  Get Started <ArrowRight size={16} />
                </motion.button>
              </Link>
              <Link href="/pricing">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="os-button os-button-secondary px-8 py-3 font-bold"
                >
                  See Pricing
                </motion.button>
              </Link>
            </div>
            <p className="text-[11px] text-os-text-dim mt-4">
              No credit card · Cancel any time · Setup in 5 minutes
            </p>
          </div>
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-os-border text-center relative z-10">
        <p className="text-[10px] font-mono text-os-text-dim uppercase tracking-[0.3em]">
          KROVA × AQIROX // INTELLIGENCE
        </p>
      </footer>

      {/* Fixed background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.06}
          duration={3}
          className="[mask-image:radial-gradient(700px_circle_at_center,white,transparent)]"
        />
        <Particles className="absolute inset-0" quantity={50} ease={80} color="#ffffff" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-teal-500/10 blur-[150px] rounded-full" />
      </div>
    </div>
  );
}
