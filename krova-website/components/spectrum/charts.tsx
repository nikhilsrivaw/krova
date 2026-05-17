"use client";

import { motion } from "motion/react";
import { useId } from "react";

type Accent = "rose" | "amber" | "emerald" | "teal" | "violet" | "sky" | "pink" | "dim";

const ACCENT_HEX: Record<Accent, string> = {
  rose: "#FB7185",
  amber: "#FCD34D",
  emerald: "#34D399",
  teal: "#5EEAD4",
  violet: "#A78BFA",
  sky: "#7DD3FC",
  pink: "#F472B6",
  dim: "#52525B",
};

// ── DONUT CHART ─────────────────────────────────────────────────────────────
interface DonutSlice {
  label: string;
  value: number;
  accent: Accent;
}

export function DonutChart({
  data,
  size = 180,
  thickness = 22,
  centerValue,
  centerLabel,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerValue?: string | number;
  centerLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col md:flex-row items-center gap-8">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={thickness}
          />
          {/* Slices */}
          {data.map((slice, i) => {
            const pct = slice.value / total;
            const arcLen = pct * circumference;
            const gap = 2; // tiny gap between slices
            const segment = (
              <motion.circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={ACCENT_HEX[slice.accent]}
                strokeWidth={thickness}
                strokeLinecap="butt"
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{
                  strokeDasharray: `${Math.max(0, arcLen - gap)} ${circumference}`,
                }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                strokeDashoffset={-offset}
              />
            );
            offset += arcLen;
            return segment;
          })}
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue !== undefined && (
            <div className="text-2xl font-bold tracking-tight tabular-nums">
              {centerValue}
            </div>
          )}
          {centerLabel && (
            <div className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim mt-0.5">
              {centerLabel}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2 min-w-0 w-full">
        {data.map((slice) => {
          const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
          return (
            <div
              key={slice.label}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-os-border bg-os-bg/40"
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: ACCENT_HEX[slice.accent] }}
              />
              <span className="text-xs text-white flex-1 truncate">{slice.label}</span>
              <span className="text-xs font-mono text-os-text-dim shrink-0">
                {slice.value.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] font-mono text-os-text-dim w-8 text-right shrink-0">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── HORIZONTAL BAR CHART ────────────────────────────────────────────────────
interface BarItem {
  label: string;
  value: number;
  accent: Accent;
  icon?: React.ReactNode;
  subtext?: string;
}

export function HorizontalBarChart({
  data,
  formatValue = (v) => v.toLocaleString("en-IN"),
}: {
  data: BarItem[];
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-4">
      {data.map((bar, i) => {
        const pct = (bar.value / max) * 100;
        return (
          <div key={bar.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {bar.icon}
                <span className="text-xs font-semibold text-white truncate">
                  {bar.label}
                </span>
                {bar.subtext && (
                  <span className="text-[10px] text-os-text-dim font-mono">
                    · {bar.subtext}
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-white tabular-nums shrink-0">
                {formatValue(bar.value)}
              </span>
            </div>
            <div className="h-2 bg-os-border/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: i * 0.06, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: ACCENT_HEX[bar.accent] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── SPARKLINE ───────────────────────────────────────────────────────────────
export function Sparkline({
  data,
  accent = "teal",
  height = 60,
  showArea = true,
}: {
  data: number[];
  accent?: Accent;
  height?: number;
  showArea?: boolean;
}) {
  const id = useId();
  const width = 240;
  const padding = 4;
  if (data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (data.length - 1 || 1);

  const points = data.map((v, i) => {
    const x = padding + i * stepX;
    const y = padding + ((max - v) / range) * (height - padding * 2);
    return { x, y };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area =
    `M${points[0].x},${height - padding} ` +
    points.map((p) => `L${p.x},${p.y}`).join(" ") +
    ` L${points[points.length - 1].x},${height - padding} Z`;

  const color = ACCENT_HEX[accent];

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showArea && <path d={area} fill={`url(#grad-${id})`} />}
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      {/* Last point dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3}
        fill={color}
      />
    </svg>
  );
}

// ── GAUGE / RADIAL PROGRESS ─────────────────────────────────────────────────
export function RadialGauge({
  value,
  max = 100,
  size = 140,
  thickness = 10,
  accent = "teal",
  label,
  suffix = "%",
}: {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  accent?: Accent;
  label?: string;
  suffix?: string;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, value / max);
  const dashLength = circumference * pct;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={thickness}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ACCENT_HEX[accent]}
          strokeWidth={thickness}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${dashLength} ${circumference}` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">
          {value}
          {suffix}
        </span>
        {label && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim mt-0.5">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// ── COMPARISON BAR (current vs ideal) ───────────────────────────────────────
export function ComparisonBar({
  currentLabel,
  currentValue,
  idealLabel,
  idealValue,
  formatValue = (v) => v.toString(),
}: {
  currentLabel: string;
  currentValue: number;
  idealLabel: string;
  idealValue: number;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(currentValue, idealValue, 1);
  return (
    <div className="space-y-3">
      {/* Current */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">
            {currentLabel}
          </span>
          <span className="text-xs font-mono text-white tabular-nums">
            {formatValue(currentValue)}
          </span>
        </div>
        <div className="h-2 bg-os-border/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(currentValue / max) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-rose-400"
          />
        </div>
      </div>
      {/* Ideal */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            {idealLabel}
          </span>
          <span className="text-xs font-mono text-white tabular-nums">
            {formatValue(idealValue)}
          </span>
        </div>
        <div className="h-2 bg-os-border/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(idealValue / max) * 100}%` }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="h-full rounded-full bg-emerald-400"
          />
        </div>
      </div>
    </div>
  );
}
