"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, Edit2, MessageSquare, Info } from "lucide-react";

export function ApprovalCard({ name, status, reasoning, message }: any) {
  const [exitDirection, setExitDirection] = useState<number | null>(null);

  return (
    <AnimatePresence>
      {!exitDirection && (
        <motion.div
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ 
            opacity: 0, 
            x: exitDirection === 1 ? 100 : -100, 
            rotate: exitDirection === 1 ? 5 : -5,
            transition: { duration: 0.3, ease: "circIn" }
          }}
          className="os-window group"
        >
          {/* Card Header */}
          <div className="h-9 border-b border-os-border flex items-center justify-between px-4 bg-os-bg/50">
            <div className="flex items-center gap-2">
              <MessageSquare size={12} className="text-os-text-dim" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">Incoming Message</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="os-badge text-[8px] px-1.5">{status}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-os-border flex items-center justify-center font-bold text-xs">
                  {name[0]}
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-tight">{name}</h4>
                  <p className="text-[10px] text-os-text-dim">via WhatsApp Business</p>
                </div>
              </div>
              <button className="p-1.5 rounded-md hover:bg-white/5 text-os-text-dim transition-colors">
                <Edit2 size={12} />
              </button>
            </div>

            <div className="os-card bg-os-bg/50 p-3 border-os-border/50">
              <p className="text-xs leading-relaxed text-os-accent-dim italic">
                "{message}"
              </p>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <Info size={12} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-blue-400/80 leading-tight">
                <span className="font-bold uppercase tracking-tighter mr-1">AI Reasoning:</span>
                {reasoning}
              </p>
            </div>
          </div>

          {/* Card Actions */}
          <div className="grid grid-cols-2 border-t border-os-border">
            <button 
              onClick={() => setExitDirection(-1)}
              className="flex items-center justify-center gap-2 py-3 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/5 transition-colors border-r border-os-border"
            >
              <X size={14} /> Reject
            </button>
            <button 
              onClick={() => setExitDirection(1)}
              className="flex items-center justify-center gap-2 py-3 text-[10px] font-bold uppercase tracking-widest text-green-400 hover:bg-green-500/5 transition-colors"
            >
              <Check size={14} /> Approve
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
