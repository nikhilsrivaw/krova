"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Globe, RefreshCw, TrendingUp, TrendingDown, BarChart2, Users2, Clock, Zap, DollarSign, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { AuroraText } from "@/components/magicui/aurora-text";

// ── Types ─────────────────────────────────────────────────────────────────────

type BenchmarkMetrics = {
  conversion?: {
    whatsapp_lead_conversion_rate?: number;
    instagram_lead_conversion_rate?: number;
    overall_conversion_rate?: number;
    avg_days_to_convert?: number;
    top_quartile_rate?: number;
  };
  response?: {
    avg_first_response_hours?: number;
    top_quartile_response_hours?: number;
    follow_up_success_rate?: number;
  };
  retention?: {
    monthly_churn_rate?: number;
    avg_customer_lifetime_months?: number;
    repeat_purchase_rate?: number;
  };
  pipeline?: {
    avg_hot_leads?: number;
    avg_warm_leads?: number;
    avg_pipeline_size?: number;
  };
  revenue?: {
    avg_deal_size?: number;
    top_quartile_deal_size?: number;
  };
  channels?: {
    most_common_primary_channel?: string;
    best_converting_channel?: string;
    best_lead_gen_channel?: string;
  };
  sample_size?: number;
  computed_at?: string;
};

