"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function WelcomeBubble() {
  return (
    <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm">
      <p className="mb-1 font-semibold text-slate-900">Hi there! 👋</p>
      <p className="text-slate-600">
        I&apos;m FundiFlow&apos;s Smart Assistant. I can tell you how FundiFlow helps tailors and small
        businesses run orders, stock, payments and customers — all from one app.
      </p>
    </div>
  );
}

export function PublicChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) setOpen(true);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { id: `u_${Date.now()}`, role: "user", content: text }]);
    setSending(true);

    try {
      const res = await fetch("/api/ai/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json().catch(() => null)) as { reply?: string; error?: string } | null;
      const reply = data?.reply;
      if (!res.ok || !reply) {
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setMessages((prev) => [...prev, { id: `a_${Date.now()}`, role: "assistant", content: reply }]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 transition hover:scale-105 hover:shadow-emerald-500/50"
        aria-label={open ? "Close chat" : "Ask the Smart Assistant"}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-[60] flex h-[min(560px,70vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:right-5">
          {/* Header */}
          <div className="flex items-center gap-2.5 bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">FundiFlow Smart Assistant</p>
              <p className="text-xs text-emerald-100">Always here to help · AI</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 hover:bg-white/20">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-4">
            {messages.length === 0 && <WelcomeBubble />}
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    m.role === "user"
                      ? "rounded-br-sm bg-emerald-600 text-white"
                      : "rounded-bl-sm border border-slate-200 bg-white text-slate-700"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>}

          {/* Composer */}
          <div className="flex items-end gap-2 border-t border-slate-200 bg-white p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Ask about FundiFlow…"
              className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-40"
              aria-label="Send message"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
