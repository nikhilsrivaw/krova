"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
  Layout,
  CheckSquare,
  Users,
  BarChart2,
  Settings,
  ArrowRight,
  MessageSquare,
  Mail,
  Instagram,
  Globe,
  Zap,
  Brain,
  Sparkles,
  Search,
  Bell,
  User as UserIcon,
  Star,
  Smartphone,
  Command,
  X,
  TrendingUp,
  AlertTriangle,
  Sun,
  DollarSign,
  Clock,
} from "lucide-react";

import { Navbar } from "@/components/spectrum/navbar";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Meteors } from "@/components/magicui/meteors";
import { Particles } from "@/components/magicui/particles";
import { OrbitingCircles } from "@/components/magicui/orbiting-circles";
import { Ripple } from "@/components/magicui/ripple";
import { ShinyText } from "@/components/magicui/shiny-text";
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid";
import { AnimatedGridPattern } from "@/components/magicui/animated-grid-pattern";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { Marquee } from "@/components/magicui/marquee";
import { DotPattern } from "@/components/magicui/dot-pattern";

import { GlowCard } from "@/components/spectrum/glow-card";
import { InteractiveGrid } from "@/components/spectrum/interactive-grid";
import { SpotlightCard } from "@/components/spectrum/spotlight-card";

const FEATURES = [
  {
    icon: CheckSquare,
    title: "Action Queue",
    desc: "AI-drafted replies, ranked by urgency. Approve, edit, reject in seconds — never type from scratch again.",
    detail: [
      "HOT / WARM / COLD scoring on every conversation",
      "One-tap approve or reject from your phone",
      "Edit drafts before sending",
      "Approve-all batch for when you're in a hurry",
    ],
  },
  {
    icon: Users,
    title: "Relationship Intelligence",
    desc: "A clean, searchable people graph that builds itself. Every inbound creates or updates a contact automatically.",
    detail: [
      "Auto-builds from inbound conversations",
      "Full conversation timeline per person",
      "Filter by status, channel, or search by name",
      "Star your most important relationships",
    ],
  },
  {
    icon: BarChart2,
    title: "Analytics",
    desc: "Know exactly what's working. Message volume, AI draft acceptance, conversion rates, time saved — all in one view.",
    detail: [
      "7-day and 12-month trend charts",
      "Channel breakdown across WhatsApp, IG, Gmail",
      "Conversion rate per channel and per stage",
      "Hours saved by AI automation",
    ],
  },
  {
    icon: Settings,
    title: "Voice & Guardrails",
    desc: "Teach KROVA your tone once. It learns greeting style, Hinglish mix, products, and what to never say.",
    detail: [
      "Greeting style + reply tone (Formal / Friendly / Casual)",
      "Products & services catalogue the AI uses",
      "Guardrails: things the AI should never write",
      "Analysis schedule: nightly or real-time",
    ],
  },
];

const CHANNELS = [
  {
    name: "WhatsApp Business",
    icon: <MessageSquare size={20} className="text-green-400" />,
    glow: "from-green-400/30 via-emerald-400/20 to-teal-400/30",
    desc: "Capture every lead from WhatsApp chats, broadcasts, and groups.",
  },
  {
    name: "Instagram Direct",
    icon: <Instagram size={20} className="text-pink-400" />,
    glow: "from-pink-400/30 via-fuchsia-400/20 to-rose-400/30",
    desc: "Process DMs and story replies from Instagram Business accounts.",
  },
  {
    name: "Gmail",
    icon: <Mail size={20} className="text-red-400" />,
    glow: "from-red-400/30 via-orange-400/20 to-amber-400/30",
    desc: "Scan your business inbox and draft professional email replies.",
  },
  {
    name: "Outlook 365",
    icon: <Mail size={20} className="text-blue-400" />,
    glow: "from-blue-400/30 via-cyan-400/20 to-sky-400/30",
    desc: "Connect your Microsoft work email in one OAuth click.",
  },
];

