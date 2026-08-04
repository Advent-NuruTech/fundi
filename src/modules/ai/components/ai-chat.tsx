"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Send,
  Loader2,
  Sparkles,
  MessageSquare,
  Menu,
  Trash2,
  Pencil,
} from "lucide-react";
import { BUSINESS_AI_PERSONAS, getBusinessPersona } from "@/lib/ai/personas";
import { buildAssistantGreeting } from "@/lib/ai/prompts";
import type { AIAssistantPersonaId, AIConversationSummary, AIMessageRecord } from "@/lib/ai/types";
import {
  chatWithAssistant,
  deleteAiConversation,
  getAiMessages,
  listAiConversations,
  renameAiConversation,
} from "@/services/ai.service";
import { Markdown } from "./markdown";
import { PersonaPicker, personaIcon } from "./persona-picker";
import { SuggestedPrompts } from "./suggested-prompts";
import { cn } from "@/lib/utils";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  creditsCharged?: number;
  balanceAfter?: number | null;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export function AiChat({ businessName }: { businessName: string }) {
  const [activePersonaId, setActivePersonaId] = useState<AIAssistantPersonaId>("business_consultant");
  const [conversations, setConversations] = useState<AIConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const activePersona = useMemo(() => getBusinessPersona(activePersonaId), [activePersonaId]);

  // Load conversation list once.
  const refreshConversations = useCallback(async () => {
    const list = await listAiConversations().catch(() => []);
    setConversations(list);
    setLoadingConvs(false);
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Auto-scroll to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const openConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    setError(null);
    setLoadingMsgs(true);
    setMessages([]);
    const rows = await getAiMessages(conversationId).catch(() => []);
    setMessages(
      rows.map((m: AIMessageRecord) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        creditsCharged: m.creditsCharged,
      }))
    );
    setLoadingMsgs(false);
    setSidebarOpen(false);
  }, []);

  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  const selectPersona = useCallback((id: AIAssistantPersonaId) => {
    setActivePersonaId(id);
    // A persona change always starts a fresh thread for that expert.
    startNewChat();
  }, [startNewChat]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);

    const optimistic: LocalMessage = {
      id: `temp_${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    const result = await chatWithAssistant({
      conversationId: activeConversationId ?? undefined,
      personaId: activePersonaId,
      message: text,
    });

    setSending(false);

    if (result.error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError(result.error);
      if (result.insufficientCredits) {
        toast.error(result.error, { description: "Top up in Settings → Usage & Top-ups to continue." });
      } else {
        toast.error(result.error);
      }
      return;
    }

    // New conversation was created server-side — adopt it and refresh the list.
    if (!activeConversationId && result.conversationId) {
      setActiveConversationId(result.conversationId);
    }
    refreshConversations();

    setMessages((prev) => [
      ...prev,
      {
        id: result.messageId || `ai_${Date.now()}`,
        role: "assistant",
        content: result.reply,
        createdAt: new Date().toISOString(),
        creditsCharged: result.creditsCharged,
        balanceAfter: result.balanceAfter,
      },
    ]);
  }, [input, sending, activeConversationId, activePersonaId, refreshConversations]);

  const handleDelete = useCallback(
    async (conversationId: string) => {
      const ok = await deleteAiConversation(conversationId).catch(() => false);
      if (!ok) {
        toast.error("Could not delete this conversation");
        return;
      }
      if (conversationId === activeConversationId) startNewChat();
      refreshConversations();
    },
    [activeConversationId, startNewChat, refreshConversations]
  );

  const handleRename = useCallback(
    async (conversationId: string) => {
      const title = window.prompt("Conversation title", conversations.find((c) => c.id === conversationId)?.title ?? "");
      if (title === null) return;
      const next = await renameAiConversation(conversationId, title.trim() || "New conversation").catch(() => null);
      if (next) refreshConversations();
    },
    [conversations, refreshConversations]
  );

  const isWelcome = !activeConversationId;

  const conversationSidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-800">Conversations</span>
        </div>
        <button
          type="button"
          onClick={startNewChat}
          className="rounded-lg bg-emerald-600 p-1.5 text-white transition hover:bg-emerald-700"
          aria-label="New chat"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {loadingConvs && (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        )}
        {!loadingConvs && conversations.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-slate-400">
            No conversations yet. Start chatting with your assistant.
          </p>
        )}
        {conversations.map((conv) => {
          const Icon = personaIcon(conv.personaId);
          const active = conv.id === activeConversationId;
          return (
            <button
              key={conv.id}
              type="button"
              onClick={() => openConversation(conv.id)}
              className={cn(
                "group flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left transition",
                active ? "bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-slate-100"
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-700">{conv.title}</span>
                <span className="block text-xs text-slate-400">
                  {getBusinessPersona(conv.personaId).label} · {timeAgo(conv.lastMessageAt)}
                </span>
              </span>
              <span className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRename(conv.id);
                  }}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Rename conversation"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(conv.id);
                  }}
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            </button>
          );
        })}
      </div>
      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={startNewChat}
          className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
        >
          + New conversation
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Desktop conversation sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 md:block">{conversationSidebar}</aside>

      {/* Mobile conversation sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="h-full w-72 border-r border-slate-200 bg-white">{conversationSidebar}</div>
          <button className="flex-1 bg-black/20" onClick={() => setSidebarOpen(false)} aria-label="Close conversations" />
        </div>
      )}

      {/* Main chat column */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label="Open conversations"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">
              {activePersona.role.replace(/^your /i, "")}
            </p>
            <p className="truncate text-xs text-slate-400">{activePersona.tagline}</p>
          </div>
          <select
            value={activePersonaId}
            onChange={(e) => selectPersona(e.target.value as AIAssistantPersonaId)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:border-emerald-400 focus:outline-none"
            aria-label="Switch assistant"
          >
            {BUSINESS_AI_PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-6">
          {isWelcome ? (
            <div className="mx-auto flex max-w-2xl flex-col gap-5">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
                <p className="text-lg font-semibold">{buildAssistantGreeting(activePersona, businessName)}</p>
                <p className="mt-2 text-sm text-emerald-50">
                  Pick an expert below, then ask about your business — or start with a suggestion.
                </p>
              </div>
              <PersonaPicker activeId={activePersonaId} onSelect={selectPersona} />
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Try asking
                </p>
                <SuggestedPrompts persona={activePersona} onPick={(p) => setInput(p)} />
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {loadingMsgs && (
                <div className="flex justify-center py-8 text-xs text-slate-400">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading conversation…
                </div>
              )}
              {!loadingMsgs &&
                messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm",
                        m.role === "user"
                          ? "rounded-br-sm bg-emerald-600 text-white"
                          : "rounded-bl-sm border border-slate-200 bg-white"
                      )}
                    >
                      {m.role === "assistant" ? (
                        <Markdown content={m.content} />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                      )}
                      {m.role === "assistant" && m.creditsCharged ? (
                        <p className="mt-1.5 text-[10px] text-slate-400">
                          Used {m.creditsCharged} credit{m.creditsCharged === 1 ? "" : "s"}
                          {typeof m.balanceAfter === "number" ? ` · ${m.balanceAfter} left` : ""}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-2 shadow-sm">
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-slate-200 bg-white px-3 py-3 sm:px-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
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
              placeholder={`Ask ${activePersona.role.replace(/^your /i, "")}…`}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-40"
              aria-label="Send message"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-slate-400">
            {businessName} Assistant only sees your business&apos;s own data. Never share passwords or account secrets.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AiChatEmpty() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">
      <MessageSquare className="mr-2 h-4 w-4" /> Assistant unavailable
    </div>
  );
}
