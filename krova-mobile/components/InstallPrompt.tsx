"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "krova_install_dismissed_at";
const DISMISS_FOR_DAYS = 7;

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed?
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS-specific
      window.navigator.standalone === true;
    if (standalone) {
      setIsStandalone(true);
      return;
    }

    // Recently dismissed?
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt)) / 86400000;
      if (days < DISMISS_FOR_DAYS) return;
    }

    // iOS detection (no beforeinstallprompt support on iOS Safari)
    const ua = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) && !window.matchMedia("(display-mode: standalone)").matches;
    if (ios) {
      setIsIos(true);
      // Show iOS hint after 8 seconds of usage
      setTimeout(() => setShow(true), 8000);
      return;
    }

    // Android / desktop Chrome — listen for the prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") {
      setShow(false);
      setEvent(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShow(false);
  };

  if (isStandalone || !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed inset-x-4 bottom-6 z-50 safe-bottom"
      >
        <div className="rounded-2xl border border-os-border bg-os-card/95 backdrop-blur-xl shadow-2xl p-4 flex items-center gap-3">
          <div className="relative w-12 h-12 shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400/40 to-violet-400/40 blur" />
            <div className="relative w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 bg-black rounded-md" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Install KROVA</p>
            <p className="text-[11px] text-os-text-dim leading-snug">
              {isIos
                ? "Tap Share → Add to Home Screen"
                : "Get it on your home screen — no app store needed"}
            </p>
          </div>
          {!isIos && (
            <button
              onClick={install}
              className="px-3 py-2 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Download size={12} /> Install
            </button>
          )}
          <button
            onClick={dismiss}
            className="w-9 h-9 rounded-xl border border-os-border bg-os-bg flex items-center justify-center text-os-text-dim hover:text-white shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
