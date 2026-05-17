"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, CheckSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/chat", icon: MessageCircle, label: "Ask KROVA" },
  { href: "/actions", icon: CheckSquare, label: "Approvals" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 safe-bottom border-t border-os-border bg-os-bg/95 backdrop-blur-xl">
      <div className="grid grid-cols-3 px-2 pt-1.5 pb-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-col items-center justify-center py-1.5 gap-1"
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-gradient-to-r from-teal-400 to-violet-400" />
              )}
              <Icon
                size={20}
                className={cn(
                  "transition-colors",
                  isActive ? "text-white" : "text-os-text-dim",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-colors",
                  isActive ? "text-white" : "text-os-text-dim",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
