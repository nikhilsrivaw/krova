"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
  Zap,
  Globe,
  Clock,
  Layout,
  Command,
  Search,
  Bell,
  User,
  Plus,
  MessageSquare,
  ArrowRight,
  Check,
  Brain,
  Sun,
  TrendingUp,
  Users,
  Mail,
  Instagram,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Eye,
  GraduationCap,
  HeartPulse,
  Scissors,
  Briefcase,
  Star,
  Twitter,
  Linkedin,
  Github,
  ShieldCheck,
} from "lucide-react";

import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { Marquee } from "@/components/magicui/marquee";
import { OrbitingCircles } from "@/components/magicui/orbiting-circles";
import { AnimatedList } from "@/components/magicui/animated-list";
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid";
import { Particles } from "@/components/magicui/particles";
import { AnimatedGridPattern } from "@/components/magicui/animated-grid-pattern";
import { Meteors } from "@/components/magicui/meteors";
import { ShinyText } from "@/components/magicui/shiny-text";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { MagicCard } from "@/components/magicui/magic-card";
import { WordRotate } from "@/components/magicui/word-rotate";
import { Ripple } from "@/components/magicui/ripple";

import { SpotlightCard } from "@/components/spectrum/spotlight-card";
import { GlowCard } from "@/components/spectrum/glow-card";
import { InteractiveGrid } from "@/components/spectrum/interactive-grid";
import { FaqAccordion } from "@/components/spectrum/faq-accordion";
import { HowItWorks } from "@/components/spectrum/how-it-works";
import { PhoneBriefing } from "@/components/spectrum/phone-briefing";
import { Navbar } from "@/components/spectrum/navbar";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

const PLANS = [
  {
    name: "Starter",
    price: "₹999",
    period: "/month",
    desc: "For solo operators and small shops.",
    highlight: false,
    features: [
      "1 channel (WhatsApp or Instagram)",
      "Up to 500 messages/month",
      "Nightly AI analysis",
      "Morning briefing on WhatsApp",
      "5 AI-drafted replies/day",
    ],
    cta: "Get Started",
    href: "/signup",
  },
  {
    name: "Growth",
    price: "₹1,999",
    period: "/month",
    desc: "For growing businesses managing multiple channels.",
    highlight: true,
    badge: "Most Popular",
    features: [
      "All 4 channels (WhatsApp, IG, Gmail, Outlook)",
      "Up to 5,000 messages/month",
      "Nightly AI analysis",
      "Morning briefing + hot lead alerts",
      "Unlimited AI-drafted replies",
      "Customer intelligence dashboard",
    ],
    cta: "Start Free Trial",
    href: "/signup",
  },
  {
    name: "Pro",
    price: "₹4,999",
    period: "/month",
    desc: "For teams that need real-time intelligence.",
    highlight: false,
    features: [
      "Everything in Growth",
      "Real-time AI analysis",
      "Team workspace (up to 5 seats)",
      "Custom AI guardrails & tone",
      "API access",
      "Priority support",
    ],
    cta: "Contact Sales",
    href: "/signup",
  },
];

const NOTIFICATIONS = [
  {
    name: "Priya D. is going cold",
    description: "No reply in 4 days · was hot lead",
    icon: <AlertTriangle size={14} className="text-amber-400" />,
    color: "border-amber-500/30 bg-amber-500/5",
  },
  {
    name: "Rahul ready to convert",
    description: "Asked for pricing twice · draft ready",
    icon: <Sparkles size={14} className="text-emerald-400" />,
    color: "border-emerald-500/30 bg-emerald-500/5",
  },
  {
    name: "Reply drafted for Anjali",
    description: "Matches your tone · awaiting approval",
    icon: <CheckCircle2 size={14} className="text-sky-400" />,
    color: "border-sky-500/30 bg-sky-500/5",
  },
  {
    name: "Revenue leak: 3 unpaid quotes",
    description: "Total ₹47,000 stuck · 12+ days old",
    icon: <DollarSign size={14} className="text-rose-400" />,
    color: "border-rose-500/30 bg-rose-500/5",
  },
];

