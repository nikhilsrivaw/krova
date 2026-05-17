import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-os-card border border-os-border flex items-center justify-center mb-6">
        <WifiOff size={28} className="text-amber-400" />
      </div>
      <h1 className="text-2xl font-bold mb-2">You&apos;re offline</h1>
      <p className="text-sm text-os-text-dim max-w-sm leading-relaxed">
        KROVA needs the internet to read your latest conversations and push approved replies.
        Cached pages still work — try going back.
      </p>
    </main>
  );
}
