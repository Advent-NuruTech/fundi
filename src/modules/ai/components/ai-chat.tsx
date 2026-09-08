"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BrainCircuit, ChevronDown, History, Loader2, LockKeyhole, MessageSquare,
  Pencil, Plus, Send, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, Trash2, X,
} from "lucide-react";
import { BUSINESS_AI_PERSONAS } from "@/lib/ai/personas";
import type { AIAssistantPersonaId, AIConversationSummary, AIMessageRecord } from "@/lib/ai/types";
import {
  chatWithAssistant, deleteAiConversation, getAiMessages, listAiConversations,
  rateAiMessage, renameAiConversation,
} from "@/services/ai.service";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";
import { personaIcon } from "./persona-picker";
import { StatusBubble } from "./status-bubble";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  feedback: -1 | 1 | null;
  expertTeam: string[];
}

const DEFAULT_STATUSES = [
  "Understanding your question…",
  "Checking your business records…",
  "Reviewing with the right specialists…",
  "Preparing your next best action…",
];

const QUICK_STARTS = [
  { label: "Today’s priorities", prompt: "What are the three most important things I should act on in my business today?" },
  { label: "Protect my cash", prompt: "Review my cash flow, unpaid balances and expenses. What needs attention first?" },
  { label: "Deliver on time", prompt: "Which orders are at risk, and what should my team do next?" },
  { label: "Find growth", prompt: "What is the best realistic growth opportunity in my current business data?" },
];

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString("en-KE");
}

