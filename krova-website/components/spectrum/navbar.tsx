"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  Brain,
  Sun,
  Sparkles,
  DollarSign,
  Layout,
  Zap,
  ArrowRight,
  Command,
  Search,
  ChevronDown,
  BookOpen,
  Smartphone,
} from "lucide-react";
import { BorderBeam } from "@/components/magicui/border-beam";
import { cn } from "@/lib/utils";

interface NavLink {
  label: string;
  href: string;
  mega?: MegaItem[];
}

interface MegaItem {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  accent?: string;
}

const LINKS: NavLink[] = [
  {
    label: "Workspace",
    href: "/workspace",
    mega: [
      {
        icon: <Layout size={18} className="text-teal-400" />,
        title: "Unified Inbox",
        description: "WhatsApp, IG, Gmail in one workspace.",
        href: "/workspace",
        accent: "from-teal-400/30 to-cyan-400/20",
      },
      {
        icon: <Zap size={18} className="text-yellow-400" />,
        title: "Actions Queue",
        description: "AI-drafted replies, you just approve.",
        href: "/dashboard/approvals",
        accent: "from-yellow-400/30 to-orange-400/20",
      },
    ],
  },
  {
    label: "Intelligence",
    href: "/intelligence",
    mega: [
      {
        icon: <Brain size={18} className="text-violet-400" />,
        title: "AI Brain",
        description: "Reads every conversation. Scores every lead.",
        href: "/intelligence",
        accent: "from-violet-400/30 to-fuchsia-400/20",
      },
      {
        icon: <Sun size={18} className="text-amber-400" />,
        title: "Morning Briefing",
        description: "8 AM WhatsApp report — what to do today.",
        href: "/intelligence",
        accent: "from-amber-400/30 to-orange-400/20",
      },
      {
        icon: <DollarSign size={18} className="text-emerald-400" />,
        title: "Revenue Leaks",
        description: "Unpaid quotes & lost replies, caught nightly.",
        href: "/dashboard/revenue",
        accent: "from-emerald-400/30 to-teal-400/20",
      },
      {
        icon: <Sparkles size={18} className="text-pink-400" />,
        title: "Ghost Writer",
        description: "Drafts in your Hinglish tone. You approve.",
        href: "/intelligence",
        accent: "from-pink-400/30 to-rose-400/20",
      },
    ],
  },
  { label: "Mobile", href: "/mobile" },
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "/pricing" },
];

