"use client";

import { Info, AlertTriangle, Lightbulb, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "warning" | "tip" | "security";

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
  className?: string;
}

const STYLES: Record<
  CalloutType,
  { border: string; bg: string; text: string; icon: ReactNode; label: string }
> = {
  info: {
    border: "border-sky-500/30",
    bg: "bg-sky-500/5",
    text: "text-sky-400",
    icon: <Info size={14} />,
    label: "Note",
  },
  warning: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    text: "text-amber-400",
    icon: <AlertTriangle size={14} />,
    label: "Heads up",
  },
  tip: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    text: "text-emerald-400",
    icon: <Lightbulb size={14} />,
    label: "Tip",
  },
  security: {
    border: "border-violet-500/30",
    bg: "bg-violet-500/5",
    text: "text-violet-400",
    icon: <ShieldCheck size={14} />,
    label: "Security",
  },
};

export function Callout({ type = "info", title, children, className }: CalloutProps) {
  const s = STYLES[type];
  return (
    <div
      className={cn(
        "relative rounded-2xl border p-4 my-4",
        s.border,
        s.bg,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 shrink-0", s.text)}>{s.icon}</div>
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest mb-1",
              s.text,
            )}
          >
            {title || s.label}
          </div>
          <div className="text-sm text-os-text-dim leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}
