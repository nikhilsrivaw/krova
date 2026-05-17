"use client";

import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Smartphone,
  ArrowRight,
  Sparkles,
  Send,
  Check,
  Bell,
  WifiOff,
  Zap,
  Download,
  Copy,
  Apple,
  Share2,
  Plus,
  Mic,
  MoreHorizontal,
  RotateCcw,
  ShieldCheck,
  Brain,
  Globe,
} from "lucide-react";

import { Navbar } from "@/components/spectrum/navbar";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShinyText } from "@/components/magicui/shiny-text";
import { Particles } from "@/components/magicui/particles";
import { AnimatedGridPattern } from "@/components/magicui/animated-grid-pattern";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { Meteors } from "@/components/magicui/meteors";
import { TypingAnimation } from "@/components/magicui/typing-animation";

import { GlowCard } from "@/components/spectrum/glow-card";
import { SpotlightCard } from "@/components/spectrum/spotlight-card";

// Example exchanges that auto-cycle in the phone mockup
const EXAMPLES = [
  {
    user: "Aaj kya hua?",
    ai: "Aaj 12 naye leads aaye — 3 hot 🔥, 5 warm, 4 abhi naye hain. Pending approvals: 8. Priya ji aur Rahul ji ne pricing pucha — drafts ready hain.",
  },
  {
    user: "Kaun se leads hot hain abhi?",
    ai: "3 hot leads:\n• Priya D. — Elite plan ka rate pucha (WhatsApp · 2h ago)\n• Rahul M. — Sample dekha, ready to convert (IG · 4h ago)\n• Anjali S. — Demo schedule karna chahti hain (Gmail · 6h ago)",
  },
  {
    user: "Priya ko kya message karoon?",
    ai: 'Suggested reply: "Hi Priya! Happy to share — Elite plan ₹2,499/month hai. Aaj lock kar lein toh kal hi start kar dete hain. Payment link bhej dun? 🙌"\n\nApprove karein? Tap HAAN.',
  },
  {
    user: "Is mahine revenue kaisa hai?",
    ai: "May tak ₹2,18,000 received · ₹47,000 expected aur 10 din mein due · ₹15,000 overdue (Vikram ji, 12 din ho gaye). April se 23% up — great work! 📈",
  },
];

