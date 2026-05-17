"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Sparkles,
  Loader2,
  AlertCircle,
  Mic,
  RotateCcw,
} from "lucide-react";
import {
  api,
  streamChat,
  type SessionResponse,
  type SessionDetail,
  type SessionMessage,
} from "@/lib/api";

const STORAGE_KEY = "krova_chat_session_id";

const SUGGESTIONS = [
  "Aaj kya hua?",
  "Kaun se leads hot hain abhi?",
  "Aaj mujhe kya karna chahiye?",
  "Is mahine revenue kaisa hai?",
  "Koi urgent cheez miss ho rahi hai?",
];

interface UIMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  error?: string;
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Boot: get / create session, load history ─────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const saved = typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;
        const session = await api.post<SessionResponse>("/conversations");
        if (cancelled) return;

        setSessionId(session.session_id);
        localStorage.setItem(STORAGE_KEY, session.session_id);

        // Load history for this session
        if (!session.is_new || saved === session.session_id) {
          try {
            const detail = await api.get<SessionDetail>(
              `/conversations/${session.session_id}`,
            );
            if (cancelled) return;
            const ui: UIMessage[] = (detail.messages || []).map(
              (m: SessionMessage) => ({
                role: m.role,
                content: m.content,
              }),
            );
            setMessages(ui);
          } catch {
            /* fresh start */
          }
        }
      } catch (e) {
        if (!cancelled)
          setBootError(e instanceof Error ? e.message : "Failed to start session.");
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Auto-scroll on new messages ──────────────────────────────────────────
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = useCallback(
    async (msg: string) => {
      if (!sessionId || !msg.trim() || sending) return;
      const trimmed = msg.trim();

      // Optimistic user bubble + empty assistant bubble (streaming)
      setMessages((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: "", streaming: true },
      ]);
      setInput("");
      setSending(true);

      try {
        await streamChat(sessionId, trimmed, (delta) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant" && last.streaming) {
              next[next.length - 1] = {
                ...last,
                content: last.content + delta,
              };
            }
            return next;
          });
        });

        // mark stream done
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = { ...last, streaming: false };
          }
          return next;
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant" && last.streaming) {
            next[next.length - 1] = {
              ...last,
              streaming: false,
              error: msg,
              content: last.content,
            };
          } else {
            next.push({ role: "assistant", content: "", streaming: false, error: msg });
          }
          return next;
        });
      } finally {
        setSending(false);
        // Re-focus input on desktop, not on mobile (keyboard pops back)
        if (typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches) {
          inputRef.current?.focus();
        }
      }
    },
    [sessionId, sending],
  );

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  };

  const reset = async () => {
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
    setSessionId(null);
    try {
      const session = await api.post<SessionResponse>("/conversations");
      setSessionId(session.session_id);
      localStorage.setItem(STORAGE_KEY, session.session_id);
    } catch {
      /* will retry on next send */
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-72px)]">
      {/* Header */}
      <header className="px-5 pt-5 pb-3 flex items-center justify-between gap-3 border-b border-os-border/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-400/40 to-violet-400/40 blur" />
            <div className="relative w-10 h-10 rounded-2xl bg-os-card border border-os-border flex items-center justify-center">
              <Sparkles size={16} className="text-violet-400" />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight">KROVA</h1>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Knows your business
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          className="w-10 h-10 rounded-xl border border-os-border bg-os-card flex items-center justify-center text-os-text-dim active:scale-95 transition-transform"
          title="New conversation"
        >
          <RotateCcw size={14} />
        </button>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {bootError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 flex items-center gap-2">
            <AlertCircle size={14} className="text-rose-400 shrink-0" />
            <p className="text-xs text-rose-400">{bootError}</p>
          </div>
        )}

        {messages.length === 0 && !bootError && <WelcomeState onPick={(s) => send(s)} />}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <MessageBubble key={i} m={m} />
          ))}
        </AnimatePresence>
      </div>

      {/* Composer */}
      <div className="px-3 pt-2 pb-3 border-t border-os-border bg-os-bg">
        <div className="flex items-end gap-2 rounded-2xl border border-os-border bg-os-card p-2">
          <button
            type="button"
            className="w-9 h-9 rounded-xl text-os-text-dim flex items-center justify-center active:scale-95 transition-transform"
            title="Voice input (coming soon)"
          >
            <Mic size={16} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder="Aaj kya hua?"
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-os-text-dim focus:outline-none py-2 max-h-32 leading-relaxed"
            disabled={!sessionId || sending}
          />
          <button
            onClick={() => send(input)}
            disabled={!sessionId || sending || !input.trim()}
            className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center active:scale-95 transition-transform disabled:bg-os-border disabled:text-os-text-dim disabled:active:scale-100"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
        <p className="text-[10px] text-os-text-dim text-center mt-2 px-2">
          KROVA can be wrong. Always review before acting on financial or
          customer-sensitive answers.
        </p>
      </div>
    </div>
  );
}

// ── Message bubble ──────────────────────────────────────────────────────────
function MessageBubble({ m }: { m: UIMessage }) {
  const isUser = m.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={isUser ? "flex justify-end" : "flex justify-start"}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-white text-black rounded-br-md"
            : "bg-os-card border border-os-border text-white rounded-bl-md"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">
            <Sparkles size={9} /> KROVA
          </div>
        )}
        <p
          className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${
            isUser ? "text-black" : "text-white"
          }`}
        >
          {m.content}
          {m.streaming && (
            <span className="inline-block w-1.5 h-3.5 align-middle ml-1 bg-violet-400 rounded-sm animate-pulse" />
          )}
        </p>
        {m.error && (
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-rose-400">
            <AlertCircle size={10} />
            <span>{m.error}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Welcome / suggestion state ──────────────────────────────────────────────
function WelcomeState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="pt-8 pb-2">
      <div className="text-center mb-6">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-teal-400/40 to-violet-400/40 blur-xl" />
          <div className="relative w-16 h-16 bg-os-card border border-os-border rounded-3xl flex items-center justify-center">
            <Sparkles size={24} className="text-violet-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold mb-1.5">Pucho kuch bhi.</h2>
        <p className="text-xs text-os-text-dim max-w-xs mx-auto leading-relaxed">
          Mein aapke business ke baare mein sab kuch jaanta hoon — leads, revenue,
          conversations, sab kuch. Hindi ya English, jo aapko comfortable lage.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-os-text-dim px-1">
          Try asking
        </p>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="w-full text-left rounded-2xl border border-os-border bg-os-card/40 p-3.5 flex items-center justify-between gap-3 active:scale-[0.98] transition-transform"
          >
            <span className="text-sm text-white">{s}</span>
            <Send size={12} className="text-os-text-dim shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
