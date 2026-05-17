"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { registerUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      const fullName =
        data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "";
      await registerUser(data.user.id, data.user.email!, fullName);
    }
    router.replace("/briefing");
  };

  return (
    <main className="min-h-screen flex flex-col px-6 safe-top safe-bottom">
      <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-400/30 to-violet-400/30 blur-xl" />
            <div className="relative w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
              <div className="w-5 h-5 bg-black rounded-md" />
            </div>
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back.</h1>
          <p className="text-sm text-os-text-dim">
            Sign in to your KROVA workspace
          </p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleLogin}
          className="space-y-4"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <AlertCircle size={14} className="text-rose-400 shrink-0" />
              <p className="text-xs text-rose-400">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
              Email
            </label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-os-card border border-os-border rounded-xl px-4 py-3.5 text-base text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                Password
              </label>
              <button
                type="button"
                className="text-[10px] text-os-text-dim hover:text-white uppercase tracking-widest"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-os-card border border-os-border rounded-xl px-4 py-3.5 pr-12 text-base text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-os-text-dim hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-white text-black text-sm font-bold uppercase tracking-widest hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Signing in…" : <>Sign In <ArrowRight size={16} /></>}
          </button>
        </motion.form>

        <p className="text-center text-[11px] text-os-text-dim mt-6">
          KROVA is a product of Aqirox Technology Pvt Ltd
        </p>
      </div>
    </main>
  );
}
