"use client";

import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

interface ShinyTextProps {
  children: ReactNode;
  className?: string;
  shimmerWidth?: number;
}

export function ShinyText({ children, className, shimmerWidth = 100 }: ShinyTextProps) {
  return (
    <span
      style={
        {
          "--shiny-width": `${shimmerWidth}px`,
        } as CSSProperties
      }
      className={cn(
        "mx-auto max-w-md text-os-text-dim/80",
        "animate-shiny-text bg-clip-text bg-no-repeat [background-position:0_0] [background-size:var(--shiny-width)_100%]",
        "bg-gradient-to-r from-transparent via-white via-50% to-transparent",
        className,
      )}
    >
      {children}
    </span>
  );
}
