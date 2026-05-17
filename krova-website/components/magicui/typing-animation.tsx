"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TypingAnimationProps {
  text: string;
  duration?: number;
  className?: string;
  startOnView?: boolean;
  loop?: boolean;
}

export function TypingAnimation({
  text,
  duration = 40,
  className,
  startOnView = true,
  loop = false,
}: TypingAnimationProps) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(!startOnView);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!startOnView) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    setDisplayed("");
    const t = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        if (loop) {
          setTimeout(() => {
            i = 0;
            setDisplayed("");
          }, 2000);
        } else {
          clearInterval(t);
        }
      }
    }, duration);
    return () => clearInterval(t);
  }, [text, duration, started, loop]);

  return (
    <span ref={ref} className={cn("inline-block", className)}>
      {displayed}
      <span className="inline-block w-[2px] h-[1em] -mb-[0.1em] ml-0.5 bg-current animate-pulse" />
    </span>
  );
}
