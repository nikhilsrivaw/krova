"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, AlertCircle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { registerUser } from "@/lib/api";

import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Particles } from "@/components/magicui/particles";
import { AnimatedGridPattern } from "@/components/magicui/animated-grid-pattern";
import { Meteors } from "@/components/magicui/meteors";
import { DotPattern } from "@/components/magicui/dot-pattern";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      const fullName = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "";
      await registerUser(data.user.id, data.user.email!, fullName);
    }
    router.push("/dashboard");
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
  };

  return (
    <div className="min-h-screen bg-os-bg flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <AnimatedGridPattern
          numSquares={20}
          maxOpacity={0.08}
          duration={3}
          className="[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]"
        />
        <Particles className="absolute inset-0" quantity={60} ease={80} color="#ffffff" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 blur-[120px] rounded-full" />
      </div>

      <Meteors number={8} />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-10">
          <Link
            href="/"
            className="w-8 h-8 bg-white rounded-lg flex items-center justify-center"
          >
            <div className="w-3.5 h-3.5 bg-black rounded-sm" />
          </Link>
          <Link href="/" className="font-bold tracking-tighter text-2xl">
            KROVA
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative os-window overflow-visible"
        >
          <div className="relative overflow-hidden rounded-[inherit]">
            <BorderBeam size={200} duration={12} colorFrom="#5EEAD4" colorTo="#A78BFA" />
            <BorderBeam size={200} duration={12} delay={6} colorFrom="#FB7185" colorTo="#FCD34D" />

            <div className="h-9 border-b border-os-border flex items-center px-4 bg-os-bg/50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
                <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
                <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
              </div>
              <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">
                Auth / Sign In
              </span>
            </div>

            <form onSubmit={handleEmailLogin} className="p-8 space-y-5 relative">
              <DotPattern className="opacity-20 [mask-image:radial-gradient(200px_circle_at_top,white,transparent)]" />
              <div className="relative">
                <h1 className="text-2xl font-bold tracking-tight mb-1">
                  Welcome <AuroraText>back.</AuroraText>
                </h1>
                <p className="text-xs text-os-text-dim">Sign in to your KROVA workspace</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 relative">
                  <AlertCircle size={12} className="text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-400">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="os-button os-button-secondary w-full justify-center text-xs py-2.5 gap-3 relative"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M15.68 8.18c0-.57-.05-1.12-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.59 2.41v2h2.57c1.5-1.38 2.4-3.42 2.4-5.87z" fill="#4285F4" />
                  <path d="M8 16c2.16 0 3.97-.72 5.29-1.94l-2.57-2a4.8 4.8 0 01-7.15-2.52H.96v2.07A8 8 0 008 16z" fill="#34A853" />
                  <path d="M3.57 9.54A4.8 4.8 0 013.32 8c0-.54.09-1.06.25-1.54V4.39H.96A8 8 0 000 8c0 1.29.31 2.51.96 3.61l2.61-2.07z" fill="#FBBC05" />
                  <path d="M8 3.2c1.22 0 2.31.42 3.17 1.24l2.37-2.37A8 8 0 00.96 4.39L3.57 6.46A4.77 4.77 0 018 3.2z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 relative">
                <div className="flex-1 h-px bg-os-border" />
                <span className="text-[10px] text-os-text-dim uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-os-border" />
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
                />
              </div>

              <div className="space-y-1.5 relative">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-[10px] text-os-text-dim hover:text-white transition-colors uppercase tracking-widest"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-os-text-dim hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="os-button os-button-primary w-full justify-center py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed gap-2 relative"
              >
                {loading ? (
                  "Signing in..."
                ) : (
                  <>
                    Sign In <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </form>

            <div className="px-8 pb-6 text-center relative">
              <p className="text-[11px] text-os-text-dim">
                No account?{" "}
                <Link href="/signup" className="text-white hover:underline font-bold">
                  Create workspace
                </Link>
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center"
        >
          <Link
            href="/"
            className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <Sparkles size={10} className="text-violet-400" />
            Back to KROVA
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
