"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Brain,
  Rocket,
  Layers,
  Plug,
  MessageSquare,
  Sun,
  CheckSquare,
  Sparkles,
  ShieldCheck,
  Cpu,
  Bug,
  ArrowRight,
  Instagram,
  Mail,
  Zap,
  Users,
  Search,
  LogIn,
  UserPlus,
  Smartphone,
  Settings as SettingsIcon,
  Bell,
  HelpCircle,
  Eye,
  Clock,
} from "lucide-react";

import { Navbar } from "@/components/spectrum/navbar";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Particles } from "@/components/magicui/particles";
import { AnimatedGridPattern } from "@/components/magicui/animated-grid-pattern";
import { DotPattern } from "@/components/magicui/dot-pattern";

import { Callout } from "@/components/spectrum/callout";
import { GlowCard } from "@/components/spectrum/glow-card";
import { SpotlightCard } from "@/components/spectrum/spotlight-card";

interface TocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  group: string;
}

const TOC: TocSection[] = [
  // Get started
  { id: "introduction", title: "What is KROVA?", icon: <BookOpen size={13} />, group: "Get Started" },
  { id: "signup", title: "Create Account", icon: <UserPlus size={13} />, group: "Get Started" },
  { id: "login", title: "Sign In", icon: <LogIn size={13} />, group: "Get Started" },
  { id: "setup", title: "First-Time Setup", icon: <Rocket size={13} />, group: "Get Started" },
  // Daily
  { id: "briefing", title: "Morning Briefing", icon: <Sun size={13} />, group: "Daily Use" },
  { id: "actions", title: "Approving Actions", icon: <CheckSquare size={13} />, group: "Daily Use" },
  { id: "relationships", title: "Relationships", icon: <Users size={13} />, group: "Daily Use" },
  { id: "intelligence", title: "Intelligence", icon: <Brain size={13} />, group: "Daily Use" },
  // Channels
  { id: "channels-overview", title: "Channels Overview", icon: <Plug size={13} />, group: "Channels" },
  { id: "whatsapp", title: "WhatsApp", icon: <MessageSquare size={13} />, group: "Channels" },
  { id: "instagram", title: "Instagram", icon: <Instagram size={13} />, group: "Channels" },
  { id: "gmail", title: "Gmail", icon: <Mail size={13} />, group: "Channels" },
  { id: "outlook", title: "Outlook", icon: <Mail size={13} />, group: "Channels" },
  // Configure
  { id: "voice", title: "Voice & Tone", icon: <Sparkles size={13} />, group: "Configure" },
  { id: "guardrails", title: "Guardrails", icon: <ShieldCheck size={13} />, group: "Configure" },
  { id: "autopilot", title: "Autopilot Rules", icon: <Zap size={13} />, group: "Configure" },
  { id: "team", title: "Team & Roles", icon: <Users size={13} />, group: "Configure" },
  // Help
  { id: "mobile", title: "Mobile App", icon: <Smartphone size={13} />, group: "Help" },
  { id: "settings", title: "Settings Map", icon: <SettingsIcon size={13} />, group: "Help" },
  { id: "faq", title: "FAQ", icon: <HelpCircle size={13} />, group: "Help" },
  { id: "troubleshooting", title: "Troubleshooting", icon: <Bug size={13} />, group: "Help" },
  { id: "privacy", title: "Privacy & Data", icon: <ShieldCheck size={13} />, group: "Help" },
];

const GROUPS = ["Get Started", "Daily Use", "Channels", "Configure", "Help"];