function MagneticLink({
  link,
  onHover,
  onLeave,
  onClick,
}: {
  link: NavLink;
  onHover: (rect: DOMRect, hasMega: boolean) => void;
  onLeave: () => void;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  function handleEnter() {
    if (ref.current) onHover(ref.current.getBoundingClientRect(), !!link.mega);
  }
  return (
    <Link
      ref={ref}
      href={link.href}
      onMouseEnter={handleEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className="relative z-10 flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors"
    >
      {link.label}
      {link.mega && <ChevronDown size={11} className="opacity-60" />}
    </Link>
  );
}

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [pillStyle, setPillStyle] = useState<{
    left: number;
    width: number;
    visible: boolean;
  }>({ left: 0, width: 0, visible: false });
  const [activeMega, setActiveMega] = useState<NavLink | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mouseTime, setMouseTime] = useState<Date | null>(null);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 40);
  });

  // Set time only on client to avoid hydration mismatch
  useEffect(() => {
    setMouseTime(new Date());
    const t = setInterval(() => setMouseTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Cmd+K
  const [cmdOpen, setCmdOpen] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
      if (e.key === "Escape") setCmdOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleLinkHover(rect: DOMRect, hasMega: boolean, link: NavLink) {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    // Position pill relative to the inner links container (its actual parent)
    if (!linksRef.current) return;
    const linksRect = linksRef.current.getBoundingClientRect();
    setPillStyle({
      left: rect.left - linksRect.left,
      width: rect.width,
      visible: true,
    });
    if (hasMega) setActiveMega(link);
    else setActiveMega(null);
  }

  function handleLinkLeave() {
    closeTimeoutRef.current = setTimeout(() => {
      setPillStyle((p) => ({ ...p, visible: false }));
      setActiveMega(null);
    }, 180);
  }

  function handleMegaEnter() {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }

  function handleMegaLeave() {
    setPillStyle((p) => ({ ...p, visible: false }));
    setActiveMega(null);
  }

  const timeStr = mouseTime
    ? mouseTime.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "--:--";

  return (
    <>
      <div className="fixed top-6 left-0 w-full flex justify-center z-50 px-6 pointer-events-none">
        <motion.nav
          ref={navRef}
          initial={{ y: -20, opacity: 0 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: scrolled ? 0.97 : 1,
          }}
          transition={{ duration: 0.25 }}
          className={cn(
            "pointer-events-auto relative h-14 rounded-full flex items-center justify-between px-2 max-w-5xl w-full shadow-2xl overflow-visible transition-all duration-300",
            scrolled
              ? "border border-white/20 bg-os-bg/85 backdrop-blur-2xl"
              : "border border-os-border bg-os-bg/60 backdrop-blur-xl",
          )}
        >
          <BorderBeam
            size={140}
            duration={14}
            delay={0}
            colorFrom="#5EEAD4"
            colorTo="#A78BFA"
          />
          <BorderBeam
            size={140}
            duration={14}
            delay={7}
            colorFrom="#FB7185"
            colorTo="#FCD34D"
          />

          {/* Left: logo */}
          <Link
            href="/"
            className="relative z-10 flex items-center gap-2 pl-3 pr-2 group"
          >
            <motion.div
              whileHover={{ rotate: 12, scale: 1.08 }}
              className="relative w-7 h-7 bg-white rounded-lg flex items-center justify-center overflow-hidden"
            >
              <div className="w-3 h-3 bg-black rounded-sm" />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-teal-300/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-black tracking-tighter">KROVA</span>
              <span className="text-[7px] text-os-text-dim font-mono uppercase tracking-[0.2em]">
                AI Analyst
              </span>
            </div>
          </Link>

          {/* Center: links with magnetic pill */}
          <div
            ref={linksRef}
            className="hidden md:flex relative items-center"
            onMouseLeave={handleLinkLeave}
          >
            <motion.div
              initial={false}
              animate={{
                left: pillStyle.left,
                width: pillStyle.width,
                opacity: pillStyle.visible ? 1 : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 35,
                opacity: { duration: 0.15 },
              }}
              className="absolute top-1/2 -translate-y-1/2 h-8 rounded-full bg-white/[0.06] border border-white/10 pointer-events-none"
            />
            {LINKS.map((l) => (
              <MagneticLink
                key={l.label}
                link={l}
                onHover={(rect, hasMega) => handleLinkHover(rect, hasMega, l)}
                onLeave={handleLinkLeave}
              />
            ))}
          </div>

          {/* Right: status + cmdK + auth + CTA */}
          <div className="relative z-10 flex items-center gap-2 pr-2">
            {/* Live status pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-os-border bg-os-card/60">
              <div className="relative">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim font-mono">
                Live · {timeStr}
              </span>
            </div>

            {/* Cmd+K */}
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-os-border bg-os-card/60 hover:bg-os-border transition-colors"
            >
              <Search size={11} className="text-os-text-dim" />
              <span className="flex items-center gap-1 text-[9px] font-mono text-os-text-dim">
                <kbd className="px-1 py-0.5 rounded bg-os-bg border border-os-border text-os-text-dim">
                  ⌘
                </kbd>
                <kbd className="px-1 py-0.5 rounded bg-os-bg border border-os-border text-os-text-dim">
                  K
                </kbd>
              </span>
            </button>

            <a
              href="https://app.krova.space"
              target="_blank"
              rel="noopener"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-os-border bg-os-card/60 hover:bg-os-border transition-colors"
            >
              <Smartphone size={11} className="text-teal-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                Open App
              </span>
            </a>

            <Link href="/login">
              <motion.button
                whileHover={{ color: "#FFFFFF" }}
                className="text-[11px] font-bold uppercase tracking-widest text-os-text-dim transition-colors px-2"
              >
                Log in
              </motion.button>
            </Link>

            {/* CTA — animated gradient pill */}
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="group relative overflow-hidden rounded-full"
              >
                <span className="relative z-10 flex items-center gap-1.5 bg-white text-black px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest">
                  Start Free
                  <ArrowRight
                    size={12}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </span>
                <div className="absolute inset-0 -z-0 bg-gradient-to-r from-teal-400 via-violet-400 to-pink-400 opacity-0 group-hover:opacity-30 transition-opacity blur-md" />
              </motion.button>
            </Link>
          </div>
        </motion.nav>
      </div>

      {/* MEGA MENU PANEL */}
      <AnimatePresence>
        {activeMega && activeMega.mega && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={handleMegaEnter}
            onMouseLeave={handleMegaLeave}
            className="fixed top-[80px] left-0 w-full flex justify-center z-40 px-6 pointer-events-none"
          >
            {/* Invisible hover bridge so cursor doesn't lose hover crossing the gap */}
            <div className="pointer-events-auto absolute top-0 left-1/2 -translate-x-1/2 w-[640px] h-4" />
            <div className="pointer-events-auto relative mt-4 max-w-3xl w-full rounded-3xl border border-os-border bg-os-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
              <BorderBeam size={180} duration={10} colorFrom="#5EEAD4" colorTo="#A78BFA" />
              <div className="p-6 grid grid-cols-2 gap-3">
                {activeMega.mega.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group relative rounded-2xl border border-os-border bg-os-bg/40 p-4 hover:border-white/20 transition-colors overflow-hidden"
                  >
                    <div
                      className={cn(
                        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br",
                        item.accent,
                      )}
                    />
                    <div className="relative flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-os-card border border-os-border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold flex items-center gap-1.5">
                          {item.title}
                          <ArrowRight
                            size={12}
                            className="text-os-text-dim opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                          />
                        </div>
                        <div className="text-[11px] text-os-text-dim mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="border-t border-os-border px-6 py-3 flex items-center justify-between bg-os-bg/40">
                <div className="flex items-center gap-2 text-[10px] font-mono text-os-text-dim uppercase tracking-widest">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  Real-time intelligence
                </div>
                <Link
                  href={activeMega.href}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white hover:text-teal-400 transition-colors"
                >
                  Explore {activeMega.label} <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMMAND PALETTE */}
      <AnimatePresence>
        {cmdOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-32 px-6"
            onClick={() => setCmdOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              onClick={(e: MouseEvent) => e.stopPropagation()}
              className="relative w-full max-w-xl rounded-2xl border border-os-border bg-os-card shadow-2xl overflow-hidden"
            >
              <BorderBeam size={200} duration={10} colorFrom="#5EEAD4" colorTo="#A78BFA" />
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-os-border">
                <Search size={16} className="text-os-text-dim" />
                <input
                  autoFocus
                  placeholder="Search pages, features, or ask KROVA..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-os-text-dim focus:outline-none"
                />
                <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-os-bg border border-os-border rounded text-os-text-dim">
                  ESC
                </kbd>
              </div>
              <div className="p-2 max-h-[400px] overflow-y-auto">
                <div className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-os-text-dim">
                  Jump to
                </div>
                {[
                  { icon: <Layout size={14} />, label: "Workspace", href: "/workspace" },
                  { icon: <Brain size={14} />, label: "Intelligence", href: "/intelligence" },
                  { icon: <Smartphone size={14} />, label: "Mobile (PWA)", href: "/mobile" },
                  { icon: <BookOpen size={14} />, label: "Documentation", href: "/docs" },
                  { icon: <Sun size={14} />, label: "Morning Briefing", href: "/intelligence" },
                  { icon: <DollarSign size={14} />, label: "Revenue Leaks", href: "/dashboard/revenue" },
                  { icon: <Command size={14} />, label: "Pricing", href: "/pricing" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setCmdOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-os-border/50 transition-colors text-sm"
                  >
                    <div className="w-7 h-7 rounded-lg bg-os-bg border border-os-border flex items-center justify-center text-os-text-dim">
                      {item.icon}
                    </div>
                    <span className="flex-1">{item.label}</span>
                    <ArrowRight size={12} className="text-os-text-dim" />
                  </Link>
                ))}
              </div>
              <div className="border-t border-os-border px-4 py-2.5 flex items-center justify-between bg-os-bg/40 text-[10px] font-mono text-os-text-dim">
                <span>Powered by KROVA AI</span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-os-card border border-os-border">↵</kbd>
                  to select
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