const VERTICALS = [
  {
    icon: <GraduationCap size={20} className="text-amber-400" />,
    name: "Coaching Institutes",
    pain: "Admission inquiries get lost across DMs and WhatsApp.",
    win: "KROVA tracks every parent inquiry, follows up on unpaid fees, books demo calls.",
    glow: "from-amber-400/30 via-orange-400/20 to-rose-400/30",
  },
  {
    icon: <HeartPulse size={20} className="text-rose-400" />,
    name: "Clinics & Doctors",
    pain: "Appointment requests pile up, follow-ups slip.",
    win: "KROVA confirms slots, sends prescription reminders, flags no-show risks early.",
    glow: "from-rose-400/30 via-pink-400/20 to-violet-400/30",
  },
  {
    icon: <Scissors size={20} className="text-teal-400" />,
    name: "Salons & Spas",
    pain: "Booking requests in 5 different inboxes, regulars forgotten.",
    win: "KROVA confirms bookings, wishes birthdays, brings dormant customers back.",
    glow: "from-teal-400/30 via-cyan-400/20 to-sky-400/30",
  },
  {
    icon: <Briefcase size={20} className="text-violet-400" />,
    name: "Agencies & Studios",
    pain: "Client commitments drift, quotes go unanswered.",
    win: "KROVA tracks deliverables, flags scope creep, drafts proposal replies in your tone.",
    glow: "from-violet-400/30 via-fuchsia-400/20 to-pink-400/30",
  },
];

const TESTIMONIALS_TOP = [
  { name: "Anuj S.", role: "Coaching · Lucknow", body: "Three admissions in week one — KROVA caught parents I'd lost in WhatsApp." },
  { name: "Dr. Meera", role: "Clinic · Pune", body: "I used to miss 4-5 follow-ups daily. Now zero. The 8am briefing is everything." },
  { name: "Riya K.", role: "Salon · Bangalore", body: "Birthday wishes alone added 12% repeat bookings in 30 days. Wild." },
  { name: "Karan T.", role: "Agency · Mumbai", body: "The Ghost Writer drafts in my exact tone. Saves me 90 minutes a day." },
];
const TESTIMONIALS_BOTTOM = [
  { name: "Sneha R.", role: "Boutique · Jaipur", body: "Recovered ₹38k of unpaid quotes in the first week. The leak detector pays for itself." },
  { name: "Vikram J.", role: "Tutor · Delhi", body: "Finally I sleep at night. The AI tells me what to focus on in the morning." },
  { name: "Pooja M.", role: "Yoga Studio · Goa", body: "Hinglish drafts are perfect. Feels like a junior who knows the business." },
  { name: "Aman D.", role: "Photo Studio · Kolkata", body: "I cancelled three other tools. KROVA replaces them all and costs less." },
];

const FAQ_ITEMS = [
  {
    q: "Is KROVA a CRM?",
    a: "No. CRMs are databases you have to feed. KROVA is your AI business analyst — it reads your conversations on its own, tells you what's at risk, and drafts the next move. You approve. It executes.",
  },
  {
    q: "Will the AI sound like me?",
    a: "Yes. KROVA learns your tone, your typical phrases, your Hinglish mix — from the first 50 messages you send. Every draft you approve makes it better.",
  },
  {
    q: "What channels work today?",
    a: "WhatsApp Business, Instagram DMs, Gmail, and Outlook. All four feed into one AI brain — no jumping between inboxes.",
  },
  {
    q: "How secure is my customer data?",
    a: "End-to-end encryption in transit and at rest. Data stays inside Indian regions. We never train shared models on your conversations.",
  },
  {
    q: "Do I need a developer to set it up?",
    a: "No. Connect WhatsApp in under 60 seconds with a QR scan. Email channels are one-click OAuth. You'll get your first briefing tomorrow at 8 AM.",
  },
  {
    q: "What's the trial like?",
    a: "14 days, full access to the Growth plan, no credit card. Cancel anytime — you keep your data export.",
  },
];

