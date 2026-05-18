import { Suspense } from "react";
import DashboardShell from "./_DashboardShell";

// Force dynamic rendering for the entire /dashboard subtree.
// The dashboard reads auth cookies, calls APIs, and uses useSearchParams —
// none of it can be statically prerendered.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex h-screen bg-os-bg items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );
}
