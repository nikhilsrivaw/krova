"use client";

import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ElementType;
  description: string;
  href?: string;
  cta?: string;
}

export function BentoGrid({ children, className, ...props }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function BentoCard({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) {
  return (
    <div
      key={name}
      className={cn(
        "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-2xl",
        "bg-os-card border border-os-border [box-shadow:0_0_0_1px_rgba(255,255,255,.03)_inset,0_2px_4px_rgba(0,0,0,.4)_inset,0_0_0_1px_rgba(0,0,0,.05)]",
        "transition-all duration-300 hover:border-os-border-bright",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 z-0">{background}</div>
      <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
        <Icon className="h-10 w-10 origin-left transform-gpu text-white transition-all duration-300 ease-in-out group-hover:scale-75" />
        <h3 className="text-xl font-bold text-white">{name}</h3>
        <p className="max-w-lg text-os-text-dim text-sm">{description}</p>
      </div>

      {href && cta && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-0 z-10 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
          )}
        >
          <a
            href={href}
            className="pointer-events-auto inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-white"
          >
            {cta}
            <ArrowRight className="ml-1 h-3 w-3" />
          </a>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-white/[0.02]" />
    </div>
  );
}