export function AiChat({ businessName }: { businessName: string }) {
  const [activePersonaId, setActivePersonaId] = useState<AIAssistantPersonaId>("business_consultant");
  const [conversations, setConversations] = useState<AIConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isWelcome = !activeConversationId && messages.length === 0;

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 132)}px`;
  }, [input]);

  const refreshConversations = useCallback(async () => {
    const list = await listAiConversations().catch(() => []);
    setConversations(list);
    setLoadingConversations(false);
  }, []);

  useEffect(() => { void refreshConversations(); }, [refreshConversations]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
    setHistoryOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const openConversation = useCallback(async (conversation: AIConversationSummary) => {
    setActiveConversationId(conversation.id);
    setActivePersonaId(conversation.personaId);
    setError(null);
    setLoadingMessages(true);
    setMessages([]);
    const rows = await getAiMessages(conversation.id).catch(() => []);
    setMessages(rows.map((message: AIMessageRecord) => ({
      id: message.id, role: message.role, content: message.content, createdAt: message.createdAt,
      feedback: message.feedback, expertTeam: message.expertTeam,
    })));
    setLoadingMessages(false);
    setHistoryOpen(false);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    const optimistic: LocalMessage = {
      id: `temp_${Date.now()}`, role: "user", content: text, createdAt: new Date().toISOString(),
      feedback: null, expertTeam: [],
    };
    setMessages((current) => [...current, optimistic]);
    setSending(true);

    const result = await chatWithAssistant({
      conversationId: activeConversationId ?? undefined,
      personaId: activePersonaId,
      message: text,
    });
    setSending(false);

    if (result.error) {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setError(result.error);
      toast.error(result.error, result.insufficientCredits
        ? { description: "Top up in Settings → Usage & Top-ups to continue." }
        : undefined);
      return;
    }

    if (!activeConversationId && result.conversationId) setActiveConversationId(result.conversationId);
    void refreshConversations();
    setMessages((current) => [...current, {
      id: result.messageId || `ai_${Date.now()}`, role: "assistant", content: result.reply,
      createdAt: new Date().toISOString(), feedback: null, expertTeam: result.expertTeam ?? [],
    }]);
  }, [activeConversationId, activePersonaId, input, refreshConversations, sending]);

  const handleFeedback = useCallback(async (messageId: string, feedback: -1 | 1) => {
    const previous = messages.find((message) => message.id === messageId)?.feedback ?? null;
    setMessages((current) => current.map((message) => message.id === messageId ? { ...message, feedback } : message));
    const saved = await rateAiMessage(messageId, feedback).catch(() => false);
    if (!saved) {
      setMessages((current) => current.map((message) => message.id === messageId ? { ...message, feedback: previous } : message));
      toast.error("Could not save your feedback");
      return;
    }
    toast.success(feedback === 1 ? "Thanks — this helps your advisor improve." : "Thanks — we’ll use this to improve future answers.");
  }, [messages]);

  const handleDelete = useCallback(async (conversationId: string) => {
    const removed = await deleteAiConversation(conversationId).catch(() => false);
    if (!removed) return toast.error("Could not delete this conversation");
    if (conversationId === activeConversationId) startNewChat();
    void refreshConversations();
  }, [activeConversationId, refreshConversations, startNewChat]);

  const handleRename = useCallback(async (conversation: AIConversationSummary) => {
    const title = window.prompt("Conversation title", conversation.title);
    if (title === null) return;
    const renamed = await renameAiConversation(conversation.id, title.trim() || "New conversation").catch(() => null);
    if (renamed) void refreshConversations();
  }, [refreshConversations]);

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
      {historyOpen && (
        <div className="absolute inset-0 z-40 flex">
          <aside className="flex h-full w-[min(88vw,360px)] flex-col border-r border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <div><p className="font-semibold text-slate-900">Conversation history</p><p className="text-xs text-slate-500">Private to your account</p></div>
              <button onClick={() => setHistoryOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close history"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              {loadingConversations ? <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading history</div> : null}
              {!loadingConversations && conversations.length === 0 ? <p className="px-4 py-10 text-center text-sm text-slate-400">Your conversations will appear here.</p> : null}
              {conversations.map((conversation) => {
                const Icon = personaIcon(conversation.personaId);
                return (
                  <div key={conversation.id} className={cn("group flex items-center gap-2 rounded-xl p-2", activeConversationId === conversation.id ? "bg-emerald-50" : "hover:bg-slate-50")}>
                    <button onClick={() => void openConversation(conversation)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="rounded-lg bg-slate-100 p-2 text-slate-500"><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{conversation.title}</span><span className="block text-xs text-slate-400">{timeAgo(conversation.lastMessageAt)}</span></span>
                    </button>
                    <button onClick={() => void handleRename(conversation)} className="rounded-lg p-1.5 text-slate-400 opacity-0 hover:bg-white hover:text-slate-700 group-hover:opacity-100" aria-label="Rename conversation"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => void handleDelete(conversation.id)} className="rounded-lg p-1.5 text-slate-400 opacity-0 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100" aria-label="Delete conversation"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-200 p-3"><button onClick={startNewChat} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"><Plus className="h-4 w-4" /> New conversation</button></div>
          </aside>
          <button className="flex-1 bg-slate-950/30 backdrop-blur-[1px]" onClick={() => setHistoryOpen(false)} aria-label="Close conversation history" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:px-5">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm"><Sparkles className="h-5 w-5" /><span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" /></div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-950">{businessName} Advisor</p><p className="flex items-center gap-1 truncate text-xs text-slate-500"><LockKeyhole className="h-3 w-3 text-emerald-600" /> Private business context</p></div>
          <label className="relative hidden sm:block">
            <span className="sr-only">Advisor focus</span>
            <select value={activePersonaId} onChange={(event) => { setActivePersonaId(event.target.value as AIAssistantPersonaId); startNewChat(); }} className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-100 focus:border-emerald-400">
              {BUSINESS_AI_PERSONAS.map((persona) => <option key={persona.id} value={persona.id}>{persona.id === "business_consultant" ? "Auto · Best expert" : persona.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </label>
          <button onClick={() => setHistoryOpen(true)} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Open conversation history"><History className="h-4 w-4" /></button>
          <button onClick={startNewChat} className="hidden items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 sm:flex"><Plus className="h-4 w-4" /> New</button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_45%)] px-3 py-5 sm:px-6">
          {isWelcome ? (
            <div className="mx-auto flex h-full max-w-3xl flex-col justify-center py-6">
              <div className="mx-auto max-w-xl text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"><BrainCircuit className="h-7 w-7" /></span>
                <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">What should we improve today?</h2>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">Ask normally. Your advisor privately brings in the right finance, operations, sales, stock or growth specialist and returns one clear answer.</p>
              </div>
              <div className="mt-8 grid gap-2 sm:grid-cols-2">
                {QUICK_STARTS.map((item) => <button key={item.label} onClick={() => { setInput(item.prompt); requestAnimationFrame(() => textareaRef.current?.focus()); }} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"><span className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700">{item.label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{item.prompt}</span></button>)}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-slate-500"><span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Permission-aware</span><span className="flex items-center gap-1.5"><BrainCircuit className="h-3.5 w-3.5 text-emerald-600" /> Specialist team</span><span className="flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-emerald-600" /> Never shared across businesses</span></div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
              {loadingMessages ? <div className="flex justify-center py-10 text-sm text-slate-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading conversation</div> : null}
              {!loadingMessages && messages.map((message) => message.role === "user" ? (
                <div key={message.id} className="flex justify-end"><div className="max-w-[88%] rounded-2xl rounded-br-md bg-slate-900 px-4 py-3 text-sm leading-6 text-white shadow-sm sm:max-w-[78%]">{message.content}</div></div>
              ) : (
                <div key={message.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><Sparkles className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    {message.expertTeam.length > 0 ? <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Reviewed by {message.expertTeam.join(" + ")}</p> : null}
                    <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm"><Markdown content={message.content} /></div>
                    {!message.id.startsWith("temp_") ? <div className="mt-2 flex items-center gap-1 text-xs text-slate-400"><span className="mr-1">Helpful?</span><button onClick={() => void handleFeedback(message.id, 1)} className={cn("rounded-lg p-1.5 hover:bg-emerald-50 hover:text-emerald-700", message.feedback === 1 && "bg-emerald-50 text-emerald-700")} aria-label="Helpful answer"><ThumbsUp className="h-3.5 w-3.5" /></button><button onClick={() => void handleFeedback(message.id, -1)} className={cn("rounded-lg p-1.5 hover:bg-rose-50 hover:text-rose-700", message.feedback === -1 && "bg-rose-50 text-rose-700")} aria-label="Unhelpful answer"><ThumbsDown className="h-3.5 w-3.5" /></button></div> : null}
                  </div>
                </div>
              ))}
              {sending ? <div className="flex items-start gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><Sparkles className="h-4 w-4" /></span><StatusBubble statuses={DEFAULT_STATUSES} /></div> : null}
            </div>
          )}
        </div>

        {error ? <div className="border-t border-rose-200 bg-rose-50 px-4 py-2.5 text-center text-xs text-rose-700">{error}</div> : null}

        <footer className="border-t border-slate-200 bg-white px-3 py-3 sm:px-5 sm:py-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.45)] focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
              <textarea ref={textareaRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSend(); } }} rows={1} placeholder={`Ask ${businessName} Advisor…`} className="max-h-[132px] min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400" />
              <button onClick={() => void handleSend()} disabled={sending || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Send message">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400">Answers use only records your role can access. Check important financial, legal and customer decisions before acting.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function AiChatEmpty() {
  return <div className="flex h-full items-center justify-center text-sm text-slate-400"><MessageSquare className="mr-2 h-4 w-4" /> Advisor unavailable</div>;
}
