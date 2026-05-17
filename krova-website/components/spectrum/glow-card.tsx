"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlowCard({
  children,
  className,
  glowColor = "from-teal-400/30 via-violet-400/20 to-pink-400/30",
}: GlowCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl p-[1px] overflow-hidden",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-2xl bg-gradient-to-r animate-gradient bg-[length:300%_300%] opacity-60",
          glowColor,
        )}
      />
      <div className="relative rounded-2xl bg-os-card border border-os-border h-full">
        {children}
      </div>
    </div>
  );
}
