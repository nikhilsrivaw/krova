"use client";

import { RefreshCw } from "lucide-react";

export interface TeamMemberStats {
  member_id: string;
  name: string;
  email: string;
  role: string;
  assigned_customers: number;
  hot_leads: number;
  converted_this_month: number;
  overdue_commitments: number;
  has_accepted: boolean;
}

export function TeamMemberCard({ m }: { m: TeamMemberStats }) {
  const initials = m.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="os-card p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-os-border flex items-center justify-center font-bold text-xs shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold truncate">{m.name}</p>
          <p className="text-[10px] text-os-text-dim capitalize">
            {m.role.replace("_", " ")}
            {!m.has_accepted ? " · Pending invite" : ""}
          </p>
        </div>
        {m.overdue_commitments > 0 && (
          <div className="flex items-center gap-1 text-red-400 shrink-0">
            <RefreshCw size={9} />
            <span className="text-[9px] font-bold">{m.overdue_commitments} overdue</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-lg font-bold">{m.assigned_customers}</p>
          <p className="text-[9px] text-os-text-dim uppercase tracking-widest">Assigned</p>
        </div>
        <div className="text-center">
          <p className={`text-lg font-bold ${m.hot_leads > 0 ? "text-red-400" : ""}`}>
            {m.hot_leads}
          </p>
          <p className="text-[9px] text-os-text-dim uppercase tracking-widest">Hot</p>
        </div>
        <div className="text-center">
          <p className={`text-lg font-bold ${m.converted_this_month > 0 ? "text-green-400" : ""}`}>
            {m.converted_this_month}
          </p>
          <p className="text-[9px] text-os-text-dim uppercase tracking-widest">Converted</p>
        </div>
      </div>

      {!m.has_accepted && (
        <div className="mt-3 pt-3 border-t border-os-border">
          <p className="text-[10px] text-os-text-dim text-center">
            Invite sent to {m.email}
          </p>
        </div>
      )}
    </div>
  );
}