function NotificationItem({ item }: { item: typeof NOTIFICATIONS[number] }) {
  return (
    <figure
      className={`relative mx-auto min-h-fit w-full max-w-[380px] cursor-pointer overflow-hidden rounded-2xl p-4 border ${item.color} backdrop-blur-md`}
    >
      <div className="flex flex-row items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-os-bg border border-os-border shrink-0">
          {item.icon}
        </div>
        <div className="flex flex-col overflow-hidden">
          <figcaption className="flex flex-row items-center text-sm font-bold text-white">
            <span>{item.name}</span>
          </figcaption>
          <p className="text-[11px] text-os-text-dim">{item.description}</p>
        </div>
      </div>
    </figure>
  );
}

function TestimonialCard({ t }: { t: { name: string; role: string; body: string } }) {
  return (
    <figure className="relative w-80 shrink-0 rounded-2xl border border-os-border bg-os-card p-5">
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
  );
}

export default function Hero() {
  return (
    <div className="bg-os-bg min-h-screen relative">
      {/* Navbar — fixed, must be FIRST so HMR doesn't displace it */}
      <Navbar />

      {/* Hero */}
      <section id="hero" className="relative z-10 pt-36 pb-20 px-6 max-w-7xl mx-auto">
        <Meteors number={14} />
        <div className="text-center mb-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border bg-os-card/80 backdrop-blur text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-8"
          >
            <Brain size={10} className="text-teal-400" />
            <ShinyText shimmerWidth={80} className="text-os-text-dim">
              AI Business Analyst for Indian SMBs
            </ShinyText>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.05]"
          >
            <span className="text-os-text-dim">It</span>{" "}
            <WordRotate
              words={["reads", "thinks", "predicts", "drafts", "decides"]}
              className="text-white"
            />
            . <br />
            <AuroraText>You sleep peacefully.</AuroraText>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-os-text-dim max-w-2xl mx-auto mb-10"
          >
            KROVA reads every conversation across WhatsApp, Instagram, and email — then tells you
            who's hot, who's cold, what's slipping, and exactly what to say. While you sleep.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/signup">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <span className="os-button os-button-primary px-8 py-3 text-base relative overflow-hidden group flex items-center gap-2">
                  Start Free Trial <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.div>
            </Link>
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.05)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => scrollTo("brain")}
              className="os-button os-button-secondary px-8 py-3 text-base group flex items-center gap-2"
            >
              <Zap size={16} className="text-yellow-500 group-hover:animate-pulse" />
              See how it thinks
            </motion.button>
          </motion.div>

          {/* Live stat ticker row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {[
              { label: "Messages Analyzed", value: 1284932, prefix: "" },
              { label: "Hot Leads Surfaced", value: 4720, prefix: "" },
              { label: "Revenue Recovered", value: 47, prefix: "₹", suffix: "L" },
              { label: "Hours Saved / Owner", value: 18, suffix: "h" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold tracking-tight text-white">
                  <NumberTicker value={s.value} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* OS Window Mockup with Border Beam */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="os-window max-w-5xl mx-auto relative group z-10"
        >
          <BorderBeam size={300} duration={14} delay={0} colorFrom="#5EEAD4" colorTo="#A78BFA" />
          <BorderBeam size={300} duration={14} delay={7} colorFrom="#FB7185" colorTo="#FCD34D" />

          <div className="h-10 border-b border-os-border flex items-center justify-between px-4 bg-os-bg/50">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-os-border" />
                <div className="w-3 h-3 rounded-full bg-os-border" />
                <div className="w-3 h-3 rounded-full bg-os-border" />
              </div>
              <div className="h-4 w-[1px] bg-os-border mx-2" />
              <div className="text-[10px] font-mono text-os-text-dim uppercase tracking-widest">KROVA / Today's Briefing</div>
            </div>
            <div className="flex items-center gap-4 text-os-text-dim">
              <Search size={14} />
              <Bell size={14} />
              <User size={14} />
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-os-bg/30 relative">
            <DotPattern className="[mask-image:radial-gradient(400px_circle_at_center,white,transparent)] opacity-30" />

            {/* Left: live notifications */}
            <div className="lg:col-span-5 space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim flex items-center gap-2">
                  <Sun size={12} className="text-yellow-400" /> What KROVA found
                </h3>
                <span className="os-badge text-emerald-400">LIVE</span>
              </div>
              <AnimatedList delay={1800} className="h-[360px]">
                {NOTIFICATIONS.map((item) => (
                  <NotificationItem key={item.name} item={item} />
                ))}
              </AnimatedList>
            </div>

            {/* Right: AI brain widgets */}
            <div className="lg:col-span-7 space-y-4 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                <SpotlightCard spotlightColor="rgba(94, 234, 212, 0.2)">
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-os-text-dim mb-3">
                      <TrendingUp size={14} className="text-teal-400" />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Reply Rate</span>
                    </div>
                    <div className="text-3xl font-bold">
                      <NumberTicker value={94} suffix="%" />
                    </div>
                    <div className="text-[10px] text-os-text-dim mt-1">+12% vs last week</div>
                  </div>
                </SpotlightCard>

                <SpotlightCard spotlightColor="rgba(251, 113, 133, 0.2)">
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-os-text-dim mb-3">
                      <AlertTriangle size={14} className="text-rose-400" />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Going Cold</span>
                    </div>
                    <div className="text-3xl font-bold">
                      <NumberTicker value={7} />
                    </div>
                    <div className="text-[10px] text-os-text-dim mt-1">act in next 24h</div>
                  </div>
                </SpotlightCard>
              </div>

              <GlowCard glowColor="from-teal-400/30 via-violet-400/20 to-pink-400/30">
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-violet-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">AI-Drafted Reply</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-sm leading-relaxed">
                    "Hey Priya! Following up on our Elite plan — happy to lock in the ₹2,499/mo
                    rate today. Sharing the payment link below 🙌"
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-os-border">
                    <span className="text-[10px] text-os-text-dim font-mono">For: Priya D. · WhatsApp</span>
                    <div className="flex gap-2">
                      <button className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white">Edit</button>
                      <button className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Approve</button>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </div>
          </div>
        </motion.div>
      </section>

      {/* HOW IT WORKS — animated beam diagram */}
      <section className="max-w-6xl mx-auto px-6 py-32 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Zap size={10} className="text-yellow-400" /> How it works
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Channels in. <AuroraText>Decisions out.</AuroraText>
          </h2>
          <p className="text-os-text-dim max-w-xl mx-auto text-lg">
            Every message flows into one brain. Briefings, drafts, and risk alerts
            flow back to you — at 8 AM, on the channels you already use.
          </p>
        </div>
        <HowItWorks />
      </section>

      {/* Brain section — orbiting channels feed AI core */}
      <section id="brain" className="max-w-7xl mx-auto px-6 py-32 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Brain size={10} className="text-teal-400" /> The Brain
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            One AI core. <AuroraText>Every channel.</AuroraText>
          </h2>
          <p className="text-os-text-dim max-w-xl mx-auto text-lg">
            WhatsApp, Instagram, Gmail, Outlook — every message flows into one brain
            that learns your business and your voice.
          </p>
        </div>

        <div className="relative h-[500px] flex items-center justify-center">
          <Ripple mainCircleSize={180} numCircles={7} />
          {/* Center brain */}
          <div className="absolute z-20 flex items-center justify-center">
            <div className="relative w-24 h-24 rounded-3xl bg-os-card border border-os-border flex items-center justify-center overflow-hidden">
              <BorderBeam size={80} duration={6} colorFrom="#5EEAD4" colorTo="#A78BFA" />
              <Brain size={36} className="text-white relative z-10" />
            </div>
          </div>

          {/* Inner orbit */}
          <OrbitingCircles radius={130} duration={20} iconSize={42}>
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

          {/* Outer orbit — reversed */}
          <OrbitingCircles radius={220} duration={30} reverse iconSize={36}>
            <div className="w-9 h-9 rounded-xl bg-os-card border border-os-border flex items-center justify-center">
              <Users size={14} className="text-violet-400" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-os-card border border-os-border flex items-center justify-center">
              <DollarSign size={14} className="text-emerald-400" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-os-card border border-os-border flex items-center justify-center">
              <Eye size={14} className="text-cyan-400" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-os-card border border-os-border flex items-center justify-center">
              <Sparkles size={14} className="text-yellow-400" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-os-card border border-os-border flex items-center justify-center">
              <Clock size={14} className="text-orange-400" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-os-card border border-os-border flex items-center justify-center">
              <TrendingUp size={14} className="text-teal-400" />
            </div>
          </OrbitingCircles>
        </div>
      </section>

      {/* PHONE MOCKUP SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-32 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-6">
              <Sun size={10} className="text-yellow-400" /> 8 AM IST · Daily
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-[1.1]">
              Wake up to a <br />
              <AuroraText>full intelligence brief</AuroraText> <br />
              on WhatsApp.
            </h2>
            <p className="text-os-text-dim text-lg mb-8 max-w-md leading-relaxed">
              Skip the dashboards. Your AI analyst messages you every morning with
              what changed overnight, who needs you today, and exactly what to say.
            </p>
            <ul className="space-y-3">
              {[
                "Hot leads ranked by readiness",
                "Customers going cold — act in 24h",
                "Revenue leaks (unpaid quotes, lost replies)",
                "Drafts ready for your approval",
              ].map((it) => (
                <li key={it} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <Check size={11} className="text-emerald-400" />
                  </div>
                  <span className="text-white/90">{it}</span>
                </li>
              ))}
            </ul>
          </div>
          <PhoneBriefing />
        </div>
      </section>

      {/* Bento Grid — the intelligence layer */}
      <section id="intelligence" className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Zap size={10} /> Intelligence Layer
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            AI that works while you sleep.
          </h2>
          <p className="text-os-text-dim max-w-xl mx-auto text-lg">
            Every night, KROVA scans every conversation, scores every lead, and drafts the perfect
            reply. Morning briefing on WhatsApp — ready before your first chai.
          </p>
        </div>

        <BentoGrid>
          <BentoCard
            name="Morning Briefing"
            className="col-span-3 lg:col-span-2"
            Icon={Sun}
            description="By 8 AM, KROVA delivers a WhatsApp briefing — who's hot, who's slipping, what to say first."
            href="/intelligence"
            cta="See a sample"
            background={
              <div className="absolute inset-0">
                <InteractiveGrid glowColor="rgba(252, 211, 77, 0.18)" />
                <div className="absolute -right-12 -top-12 w-64 h-64 bg-yellow-500/10 blur-3xl rounded-full" />
              </div>
            }
          />
          <BentoCard
            name="Revenue Leak Detector"
            className="col-span-3 lg:col-span-1"
            Icon={DollarSign}
            description="Unpaid quotes, unanswered hot leads — KROVA catches the money slipping through cracks."
            href="/intelligence"
            cta="Learn more"
            background={
              <div className="absolute inset-0">
                <Meteors number={8} className="bg-rose-300" />
                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-rose-500/10 blur-3xl rounded-full" />
              </div>
            }
          />
          <BentoCard
            name="Ghost Writer"
            className="col-span-3 lg:col-span-1"
            Icon={Sparkles}
            description="Drafts replies that sound like you — Hinglish, your tone, your style. You only approve."
            href="/intelligence"
            cta="See it write"
            background={
              <div className="absolute inset-0 opacity-50">
                <AnimatedGridPattern numSquares={20} maxOpacity={0.15} duration={3} className="text-violet-400/30" />
              </div>
            }
          />
          <BentoCard
            name="Customer Intelligence"
            className="col-span-3 lg:col-span-2"
            Icon={Brain}
            description="Every customer gets a health score, churn risk, energy trajectory. Spot trouble before it happens."
            href="/intelligence"
            cta="See dashboard"
            background={
              <div className="absolute inset-0">
                <InteractiveGrid glowColor="rgba(94, 234, 212, 0.18)" />
                <div className="absolute -left-12 -top-12 w-72 h-72 bg-teal-500/10 blur-3xl rounded-full" />
              </div>
            }
          />
        </BentoGrid>
      </section>

      {/* VERTICALS — who KROVA is for */}
      <section className="max-w-7xl mx-auto px-6 py-32 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Users size={10} /> Built for Indian SMBs
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Made for the way <AuroraText>you actually run business.</AuroraText>
          </h2>
          <p className="text-os-text-dim max-w-xl mx-auto text-lg">
            Hinglish replies. WhatsApp-first. Built for coaching institutes, clinics, salons, and agencies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {VERTICALS.map((v, i) => (
            <motion.div
              key={v.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <GlowCard glowColor={v.glow}>
                <div className="p-7 h-full">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl bg-os-bg border border-os-border flex items-center justify-center">
                      {v.icon}
                    </div>
                    <h3 className="text-xl font-bold">{v.name}</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-rose-400 mb-1">
                        The pain
                      </div>
                      <p className="text-sm text-os-text-dim">{v.pain}</p>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 mb-1">
                        What KROVA does
                      </div>
                      <p className="text-sm text-white/90">{v.win}</p>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS — dual marquee */}
      <section className="py-32 relative overflow-hidden border-y border-os-border">
        <div className="text-center mb-16 px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Star size={10} className="text-yellow-400" /> Loved by owners
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <AuroraText>Real businesses.</AuroraText> Real results.
          </h2>
        </div>

        <div className="relative">
          <Marquee duration="50s" className="[--gap:1.5rem]">
            {TESTIMONIALS_TOP.map((t) => (
              <TestimonialCard key={t.name} t={t} />
            ))}
          </Marquee>
          <Marquee reverse duration="50s" className="[--gap:1.5rem] mt-6">
            {TESTIMONIALS_BOTTOM.map((t) => (
              <TestimonialCard key={t.name} t={t} />
            ))}
          </Marquee>
          {/* Edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-os-bg to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-os-bg to-transparent" />
        </div>
      </section>

      {/* Marquee — works with everything */}
      <section className="py-20 border-b border-os-border bg-os-card/30 overflow-hidden">
        <div className="text-center mb-10">
          <div className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
            Plugs into the tools you already use
          </div>
        </div>
        <Marquee duration="40s" className="[--gap:3rem] py-2">
          {[
            { icon: <MessageSquare size={20} className="text-green-400" />, name: "WhatsApp Business" },
            { icon: <Instagram size={20} className="text-pink-400" />, name: "Instagram" },
            { icon: <Mail size={20} className="text-red-400" />, name: "Gmail" },
            { icon: <Mail size={20} className="text-blue-400" />, name: "Outlook" },
            { icon: <DollarSign size={20} className="text-emerald-400" />, name: "Razorpay" },
            { icon: <Users size={20} className="text-violet-400" />, name: "Team Inbox" },
            { icon: <Clock size={20} className="text-orange-400" />, name: "Calendar" },
          ].map((it) => (
            <div
              key={it.name}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl border border-os-border bg-os-bg shrink-0"
            >
              {it.icon}
              <span className="text-sm font-bold text-white whitespace-nowrap">{it.name}</span>
            </div>
          ))}
        </Marquee>
      </section>

      {/* Pricing with Magic Cards */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-32 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Command size={10} /> Pricing
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Simple, transparent pricing.
          </h2>
          <p className="text-os-text-dim max-w-lg mx-auto">
            14-day free trial. No credit card required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative"
            >
              {plan.highlight ? (
                <GlowCard className="h-full" glowColor="from-teal-400/40 via-violet-400/30 to-pink-400/40">
                  <div className="h-9 border-b border-white/10 bg-white/5 flex items-center px-4">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                      <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
                      <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
                    </div>
                    <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">
                      {plan.name}
                      {plan.badge && <span className="ml-2 text-emerald-400">· {plan.badge}</span>}
                    </span>
                  </div>
                  <div className="p-6 flex flex-col">
                    <div className="mb-6">
                      <div className="flex items-end gap-1 mb-1">
                        <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                        <span className="text-os-text-dim text-sm mb-1">{plan.period}</span>
                      </div>
                      <p className="text-xs text-os-text-dim">{plan.desc}</p>
                    </div>
                    <ul className="space-y-3 flex-1 mb-6">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <Check size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                          <span className="text-xs text-os-text-dim">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={plan.href}>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-white/90 transition-all"
                      >
                        {plan.cta}
                      </motion.button>
                    </Link>
                  </div>
                </GlowCard>
              ) : (
                <MagicCard className="h-full" gradientFrom="#5EEAD4" gradientTo="#A78BFA">
                  <div className="h-9 border-b border-os-border bg-os-bg/50 flex items-center px-4">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
                      <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
                      <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
                    </div>
                    <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">
                      {plan.name}
                    </span>
                  </div>
                  <div className="p-6 flex flex-col">
                    <div className="mb-6">
                      <div className="flex items-end gap-1 mb-1">
                        <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                        <span className="text-os-text-dim text-sm mb-1">{plan.period}</span>
                      </div>
                      <p className="text-xs text-os-text-dim">{plan.desc}</p>
                    </div>
                    <ul className="space-y-3 flex-1 mb-6">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <Check size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                          <span className="text-xs text-os-text-dim">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={plan.href}>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-os-card border border-os-border text-white hover:bg-os-border transition-all"
                      >
                        {plan.cta}
                      </motion.button>
                    </Link>
                  </div>
                </MagicCard>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-32">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <ShieldCheck size={10} /> FAQ
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Common questions, <AuroraText>direct answers.</AuroraText>
          </h2>
        </div>
        <FaqAccordion items={FAQ_ITEMS} />
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-6 py-32">
        <div className="relative rounded-3xl overflow-hidden border border-os-border bg-os-card p-16 text-center">
          <Particles className="absolute inset-0" quantity={60} color="#5EEAD4" />
          <BorderBeam size={400} duration={12} colorFrom="#5EEAD4" colorTo="#A78BFA" />
          <BorderBeam size={400} duration={12} delay={6} colorFrom="#FB7185" colorTo="#FCD34D" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              Your <AuroraText>AI analyst</AuroraText> is ready.
            </h2>
            <p className="text-os-text-dim text-lg mb-8 max-w-xl mx-auto">
              Connect WhatsApp in 60 seconds. Wake up tomorrow to your first briefing.
            </p>
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="os-button os-button-primary px-10 py-4 text-base inline-flex items-center gap-2"
              >
                Start Free Trial <ArrowRight size={18} />
              </motion.button>
            </Link>
          </div>
        </div>
      </section>

      {/* Dock */}
      <div className="os-dock">
        <Link href="/" title="Home">
          <motion.div whileHover={{ scale: 1.2, y: -4 }} whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shadow-lg cursor-pointer">
            <Command size={20} />
          </motion.div>
        </Link>
        <div className="h-6 w-[1px] bg-os-border mx-1" />
        <Link href="/workspace" title="Workspace">
          <motion.div whileHover={{ scale: 1.2, y: -4 }} whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-xl hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer">
            <Layout size={20} />
          </motion.div>
        </Link>
        <Link href="/intelligence" title="Intelligence">
          <motion.div whileHover={{ scale: 1.2, y: -4 }} whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-xl hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer">
            <Brain size={20} />
          </motion.div>
        </Link>
        <Link href="/pricing" title="Pricing">
          <motion.div whileHover={{ scale: 1.2, y: -4 }} whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-xl hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer">
            <Search size={20} />
          </motion.div>
        </Link>
        <div className="h-6 w-[1px] bg-os-border mx-1" />
        <Link href="/signup" title="Start Free Trial">
          <motion.div whileHover={{ scale: 1.2, y: -4 }} whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center cursor-pointer hover:bg-white hover:text-black transition-all">
            <Plus size={20} />
          </motion.div>
        </Link>
      </div>

      {/* ===========================
          FOOTER — KROVA × AQIROX
          =========================== */}
      <footer className="relative border-t border-os-border bg-os-card/30 mt-20">
        <DotPattern className="opacity-30 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-10">
          {/* Top — brand + columns */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
            {/* Brand block */}
            <div className="md:col-span-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-black rounded" />
                </div>
                <span className="text-2xl font-bold tracking-tighter">KROVA</span>
              </div>
              <p className="text-os-text-dim text-sm leading-relaxed mb-6 max-w-sm">
                Your AI Business Analyst. Reads every conversation, predicts what's at risk,
                drafts what to do. Built for Indian SMBs.
              </p>

              {/* Aqirox parent badge */}
              <Link
                href="#"
                className="group inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-os-border bg-os-bg hover:border-os-border-bright transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400/30 to-violet-400/30 border border-os-border flex items-center justify-center">
                  <span className="text-[10px] font-black tracking-tighter">A</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">
                    A product of
                  </span>
                  <span className="text-sm font-bold tracking-tight group-hover:text-white transition-colors">
                    Aqirox Technology Pvt Ltd
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-3 mt-6">
                <a href="#" className="w-9 h-9 rounded-lg border border-os-border bg-os-bg hover:bg-os-border flex items-center justify-center transition-colors">
                  <Twitter size={14} className="text-os-text-dim" />
                </a>
                <a href="#" className="w-9 h-9 rounded-lg border border-os-border bg-os-bg hover:bg-os-border flex items-center justify-center transition-colors">
                  <Linkedin size={14} className="text-os-text-dim" />
                </a>
                <a href="#" className="w-9 h-9 rounded-lg border border-os-border bg-os-bg hover:bg-os-border flex items-center justify-center transition-colors">
                  <Github size={14} className="text-os-text-dim" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div className="md:col-span-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/workspace" className="text-os-text-dim hover:text-white transition-colors">Workspace</Link></li>
                <li><Link href="/intelligence" className="text-os-text-dim hover:text-white transition-colors">Intelligence</Link></li>
                <li><Link href="/pricing" className="text-os-text-dim hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/dashboard" className="text-os-text-dim hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>

            {/* For */}
            <div className="md:col-span-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white mb-4">For</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-os-text-dim hover:text-white transition-colors">Coaching</a></li>
                <li><a href="#" className="text-os-text-dim hover:text-white transition-colors">Clinics</a></li>
                <li><a href="#" className="text-os-text-dim hover:text-white transition-colors">Salons</a></li>
                <li><a href="#" className="text-os-text-dim hover:text-white transition-colors">Agencies</a></li>
              </ul>
            </div>

            {/* Company */}
            <div className="md:col-span-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-os-text-dim hover:text-white transition-colors">About Aqirox</a></li>
                <li><a href="#" className="text-os-text-dim hover:text-white transition-colors">Careers</a></li>
                <li><a href="mailto:hello@krova.in" className="text-os-text-dim hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="text-os-text-dim hover:text-white transition-colors">Press kit</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="md:col-span-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white mb-4">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-os-text-dim hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="text-os-text-dim hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="text-os-text-dim hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="text-os-text-dim hover:text-white transition-colors">Refunds</a></li>
              </ul>
            </div>
          </div>

          {/* Giant brand line — Aqirox watermark */}
          <div className="relative mb-10 overflow-hidden">
            <div className="text-center select-none">
              <div className="text-[88px] md:text-[140px] font-black tracking-tighter leading-none bg-gradient-to-b from-white/10 to-transparent bg-clip-text text-transparent">
                AQIROX × KROVA
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-os-border">
            <div className="flex items-center gap-4 text-[10px] font-mono text-os-text-dim uppercase tracking-[0.3em]">
              <span>© 2026 Aqirox Technology Pvt Ltd</span>
              <span className="hidden md:block">·</span>
              <span className="hidden md:block">All rights reserved</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-os-text-dim">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="uppercase tracking-widest">All systems operational</span>
            </div>
            <div className="text-[10px] font-mono text-os-text-dim uppercase tracking-[0.3em]">
              Made with intent in India 🇮🇳
            </div>
          </div>
        </div>
      </footer>

      {/* Decorative background — FIXED behind everything */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.08}
          duration={3}
          className="[mask-image:radial-gradient(700px_circle_at_center,white,transparent)] inset-x-0 -top-20 h-[120%] skew-y-12"
        />
        <Particles className="absolute inset-0" quantity={60} ease={80} color="#ffffff" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-500/10 blur-[150px] rounded-full" />
      </div>
    </div>
  );
}
