"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Check, X, Zap, ArrowRight, Command, HelpCircle, Sparkles } from "lucide-react";
import { useState } from "react";

import { Navbar } from "@/components/spectrum/navbar";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Particles } from "@/components/magicui/particles";
import { Meteors } from "@/components/magicui/meteors";
import { ShinyText } from "@/components/magicui/shiny-text";
import { AnimatedGridPattern } from "@/components/magicui/animated-grid-pattern";
import { MagicCard } from "@/components/magicui/magic-card";
import { DotPattern } from "@/components/magicui/dot-pattern";

import { GlowCard } from "@/components/spectrum/glow-card";
import { FaqAccordion } from "@/components/spectrum/faq-accordion";

const PLANS = [
  {
    name: "Starter",
    tagline: "For solo operators",
    price: { monthly: "₹999", annual: "₹799" },
    desc: "Everything you need to stop missing leads from one channel.",
    highlight: false,
    features: [
      { text: "1 channel (WhatsApp or Instagram)", included: true },
      { text: "Up to 500 messages/month", included: true },
      { text: "Nightly AI analysis (10 PM IST)", included: true },
      { text: "Morning briefing on WhatsApp", included: true },
      { text: "5 AI-drafted replies/day", included: true },
      { text: "HOT / WARM / COLD scoring", included: true },
      { text: "Customer intelligence dashboard", included: false },
      { text: "Multi-channel (all 4)", included: false },
      { text: "Unlimited AI replies", included: false },
      { text: "Team seats", included: false },
      { text: "API access", included: false },
    ],
    cta: "Start Free Trial",
    href: "/signup",
  },
  {
    name: "Growth",
    tagline: "For growing businesses",
    price: { monthly: "₹1,999", annual: "₹1,599" },
    desc: "All 4 channels, unlimited replies, full intelligence. The complete KROVA.",
    highlight: true,
    badge: "Most Popular",
    features: [
      { text: "All 4 channels (WhatsApp, IG, Gmail, Outlook)", included: true },
      { text: "Up to 5,000 messages/month", included: true },
      { text: "Nightly AI analysis (10 PM IST)", included: true },
      { text: "Morning briefing + hot lead alerts", included: true },
      { text: "Unlimited AI-drafted replies", included: true },
      { text: "HOT / WARM / COLD scoring", included: true },
      { text: "Customer intelligence dashboard", included: true },
      { text: "Analytics & conversion tracking", included: true },
      { text: "Team seats", included: false },
      { text: "API access", included: false },
    ],
    cta: "Start Free Trial",
    href: "/signup",
  },
  {
    name: "Pro",
    tagline: "For teams & power users",
    price: { monthly: "₹4,999", annual: "₹3,999" },
    desc: "Real-time intelligence, team collaboration, full API access.",
    highlight: false,
    features: [
      { text: "Everything in Growth", included: true },
      { text: "Unlimited messages", included: true },
      { text: "Real-time AI analysis (not just nightly)", included: true },
      { text: "Morning briefing + instant alerts", included: true },
      { text: "Unlimited AI-drafted replies", included: true },
      { text: "Advanced scoring & custom rules", included: true },
      { text: "Customer intelligence dashboard", included: true },
      { text: "Team workspace (up to 5 seats)", included: true },
      { text: "Custom AI tone & guardrails", included: true },
      { text: "API access", included: true },
    ],
    cta: "Contact Sales",
    href: "/signup",
  },
];

