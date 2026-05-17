"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaqItem {
  q: string;
  a: string;
}

export function FaqAccordion({ items, className }: { items: FaqItem[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <motion.div
            key={item.q}
            layout
            className={cn(
              "rounded-2xl border bg-os-card overflow-hidden transition-colors",
              isOpen ? "border-white/30" : "border-os-border hover:border-os-border-bright",
            )}
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-6 py-5 text-left"
            >
              <span className="text-sm md:text-base font-bold">{item.q}</span>
              <div className="w-7 h-7 rounded-lg bg-os-bg border border-os-border flex items-center justify-center shrink-0">
                {isOpen ? <Minus size={14} /> : <Plus size={14} />}
              </div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="px-6 pb-5 text-os-text-dim text-sm leading-relaxed"
                >
                  {item.a}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