export default function MobilePage() {
  const [installUrl, setInstallUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Default to localhost in dev; replace with production URL when deployed
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      setInstallUrl("http://localhost:3001");
    } else {
      setInstallUrl(`https://app.${host.replace(/^www\./, "")}`);
    }
  }, []);

  const copy = () => {
    if (!installUrl) return;
    navigator.clipboard.writeText(installUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-os-bg min-h-screen relative">
      <Navbar />

      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <AnimatedGridPattern
          numSquares={24}
          maxOpacity={0.05}
          duration={3}
          className="[mask-image:radial-gradient(700px_circle_at_center,white,transparent)]"
        />
        <Particles className="absolute inset-0" quantity={40} ease={80} color="#ffffff" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-500/[0.07] blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-teal-500/[0.07] blur-[150px] rounded-full" />
      </div>

      {/* ─── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-36 pb-16 px-6 max-w-7xl mx-auto">
        <Meteors number={10} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border bg-os-card/80 backdrop-blur text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-6"
            >
              <Smartphone size={10} className="text-teal-400" />
              <ShinyText shimmerWidth={70} className="text-os-text-dim">
                KROVA on your phone
              </ShinyText>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold tracking-tight mb-5 leading-[1.05]"
            >
              Aapka AI <br />
              <AuroraText>business partner.</AuroraText> <br />
              <span className="text-os-text-dim">In your pocket.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-os-text-dim text-lg leading-relaxed max-w-md mb-8"
            >
              Pucho kuch bhi about your business in Hindi, English, or Hinglish.
              KROVA jaanta hai your customers, your numbers, your day — and answers
              in plain language.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 flex-wrap"
            >
              {installUrl && (
                <a
                  href={installUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="os-button os-button-primary px-6 py-3 text-sm font-bold gap-2"
                >
                  Open the app <ArrowRight size={14} />
                </a>
              )}
              <a
                href="#install"
                className="os-button os-button-secondary px-6 py-3 text-sm font-bold gap-2"
              >
                <Download size={14} />
                Install steps
              </a>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[11px] text-os-text-dim mt-6 max-w-md leading-relaxed"
            >
              KROVA Mobile is a <strong className="text-white">PWA</strong> — installable
              web app. No App Store. No Play Store. No 200MB download. Just open the
              link on your phone.
            </motion.p>
          </div>

          {/* Phone mockup with live cycling chat */}
          <div className="flex justify-center lg:justify-end relative">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ─── ASK ANYTHING — example questions ────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Sparkles size={10} className="text-violet-400" /> Pucho kuch bhi
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Hindi, Hinglish, English. <br />
            <AuroraText>It always knows.</AuroraText>
          </h2>
          <p className="text-os-text-dim text-lg max-w-xl mx-auto">
            ChatGPT knows nothing about your business. KROVA knows everything —
            every customer, every conversation, every commitment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              q: "Aaj kya hua?",
              a: "Full daily briefing",
              accent: "teal" as const,
            },
            {
              q: "Kaun se leads hot hain abhi?",
              a: "Live hot lead list",
              accent: "rose" as const,
            },
            {
              q: "Rahul ne kab last message kiya tha?",
              a: "Specific customer lookup",
              accent: "violet" as const,
            },
            {
              q: "Is mahine revenue kaisa hai?",
              a: "Revenue summary",
              accent: "emerald" as const,
            },
            {
              q: "Aaj mujhe kya karna chahiye?",
              a: "Priority recommendations",
              accent: "amber" as const,
            },
            {
              q: "Priya ko kya message karoon?",
              a: "Suggested reply for any customer",
              accent: "pink" as const,
            },
          ].map((ex) => (
            <ExampleCard key={ex.q} q={ex.q} a={ex.a} accent={ex.accent} />
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Brain size={10} className="text-teal-400" /> How it thinks
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            One tap. <AuroraText>Real action.</AuroraText>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              n: "1",
              title: "Ask",
              body: "Type or speak in any language. KROVA reads your business context — customers, history, conversations — to answer specifically.",
              icon: <Sparkles size={16} />,
              accent: "teal" as const,
            },
            {
              n: "2",
              title: "See a draft",
              body: "When KROVA suggests a follow-up, you see the message it wants to send, the customer, and why it suggested it.",
              icon: <Send size={16} />,
              accent: "violet" as const,
            },
            {
              n: "3",
              title: "Tap HAAN",
              body: "One tap. The message goes out via your WhatsApp / Instagram / Gmail. No typing. No copy-paste. No switching apps.",
              icon: <Check size={16} />,
              accent: "emerald" as const,
            },
          ].map((step) => (
            <StepCard key={step.n} step={step} />
          ))}
        </div>
      </section>

      {/* ─── WHY PWA ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Globe size={10} className="text-emerald-400" /> Why no App Store?
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Open. <AuroraText>Install. Done.</AuroraText>
          </h2>
          <p className="text-os-text-dim text-lg max-w-xl mx-auto">
            KROVA Mobile is a PWA — installable web app. Same look. Same speed.
            None of the App Store theatre.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: <Zap size={16} className="text-amber-400" />,
              title: "Instant updates",
              body: "We ship a fix at 11 AM, you get it at 11:01. No review queue. No 'update available' nag.",
            },
            {
              icon: <Download size={16} className="text-emerald-400" />,
              title: "~500KB install",
              body: "Compared to a 100MB native app. Saves your phone storage and data.",
            },
            {
              icon: <WifiOff size={16} className="text-teal-400" />,
              title: "Works offline",
              body: "Cached pages keep working when you're offline. Drafts queue and send when you reconnect.",
            },
            {
              icon: <Bell size={16} className="text-violet-400" />,
              title: "Push notifications",
              body: "Hot lead lands at 11 PM? Phone buzzes. Just like a native app — because under the hood, it is one.",
            },
          ].map((c) => (
            <SpotlightCard key={c.title}>
              <div className="p-5">
                <div className="w-9 h-9 rounded-xl bg-os-bg border border-os-border flex items-center justify-center mb-3">
                  {c.icon}
                </div>
                <h3 className="text-sm font-bold mb-1">{c.title}</h3>
                <p className="text-xs text-os-text-dim leading-relaxed">{c.body}</p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* ─── INSTALL INSTRUCTIONS ─────────────────────────────────────────── */}
      <section
        id="install"
        className="relative z-10 max-w-6xl mx-auto px-6 py-24"
      >
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-os-border text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-4">
            <Download size={10} className="text-teal-400" /> Install in 30 seconds
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Pick your <AuroraText>phone.</AuroraText>
          </h2>
        </div>

        {/* URL card */}
        {installUrl && (
          <div className="mb-8 rounded-2xl border border-os-border bg-os-card/40 p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 max-w-2xl mx-auto">
            <div className="flex-1 px-4 py-3 rounded-xl border border-os-border bg-os-bg font-mono text-sm text-white overflow-x-auto">
              {installUrl}
            </div>
            <button
              onClick={copy}
              className="px-4 py-3 rounded-xl bg-white text-black text-[11px] font-bold uppercase tracking-widest hover:bg-white/90 transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-600" /> Copied
                </>
              ) : (
                <>
                  <Copy size={13} /> Copy link
                </>
              )}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* iOS */}
          <InstallCard
            label="iOS · Safari"
            icon={<Apple size={20} />}
            glow="from-sky-400/30 via-blue-400/20 to-cyan-400/30"
            steps={[
              {
                line: "Open the link in Safari",
                hint: "Chrome on iOS won't work — Apple restricts PWA install to Safari.",
              },
              {
                line: (
                  <>
                    Tap the <strong>Share</strong> button{" "}
                    <Share2
                      size={11}
                      className="inline -mt-0.5 text-sky-400"
                    />
                  </>
                ),
                hint: "Bottom of the screen on iPhone.",
              },
              {
                line: (
                  <>
                    Tap <strong>Add to Home Screen</strong>
                  </>
                ),
                hint: "Scroll down in the share sheet if you don't see it.",
              },
              { line: "Done — open KROVA from your home screen.", hint: "" },
            ]}
          />

          {/* Android */}
          <InstallCard
            label="Android · Chrome"
            icon={<Smartphone size={20} />}
            glow="from-emerald-400/30 via-teal-400/20 to-cyan-400/30"
            steps={[
              { line: "Open the link in Chrome", hint: "" },
              {
                line: "Tap the install prompt that pops up",
                hint: "Otherwise: open the ⋮ menu → 'Install app'.",
              },
              { line: "Confirm", hint: "Done — KROVA is on your home screen." },
            ]}
          />

          {/* Desktop */}
          <InstallCard
            label="Desktop · Chrome / Edge"
            icon={<MoreHorizontal size={20} />}
            glow="from-violet-400/30 via-fuchsia-400/20 to-pink-400/30"
            steps={[
              { line: "Open the link in Chrome or Edge", hint: "" },
              {
                line: (
                  <>
                    Click the install icon{" "}
                    <Download
                      size={11}
                      className="inline -mt-0.5 text-violet-400"
                    />{" "}
                    in the address bar
                  </>
                ),
                hint: "Right-hand side of the URL bar.",
              },
              {
                line: "Click Install",
                hint: "Opens as its own desktop window — feels like a native app.",
              },
            ]}
          />
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <div className="relative rounded-3xl overflow-hidden border border-os-border bg-os-card p-12 md:p-16 text-center">
          <Particles className="absolute inset-0" quantity={50} color="#5EEAD4" />
          <DotPattern className="opacity-30 [mask-image:radial-gradient(400px_circle_at_center,white,transparent)]" />
          <BorderBeam size={400} duration={12} colorFrom="#5EEAD4" colorTo="#A78BFA" />
          <BorderBeam size={400} duration={12} delay={6} colorFrom="#FB7185" colorTo="#FCD34D" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
              Your AI partner is{" "}
              <AuroraText>30 seconds away.</AuroraText>
            </h2>
            <p className="text-os-text-dim text-lg mb-8 max-w-xl mx-auto">
              Open the link on your phone, tap install. KROVA is on your home
              screen forever.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {installUrl && (
                <a
                  href={installUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="os-button os-button-primary px-8 py-3 font-bold gap-2"
                >
                  Open the app <ArrowRight size={14} />
                </a>
              )}
              <Link href="/signup">
                <button className="os-button os-button-secondary px-8 py-3 font-bold">
                  Create an account first
                </button>
              </Link>
            </div>
            <p className="text-[11px] text-os-text-dim mt-6">
              You need a KROVA account first.{" "}
              <Link href="/signup" className="text-white hover:underline">
                Sign up free
              </Link>{" "}
              — 14-day trial, no card needed.
            </p>
          </div>
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-os-border text-center relative z-10">
        <p className="text-[10px] font-mono text-os-text-dim uppercase tracking-[0.3em]">
          KROVA × AQIROX // MOBILE
        </p>
      </footer>
    </div>
  );
}