const FAQS = [
  {
    q: "What counts as a 'message'?",
    a: "Any inbound or outbound message across your connected channels — WhatsApp, Instagram DMs, Gmail threads, or Outlook emails — counts as one message.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. Upgrade or downgrade any time. Upgrades take effect immediately; downgrades apply at the next billing cycle.",
  },
  {
    q: "What is the 14-day free trial?",
    a: "Every new account gets 14 days of the Growth plan, completely free. No credit card required. After 14 days you choose a plan or move to read-only mode.",
  },
  {
    q: "What channels are supported?",
    a: "WhatsApp Business API, Instagram Direct (via Meta), Gmail (via Google OAuth), and Outlook / Office 365 (via Microsoft OAuth). More channels coming.",
  },
  {
    q: "Is my data secure?",
    a: "All message data is encrypted at rest and in transit. KROVA never reads your messages for any purpose other than AI processing. Delete all data any time from Settings.",
  },
  {
    q: "Do I need technical skills to set up?",
    a: "No. Setup takes under 5 minutes — connect channels via OAuth, fill in your business profile, and KROVA handles the rest.",
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="bg-os-bg min-h-screen relative">
      <Navbar />

      {/* HERO */}
      <section className="relative z-10 pt-36 pb-20 px-6 max-w-6xl mx-auto">
        <Meteors number={10} />
        <div className="text-center mb-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border bg-os-card/80 backdrop-blur text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-8"
          >
            <Command size={10} className="text-teal-400" />
            <ShinyText shimmerWidth={80} className="text-os-text-dim">
              Pricing
            </ShinyText>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-4 max-w-4xl mx-auto leading-[1.05]"
          >
            Simple, <AuroraText>honest pricing.</AuroraText>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-os-text-dim text-lg max-w-xl mx-auto mb-8"
          >
            14-day free trial on every plan. No credit card required. Cancel any time.
          </motion.p>

          {/* Annual toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 p-1 rounded-full border border-os-border bg-os-card relative overflow-hidden"
          >
            <BorderBeam size={80} duration={10} colorFrom="#5EEAD4" colorTo="#A78BFA" />
            <button
              onClick={() => setAnnual(false)}
              className={`relative z-10 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${!annual ? "bg-white text-black" : "text-os-text-dim"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`relative z-10 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${annual ? "bg-white text-black" : "text-os-text-dim"}`}
            >
              Annual
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${annual ? "bg-green-600/30 text-green-900" : "bg-emerald-500/10 text-emerald-400"}`}
              >
                SAVE 20%
              </span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* PLANS */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              {plan.highlight ? (
                <GlowCard
                  className="h-full"
                  glowColor="from-teal-400/40 via-violet-400/30 to-pink-400/40"
                >
                  <PlanInner plan={plan} annual={annual} />
                </GlowCard>
              ) : (
                <MagicCard className="h-full" gradientFrom="#5EEAD4" gradientTo="#A78BFA">
                  <PlanInner plan={plan} annual={annual} />
                </MagicCard>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* COMPARE CALLOUT */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <GlowCard glowColor="from-amber-400/30 via-orange-400/20 to-rose-400/30">
          <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-os-bg border border-os-border flex items-center justify-center shrink-0">
                <Zap size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Not sure which plan?</h3>
                <p className="text-os-text-dim text-sm">
                  Start with Growth — covers 95% of businesses. You can always downgrade.
                </p>
              </div>
            </div>
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="os-button os-button-primary px-8 py-3 font-bold shrink-0 gap-2"
              >
                Try Growth Free <ArrowRight size={14} />
              </motion.button>
            </Link>
          </div>
        </GlowCard>
      </section>

      {/* FAQ */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <HelpCircle size={10} /> FAQ
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Common <AuroraText>questions.</AuroraText>
          </h2>
        </div>
        <FaqAccordion items={FAQS} />
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <div className="relative rounded-3xl overflow-hidden border border-os-border bg-os-card p-16 text-center">
          <Particles className="absolute inset-0" quantity={60} color="#5EEAD4" />
          <DotPattern className="opacity-30 [mask-image:radial-gradient(400px_circle_at_center,white,transparent)]" />
          <BorderBeam size={400} duration={12} colorFrom="#5EEAD4" colorTo="#A78BFA" />
          <BorderBeam size={400} duration={12} delay={6} colorFrom="#FB7185" colorTo="#FCD34D" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-6">
              <Sparkles size={10} className="text-violet-400" /> 14-day free trial
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Put your business <AuroraText>on autopilot.</AuroraText>
            </h2>
            <p className="text-os-text-dim text-lg mb-8 max-w-xl mx-auto">
              Join hundreds of Indian SMBs already using KROVA.
            </p>
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="os-button os-button-primary px-10 py-3 text-base font-bold inline-flex items-center gap-2"
              >
                Start Free Trial <ArrowRight size={16} />
              </motion.button>
            </Link>
            <p className="text-[11px] text-os-text-dim mt-4">
              No credit card · Cancel any time · Setup in 5 minutes
            </p>
          </div>
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-os-border text-center relative z-10">
        <p className="text-[10px] font-mono text-os-text-dim uppercase tracking-[0.3em]">
          KROVA × AQIROX // PRICING
        </p>
      </footer>

      {/* Fixed background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <AnimatedGridPattern
          numSquares={28}
          maxOpacity={0.06}
          duration={3}
          className="[mask-image:radial-gradient(700px_circle_at_center,white,transparent)]"
        />
        <Particles className="absolute inset-0" quantity={50} ease={80} color="#ffffff" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-violet-500/10 blur-[150px] rounded-full" />
      </div>
    </div>
  );
}

function PlanInner({
  plan,
  annual,
}: {
  plan: (typeof PLANS)[number];
  annual: boolean;
}) {
  return (
    <>
      <div className="h-9 border-b border-os-border bg-os-bg/50 flex items-center px-4">
        <div className="flex gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${plan.highlight ? "bg-white/40" : "bg-os-border"}`} />
          <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
          <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
        </div>
        <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">
          {plan.name}
          {plan.badge && <span className="text-emerald-400 ml-2">· {plan.badge}</span>}
        </span>
      </div>
      <div className="p-6 flex flex-col">
        <div className="mb-6 pb-6 border-b border-os-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-2">
            {plan.tagline}
          </p>
          <div className="flex items-end gap-1 mb-2">
            <span className="text-4xl font-bold tracking-tight">
              {annual ? plan.price.annual : plan.price.monthly}
            </span>
            <span className="text-os-text-dim text-sm mb-1">/month</span>
          </div>
          {annual && (
            <p className="text-[10px] text-emerald-400 font-bold">Billed annually · Save 20%</p>
          )}
          <p className="text-xs text-os-text-dim mt-2 leading-relaxed">{plan.desc}</p>
        </div>

        <ul className="space-y-2.5 flex-1 mb-6">
          {plan.features.map((f) => (
            <li key={f.text} className="flex items-start gap-2.5">
              {f.included ? (
                <Check size={12} className="mt-0.5 shrink-0 text-emerald-400" />
              ) : (
                <X size={12} className="mt-0.5 shrink-0 text-os-border" />
              )}
              <span
                className={`text-xs leading-relaxed ${f.included ? "text-white" : "text-os-border line-through"}`}
              >
                {f.text}
              </span>
            </li>
          ))}
        </ul>

        <Link href={plan.href}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              plan.highlight
                ? "bg-white text-black hover:bg-white/90"
                : "border border-os-border text-white hover:border-os-border-bright hover:bg-white/5"
            }`}
          >
            {plan.cta} <ArrowRight size={12} />
          </motion.button>
        </Link>
      </div>
    </>
  );
}
