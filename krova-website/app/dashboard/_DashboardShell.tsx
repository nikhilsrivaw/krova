"use client";

import React, { useEffect, useState } from "react";
import {
  Sun,
  CheckSquare,
  BarChart2,
  Users,
  LogOut,
  Search,
  Bell,
  Settings,
  ChevronRight,
  ChevronDown,
  Brain,
  Zap,
  DollarSign,
  Globe,
  Clock,
  Sparkles,
  Target,
  Lightbulb,
  Star,
  CheckCircle,
  ShieldAlert,
  BarChart3,
  Heart,
  Shield,
  Mic,
  Users2,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

import { BorderBeam } from "@/components/magicui/border-beam";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { Particles } from "@/components/magicui/particles";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signOut } = useAuth();
  const [userRole, setUserRole] = useState<"owner" | "manager" | "team_member">("owner");

  // Sidebar dropdown — auto-expand when we're on the Intelligence page
  const isOnIntelligence = pathname === "/dashboard/intelligence";
  const [intelligenceOpen, setIntelligenceOpen] = useState(isOnIntelligence);
  useEffect(() => {
    if (isOnIntelligence) setIntelligenceOpen(true);
  }, [isOnIntelligence]);

  const currentLens = searchParams.get("lens") || "predictions";

  useEffect(() => {
    if (user) {
      api
        .get<{ role: string }>("/team/me")
        .then((d) => {
          if (d.role === "team_member" || d.role === "manager" || d.role === "owner") {
            setUserRole(d.role as "owner" | "manager" | "team_member");
          }
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen bg-os-bg items-center justify-center relative overflow-hidden">
        <Particles className="absolute inset-0" quantity={40} color="#ffffff" />
        <div className="absolute w-96 h-96 bg-teal-500/10 blur-[120px] rounded-full" />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-400/30 to-violet-400/30 blur-xl" />
            <div className="relative w-12 h-12 bg-os-card border border-os-border rounded-2xl flex items-center justify-center overflow-hidden">
              <BorderBeam size={40} duration={4} colorFrom="#5EEAD4" colorTo="#A78BFA" />
              <Brain size={20} className="text-white relative z-10" />
            </div>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-os-text-dim">
            Loading workspace…
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isTeamMember = userRole === "team_member";

  const allTodayItems = [
    { icon: <Sun size={16} />, label: "Briefing", path: "/dashboard", teamMember: true },
    {
      icon: <CheckSquare size={16} />,
      label: "Actions",
      path: "/dashboard/approvals",
      badge: true,
      teamMember: true,
    },
    {
      icon: <Clock size={16} />,
      label: "Commitments",
      path: "/dashboard/commitments",
      teamMember: true,
    },
  ];

  // Items that sit at the top of the Intelligence section (besides the
  // expandable Intelligence dropdown). The Intelligence item itself is
  // rendered separately because it expands into a sub-list of lenses.
  const allIntelligenceItems = [
    {
      icon: <DollarSign size={16} />,
      label: "Revenue Leaks",
      path: "/dashboard/revenue",
      teamMember: false,
    },
    {
      icon: <BarChart2 size={16} />,
      label: "Analytics",
      path: "/dashboard/analytics",
      teamMember: false,
    },
    {
      icon: <Globe size={16} />,
      label: "Network",
      path: "/dashboard/network",
      teamMember: false,
    },
  ];

  // The 15 lenses inside Business Intelligence
  const INTELLIGENCE_LENSES: { id: string; label: string; Icon: React.ElementType }[] = [
    { id: "predictions", label: "Predictions", Icon: Target },
    { id: "dna", label: "Business DNA", Icon: Brain },
    { id: "commitments", label: "Commitments", Icon: CheckCircle },
    { id: "revenue", label: "Revenue Leaks", Icon: DollarSign },
    { id: "competitors", label: "Competitors", Icon: ShieldAlert },
    { id: "growth", label: "Growth Blockers", Icon: BarChart3 },
    { id: "financial", label: "Financial", Icon: Zap },
    { id: "learning", label: "This Week", Icon: Lightbulb },
    { id: "reputation", label: "Reputation", Icon: Star },
    { id: "gratitude", label: "Gratitude", Icon: Heart },
    { id: "antispam", label: "Anti-Spam", Icon: Shield },
    { id: "reldebt", label: "Relationship Debt", Icon: Clock },
    { id: "voice", label: "Voice of Customer", Icon: Mic },
    { id: "clusters", label: "Customer Clusters", Icon: Users2 },
    { id: "coach", label: "KROVA Coach", Icon: GraduationCap },
  ];

  const allRelationshipItems = [
    {
      icon: <Users size={16} />,
      label: "Relationships",
      path: "/dashboard/customers",
      teamMember: true,
    },
    {
      icon: <Zap size={16} />,
      label: "Autopilot",
      path: "/dashboard/autopilot",
      teamMember: false,
    },
  ];

  const todayItems = allTodayItems.filter((i) => !isTeamMember || i.teamMember);
  const intelligenceItems = allIntelligenceItems.filter((i) => !isTeamMember || i.teamMember);
  const relationshipItems = allRelationshipItems.filter((i) => !isTeamMember || i.teamMember);

  const allNavItems = [...todayItems, ...intelligenceItems, ...relationshipItems];
  const breadcrumb =
    allNavItems.find((i) => i.path === pathname)?.label ??
    (pathname === "/dashboard/settings" ? "Settings" : "Briefing");

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const renderNavSection = (
    title: string,
    items: { icon: React.ReactNode; label: string; path: string; badge?: boolean }[],
  ) => (
    <nav className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-os-text-dim mb-4 px-2">
        {title}
      </p>
      {items.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.label}
            href={item.path}
            className={`relative flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all group overflow-hidden ${
              isActive
                ? "bg-white/5 text-white border border-os-border-bright"
                : "text-os-text-dim hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            {isActive && (
              <BorderBeam
                size={80}
                duration={8}
                colorFrom="#5EEAD4"
                colorTo="#A78BFA"
                borderWidth={1}
              />
            )}
            <div className="relative flex items-center gap-3">
              <span
                className={`${isActive ? "text-teal-400" : "text-os-text-dim group-hover:text-white"} transition-colors`}
              >
                {item.icon}
              </span>
              <span className="font-medium text-xs tracking-tight">{item.label}</span>
            </div>
            {item.badge && (
              <div className="relative">
                <span className="block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
              </div>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen bg-os-bg overflow-hidden text-white font-sans relative">
      {/* Subtle background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="os-noise" />
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-teal-500/[0.04] blur-[160px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-500/[0.04] blur-[180px] rounded-full" />
      </div>

      {/* Sidebar */}
      <aside className="w-64 border-r border-os-border bg-os-bg/80 backdrop-blur-md flex flex-col relative z-10 shrink-0">
        <div className="h-14 border-b border-os-border flex items-center px-6 gap-3 relative overflow-hidden">
          <Link
            href="/"
            className="relative w-7 h-7 bg-white rounded-md flex items-center justify-center group"
          >
            <div className="w-3.5 h-3.5 bg-black rounded-sm" />
            <motion.div
              className="absolute inset-0 rounded-md bg-gradient-to-tr from-transparent via-teal-300/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          </Link>
          <div className="flex flex-col leading-none">
            <span className="font-bold tracking-tighter text-sm">KROVA</span>
            <span className="text-[7px] text-os-text-dim font-mono uppercase tracking-[0.2em] mt-0.5">
              AI Analyst
            </span>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-8">
          {renderNavSection("Today", todayItems)}

          {/* ── INTELLIGENCE — special expandable item ───────────────────── */}
          <nav className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-os-text-dim mb-4 px-2">
              Intelligence
            </p>

            {/* Expandable Intelligence entry */}
            <button
              onClick={() => {
                if (!isOnIntelligence) router.push("/dashboard/intelligence");
                setIntelligenceOpen((v) => !v);
              }}
              className={`relative w-full flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all group overflow-hidden ${
                isOnIntelligence
                  ? "bg-white/5 text-white border border-os-border-bright"
                  : "text-os-text-dim hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              {isOnIntelligence && (
                <BorderBeam
                  size={80}
                  duration={8}
                  colorFrom="#5EEAD4"
                  colorTo="#A78BFA"
                  borderWidth={1}
                />
              )}
              <div className="relative flex items-center gap-3">
                <span
                  className={`${isOnIntelligence ? "text-teal-400" : "text-os-text-dim group-hover:text-white"} transition-colors`}
                >
                  <Brain size={16} />
                </span>
                <span className="font-medium text-xs tracking-tight">Intelligence</span>
              </div>
              <ChevronDown
                size={12}
                className={`relative text-os-text-dim transition-transform duration-200 ${intelligenceOpen ? "rotate-0" : "-rotate-90"}`}
              />
            </button>

            {/* Lens sub-items */}
            <AnimatePresence initial={false}>
              {intelligenceOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pl-4 pt-1 space-y-0.5 border-l border-os-border ml-3.5">
                    {INTELLIGENCE_LENSES.map((lens) => {
                      const isLensActive =
                        isOnIntelligence && currentLens === lens.id;
                      return (
                        <Link
                          key={lens.id}
                          href={`/dashboard/intelligence?lens=${lens.id}`}
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors text-[11px] ${
                            isLensActive
                              ? "bg-white/[0.06] text-white"
                              : "text-os-text-dim hover:text-white hover:bg-white/[0.03]"
                          }`}
                        >
                          <lens.Icon
                            size={12}
                            className={
                              isLensActive ? "text-teal-400" : "text-os-text-dim"
                            }
                          />
                          <span className="font-medium tracking-tight truncate">
                            {lens.label}
                          </span>
                          {isLensActive && (
                            <span className="ml-auto w-1 h-1 rounded-full bg-teal-400" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Other items in the Intelligence group (Revenue, Analytics, Network) */}
            <div className="pt-1">
              {intelligenceItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.label}
                    href={item.path}
                    className={`relative flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all group overflow-hidden ${
                      isActive
                        ? "bg-white/5 text-white border border-os-border-bright"
                        : "text-os-text-dim hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    {isActive && (
                      <BorderBeam
                        size={80}
                        duration={8}
                        colorFrom="#5EEAD4"
                        colorTo="#A78BFA"
                        borderWidth={1}
                      />
                    )}
                    <div className="relative flex items-center gap-3">
                      <span
                        className={`${isActive ? "text-teal-400" : "text-os-text-dim group-hover:text-white"} transition-colors`}
                      >
                        {item.icon}
                      </span>
                      <span className="font-medium text-xs tracking-tight">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>

          {renderNavSection("People", relationshipItems)}
          {renderNavSection("System", [
            { icon: <Settings size={16} />, label: "Settings", path: "/dashboard/settings" },
          ])}
        </div>

        <div className="p-4 border-t border-os-border">
          <div className="flex items-center gap-3 mb-4 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer relative overflow-hidden">
            <div className="relative w-9 h-9 shrink-0">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400/40 to-violet-400/40 blur" />
              <div className="relative w-9 h-9 rounded-xl bg-os-card border border-os-border flex items-center justify-center text-white font-bold text-xs">
                {initials}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{displayName}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">
                {userRole === "owner" ? "Free Trial" : userRole.replace("_", " ")}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 text-os-text-dim hover:text-red-400 transition-all w-full p-2 rounded-lg hover:bg-red-500/5"
          >
            <LogOut size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 min-w-0">
        <header className="h-14 border-b border-os-border flex items-center justify-between px-8 bg-os-bg/60 backdrop-blur-xl shrink-0 relative">
          <div className="flex items-center gap-2 text-xs text-os-text-dim">
            <Sparkles size={11} className="text-violet-400" />
            <span>Workspace</span>
            <ChevronRight size={12} />
            <span className="text-white font-medium">{breadcrumb}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-os-border text-[10px] font-mono text-os-text-dim cursor-pointer hover:border-os-border-bright transition-colors">
              <Search size={10} />
              <span>Search...</span>
              <kbd className="ml-2 px-1 py-0.5 text-[8px] rounded bg-os-bg border border-os-border">
                ⌘K
              </kbd>
            </div>
            <button className="w-8 h-8 rounded-full border border-os-border flex items-center justify-center text-os-text-dim hover:text-white transition-colors cursor-pointer relative">
              <Bell size={14} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping opacity-75" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-10 bg-os-bg/30 relative">
          <DotPattern className="opacity-[0.06] [mask-image:radial-gradient(900px_circle_at_center,white,transparent)]" />
          <div className="max-w-6xl mx-auto relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