type BenchmarkResponse = {
  business_type: string;
  period_date: string;
  metrics: BenchmarkMetrics;
  sample_size: number;
  your_stats: {
    conversion_rate: number;
    hot_lead_rate: number;
    cold_lead_rate: number;
    total_customers: number;
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(val: number | undefined): string {
  if (val == null) return "—";
  return `${Math.round(val * 100)}%`;
}

function num(val: number | undefined, prefix = "", suffix = ""): string {
  if (val == null) return "—";
  return `${prefix}${val.toLocaleString("en-IN")}${suffix}`;
}

type DeltaDir = "up" | "down" | "neutral";

function delta(yours: number | undefined, benchmark: number | undefined, higherIsBetter = true): { dir: DeltaDir; text: string } {
  if (yours == null || benchmark == null || benchmark === 0) return { dir: "neutral", text: "—" };
  const diff = ((yours - benchmark) / benchmark) * 100;
  const dir: DeltaDir = Math.abs(diff) < 3 ? "neutral" : (diff > 0) === higherIsBetter ? "up" : "down";
  const sign = diff > 0 ? "+" : "";
  return { dir, text: `${sign}${Math.round(diff)}%` };
}

function DeltaBadge({ dir, text }: { dir: DeltaDir; text: string }) {
  if (dir === "neutral") return <span className="text-[9px] font-mono text-os-text-dim">{text}</span>;
  const color = dir === "up" ? "text-green-400" : "text-red-400";
  const Icon = dir === "up" ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-1 text-[9px] font-bold font-mono ${color}`}>
      <Icon size={8} />{text}
    </span>
  );
}

function StatRow({
  label, yours, benchmark, topQ, higherIsBetter = true,
  format = (v: number) => String(Math.round(v)),
}: {
  label: string;
  yours: number | undefined;
  benchmark: number | undefined;
  topQ?: number | undefined;
  higherIsBetter?: boolean;
  format?: (v: number) => string;
}) {
  const d = delta(yours, benchmark, higherIsBetter);
  return (
    <div className="grid grid-cols-4 gap-3 py-3 border-b border-os-border last:border-0 items-center">
      <p className="text-[11px] text-white col-span-1">{label}</p>
      <p className="text-[11px] font-bold font-mono text-white text-right">
        {yours != null ? format(yours) : "—"}
      </p>
      <p className="text-[11px] font-mono text-os-text-dim text-right">
        {benchmark != null ? format(benchmark) : "—"}
      </p>
      <div className="text-right flex items-center justify-end gap-2">
        <DeltaBadge dir={d.dir} text={d.text} />
        {topQ != null && (
          <span className="text-[9px] text-os-text-dim font-mono">top: {format(topQ)}</span>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NetworkPage() {
  const [data, setData] = useState<BenchmarkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notEnoughData, setNotEnoughData] = useState(false);

  useEffect(() => {
    api.get<BenchmarkResponse | null>("/intelligence/benchmarks")
      .then(d => {
        if (!d || !d.metrics || Object.keys(d.metrics).length === 0) {
          setNotEnoughData(true);
        } else {
          setData(d);
        }
      })
      .catch(() => setNotEnoughData(true))
      .finally(() => setLoading(false));
  }, []);

  const m = data?.metrics;
  const yours = data?.your_stats;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={16} className="text-os-text-dim animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-os-text-dim mb-2">
          <Globe size={10} /> Network
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          KROVA <AuroraText>Network.</AuroraText>
        </h1>
        <p className="text-xs text-os-text-dim mt-1">
          How does your business compare to similar businesses on KROVA?
        </p>
      </div>

      {notEnoughData ? (
        <div className="space-y-4">
          <div className="os-card p-8 text-center space-y-4">
            <Globe size={28} className="text-os-text-dim mx-auto" />
            <div className="space-y-2">
              <p className="text-sm font-bold text-white">Benchmarks are building</p>
              <p className="text-[11px] text-os-text-dim max-w-md mx-auto leading-relaxed">
                KROVA Network needs 500–1,000 businesses of your type before comparisons become meaningful.
                We're not going to show you a benchmark based on 4 businesses — that would be noise, not signal.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              {
                title: "What you'll see when it's ready",
                items: [
                  "Your conversion rate vs industry average",
                  "Your response time vs top performers",
                  "Your deal size vs similar businesses",
                  "Which channels convert best in your category",
                ],
              },
              {
                title: "What the network moat looks like",
                items: [
                  "Every business contributes anonymised stats",
                  "Nobody knows who contributed what",
                  "More businesses = more accurate benchmarks",
                  "At 10,000 businesses — irreplaceable dataset",
                ],
              },
              {
                title: "Why this matters",
                items: [
                  "No consultant has this data",
                  "No survey has this accuracy",
                  "Your instincts about what's normal are often wrong",
                  "Top performers are doing 3× what you think",
                ],
              },
            ].map((card, i) => (
              <div key={i} className="os-card p-4 space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">{card.title}</p>
                <ul className="space-y-2">
                  {card.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="text-os-text-dim mt-0.5">·</span>
                      <p className="text-[11px] text-white/70 leading-relaxed">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="os-card p-4 border border-white/10 space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">Your contribution</p>
            <p className="text-[11px] text-os-text-dim leading-relaxed">
              Your business data is already contributing to the network — anonymised and aggregated.
              When enough businesses in your category join, your benchmarks will appear here automatically.
              No action needed.
            </p>
          </div>
        </div>
      ) : data && m && yours ? (
        <div className="space-y-6">
          {/* Header card */}
          <div className="os-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">Benchmarking against</p>
                <p className="text-base font-bold text-white capitalize">{data.business_type.replace(/_/g, " ")} businesses on KROVA</p>
                <p className="text-[10px] text-os-text-dim">{data.sample_size} businesses · Updated {data.period_date}</p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p className="text-2xl font-bold text-white">{yours.total_customers}</p>
                <p className="text-[9px] text-os-text-dim">your total customers</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 pt-2 border-t border-os-border text-[9px] font-bold uppercase tracking-widest text-os-text-dim">
              <span>Metric</span>
              <span className="text-right">You</span>
              <span className="text-right">Industry avg</span>
              <span className="text-right">vs avg</span>
            </div>
          </div>

          {/* Conversion section */}
          {m.conversion && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="os-card">
              <div className="px-5 py-3 border-b border-os-border flex items-center gap-2">
                <Zap size={12} className="text-green-400" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-white">Conversion</p>
              </div>
              <div className="px-5">
                <StatRow
                  label="Overall conversion rate"
                  yours={yours.conversion_rate}
                  benchmark={m.conversion.overall_conversion_rate}
                  topQ={m.conversion.top_quartile_rate}
                  format={v => `${Math.round(v * 100)}%`}
                />
                {m.conversion.whatsapp_lead_conversion_rate != null && (
                  <StatRow
                    label="WhatsApp conversion"
                    yours={undefined}
                    benchmark={m.conversion.whatsapp_lead_conversion_rate}
                    format={v => `${Math.round(v * 100)}%`}
                  />
                )}
                {m.conversion.instagram_lead_conversion_rate != null && (
                  <StatRow
                    label="Instagram conversion"
                    yours={undefined}
                    benchmark={m.conversion.instagram_lead_conversion_rate}
                    format={v => `${Math.round(v * 100)}%`}
                  />
                )}
                {m.conversion.avg_days_to_convert != null && (
                  <StatRow
                    label="Avg days to close"
                    yours={undefined}
                    benchmark={m.conversion.avg_days_to_convert}
                    higherIsBetter={false}
                    format={v => `${v.toFixed(1)}d`}
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* Response time section */}
          {m.response && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="os-card">
              <div className="px-5 py-3 border-b border-os-border flex items-center gap-2">
                <Clock size={12} className="text-blue-400" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-white">Response Speed</p>
              </div>
              <div className="px-5">
                {m.response.avg_first_response_hours != null && (
                  <StatRow
                    label="Avg first response"
                    yours={undefined}
                    benchmark={m.response.avg_first_response_hours}
                    topQ={m.response.top_quartile_response_hours}
                    higherIsBetter={false}
                    format={v => `${v.toFixed(1)}h`}
                  />
                )}
                {m.response.follow_up_success_rate != null && (
                  <StatRow
                    label="Follow-up success rate"
                    yours={undefined}
                    benchmark={m.response.follow_up_success_rate}
                    format={v => `${Math.round(v * 100)}%`}
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* Pipeline section */}
          {m.pipeline && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="os-card">
              <div className="px-5 py-3 border-b border-os-border flex items-center gap-2">
                <BarChart2 size={12} className="text-purple-400" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-white">Pipeline Health</p>
              </div>
              <div className="px-5">
                {m.pipeline.avg_hot_leads != null && (
                  <StatRow
                    label="Avg hot leads"
                    yours={Math.round((yours.hot_lead_rate || 0) * yours.total_customers)}
                    benchmark={m.pipeline.avg_hot_leads}
                    format={v => String(Math.round(v))}
                  />
                )}
                {m.pipeline.avg_pipeline_size != null && (
                  <StatRow
                    label="Avg pipeline size"
                    yours={yours.total_customers}
                    benchmark={m.pipeline.avg_pipeline_size}
                    format={v => String(Math.round(v))}
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* Revenue section */}
          {m.revenue && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="os-card">
              <div className="px-5 py-3 border-b border-os-border flex items-center gap-2">
                <DollarSign size={12} className="text-yellow-400" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-white">Revenue</p>
              </div>
              <div className="px-5">
                {m.revenue.avg_deal_size != null && (
                  <StatRow
                    label="Avg deal size"
                    yours={undefined}
                    benchmark={m.revenue.avg_deal_size}
                    topQ={m.revenue.top_quartile_deal_size}
                    format={v => `₹${Math.round(v).toLocaleString("en-IN")}`}
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* Retention section */}
          {m.retention && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="os-card">
              <div className="px-5 py-3 border-b border-os-border flex items-center gap-2">
                <Users2 size={12} className="text-cyan-400" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-white">Retention</p>
              </div>
              <div className="px-5">
                {m.retention.monthly_churn_rate != null && (
                  <StatRow
                    label="Monthly churn rate"
                    yours={undefined}
                    benchmark={m.retention.monthly_churn_rate}
                    higherIsBetter={false}
                    format={v => `${Math.round(v * 100)}%`}
                  />
                )}
                {m.retention.avg_customer_lifetime_months != null && (
                  <StatRow
                    label="Avg customer lifetime"
                    yours={undefined}
                    benchmark={m.retention.avg_customer_lifetime_months}
                    format={v => `${v.toFixed(1)} mo`}
                  />
                )}
                {m.retention.repeat_purchase_rate != null && (
                  <StatRow
                    label="Repeat purchase rate"
                    yours={undefined}
                    benchmark={m.retention.repeat_purchase_rate}
                    format={v => `${Math.round(v * 100)}%`}
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* Channel intelligence */}
          {m.channels && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="os-card">
              <div className="px-5 py-3 border-b border-os-border flex items-center gap-2">
                <MessageSquare size={12} className="text-green-400" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-white">Channel Intelligence</p>
              </div>
              <div className="p-5 grid grid-cols-3 gap-4">
                {[
                  { label: "Most common channel", value: m.channels.most_common_primary_channel },
                  { label: "Best for conversion", value: m.channels.best_converting_channel },
                  { label: "Best for leads", value: m.channels.best_lead_gen_channel },
                ].filter(c => c.value).map(c => (
                  <div key={c.label} className="space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">{c.label}</p>
                    <p className="text-xs font-bold text-white capitalize">{c.value}</p>
                    <p className="text-[9px] text-os-text-dim">industry average</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <p className="text-[9px] text-os-text-dim text-center">
            All data anonymised · {data.sample_size} businesses contributed · {data.period_date}
          </p>
        </div>
      ) : null}
    </div>
  );
}