// ── PHONE MOCKUP ─────────────────────────────────────────────────────────────
function PhoneMockup() {
  const [idx, setIdx] = useState(0);
  const ex = EXAMPLES[idx];

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % EXAMPLES.length), 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-10 bg-gradient-to-br from-teal-500/20 to-violet-500/20 blur-3xl rounded-full -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative w-[300px] mx-auto"
      >
        <div className="rounded-[2.5rem] border-8 border-os-card bg-os-bg shadow-2xl overflow-hidden relative">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-os-card rounded-b-2xl z-20" />

          {/* Status bar */}
          <div className="bg-os-bg pt-9 pb-2 px-5 flex items-center justify-between text-[9px] font-mono text-os-text-dim relative z-10">
            <span>9:41</span>
            <span>●●●○○ 4G</span>
          </div>

          {/* Chat header */}
          <div className="border-b border-os-border bg-os-bg px-4 py-3 flex items-center gap-3">
            <div className="relative w-10 h-10 shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-400/40 to-violet-400/40 blur" />
              <div className="relative w-10 h-10 rounded-2xl bg-os-card border border-os-border flex items-center justify-center">
                <Sparkles size={16} className="text-violet-400" />
              </div>
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">KROVA</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Knows your business
              </div>
            </div>
            <RotateCcw size={14} className="ml-auto text-os-text-dim" />
          </div>

          {/* Chat body */}
          <div
            className="px-3 py-4 space-y-3 min-h-[440px] bg-os-bg"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
              backgroundSize: "12px 12px",
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-3"
              >
                {/* User bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[88%] rounded-2xl rounded-br-md px-3 py-2 bg-white text-black">
                    <p className="text-[12px] leading-relaxed">{ex.user}</p>
                  </div>
                </div>

                {/* AI bubble with typewriter */}
                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-2xl rounded-bl-md px-3 py-2 bg-os-card border border-os-border">
                    <div className="flex items-center gap-1.5 mb-1 text-[8px] font-bold uppercase tracking-widest text-violet-400">
                      <Sparkles size={8} /> KROVA
                    </div>
                    <p className="text-[11px] leading-relaxed text-white whitespace-pre-line">
                      <TypingAnimation
                        key={ex.user}
                        text={ex.ai}
                        duration={18}
                      />
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Composer */}
          <div className="border-t border-os-border bg-os-bg px-3 py-2.5 flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-xl border border-os-border bg-os-card text-[11px] text-os-text-dim">
              {ex.user}
            </div>
            <button className="w-9 h-9 rounded-xl text-os-text-dim flex items-center justify-center">
              <Mic size={14} />
            </button>
            <button className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center">
              <Send size={13} />
            </button>
          </div>
        </div>

        {/* Floating badges */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="absolute -left-12 top-32 px-3 py-2 rounded-xl bg-os-card border border-os-border shadow-2xl flex items-center gap-2"
        >
          <Sparkles size={12} className="text-violet-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Hinglish
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 }}
          className="absolute -right-10 bottom-40 px-3 py-2 rounded-xl bg-os-card border border-os-border shadow-2xl flex items-center gap-2"
        >
          <ShieldCheck size={12} className="text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Real data
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ── EXAMPLE CARD ─────────────────────────────────────────────────────────────
function ExampleCard({
  q,
  a,
  accent,
}: {
  q: string;
  a: string;
  accent: "teal" | "rose" | "violet" | "emerald" | "amber" | "pink";
}) {
  const text: Record<typeof accent, string> = {
    teal: "text-teal-400",
    rose: "text-rose-400",
    violet: "text-violet-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    pink: "text-pink-400",
  };
  return (
    <SpotlightCard>
      <div className="p-5 flex items-start gap-3">
        <div className="relative w-9 h-9 shrink-0">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400/30 to-violet-400/30 blur" />
          <div className="relative w-9 h-9 rounded-xl bg-os-bg border border-os-border flex items-center justify-center">
            <Sparkles size={13} className={text[accent]} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">"{q}"</p>
          <p className={`text-[11px] font-mono uppercase tracking-widest mt-1 ${text[accent]}`}>
            → {a}
          </p>
        </div>
      </div>
    </SpotlightCard>
  );
}