export default function WorkspacePage() {
  return (
    <div className="bg-os-bg min-h-screen relative">
      <Navbar />

      {/* HERO */}
      <section className="relative z-10 pt-36 pb-24 px-6 max-w-6xl mx-auto">
        <Meteors number={10} />
        <div className="text-center mb-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border bg-os-card/80 backdrop-blur text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-8"
          >
            <Layout size={10} className="text-teal-400" />
            <ShinyText shimmerWidth={80} className="text-os-text-dim">
              Workspace
            </ShinyText>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.05]"
          >
            One workspace. <br />
            <AuroraText>Every channel.</AuroraText> <br />
            <span className="text-os-text-dim">Zero chaos.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-os-text-dim text-lg max-w-2xl mx-auto mb-10"
          >
            KROVA collapses your WhatsApp notifications, Instagram inbox, Gmail tab, and scattered
            spreadsheets into one OS-style command center built for Indian owners.
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
                Try it free <ArrowRight size={16} />
              </motion.button>
            </Link>
            <Link
              href="/pricing"
              className="text-[11px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors flex items-center gap-1"
            >
              See pricing <ArrowRight size={12} />
            </Link>
          </motion.div>

          {/* Stats ticker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {[
              { label: "Apps Replaced", value: 5, suffix: "" },
              { label: "Avg Setup", value: 5, suffix: "m" },
              { label: "Channels Supported", value: 4 },
              { label: "Hours Saved / Week", value: 18, suffix: "h" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold tracking-tight text-white">
                  <NumberTicker value={s.value} suffix={s.suffix} />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* OS WINDOW PREVIEW — visual proof */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Command size={10} className="text-violet-400" /> Live Preview
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            This is what <AuroraText>5 apps</AuroraText> become.
          </h2>
          <p className="text-os-text-dim max-w-lg mx-auto">
            One command center for actions, relationships, analytics, and AI voice.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="os-window max-w-5xl mx-auto relative"
        >
          <BorderBeam size={300} duration={14} colorFrom="#5EEAD4" colorTo="#A78BFA" />
          <BorderBeam size={300} duration={14} delay={7} colorFrom="#FB7185" colorTo="#FCD34D" />

          <div className="h-10 border-b border-os-border flex items-center justify-between px-4 bg-os-bg/50">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-os-border" />
                <div className="w-3 h-3 rounded-full bg-os-border" />
                <div className="w-3 h-3 rounded-full bg-os-border" />
              </div>
              <div className="h-4 w-[1px] bg-os-border mx-2" />
              <div className="text-[10px] font-mono text-os-text-dim uppercase tracking-widest">
                KROVA / Workspace
              </div>
            </div>
            <div className="flex items-center gap-4 text-os-text-dim">
              <Search size={14} />
              <Bell size={14} />
              <UserIcon size={14} />
            </div>
          </div>

          <div className="grid grid-cols-12 bg-os-bg/30 relative min-h-[400px]">
            <DotPattern className="opacity-20 [mask-image:radial-gradient(500px_circle_at_center,white,transparent)]" />

            {/* Sidebar */}
            <div className="col-span-3 border-r border-os-border p-4 space-y-1 relative">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-os-text-dim mb-3 px-2">
                Today
              </p>
              {[
                { icon: <Sun size={12} />, label: "Briefing", active: true },
                { icon: <CheckSquare size={12} />, label: "Actions", badge: "12" },
                { icon: <Clock size={12} />, label: "Commitments" },
              ].map((it) => (
                <div
                  key={it.label}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] ${it.active ? "bg-white/5 text-white border border-os-border-bright" : "text-os-text-dim"}`}
                >
                  <div className="flex items-center gap-2">
                    {it.icon}
                    <span>{it.label}</span>
                  </div>
                  {it.badge && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      {it.badge}
                    </span>
                  )}
                </div>
              ))}
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-os-text-dim mb-3 px-2 mt-5">
                Intelligence
              </p>
              {[
                { icon: <Brain size={12} />, label: "Intelligence" },
                { icon: <DollarSign size={12} />, label: "Revenue" },
                { icon: <BarChart2 size={12} />, label: "Analytics" },
              ].map((it) => (
                <div
                  key={it.label}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-os-text-dim"
                >
                  {it.icon}
                  <span>{it.label}</span>
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="col-span-9 p-6 space-y-4 relative">
              <div>
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-os-text-dim mb-1">
                  <Sun size={10} className="text-yellow-400" /> Today&apos;s Briefing
                </div>
                <div className="text-2xl font-bold mb-1">
                  <AuroraText>Good morning, Aditya.</AuroraText>
                </div>
                <p className="text-[11px] text-os-text-dim">
                  KROVA analyzed <span className="text-white font-bold">218</span> conversations
                  overnight · <span className="text-white font-bold">12</span> drafts ready ·{" "}
                  <span className="text-white font-bold">7</span> at risk
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3 mt-4">
                {[
                  { label: "Hot", value: 7, color: "text-rose-400" },
                  { label: "Warm", value: 14, color: "text-amber-400" },
                  { label: "Drafts", value: 12, color: "text-emerald-400" },
                  { label: "Reply", value: 94, suffix: "%", color: "text-violet-400" },
                ].map((s) => (
                  <div key={s.label} className="os-card p-3 border-os-border">
                    <div className={`text-2xl font-bold ${s.color}`}>
                      <NumberTicker value={s.value} suffix={s.suffix} />
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mt-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">
                  Awaiting your approval
                </p>
                {[
                  { name: "Priya D.", action: "Pricing reply ready", urgent: true },
                  { name: "Rahul M.", action: "Demo follow-up drafted", urgent: false },
                  { name: "Anjali S.", action: "Quote reminder", urgent: false },
                ].map((it) => (
                  <div
                    key={it.name}
                    className="flex items-center justify-between p-2 rounded-lg border border-os-border bg-os-bg/40 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${it.urgent ? "bg-rose-400 animate-pulse" : "bg-emerald-400"}`} />
                      <span className="font-bold">{it.name}</span>
                      <span className="text-os-text-dim">— {it.action}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest text-rose-400 hover:bg-rose-500/10">
                        Reject
                      </button>
                      <button className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10">
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* BEFORE / AFTER */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <TrendingUp size={10} className="text-emerald-400" /> Before · After
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            From <span className="text-rose-400">chaos</span> to{" "}
            <AuroraText>clarity.</AuroraText>
          </h2>
          <p className="text-os-text-dim max-w-lg mx-auto">
            What changes the moment KROVA enters your day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BEFORE */}
          <div className="relative rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-lg bg-rose-500/20 border-b border-l border-rose-500/30">
              <span className="text-[9px] font-bold uppercase tracking-widest text-rose-300">
                Before KROVA
              </span>
            </div>
            <div className="space-y-3 mt-4">
              {[
                "WhatsApp + IG + Gmail + 2 spreadsheets",
                "Forgot to reply to Rahul again",
                "5 unpaid quotes — no clue who",
                "Wrote the same reply 8 times",
                "Lost track of who's hot vs cold",
                "Spreadsheets out of date by Tuesday",
              ].map((line) => (
                <div key={line} className="flex items-center gap-2.5 text-sm text-os-text-dim">
                  <X size={14} className="text-rose-400 shrink-0" />
                  <span>{line}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-rose-500/20 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-rose-400">
              <AlertTriangle size={11} />
              <span>~3 hours/day lost to admin</span>
            </div>
          </div>

          {/* AFTER */}
          <GlowCard glowColor="from-emerald-400/40 via-teal-400/30 to-cyan-400/40">
            <div className="relative p-6 overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-lg bg-emerald-500/20 border-b border-l border-emerald-500/30">
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-300">
                  After KROVA
                </span>
              </div>
              <div className="space-y-3 mt-4">
                {[
                  "One workspace · all channels",
                  "8 AM briefing names everyone hot",
                  "Revenue Leaks lists unpaid quotes",
                  "AI drafts in your voice — you approve",
                  "Health score on every relationship",
                  "Real-time — nothing falls through cracks",
                ].map((line) => (
                  <div key={line} className="flex items-center gap-2.5 text-sm text-white">
                    <CheckSquare size={14} className="text-emerald-400 shrink-0" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-emerald-500/20 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                <Zap size={11} />
                <span>~18 hours/week back</span>
              </div>
            </div>
          </GlowCard>
        </div>
      </section>

      {/* CHANNELS — orbiting brain */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Globe size={10} /> 4 Channels
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Connect everything in <AuroraText>minutes.</AuroraText>
          </h2>
          <p className="text-os-text-dim max-w-lg mx-auto">
            One-click OAuth setup. No APIs to configure. No developer needed.
          </p>
        </div>

        {/* Orbit visual */}
        <div className="relative h-[400px] flex items-center justify-center mb-16">
          <Ripple mainCircleSize={160} numCircles={6} />
          <div className="absolute z-20 w-20 h-20 rounded-3xl bg-os-card border border-os-border flex items-center justify-center overflow-hidden">
            <BorderBeam size={60} duration={6} colorFrom="#5EEAD4" colorTo="#A78BFA" />
            <Layout size={30} className="text-white relative z-10" />
          </div>
          <OrbitingCircles radius={150} duration={22} iconSize={44}>
            <div className="w-11 h-11 rounded-2xl bg-os-card border border-os-border flex items-center justify-center">
              <MessageSquare size={18} className="text-green-400" />
            </div>
            <div className="w-11 h-11 rounded-2xl bg-os-card border border-os-border flex items-center justify-center">
              <Instagram size={18} className="text-pink-400" />
            </div>
            <div className="w-11 h-11 rounded-2xl bg-os-card border border-os-border flex items-center justify-center">
              <Mail size={18} className="text-red-400" />
            </div>
            <div className="w-11 h-11 rounded-2xl bg-os-card border border-os-border flex items-center justify-center">
              <Mail size={18} className="text-blue-400" />
            </div>
          </OrbitingCircles>
        </div>

        {/* Channel grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CHANNELS.map((ch, i) => (
            <motion.div
              key={ch.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <GlowCard glowColor={ch.glow}>
                <div className="p-5 h-full">
                  <div className="w-10 h-10 rounded-xl bg-os-bg border border-os-border flex items-center justify-center mb-4">
                    {ch.icon}
                  </div>
                  <h3 className="font-bold mb-2 text-sm">{ch.name}</h3>
                  <p className="text-xs text-os-text-dim leading-relaxed">{ch.desc}</p>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES — bento */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Sparkles size={10} className="text-violet-400" /> Workspace
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Four views. <AuroraText>One login.</AuroraText>
          </h2>
          <p className="text-os-text-dim max-w-xl mx-auto">
            Everything an owner needs — actions, relationships, analytics, voice — without
            jumping between five apps.
          </p>
        </div>

        <BentoGrid>
          <BentoCard
            name={FEATURES[0].title}
            className="col-span-3 lg:col-span-2"
            Icon={FEATURES[0].icon}
            description={FEATURES[0].desc}
            href="/dashboard/approvals"
            cta="See the queue"
            background={
              <div className="absolute inset-0">
                <InteractiveGrid glowColor="rgba(94, 234, 212, 0.18)" />
                <div className="absolute -right-12 -top-12 w-64 h-64 bg-teal-500/10 blur-3xl rounded-full" />
              </div>
            }
          />
          <BentoCard
            name={FEATURES[1].title}
            className="col-span-3 lg:col-span-1"
            Icon={FEATURES[1].icon}
            description={FEATURES[1].desc}
            href="/dashboard/customers"
            cta="See people"
            background={
              <div className="absolute inset-0">
                <AnimatedGridPattern numSquares={20} maxOpacity={0.15} duration={3} className="text-violet-400/30" />
              </div>
            }
          />
          <BentoCard
            name={FEATURES[2].title}
            className="col-span-3 lg:col-span-1"
            Icon={FEATURES[2].icon}
            description={FEATURES[2].desc}
            href="/dashboard/analytics"
            cta="See charts"
            background={
              <div className="absolute inset-0">
                <Meteors number={6} className="bg-amber-300" />
                <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full" />
              </div>
            }
          />
          <BentoCard
            name={FEATURES[3].title}
            className="col-span-3 lg:col-span-2"
            Icon={FEATURES[3].icon}
            description={FEATURES[3].desc}
            href="/dashboard/settings"
            cta="Configure"
            background={
              <div className="absolute inset-0">
                <InteractiveGrid glowColor="rgba(167, 139, 250, 0.18)" />
                <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-violet-500/10 blur-3xl rounded-full" />
              </div>
            }
          />
        </BentoGrid>

        {/* Detail list */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <SpotlightCard key={f.title}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-os-bg border border-os-border flex items-center justify-center">
                    <f.icon size={18} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold">{f.title}</h3>
                </div>
                <ul className="space-y-2">
                  {f.detail.map((d) => (
                    <li key={d} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                      <span className="text-xs text-os-text-dim">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* POWER USER — keyboard shortcuts */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-6">
              <Command size={10} className="text-violet-400" /> Power user
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
              Built for <br />
              <AuroraText>keyboard owners.</AuroraText>
            </h2>
            <p className="text-os-text-dim text-lg mb-6 leading-relaxed max-w-md">
              Every action has a shortcut. Approve, reject, search, jump — without your hands
              ever leaving the keyboard.
            </p>
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-os-border bg-os-card max-w-sm">
              <kbd className="px-2 py-1 text-[10px] font-mono bg-os-bg border border-os-border rounded">
                ⌘
              </kbd>
              <kbd className="px-2 py-1 text-[10px] font-mono bg-os-bg border border-os-border rounded">
                K
              </kbd>
              <span className="text-xs text-os-text-dim ml-2">
                opens the command palette from anywhere
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { keys: ["A"], label: "Approve current action" },
              { keys: ["R"], label: "Reject current action" },
              { keys: ["E"], label: "Edit draft before sending" },
              { keys: ["J"], label: "Jump to next item" },
              { keys: ["⌘", "K"], label: "Open command palette" },
              { keys: ["⌘", "/"], label: "Show all shortcuts" },
              { keys: ["G", "B"], label: "Go to briefing" },
              { keys: ["G", "A"], label: "Go to actions" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between p-3 rounded-xl border border-os-border bg-os-card/40 hover:border-os-border-bright transition-colors"
              >
                <span className="text-sm text-os-text-dim">{s.label}</span>
                <div className="flex gap-1">
                  {s.keys.map((k) => (
                    <kbd
                      key={k}
                      className="min-w-[24px] px-1.5 py-0.5 text-center text-[10px] font-mono bg-os-bg border border-os-border rounded text-white"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* MOBILE PARITY */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <div className="relative max-w-[260px] mx-auto">
              <div className="absolute -inset-8 bg-teal-500/10 blur-3xl rounded-full -z-10" />
              <div className="relative rounded-[2.5rem] border-8 border-os-card bg-os-bg shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-os-card rounded-b-2xl z-20" />
                <div className="pt-10 px-3 pb-4 space-y-3 bg-os-bg min-h-[400px]">
                  <div className="text-center mb-3">
                    <div className="text-[8px] font-bold uppercase tracking-widest text-os-text-dim">
                      KROVA
                    </div>
                    <div className="text-sm font-bold">Today&apos;s Briefing</div>
                  </div>
                  {[
                    { name: "Priya D.", status: "hot", action: "Approve" },
                    { name: "Rahul M.", status: "warm", action: "Approve" },
                    { name: "Anjali", status: "cold", action: "Review" },
                  ].map((c, i) => (
                    <motion.div
                      key={c.name}
                      initial={{ opacity: 0, y: 6 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="rounded-xl border border-os-border bg-os-card/60 p-2.5"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold">{c.name}</span>
                        <span
                          className={`text-[8px] font-bold uppercase tracking-widest ${
                            c.status === "hot"
                              ? "text-rose-400"
                              : c.status === "warm"
                                ? "text-amber-400"
                                : "text-cyan-400"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        <button className="rounded text-[8px] font-bold py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Reject
                        </button>
                        <button className="rounded text-[8px] font-bold py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {c.action}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-6">
              <Smartphone size={10} className="text-cyan-400" /> Mobile
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
              Approve from <br />
              <AuroraText>anywhere.</AuroraText>
            </h2>
            <p className="text-os-text-dim text-lg mb-6 leading-relaxed max-w-md">
              Full workspace parity on iOS and Android. The 8 AM briefing comes in via WhatsApp,
              the actions sit in your pocket.
            </p>
            <ul className="space-y-3">
              {[
                "One-tap approve / reject from the lock screen",
                "Push alerts for hot leads — never miss a buyer",
                "Voice-note transcription for Hindi & Hinglish",
                "Works offline · syncs when you reconnect",
              ].map((it) => (
                <li key={it} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <CheckSquare size={11} className="text-cyan-400" />
                  </div>
                  <span className="text-white/90">{it}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS MARQUEE */}
      <section className="relative z-10 py-24 border-y border-os-border bg-os-card/30 overflow-hidden">
        <div className="text-center mb-12 px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Star size={10} className="text-yellow-400" /> Loved by owners
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            <AuroraText>Real owners.</AuroraText> Real time saved.
          </h2>
        </div>

        <div className="relative">
          <Marquee duration="50s" className="[--gap:1.5rem]">
            {[
              {
                name: "Anuj S.",
                role: "Coaching · Lucknow",
                body: "I closed 3 admissions in week one — parents I had completely lost in WhatsApp.",
              },
              {
                name: "Dr. Meera",
                role: "Clinic · Pune",
                body: "Missed 4-5 follow-ups daily before. Zero now. The morning briefing is everything.",
              },
              {
                name: "Riya K.",
                role: "Salon · Bangalore",
                body: "12% more repeat bookings in 30 days just from birthday wishes. Wild.",
              },
              {
                name: "Karan T.",
                role: "Agency · Mumbai",
                body: "Ghost Writer drafts in my exact tone. 90 minutes back every day.",
              },
            ].map((t) => (
              <figure
                key={t.name}
                className="w-80 shrink-0 rounded-2xl border border-os-border bg-os-card p-5"
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={11} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-sm leading-relaxed mb-4">{t.body}</blockquote>
                <figcaption className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400/40 to-violet-400/40 flex items-center justify-center text-xs font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{t.name}</div>
                    <div className="text-[10px] text-os-text-dim">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </Marquee>
          <Marquee reverse duration="50s" className="[--gap:1.5rem] mt-6">
            {[
              {
                name: "Sneha R.",
                role: "Boutique · Jaipur",
                body: "Recovered ₹38k of unpaid quotes in the first week. Leak detector pays for itself.",
              },
              {
                name: "Vikram J.",
                role: "Tutor · Delhi",
                body: "Finally I sleep at night. AI tells me what to focus on in the morning.",
              },
              {
                name: "Pooja M.",
                role: "Yoga · Goa",
                body: "Hinglish drafts are perfect. Feels like a junior who knows my business.",
              },
              {
                name: "Aman D.",
                role: "Studio · Kolkata",
                body: "I cancelled three other tools. KROVA replaces them all for less.",
              },
            ].map((t) => (
              <figure
                key={t.name}
                className="w-80 shrink-0 rounded-2xl border border-os-border bg-os-card p-5"
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={11} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-sm leading-relaxed mb-4">{t.body}</blockquote>
                <figcaption className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400/40 to-orange-400/40 flex items-center justify-center text-xs font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{t.name}</div>
                    <div className="text-[10px] text-os-text-dim">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </Marquee>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-os-bg to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-os-bg to-transparent" />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-24 relative z-10">
        <div className="relative rounded-3xl overflow-hidden border border-os-border bg-os-card p-16 text-center">
          <Particles className="absolute inset-0" quantity={60} color="#5EEAD4" />
          <BorderBeam size={400} duration={12} colorFrom="#5EEAD4" colorTo="#A78BFA" />
          <BorderBeam size={400} duration={12} delay={6} colorFrom="#FB7185" colorTo="#FCD34D" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Ready to <AuroraText>see it in action?</AuroraText>
            </h2>
            <p className="text-os-text-dim text-lg mb-8 max-w-xl mx-auto">
              Set up in 5 minutes. No credit card required.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/signup">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="os-button os-button-primary px-8 py-3 font-bold gap-2"
                >
                  Start Free Trial <ArrowRight size={16} />
                </motion.button>
              </Link>
              <Link href="/pricing">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="os-button os-button-secondary px-8 py-3 font-bold"
                >
                  View Pricing
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-os-border text-center relative z-10">
        <p className="text-[10px] font-mono text-os-text-dim uppercase tracking-[0.3em]">
          KROVA × AQIROX // WORKSPACE
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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