export default function DocsPage() {
  const [active, setActive] = useState<string>(TOC[0].id);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      const offsets = TOC.map((t) => {
        const el = document.getElementById(t.id);
        if (!el) return { id: t.id, top: Infinity };
        return { id: t.id, top: Math.abs(el.getBoundingClientRect().top - 120) };
      });
      offsets.sort((a, b) => a.top - b.top);
      if (offsets[0]) setActive(offsets[0].id);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const visibleToc = TOC.filter(
    (t) => !search || t.title.toLowerCase().includes(search.toLowerCase()),
  );

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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/[0.06] blur-[120px] rounded-full" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-violet-500/[0.06] blur-[150px] rounded-full" />
      </div>

      {/* LAYOUT — sidebar + main (no hero, full height) */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-24">
        <div className="grid grid-cols-12 gap-10">
          {/* SIDEBAR */}
          <aside className="col-span-12 md:col-span-3 md:sticky md:top-24 md:h-[calc(100vh-7rem)] md:overflow-y-auto md:pr-6 md:border-r md:border-os-border">
            <div className="relative mb-4">
              <Search
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-os-text-dim"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the guide..."
                className="w-full bg-os-card border border-os-border rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright font-mono"
              />
            </div>

            {GROUPS.map((group) => {
              const items = visibleToc.filter((t) => t.group === group);
              if (!items.length) return null;
              return (
                <div key={group} className="mb-6">
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-os-text-dim mb-2 px-2">
                    {group}
                  </p>
                  <nav className="space-y-0.5">
                    {items.map((item) => {
                      const isActive = active === item.id;
                      return (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          className={`relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors overflow-hidden ${
                            isActive
                              ? "bg-white/5 text-white border border-os-border-bright"
                              : "text-os-text-dim hover:text-white hover:bg-white/[0.03] border border-transparent"
                          }`}
                        >
                          {isActive && (
                            <BorderBeam
                              size={60}
                              duration={6}
                              colorFrom="#5EEAD4"
                              colorTo="#A78BFA"
                              borderWidth={1}
                            />
                          )}
                          <span className={isActive ? "text-teal-400" : "text-os-text-dim"}>
                            {item.icon}
                          </span>
                          <span className="font-medium tracking-tight">{item.title}</span>
                        </a>
                      );
                    })}
                  </nav>
                </div>
              );
            })}

            <div className="mt-4 p-4 rounded-2xl border border-os-border bg-os-card/40 relative overflow-hidden">
              <BorderBeam size={100} duration={10} colorFrom="#5EEAD4" colorTo="#A78BFA" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-2">
                Stuck on something?
              </p>
              <a
                href="mailto:hello@krova.in"
                className="text-xs text-white font-bold hover:underline"
              >
                hello@krova.in
              </a>
              <p className="text-[10px] text-os-text-dim mt-1">We reply within 4 business hours.</p>
            </div>
          </aside>

          {/* MAIN */}
          <main className="col-span-12 md:col-span-9 space-y-24 prose-headings:scroll-mt-28">
            {/* ============ INTRODUCTION ============ */}
            <Section id="introduction" eyebrow="Start here" title="What is KROVA?">
              <p className="text-lg text-os-text-dim leading-relaxed mb-6">
                <strong className="text-white">KROVA is your AI Business Analyst.</strong> It
                quietly reads every customer conversation across WhatsApp, Instagram, Gmail and
                Outlook — then tells you who&apos;s hot, who&apos;s slipping, what&apos;s at risk, and
                exactly what to say next.
              </p>
              <p className="text-os-text-dim leading-relaxed mb-6">
                Every night at 10 PM, KROVA scans everything. By 8 AM you get a WhatsApp
                briefing telling you exactly what to do that day. You approve. KROVA sends.
                That&apos;s the whole loop.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-6">
                {[
                  {
                    icon: <Eye size={16} className="text-teal-400" />,
                    title: "It reads",
                    body: "Every message across every channel — automatically.",
                  },
                  {
                    icon: <Brain size={16} className="text-violet-400" />,
                    title: "It thinks",
                    body: "Scores leads, spots churn, finds revenue you&apos;re losing.",
                  },
                  {
                    icon: <Sparkles size={16} className="text-emerald-400" />,
                    title: "It drafts",
                    body: "Writes replies in your tone. You only press approve.",
                  },
                ].map((s) => (
                  <SpotlightCard key={s.title}>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">{s.icon}</div>
                      <div className="text-sm font-bold mb-1">{s.title}</div>
                      <p
                        className="text-xs text-os-text-dim leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: s.body }}
                      />
                    </div>
                  </SpotlightCard>
                ))}
              </div>

              <Callout type="info" title="Who this is for">
                Owners of Indian SMBs — coaching institutes, clinics, salons, agencies,
                boutiques, freelancers, agencies. If your customers find you on WhatsApp, this
                is for you.
              </Callout>
            </Section>

            {/* ============ SIGNUP ============ */}
            <Section id="signup" eyebrow="Step 1" title="Create your account">
              <p className="text-os-text-dim leading-relaxed mb-6">
                Sign-up takes under a minute. You get a 14-day free trial. No credit card.
              </p>

              <NumberedSteps
                steps={[
                  {
                    title: "Open the sign-up page",
                    body: (
                      <>
                        Visit{" "}
                        <Link
                          href="/signup"
                          className="text-teal-400 underline hover:text-white"
                        >
                          /signup
                        </Link>{" "}
                        from the navbar or click <em>Start Free</em>.
                      </>
                    ),
                  },
                  {
                    title: "Enter your details",
                    body: (
                      <>
                        Full name, email, and a password (at least 8 characters). Or skip the
                        form and click <em>Continue with Google</em> — fastest option.
                      </>
                    ),
                  },
                  {
                    title: "Confirm your email",
                    body: (
                      <>
                        We send a verification link. Click it to activate the account. (Google
                        sign-ins skip this step.)
                      </>
                    ),
                  },
                  {
                    title: "Land in the setup wizard",
                    body: (
                      <>
                        You&apos;re dropped into the 4-step onboarding flow described below.
                      </>
                    ),
                  },
                ]}
              />

              <Callout type="tip" title="Multiple owners?">
                Sign up with whoever holds the master WhatsApp number — that&apos;s the account
                that receives the 8 AM briefing. You can invite team members later from
                Settings.
              </Callout>
            </Section>

            {/* ============ LOGIN ============ */}
            <Section id="login" eyebrow="Returning users" title="Sign in">
              <p className="text-os-text-dim leading-relaxed mb-6">
                Already have an account? Three ways to come back.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    icon: <Mail size={16} className="text-blue-400" />,
                    title: "Email & password",
                    body: "Use the credentials you signed up with. Forgot? Tap the reset link on the login page.",
                  },
                  {
                    icon: <LogIn size={16} className="text-emerald-400" />,
                    title: "Google",
                    body: "One-click sign-in if you registered with Google. Same account, no password to remember.",
                  },
                  {
                    icon: <Smartphone size={16} className="text-violet-400" />,
                    title: "Mobile app",
                    body: "Once installed, the mobile app stays signed in. Touch ID / Face ID protects access.",
                  },
                ].map((m) => (
                  <SpotlightCard key={m.title}>
                    <div className="p-5">
                      <div className="w-9 h-9 rounded-lg bg-os-bg border border-os-border flex items-center justify-center mb-3">
                        {m.icon}
                      </div>
                      <h4 className="text-sm font-bold mb-1">{m.title}</h4>
                      <p className="text-xs text-os-text-dim leading-relaxed">{m.body}</p>
                    </div>
                  </SpotlightCard>
                ))}
              </div>

              <Callout type="warning" title="Trouble signing in?">
                If you signed up with Google, you don&apos;t have a password — use the Google
                button instead of the email form. If you forgot your password, reset it from
                the sign-in page. Still stuck? Email us.
              </Callout>
            </Section>

            {/* ============ SETUP ============ */}
            <Section id="setup" eyebrow="Step 2" title="First-time setup">
              <p className="text-os-text-dim leading-relaxed mb-6">
                After sign-up you land in a 4-step onboarding wizard. Total time:{" "}
                <strong className="text-white">about 5 minutes</strong>.
              </p>

              <div className="space-y-3">
                {[
                  {
                    n: 1,
                    title: "Business profile",
                    body: "Tell KROVA your business name, city, type (coaching, clinic, salon, etc.), and the WhatsApp number where you want morning briefings sent.",
                  },
                  {
                    n: 2,
                    title: "Connect channels",
                    body: "Pick at least one — WhatsApp, Instagram, Gmail, or Outlook. You can add more later. Each one takes one click.",
                  },
                  {
                    n: 3,
                    title: "AI setup",
                    body: "Tell KROVA what you sell (one paragraph) and what makes a good lead. The brain uses this to score every conversation.",
                  },
                  {
                    n: 4,
                    title: "Launch",
                    body: "Done. KROVA starts watching your channels. Your first analysis runs tonight at 10 PM IST. Briefing arrives at 8 AM tomorrow.",
                  },
                ].map((s) => (
                  <div
                    key={s.n}
                    className="flex gap-4 p-4 rounded-2xl border border-os-border bg-os-card/40"
                  >
                    <div className="relative w-10 h-10 shrink-0">
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400/30 to-violet-400/30 blur" />
                      <div className="relative w-10 h-10 rounded-xl bg-os-bg border border-os-border flex items-center justify-center text-sm font-bold">
                        {s.n}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold mb-1">{s.title}</h4>
                      <p className="text-sm text-os-text-dim leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Callout type="tip" title="Skip any step">
                You can skip channel connections during setup and add them from Settings
                later. The only required step is the business profile.
              </Callout>
            </Section>

            {/* ============ BRIEFING ============ */}
            <Section id="briefing" eyebrow="Daily use" title="The 8 AM briefing">
              <p className="text-os-text-dim leading-relaxed mb-6">
                Every morning at <strong className="text-white">8:00 AM IST</strong>, KROVA
                sends a WhatsApp message to your registered phone. The whole briefing fits in
                under a minute of reading.
              </p>

              <GlowCard glowColor="from-amber-400/30 via-yellow-400/20 to-orange-400/30">
                <div className="p-6 space-y-3 text-sm">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2">
                    What a briefing looks like
                  </div>
                  <div className="space-y-2 text-os-text-dim">
                    <p>☀️ Good morning, Aditya.</p>
                    <p>
                      🔥 <strong className="text-white">3 hot leads</strong> need replies today
                      — Priya, Rahul, Anjali.
                    </p>
                    <p>
                      ⚠️ <strong className="text-white">2 going cold</strong> — Vikram & Sneha
                      (silent 4+ days).
                    </p>
                    <p>
                      💰 <strong className="text-white">₹47,000</strong> in unpaid quotes — I
                      can send reminders. Reply ✅ to approve.
                    </p>
                    <p>📊 You sent 32 messages yesterday · reply rate 94%.</p>
                  </div>
                </div>
              </GlowCard>

              <h3 className="text-lg font-bold mt-8 mb-3">What you can do from the briefing</h3>
              <ul className="space-y-2.5">
                {[
                  "Reply ✅ to approve all suggested drafts in one tap",
                  "Reply with a number (e.g. \"1\") to approve just that action",
                  "Tap any name to open their conversation in the dashboard",
                  "Reply STOP to pause briefings (no judgment — turn back on anytime)",
                ].map((it) => (
                  <li
                    key={it}
                    className="flex items-start gap-2.5 text-sm text-os-text-dim"
                  >
                    <CheckSquare size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>

              <Callout type="info" title="Want a different time?">
                Settings → Briefing → Schedule. You can move it to 7 AM, 9 AM, or even split
                into morning + evening briefings.
              </Callout>
            </Section>

            {/* ============ ACTIONS ============ */}
            <Section id="actions" eyebrow="Daily use" title="Approving actions">
              <p className="text-os-text-dim leading-relaxed mb-6">
                An <em>action</em> is a draft reply waiting for your approval. You see them in
                two places: the briefing (top 5), and the Actions tab in the dashboard (all of
                them).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    icon: <CheckSquare size={16} className="text-emerald-400" />,
                    title: "Approve",
                    body: "KROVA sends the message via the same channel it came in. You see it land in your sent folder a few seconds later.",
                  },
                  {
                    icon: <Eye size={16} className="text-blue-400" />,
                    title: "Edit then send",
                    body: "Tap edit to tweak the draft before sending. Your edits also teach the AI your real voice over time.",
                  },
                  {
                    icon: <Bell size={16} className="text-amber-400" />,
                    title: "Snooze",
                    body: "Push the action to later — 1 hour, tomorrow morning, next Monday. It comes back to the top of your queue automatically.",
                  },
                  {
                    icon: <Bug size={16} className="text-rose-400" />,
                    title: "Reject",
                    body: "Discard the draft entirely. KROVA learns from rejections — too many on the same theme and the AI shifts approach.",
                  },
                ].map((m) => (
                  <SpotlightCard key={m.title}>
                    <div className="p-5">
                      <div className="w-9 h-9 rounded-lg bg-os-bg border border-os-border flex items-center justify-center mb-3">
                        {m.icon}
                      </div>
                      <h4 className="text-sm font-bold mb-1">{m.title}</h4>
                      <p className="text-xs text-os-text-dim leading-relaxed">{m.body}</p>
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            </Section>

            {/* ============ RELATIONSHIPS ============ */}
            <Section id="relationships" eyebrow="Daily use" title="People & relationships">
              <p className="text-os-text-dim leading-relaxed mb-6">
                Every customer who messages you becomes a <em>relationship</em> automatically.
                No contact-form filling. KROVA builds this database from inbound chats.
              </p>

              <h3 className="text-lg font-bold mb-3">Each person gets</h3>
              <ul className="space-y-2.5 mb-6">
                {[
                  "A status — HOT, WARM, COLD, CONVERTED, or LOST",
                  "A health score (0–100) showing relationship strength",
                  "Their primary channel (WhatsApp, IG, Gmail, Outlook)",
                  "A timeline of every conversation, across every channel",
                  "An assigned team member if you have a team",
                  "Notes and commitments — anything you promised them",
                ].map((it) => (
                  <li
                    key={it}
                    className="flex items-start gap-2.5 text-sm text-os-text-dim"
                  >
                    <CheckSquare size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>

              <Callout type="tip" title="Searching">
                Use the search bar in Relationships to find someone by name, phone, or email
                — KROVA searches across all channels at once.
              </Callout>
            </Section>

            {/* ============ INTELLIGENCE ============ */}
            <Section id="intelligence" eyebrow="Daily use" title="The Intelligence view">
              <p className="text-os-text-dim leading-relaxed mb-6">
                Open <strong className="text-white">/dashboard/intelligence</strong> for the
                deeper signals. The brain surfaces 8 different categories of insight.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    label: "Predictions",
                    body: "Who&apos;s likely to churn. Who&apos;s likely to convert. When.",
                  },
                  {
                    label: "Revenue Leaks",
                    body: "Unpaid quotes, ghosted hot leads, abandoned conversations.",
                  },
                  {
                    label: "Voice of Customer",
                    body: "Clustered themes from real chats — what people keep asking for.",
                  },
                  {
                    label: "Commitments",
                    body: "Things you promised — and might forget to deliver.",
                  },
                  {
                    label: "Competitor Mentions",
                    body: "When customers mention rivals, with the context.",
                  },
                  {
                    label: "Growth Blockers",
                    body: "Patterns in lost deals — why you keep losing this customer type.",
                  },
                  {
                    label: "Anti-Spam Alerts",
                    body: "Suspected scams or low-quality leads before you waste time.",
                  },
                  {
                    label: "Coaching",
                    body: "Suggestions on how to improve replies based on your history.",
                  },
                ].map((it) => (
                  <div
                    key={it.label}
                    className="p-4 rounded-xl border border-os-border bg-os-card/40"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-1">
                      {it.label}
                    </div>
                    <p
                      className="text-sm text-white"
                      dangerouslySetInnerHTML={{ __html: it.body }}
                    />
                  </div>
                ))}
              </div>
            </Section>

            {/* ============ CHANNELS OVERVIEW ============ */}
            <Section id="channels-overview" eyebrow="Channels" title="Connecting channels">
              <p className="text-os-text-dim leading-relaxed mb-6">
                A channel is any inbox KROVA reads from and writes to. Four are supported
                today. You can connect more than one of each — useful if you run multiple
                WhatsApp numbers or two email addresses.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    icon: <MessageSquare size={18} className="text-green-400" />,
                    name: "WhatsApp",
                    time: "2 min",
                    glow: "from-green-400/30 via-emerald-400/20 to-teal-400/30",
                  },
                  {
                    icon: <Instagram size={18} className="text-pink-400" />,
                    name: "Instagram",
                    time: "3 min",
                    glow: "from-pink-400/30 via-fuchsia-400/20 to-rose-400/30",
                  },
                  {
                    icon: <Mail size={18} className="text-red-400" />,
                    name: "Gmail",
                    time: "1 min",
                    glow: "from-red-400/30 via-orange-400/20 to-amber-400/30",
                  },
                  {
                    icon: <Mail size={18} className="text-blue-400" />,
                    name: "Outlook",
                    time: "1 min",
                    glow: "from-blue-400/30 via-cyan-400/20 to-sky-400/30",
                  },
                ].map((c) => (
                  <GlowCard key={c.name} glowColor={c.glow}>
                    <div className="p-5 text-center">
                      <div className="w-11 h-11 rounded-xl bg-os-bg border border-os-border flex items-center justify-center mx-auto mb-3">
                        {c.icon}
                      </div>
                      <div className="text-sm font-bold mb-1">{c.name}</div>
                      <div className="text-[10px] font-mono text-os-text-dim">
                        ~{c.time} to set up
                      </div>
                    </div>
                  </GlowCard>
                ))}
              </div>

              <Callout type="info" title="Where to connect">
                Either during the onboarding wizard, or any time later from{" "}
                <strong className="text-white">Settings → Channels</strong>. You can disconnect
                a channel any time without losing past conversations.
              </Callout>
            </Section>

            {/* ============ WHATSAPP ============ */}
            <Section id="whatsapp" eyebrow="Channels" title="Connecting WhatsApp">
              <p className="text-os-text-dim leading-relaxed mb-6">
                The most important channel for Indian SMBs. KROVA supports{" "}
                <strong className="text-white">WhatsApp Business</strong> (the green-icon app).
                Regular personal WhatsApp is not supported.
              </p>

              <NumberedSteps
                steps={[
                  {
                    title: "Open Settings → Channels",
                    body: "Click the WhatsApp tile.",
                  },
                  {
                    title: "Scan the QR code",
                    body: "On your phone, open WhatsApp Business → Settings → Linked Devices → Link a Device. Scan the QR shown in KROVA.",
                  },
                  {
                    title: "Wait for confirmation",
                    body: "You&apos;ll see a green checkmark within 10 seconds. KROVA starts syncing your recent chats immediately.",
                  },
                  {
                    title: "Set the briefing number",
                    body: "Make sure your WhatsApp number is also entered in Settings → Briefing — that&apos;s where the 8 AM message arrives.",
                  },
                ]}
              />

              <Callout type="warning" title="Personal WhatsApp won't work">
                You need WhatsApp Business — the free app with the green-suitcase icon. If you
                only have personal WhatsApp, download Business from the Play Store / App Store
                first; it can use the same number after transfer.
              </Callout>
            </Section>

            {/* ============ INSTAGRAM ============ */}
            <Section id="instagram" eyebrow="Channels" title="Connecting Instagram">
              <p className="text-os-text-dim leading-relaxed mb-6">
                Works with <strong className="text-white">Business</strong> or{" "}
                <strong className="text-white">Creator</strong> accounts. Personal accounts
                aren&apos;t supported by Instagram&apos;s API.
              </p>

              <NumberedSteps
                steps={[
                  {
                    title: "Switch to Business / Creator",
                    body: "If you haven't already, open Instagram → Settings → Account Type → Switch to Business.",
                  },
                  {
                    title: "Link to a Facebook Page",
                    body: "Instagram's API requires a connected Facebook Page. Create one if you don't have one — takes a minute.",
                  },
                  {
                    title: "Click Connect in KROVA",
                    body: "Settings → Channels → Instagram. You'll be sent to Meta to grant permissions.",
                  },
                  {
                    title: "Approve permissions",
                    body: "Allow KROVA to read DMs and send DMs. Approve.",
                  },
                ]}
              />

              <Callout type="tip" title="Story replies & comments">
                KROVA also captures story replies and DMs from comment-buttons. Story replies
                are treated as fresh conversations.
              </Callout>
            </Section>

            {/* ============ GMAIL ============ */}
            <Section id="gmail" eyebrow="Channels" title="Connecting Gmail">
              <p className="text-os-text-dim leading-relaxed mb-6">
                Works with any Gmail or Google Workspace inbox. One click and you&apos;re done.
              </p>

              <NumberedSteps
                steps={[
                  {
                    title: "Click Connect Gmail",
                    body: "Settings → Channels → Gmail. You'll be sent to Google.",
                  },
                  {
                    title: "Choose the right account",
                    body: "If you're signed into multiple Google accounts, pick the business one.",
                  },
                  {
                    title: "Grant read + send permissions",
                    body: "KROVA reads your business inbox and sends replies on your behalf. Approve both.",
                  },
                  {
                    title: "Filter inbox (optional)",
                    body: "In Settings → Channels → Gmail you can exclude labels (e.g. Newsletters) so KROVA doesn&apos;t analyze them.",
                  },
                ]}
              />
            </Section>

            {/* ============ OUTLOOK ============ */}
            <Section id="outlook" eyebrow="Channels" title="Connecting Outlook">
              <p className="text-os-text-dim leading-relaxed mb-6">
                Works with personal Outlook.com and Microsoft 365 work accounts.
              </p>

              <NumberedSteps
                steps={[
                  {
                    title: "Click Connect Outlook",
                    body: "Settings → Channels → Outlook. You'll be sent to Microsoft.",
                  },
                  {
                    title: "Sign in",
                    body: "Use your Microsoft account credentials.",
                  },
                  {
                    title: "Approve permissions",
                    body: "Mail.Read and Mail.Send. KROVA never reads OneDrive or Teams.",
                  },
                ]}
              />

              <Callout type="info" title="Workspace admin approval">
                Some Microsoft 365 tenants require IT admin approval before third-party apps
                can connect. If you see an "admin approval required" message, forward the
                Microsoft consent page to your IT team — it&apos;s a one-click approval on their
                end.
              </Callout>
            </Section>

            {/* ============ VOICE ============ */}
            <Section id="voice" eyebrow="Configure" title="Teaching KROVA your voice">
              <p className="text-os-text-dim leading-relaxed mb-6">
                The AI writes drafts in <em>your</em> tone — not generic chatbot language. It
                learns from two places: your past sent messages, and your edits to its drafts.
              </p>

              <h3 className="text-lg font-bold mb-3">Where to teach it</h3>
              <div className="space-y-3">
                {[
                  {
                    title: "Settings → Voice → Tone",
                    body: "Pick one: Formal, Friendly, or Casual. This sets the default for new drafts.",
                  },
                  {
                    title: "Settings → Voice → Language mix",
                    body: "English / Hindi / Hinglish. Most Indian SMBs go Hinglish.",
                  },
                  {
                    title: "Settings → Voice → Examples",
                    body: "Paste 5 sample replies you've sent before. The AI clones the cadence, emoji use, and greetings.",
                  },
                  {
                    title: "Edit drafts that don't sound like you",
                    body: "Every edit you make teaches the AI. After ~20 edits the drafts start landing close to perfect.",
                  },
                ].map((s, i) => (
                  <div
                    key={s.title}
                    className="flex gap-4 p-4 rounded-2xl border border-os-border bg-os-card/40"
                  >
                    <div className="text-[10px] font-bold font-mono text-os-text-dim shrink-0 mt-1">
                      0{i + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold mb-1">{s.title}</h4>
                      <p className="text-xs text-os-text-dim leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* ============ GUARDRAILS ============ */}
            <Section id="guardrails" eyebrow="Configure" title="Setting guardrails">
              <p className="text-os-text-dim leading-relaxed mb-6">
                Guardrails are <strong className="text-white">hard rules</strong> the AI must
                never break. Examples: never quote a price below ₹X, never name a competitor,
                never make medical claims.
              </p>

              <h3 className="text-lg font-bold mb-3">Common guardrails owners set</h3>
              <ul className="space-y-2.5 mb-6">
                {[
                  "Never quote prices without my approval first",
                  "Never recommend a competitor product",
                  "Never promise delivery faster than 48 hours",
                  "Never use slang like 'bro' or 'mate'",
                  "Always confirm before booking an appointment",
                  "Never share my personal phone number",
                ].map((it) => (
                  <li
                    key={it}
                    className="flex items-start gap-2.5 text-sm text-os-text-dim"
                  >
                    <ShieldCheck size={14} className="text-violet-400 mt-0.5 shrink-0" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>

              <Callout type="security" title="Enforced on every draft">
                Guardrails are checked twice — once when reading the conversation, and once
                before any draft reaches your queue. The brain refuses to break them, even if
                a customer asks directly.
              </Callout>
            </Section>

            {/* ============ AUTOPILOT ============ */}
            <Section id="autopilot" eyebrow="Configure" title="Autopilot rules">
              <p className="text-os-text-dim leading-relaxed mb-6">
                Autopilot lets you set <strong className="text-white">"when X happens, do Y"</strong>{" "}
                rules. Set once, KROVA runs forever.
              </p>

              <h3 className="text-lg font-bold mb-3">Popular recipes</h3>
              <div className="space-y-3">
                {[
                  {
                    when: "Lead hasn't replied in 3 days",
                    then: "Draft a polite follow-up and add it to my queue",
                  },
                  {
                    when: "New lead arrives on WhatsApp",
                    then: "Send a friendly greeting in my Hinglish tone",
                  },
                  {
                    when: "Health score drops below 40",
                    then: "Notify me on WhatsApp · add to morning briefing",
                  },
                  {
                    when: "Customer status changes to Converted",
                    then: "Send a thank-you message 30 minutes later",
                  },
                  {
                    when: "Every Monday at 9 AM",
                    then: "Send me a weekly summary of pipeline + revenue",
                  },
                  {
                    when: "Customer mentions a birthday",
                    then: "Remind me 1 day before · draft a birthday wish",
                  },
                ].map((r) => (
                  <div
                    key={r.when}
                    className="grid grid-cols-12 gap-3 p-4 rounded-xl border border-os-border bg-os-card/40"
                  >
                    <div className="col-span-12 md:col-span-5">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-violet-400 mb-1">
                        When
                      </div>
                      <div className="text-sm text-white">{r.when}</div>
                    </div>
                    <div className="col-span-12 md:col-span-7">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 mb-1">
                        Then
                      </div>
                      <div className="text-sm text-os-text-dim">{r.then}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Callout type="tip" title="Where to set them">
                Settings → Autopilot → New Rule. Pick a trigger from the dropdown, pick an
                action, and toggle it on. You can have up to 50 active rules per workspace.
              </Callout>
            </Section>

            {/* ============ TEAM ============ */}
            <Section id="team" eyebrow="Configure" title="Adding team members">
              <p className="text-os-text-dim leading-relaxed mb-6">
                On the Pro plan you can invite up to 5 team members. Each has their own login
                and role.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    role: "Owner",
                    desc: "Full access — billing, settings, channels, everything.",
                    glow: "from-amber-400/30 via-orange-400/20 to-yellow-400/30",
                  },
                  {
                    role: "Manager",
                    desc: "Can see all data, edit guardrails, but not change billing.",
                    glow: "from-violet-400/30 via-fuchsia-400/20 to-purple-400/30",
                  },
                  {
                    role: "Team Member",
                    desc: "Sees only conversations assigned to them. Approves their own actions.",
                    glow: "from-teal-400/30 via-cyan-400/20 to-sky-400/30",
                  },
                ].map((r) => (
                  <GlowCard key={r.role} glowColor={r.glow}>
                    <div className="p-5">
                      <h4 className="text-sm font-bold mb-1">{r.role}</h4>
                      <p className="text-xs text-os-text-dim leading-relaxed">{r.desc}</p>
                    </div>
                  </GlowCard>
                ))}
              </div>

              <h3 className="text-lg font-bold mt-8 mb-3">How to invite</h3>
              <NumberedSteps
                steps={[
                  { title: "Open Settings → Team", body: "" },
                  {
                    title: "Click Invite Member",
                    body: "Enter their email and pick a role.",
                  },
                  {
                    title: "They receive an email",
                    body: "Clicking the link takes them through a 30-second sign-up.",
                  },
                  {
                    title: "Start assigning conversations",
                    body: "From any customer page, set the Assigned dropdown to the team member.",
                  },
                ]}
              />
            </Section>

            {/* ============ MOBILE ============ */}
            <Section id="mobile" eyebrow="Apps" title="Using the mobile app">
              <p className="text-os-text-dim leading-relaxed mb-6">
                The mobile app gives you full parity with the web dashboard. Available on iOS
                and Android.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    title: "Approve from anywhere",
                    body: "One-tap approve/reject right from the lock-screen notification — no need to open the app.",
                  },
                  {
                    title: "Push alerts for hot leads",
                    body: "KROVA pings you the moment a new buyer-intent message lands. Never miss the moment.",
                  },
                  {
                    title: "Voice-note transcription",
                    body: "Hindi, Hinglish, English. Customers send voice notes; KROVA reads them as text.",
                  },
                  {
                    title: "Works offline",
                    body: "Drafts you approve while offline are queued and sent when you reconnect.",
                  },
                ].map((m) => (
                  <SpotlightCard key={m.title}>
                    <div className="p-5">
                      <h4 className="text-sm font-bold mb-1">{m.title}</h4>
                      <p className="text-xs text-os-text-dim leading-relaxed">{m.body}</p>
                    </div>
                  </SpotlightCard>
                ))}
              </div>

              <Callout type="info" title="Where to download">
                The mobile app is in private beta. Email us to request access and we&apos;ll send
                the TestFlight / Play Store invite within 24 hours.
              </Callout>
            </Section>

            {/* ============ SETTINGS MAP ============ */}
            <Section id="settings" eyebrow="Help" title="Where everything lives">
              <p className="text-os-text-dim leading-relaxed mb-6">
                A quick map of where to find each setting in the dashboard.
              </p>

              <div className="space-y-2">
                {[
                  { path: "Settings → Profile", what: "Business name, city, type" },
                  { path: "Settings → Channels", what: "Connect / disconnect WhatsApp, IG, Gmail, Outlook" },
                  { path: "Settings → Briefing", what: "Phone number, time, frequency" },
                  { path: "Settings → Voice", what: "Tone, language, sample replies" },
                  { path: "Settings → Guardrails", what: "Rules the AI must never break" },
                  { path: "Settings → Autopilot", what: "Automatic when/then rules" },
                  { path: "Settings → Team", what: "Invite team members, set roles" },
                  { path: "Settings → Privacy", what: "Export data, delete everything" },
                  { path: "Settings → Billing", what: "Plan, payment method, invoices" },
                ].map((row) => (
                  <div
                    key={row.path}
                    className="grid grid-cols-12 gap-3 p-3 rounded-xl border border-os-border bg-os-card/40 hover:border-os-border-bright transition-colors"
                  >
                    <div className="col-span-12 md:col-span-5">
                      <code className="text-xs px-2 py-0.5 rounded bg-os-bg border border-os-border text-teal-400">
                        {row.path}
                      </code>
                    </div>
                    <div className="col-span-12 md:col-span-7 text-sm text-os-text-dim">
                      {row.what}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* ============ FAQ ============ */}
            <Section id="faq" eyebrow="Help" title="Frequently asked">
              <div className="space-y-3">
                {[
                  {
                    q: "Is KROVA a CRM?",
                    a: "No. CRMs are databases you have to feed. KROVA is your AI business analyst — it reads your conversations on its own, tells you what's at risk, and drafts the next move. You approve. It executes.",
                  },
                  {
                    q: "Will the AI sound like me?",
                    a: "Yes — within the first 20 approvals. The AI clones your tone from sent messages, language mix (English / Hindi / Hinglish), greeting style, emoji use, and your edits.",
                  },
                  {
                    q: "Does KROVA reply automatically?",
                    a: "By default, no — every draft waits for your approval. You can enable specific Autopilot rules to send certain low-risk replies automatically (e.g. 'send greeting on new lead'), but the safe default is approval-first.",
                  },
                  {
                    q: "What does the 14-day trial include?",
                    a: "Full Growth plan — all 4 channels, unlimited drafts, customer intelligence dashboard. No credit card.",
                  },
                  {
                    q: "How is this different from Zoho / Freshdesk?",
                    a: "Those are CRMs — manual data entry tools. KROVA is the analyst that uses the data. It reads, scores, decides, and drafts — they just store.",
                  },
                  {
                    q: "What if I want to cancel?",
                    a: "Cancel from Settings → Billing. You keep access until the end of the billing period and can export all your data.",
                  },
                  {
                    q: "Can I add more than one WhatsApp number?",
                    a: "Yes. Each is a separate channel. Common for owners running multiple businesses from the same dashboard.",
                  },
                  {
                    q: "Does it work in Hindi?",
                    a: "Yes. Reads, scores, and drafts in Hindi, Hinglish, and English. Switches automatically based on what the customer wrote.",
                  },
                ].map((t) => (
                  <details
                    key={t.q}
                    className="group rounded-2xl border border-os-border bg-os-card/40 overflow-hidden"
                  >
                    <summary className="px-4 py-3 cursor-pointer font-bold text-sm flex items-center justify-between">
                      {t.q}
                      <ArrowRight
                        size={14}
                        className="text-os-text-dim transition-transform group-open:rotate-90"
                      />
                    </summary>
                    <div className="px-4 pb-4 text-sm text-os-text-dim leading-relaxed">
                      {t.a}
                    </div>
                  </details>
                ))}
              </div>
            </Section>

            {/* ============ TROUBLESHOOTING ============ */}
            <Section id="troubleshooting" eyebrow="Help" title="Common issues">
              <div className="space-y-3">
                {[
                  {
                    q: "My morning briefing didn't arrive",
                    a: "Check Settings → Briefing. Most often: the WhatsApp number isn't verified. Tap re-verify, you'll get a 6-digit code on WhatsApp. Enter it. Next briefing arrives on schedule.",
                  },
                  {
                    q: "AI drafts don't sound like me",
                    a: "Voice trains from your sent messages. If you're new, drop 5 examples in Settings → Voice → Examples. Also: every edit you make teaches it. After ~20 edits the drafts get noticeably closer.",
                  },
                  {
                    q: "WhatsApp keeps disconnecting",
                    a: "WhatsApp sessions expire after 14 days for security. Re-link from Settings → Channels. We'll soon support persistent connections via the official Cloud API.",
                  },
                  {
                    q: "I see no actions in the queue",
                    a: "The nightly brain runs at 10 PM IST. Inbound from today shows up tomorrow morning. If you want it now, hit 'Run analysis' on the Intelligence page.",
                  },
                  {
                    q: "An action was sent to the wrong customer",
                    a: "This shouldn't happen — every action shows the recipient before approve. If it did, email us with the action ID (visible in URL). We'll roll it back and investigate.",
                  },
                  {
                    q: "I want to export all my data",
                    a: "Settings → Privacy → Export. You'll get a ZIP with every conversation, action, and relationship within 24 hours.",
                  },
                  {
                    q: "How do I pause KROVA temporarily?",
                    a: "Settings → Briefing → Pause briefings. You can also disconnect channels temporarily without losing past data.",
                  },
                ].map((t) => (
                  <details
                    key={t.q}
                    className="group rounded-2xl border border-os-border bg-os-card/40 overflow-hidden"
                  >
                    <summary className="px-4 py-3 cursor-pointer font-bold text-sm flex items-center justify-between">
                      {t.q}
                      <ArrowRight
                        size={14}
                        className="text-os-text-dim transition-transform group-open:rotate-90"
                      />
                    </summary>
                    <div className="px-4 pb-4 text-sm text-os-text-dim leading-relaxed">
                      {t.a}
                    </div>
                  </details>
                ))}
              </div>
            </Section>

            {/* ============ PRIVACY ============ */}
            <Section id="privacy" eyebrow="Help" title="Privacy & your data">
              <p className="text-os-text-dim leading-relaxed mb-6">
                KROVA is built for Indian SMBs under Indian data law. Your conversations are
                yours.
              </p>

              <GlowCard glowColor="from-emerald-400/30 via-teal-400/20 to-cyan-400/30">
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      k: "Where your data lives",
                      v: "Mumbai (Indian region) only. Never copied abroad.",
                    },
                    {
                      k: "Encryption",
                      v: "Industry-standard at rest and in transit.",
                    },
                    {
                      k: "Compliance",
                      v: "DPDPA 2023 (India). SOC 2 in progress.",
                    },
                    {
                      k: "Model training",
                      v: "Your conversations never train shared models.",
                    },
                    {
                      k: "Delete everything",
                      v: "One click in Settings → Privacy. Erased within 30 days.",
                    },
                    {
                      k: "Audit log",
                      v: "Every action logged and exportable any time.",
                    },
                  ].map((r) => (
                    <div
                      key={r.k}
                      className="p-3 rounded-xl border border-os-border bg-os-bg/40"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">
                        {r.k}
                      </div>
                      <div className="text-sm text-white">{r.v}</div>
                    </div>
                  ))}
                </div>
              </GlowCard>

              <Callout type="security" title="See something off?">
                Email{" "}
                <a
                  href="mailto:security@krova.in"
                  className="text-white font-bold hover:underline"
                >
                  security@krova.in
                </a>
                . We take every report seriously and reply within 24 hours.
              </Callout>
            </Section>

            {/* CLOSING CTA */}
            <section className="relative rounded-3xl overflow-hidden border border-os-border bg-os-card p-12 text-center">
              <Particles className="absolute inset-0" quantity={40} color="#5EEAD4" />
              <DotPattern className="opacity-20 [mask-image:radial-gradient(400px_circle_at_center,white,transparent)]" />
              <BorderBeam size={300} duration={12} colorFrom="#5EEAD4" colorTo="#A78BFA" />
              <div className="relative z-10">
                <h2 className="text-3xl font-bold tracking-tight mb-3">
                  Ready to <AuroraText>get started?</AuroraText>
                </h2>
                <p className="text-os-text-dim mb-6 max-w-md mx-auto">
                  Setup takes 5 minutes. Your first briefing lands tomorrow morning.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link href="/signup">
                    <button className="os-button os-button-primary px-8 py-3 text-sm font-bold inline-flex items-center gap-2">
                      Create account <ArrowRight size={14} />
                    </button>
                  </Link>
                  <a
                    href="mailto:hello@krova.in"
                    className="os-button os-button-secondary px-8 py-3 text-sm font-bold inline-flex items-center gap-2"
                  >
                    Email us
                  </a>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <footer className="py-10 px-6 border-t border-os-border text-center relative z-10">
        <p className="text-[10px] font-mono text-os-text-dim uppercase tracking-[0.3em]">
          KROVA × AQIROX // USER GUIDE
        </p>
      </footer>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim mb-2">
        <span className="text-teal-400">▸</span>
        {eyebrow}
      </div>
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
        <AuroraText>{title}</AuroraText>
      </h2>
      <div>{children}</div>
    </section>
  );
}

function NumberedSteps({
  steps,
}: {
  steps: { title: string; body: React.ReactNode }[];
}) {
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div
          key={s.title}
          className="flex gap-4 p-4 rounded-2xl border border-os-border bg-os-card/40"
        >
          <div className="relative w-9 h-9 shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400/30 to-violet-400/30 blur" />
            <div className="relative w-9 h-9 rounded-xl bg-os-bg border border-os-border flex items-center justify-center text-xs font-bold">
              {i + 1}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold mb-1">{s.title}</h4>
            <div className="text-sm text-os-text-dim leading-relaxed">{s.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
