"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface OrbitingCirclesProps {
  className?: string;
  children?: ReactNode;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
  iconSize?: number;
  speed?: number;
}

export function OrbitingCircles({
  className,
  children,
  reverse,
  duration = 20,
  radius = 160,
  path = true,
  iconSize = 36,
  speed = 1,
}: OrbitingCirclesProps) {
  const calculatedDuration = duration / speed;

  const childArray = Array.isArray(children) ? children : [children];
  const count = childArray.length;

  return (
    <>
      {path && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <circle
            className="stroke-white/10 stroke-1 dark:stroke-white/10"
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
          />
        </svg>
      )}
      {childArray.map((child, index) => {
        const angle = (360 / count) * index;
        return (
          <div
            key={index}
            style={
              {
                "--duration": calculatedDuration,
                "--radius": radius,
                "--angle": angle,
                width: `${iconSize}px`,
                height: `${iconSize}px`,
              } as React.CSSProperties
            }
            className={cn(
              "absolute flex size-full transform-gpu animate-orbit items-center justify-center rounded-full",
              { "[animation-direction:reverse]": reverse },
              className,
            )}
          >
            {child}
          </div>
        );
      })}
    </>
  );
}
