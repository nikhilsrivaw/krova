"use client";

import { useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface InteractiveGridProps {
  className?: string;
  size?: number;
  glowSize?: number;
  glowColor?: string;
}

export function InteractiveGrid({
  className,
  size = 40,
  glowSize = 300,
  glowColor = "rgba(120,200,255,0.15)",
}: InteractiveGridProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={() => setPos(null)}
      className={cn("absolute inset-0 overflow-hidden", className)}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: `${size}px ${size}px`,
        }}
      />
      {pos && (
        <div
          className="pointer-events-none absolute transition-opacity duration-300"
          style={{
            left: pos.x - glowSize / 2,
            top: pos.y - glowSize / 2,
            width: glowSize,
            height: glowSize,
            background: `radial-gradient(circle, ${glowColor}, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}