// ── STEP CARD ────────────────────────────────────────────────────────────────
function StepCard({
  step,
}: {
  step: {
    n: string;
    title: string;
    body: string;
    icon: React.ReactNode;
    accent: "teal" | "violet" | "emerald";
  };
}) {
  const glow: Record<typeof step.accent, string> = {
    teal: "from-teal-400/30 via-cyan-400/20 to-sky-400/30",
    violet: "from-violet-400/30 via-fuchsia-400/20 to-pink-400/30",
    emerald: "from-emerald-400/30 via-teal-400/20 to-cyan-400/30",
  };
  return (
    <GlowCard glowColor={glow[step.accent]}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-10 h-10 shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400/40 to-violet-400/40 blur" />
            <div className="relative w-10 h-10 rounded-xl bg-os-bg border border-os-border flex items-center justify-center">
              {step.icon}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-mono font-bold text-os-text-dim">
              Step {step.n}
            </div>
            <h3 className="text-base font-bold">{step.title}</h3>
          </div>
        </div>
        <p className="text-sm text-os-text-dim leading-relaxed">{step.body}</p>
      </div>
    </GlowCard>
  );
}

// ── INSTALL CARD ─────────────────────────────────────────────────────────────
function InstallCard({
  label,
  icon,
  glow,
  steps,
}: {
  label: string;
  icon: React.ReactNode;
  glow: string;
  steps: { line: React.ReactNode; hint?: string }[];
}) {
  return (
    <GlowCard glowColor={glow}>
      <div className="p-6 h-full">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-os-bg border border-os-border flex items-center justify-center text-white">
            {icon}
          </div>
          <h3 className="text-sm font-bold uppercase tracking-widest">{label}</h3>
        </div>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <div className="w-6 h-6 rounded-lg bg-os-bg border border-os-border flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white leading-snug">{s.line}</div>
                {s.hint && (
                  <p className="text-[10px] text-os-text-dim leading-snug mt-0.5">
                    {s.hint}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </GlowCard>
  );
}
