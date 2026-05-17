import { createClient } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const auth = await authHeaders();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...auth,
  };

  if (!auth.Authorization) {
    throw new Error("Not authenticated. Please sign in again.");
  }

  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error("Session expired. Please sign in again.");
    const msg = err?.error?.message || err?.detail || `API error ${res.status}`;
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

/** Register user in KROVA DB — no auth header needed, called right after Supabase login */
export async function registerUser(supabaseUserId: string, email: string, fullName: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supabase_user_id: supabaseUserId, email, full_name: fullName }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Typed API helpers ─────────────────────────────────────────────────────────

export type DNAProfile = {
  business_id: string;
  profile: Record<string, unknown>;
  narrative: string | null;
  analysis_count: number;
  last_updated: string | null;
};

export type Prediction = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  prediction_type: string;
  probability: number;
  confidence: number;
  prediction_text: string;
  recommended_action: string | null;
  predicted_for_date: string | null;
  evidence: Record<string, unknown>;
  created_at: string;
};

export type CustomerIntelligence = {
  customer_id: string;
  customer_name: string | null;
  profile: Record<string, unknown>;
  current_recommendation: string | null;
  message_template: string | null;
  confidence: number;
  interaction_count: number;
  last_updated: string | null;
};

export type WeeklyInsight = {
  id: string;
  week: string;
  category: string;
  headline: string;
  body: string;
  action_item: string;
  estimated_impact: string | null;
  benchmark_comparison: string | null;
  confidence: number;
  is_read: boolean;
  owner_committed: boolean;
  created_at: string;
};

export type AutopilotRule = {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  message_template: string | null;
  channel: string | null;
  requires_approval: boolean;
  is_active: boolean;
  execution_count: number;
  cooldown_days: number;
  applies_to_status: string | null;
  created_at: string;
};

export type FinancialOverview = {
  total_received_this_month: number;
  total_expected_this_month: number;
  total_overdue: number;
  overdue_count: number;
  overdue_clients: Array<{ customer_name: string; amount: number; days_overdue: number; description: string | null }>;
  avg_payment_days: number;
  slow_payers: unknown[];
  recent_entries: Array<{ id: string; customer_name: string; amount: number; status: string; description: string | null; payment_date: string | null }>;
};

export type Commitment = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  commitment_text: string;
  due_date: string | null;
  source_channel: string | null;
  is_fulfilled: boolean;
  is_dismissed: boolean;
  created_at: string;
};

export type RevenueSignal = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  signal_type: string;
  estimated_amount: number | null;
  description: string | null;
  is_resolved: boolean;
  created_at: string;
};

export type CompetitorSummary = {
  competitor_name: string;
  mention_count: number;
  last_mentioned: string;
  sentiments: string[];
  customers_mentioning: string[];
};

export type GrowthBlocker = {
  id: string;
  report_date: string;
  blockers: Array<{
    title: string;
    description: string;
    revenue_impact_annual: number;
    action_item: string;
    priority: number;
  }>;
  total_revenue_leakage_estimate: number | null;
  top_blocker: string | null;
  is_read: boolean;
};

export type ReputationOverview = {
  avg_rating: number | null;
  total_reviews: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  unresponded_negative: number;
  recent_events: Array<{ id: string; type: string; sentiment: string; rating: number | null; content: string; suggested_response: string | null; is_responded: boolean; created_at: string }>;
  review_requests_sent: number;
};

export type CoachOption = {
  rank: number;
  message: string;
  tone: string;
  rationale: string;
  best_channel: string;
};

export type ConversationCoachResponse = {
  customer_id: string;
  customer_name: string | null;
  options: CoachOption[];
  context_summary: string;
  urgency: string;
};

export type GratitudeCandidate = {
  customer_id: string;
  customer_name: string | null;
  gratitude_reason: string;
  last_contact_at: string | null;
  status: string;
  health_score: number;
  suggested_message: string;
  channel: string;
};

export type AntiSpamAlert = {
  customer_id: string;
  customer_name: string | null;
  outbound_count: number;
  days_since_last_reply: number;
  status: string;
  channel: string;
  recommendation: string;
  pause_days: number;
};

export type RelationshipDebtItem = {
  customer_id: string;
  customer_name: string | null;
  days_since_contact: number;
  debt_score: number;
  relationship_type: string;
  status: string;
  channel: string;
  suggested_action: string;
};

export type VoiceTheme = {
  theme: string;
  frequency: number;
  sentiment: string;
  example_quote: string;
  action: string;
};

export type VoiceOfCustomerResponse = {
  period_days: number;
  total_messages_analyzed: number;
  themes: VoiceTheme[];
  top_request: string | null;
  top_complaint: string | null;
  top_praise: string | null;
  overall_mood: string;
  generated_at: string;
};

export type CustomerCluster = {
  cluster_name: string;
  description: string;
  customer_count: number;
  percentage: number;
  avg_health_score: number;
  conversion_rate: number;
  characteristics: string[];
  primary_channel: string;
  energy_level: string;
  revenue_potential: string;
  strategy: string;
};

export type ClusterIntelligenceResponse = {
  clusters: CustomerCluster[];
  most_valuable_cluster: string;
  highest_effort_cluster: string;
  total_customers_analyzed: number;
  insight: string;
  generated_at: string;
};

export type BehaviorPattern = {
  pattern: string;
  impact: string;
  data_point: string;
  recommendation: string;
};

export type KROVACoachResponse = {
  has_enough_data: boolean;
  days_of_data: number;
  avg_response_time_hours: number;
  best_response_day: string | null;
  worst_response_day: string | null;
  follow_up_consistency: number;
  conversion_rate: number;
  patterns: BehaviorPattern[];
  top_habit_to_change: string | null;
  estimated_uplift: string | null;
  generated_at: string;
};

export type TimeMachineScenario = {
  scenario: string;
  description: string;
  leads_affected: number;
  estimated_revenue_lost: number;
  current_stat: string;
  ideal_stat: string;
  improvement_possible: string;
};

export type TimeMachineResponse = {
  period_days: number;
  total_leads_analyzed: number;
  total_lost_leads: number;
  current_conversion_rate: number;
  scenarios: TimeMachineScenario[];
  total_estimated_annual_loss: number;
  top_lever: string;
  generated_at: string;
};

export type BusinessReport = {
  report_date: string;
  business_name: string | null;
  business_type: string;
  period_days: number;
  customer_summary: Record<string, unknown>;
  pipeline_breakdown: Record<string, number>;
  financial_summary: { received_this_month: number; total_overdue: number; estimated_revenue_leakage: number };
  active_predictions: number;
  overdue_commitments: number;
  unresolved_revenue_leaks: number;
  competitor_mentions_30d: number;
  messages_30d: number;
  messages_90d: number;
  dna_narrative: string | null;
  analysis_runs: number;
  top_predictions: Array<{ type: string; text: string; customer: string | null; probability: number; action: string | null }>;
  revenue_leaks_summary: Array<{ type: string; customer: string; amount: number | null; description: string | null }>;
  overdue_commitments_list: Array<{ commitment: string; customer: string | null; due_date: string | null; channel: string | null }>;
  generated_at: string;
};
