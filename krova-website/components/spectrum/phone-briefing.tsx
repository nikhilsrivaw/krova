"use client";

import { motion } from "motion/react";
import { Sun, Sparkles } from "lucide-react";
import { TypingAnimation } from "@/components/magicui/typing-animation";

const MESSAGES = [
  {
    from: "KROVA",
    time: "8:00 AM",
    body: "☀️ Good morning! Your briefing for today:",
    accent: true,
  },
  {
    from: "KROVA",
    time: "8:00 AM",
    body: "🔥 3 hot leads need replies today:\n• Priya D. — asked pricing twice\n• Rahul M. — ready to book\n• Anjali — wants demo",
  },
  {
    from: "KROVA",
    time: "8:01 AM",
    body: "⚠️ 2 going cold: Vikram & Sneha (4+ days silent)",
  },
  {
    from: "KROVA",
    time: "8:01 AM",
    body: "💰 ₹47,000 in unpaid quotes — I can send reminders. Reply ✅ to approve.",
  },
];

export function PhoneBriefing() {
  return (
    <div className="relative mx-auto w-[280px]">
      <div className="relative rounded-[2.5rem] border-8 border-os-card bg-os-bg shadow-2xl overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-os-card rounded-b-2xl z-20" />

        {/* WhatsApp-ish header */}
        <div className="bg-emerald-900/30 border-b border-emerald-500/20 px-4 pt-10 pb-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Sparkles size={16} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">KROVA</div>
            <div className="text-[9px] text-emerald-400">online · your AI analyst</div>
          </div>
        </div>

        {/* Chat body */}
        <div
          className="px-3 py-4 space-y-3 h-[460px] overflow-hidden"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
            backgroundSize: "12px 12px",
          }}
        >
          {MESSAGES.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.4 }}
              className="max-w-[88%]"
            >
              <div
                className={`rounded-2xl rounded-bl-sm px-3 py-2 text-[11px] whitespace-pre-line shadow ${
                  m.accent
                    ? "bg-gradient-to-br from-emerald-500/30 to-emerald-700/20 border border-emerald-400/30"
                    : "bg-os-card border border-os-border"
                }`}
              >
                {i === 0 ? (
                  <TypingAnimation text={m.body} duration={30} />
                ) : (
                  <span className="text-white/95 leading-relaxed">{m.body}</span>
                )}
                <div className="text-[8px] text-os-text-dim mt-1 text-right">{m.time}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Glow */}
      <div className="absolute -inset-8 bg-emerald-500/10 blur-3xl rounded-full -z-10" />

      {/* Floating badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6 }}
        className="absolute -right-12 top-20 px-3 py-2 rounded-xl bg-os-card border border-os-border shadow-xl flex items-center gap-2"
      >
        <Sun size={14} className="text-yellow-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest">8 AM IST</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.9 }}
        className="absolute -left-10 bottom-32 px-3 py-2 rounded-xl bg-os-card border border-os-border shadow-xl flex items-center gap-2"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Delivered</span>
      </motion.div>
    </div>
  );
}
