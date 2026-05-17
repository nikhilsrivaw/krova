"use client";

import { forwardRef, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import { MessageSquare, Instagram, Mail, Brain, Sun, Smartphone, Sparkles } from "lucide-react";

const Node = forwardRef<HTMLDivElement, { className?: string; children?: ReactNode }>(
  ({ className, children }, ref) => (
    <div
      ref={ref}
      className={cn(
        "z-10 flex size-14 items-center justify-center rounded-2xl border border-os-border bg-os-card shadow-[0_0_20px_-12px_rgba(255,255,255,0.5)]",
        className,
      )}
    >
      {children}
    </div>
  ),
);
Node.displayName = "Node";

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const whatsappRef = useRef<HTMLDivElement | null>(null);
  const igRef = useRef<HTMLDivElement | null>(null);
  const gmailRef = useRef<HTMLDivElement | null>(null);
  const brainRef = useRef<HTMLDivElement | null>(null);
  const briefRef = useRef<HTMLDivElement | null>(null);
  const phoneRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex h-[480px] w-full max-w-4xl items-center justify-between px-10"
    >
      {/* Left column — channels in */}
      <div className="flex flex-col gap-10">
        <Node ref={whatsappRef}>
          <MessageSquare size={22} className="text-green-400" />
        </Node>
        <Node ref={igRef}>
          <Instagram size={22} className="text-pink-400" />
        </Node>
        <Node ref={gmailRef}>
          <Mail size={22} className="text-red-400" />
        </Node>
      </div>

      {/* Center — brain */}
      <div className="flex flex-col items-center">
        <Node ref={brainRef} className="size-20 bg-gradient-to-br from-teal-500/20 to-violet-500/20">
          <Brain size={32} className="text-white" />
        </Node>
        <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
          KROVA Brain
        </div>
      </div>

      {/* Right column — outputs */}
      <div className="flex flex-col gap-10">
        <Node ref={briefRef}>
          <Sun size={22} className="text-yellow-400" />
        </Node>
        <Node ref={phoneRef}>
          <Smartphone size={22} className="text-cyan-400" />
        </Node>
        <Node ref={draftRef}>
          <Sparkles size={22} className="text-violet-400" />
        </Node>
      </div>

      <AnimatedBeam containerRef={containerRef} fromRef={whatsappRef} toRef={brainRef} duration={3} />
      <AnimatedBeam containerRef={containerRef} fromRef={igRef} toRef={brainRef} duration={3} delay={0.5} />
      <AnimatedBeam containerRef={containerRef} fromRef={gmailRef} toRef={brainRef} duration={3} delay={1} />
      <AnimatedBeam containerRef={containerRef} fromRef={brainRef} toRef={briefRef} duration={3} delay={1.5} gradientStartColor="#FCD34D" gradientStopColor="#5EEAD4" />
      <AnimatedBeam containerRef={containerRef} fromRef={brainRef} toRef={phoneRef} duration={3} delay={2} gradientStartColor="#5EEAD4" gradientStopColor="#22D3EE" />
      <AnimatedBeam containerRef={containerRef} fromRef={brainRef} toRef={draftRef} duration={3} delay={2.5} gradientStartColor="#A78BFA" gradientStopColor="#FB7185" />
    </div>
  );
}
