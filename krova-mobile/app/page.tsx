"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/chat" : "/login");
  }, [user, loading, router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-400/30 to-violet-400/30 blur-xl" />
        <div className="relative w-14 h-14 bg-white rounded-2xl flex items-center justify-center">
          <div className="w-6 h-6 bg-black rounded-md animate-pulse" />
        </div>
      </div>
    </main>
  );
}
