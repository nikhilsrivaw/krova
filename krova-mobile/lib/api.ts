import { createClient } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const auth = await authHeaders();
  if (!auth.Authorization) {
    throw new Error("Not authenticated. Please sign in again.");
  }
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...auth,
    },
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

/**
 * Stream a chat response from KROVA via Server-Sent Events.
 * Calls `onDelta(text)` for every word that arrives.
 * Resolves when the stream sends `{"done": true}` or rejects on error.
 *
 * Backend contract (each SSE line):
 *   data: {"delta": "word"}
 *   data: {"done": true}
 *   data: {"error": "message"}
 */
export async function streamChat(
  sessionId: string,
  message: string,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const auth = await authHeaders();
  if (!auth.Authorization) throw new Error("Not authenticated.");

  const res = await fetch(
    `${API_BASE}/api/v1/conversations/${sessionId}/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ message }),
      signal,
    },
  );
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.detail || `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line: \n\n
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const ev of events) {
      const line = ev.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.slice(5).trim();
      if (!json) continue;
      try {
        const payload = JSON.parse(json) as {
          delta?: string;
          done?: boolean;
          error?: string;
        };
        if (payload.error) throw new Error(payload.error);
        if (payload.done) return;
        if (payload.delta) onDelta(payload.delta);
      } catch {
        // Malformed line — skip
      }
    }
  }
}

export interface SessionResponse {
  session_id: string;
  is_new: boolean;
  title: string | null;
  message_count: number;
}

export interface SessionMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface SessionDetail {
  id: string;
  title: string | null;
  messages: SessionMessage[];
  is_active: boolean;
}

export async function registerUser(supabaseUserId: string, email: string, fullName: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supabase_user_id: supabaseUserId,
        email,
        full_name: fullName,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Shared types ────────────────────────────────────────────────────────────

export interface PriorityItem {
  id: string;
  area: string;
  urgency: string;
  title: string;
  description: string;
  action_label: string;
  action_href: string;
  customer_name: string | null;
  amount: number | null;
}

export interface PriorityBrief {
  items: PriorityItem[];
  business_health_score: number;
  greeting: string;
}

export interface OverviewStats {
  total_customers: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  messages_this_week: number;
  pending_approvals: number;
  reply_rate_percent: number;
  converted_this_month: number;
  at_risk_count: number;
}

export interface Action {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  channel: string;
  status: string;
  message_content: string;
  action_type: string;
  created_at: string;
}

export interface PendingResponse {
  actions: Action[];
  count: number;
}

export interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  primary_channel: string;
  status: string;
  health_score: number;
  last_contact_at: string | null;
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}
