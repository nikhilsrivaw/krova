"use client";

import { useRouter } from "next/navigation";
import { LogOut, User, Bell, Plug, ShieldCheck, ChevronRight, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="px-5 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim mb-1.5">
          <Smartphone size={10} className="text-teal-400" /> Account
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl border border-os-border bg-os-card/40 p-4 flex items-center gap-3">
        <div className="relative w-12 h-12 shrink-0">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400/40 to-violet-400/40 blur" />
          <div className="relative w-12 h-12 rounded-xl bg-os-bg border border-os-border flex items-center justify-center font-bold text-sm">
            {initials}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{displayName}</p>
          <p className="text-[11px] text-os-text-dim font-mono truncate">{user?.email}</p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {[
          { icon: User, label: "Business profile", hint: "Name, type, city" },
          { icon: Plug, label: "Channels", hint: "WhatsApp, Instagram, Gmail" },
          { icon: Bell, label: "Briefing schedule", hint: "8 AM IST by default" },
          { icon: ShieldCheck, label: "Guardrails", hint: "Rules the AI must follow" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="w-full rounded-2xl border border-os-border bg-os-card/40 px-4 py-3.5 flex items-center gap-3 active:bg-white/[0.03] transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-os-bg border border-os-border flex items-center justify-center text-os-text-dim shrink-0">
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-[11px] text-os-text-dim truncate">{item.hint}</p>
              </div>
              <ChevronRight size={14} className="text-os-text-dim shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/5 px-4 py-3.5 flex items-center gap-3 active:bg-rose-500/10 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-os-bg border border-os-border flex items-center justify-center text-rose-400 shrink-0">
          <LogOut size={15} />
        </div>
        <span className="text-sm font-bold text-rose-400">Sign out</span>
      </button>

      <p className="text-center text-[10px] text-os-text-dim font-mono uppercase tracking-widest mt-4">
        KROVA × AQIROX
      </p>
    </div>
  );
}
