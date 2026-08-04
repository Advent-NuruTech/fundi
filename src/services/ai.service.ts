"use client";

// Client facade for the Business AI Assistant (AI 2). All heavy lifting —
// auth, tenant isolation, prompts, context, billing, persistence — lives on the
// server in /api/ai. This service only carries the caller's session token and
// shapes the request.

import { supabase } from "@/lib/supabase";
import type {
  AIChatResponse,
  AIConversationSummary,
  AIAssistantPersonaId,
  AIMessageRecord,
} from "@/lib/ai/types";

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

export interface ChatResult extends AIChatResponse {
  /** True when the server responded with a throttling / insufficient-credits error. */
  insufficientCredits?: boolean;
  error?: string;
}

export async function listAiConversations(
  personaId?: AIAssistantPersonaId
): Promise<AIConversationSummary[]> {
  const params = new URLSearchParams({ mode: "conversations" });
  if (personaId) params.set("personaId", personaId);
  const res = await authedFetch(`/api/ai?${params.toString()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { conversations?: AIConversationSummary[] };
  return data.conversations ?? [];
}

export async function getAiMessages(conversationId: string): Promise<AIMessageRecord[]> {
  const params = new URLSearchParams({ mode: "messages", conversationId });
  const res = await authedFetch(`/api/ai?${params.toString()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { messages?: AIMessageRecord[] };
  return data.messages ?? [];
}

export async function createAiConversation(
  personaId: AIAssistantPersonaId,
  title?: string
): Promise<AIConversationSummary | null> {
  const res = await authedFetch("/api/ai", {
    method: "POST",
    body: JSON.stringify({ mode: "create", personaId, title }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { conversation?: AIConversationSummary };
  return data.conversation ?? null;
}

export async function renameAiConversation(
  conversationId: string,
  title: string
): Promise<AIConversationSummary | null> {
  const res = await authedFetch("/api/ai", {
    method: "POST",
    body: JSON.stringify({ mode: "rename", conversationId, title }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { conversation?: AIConversationSummary };
  return data.conversation ?? null;
}

export async function deleteAiConversation(conversationId: string): Promise<boolean> {
  const res = await authedFetch("/api/ai", {
    method: "POST",
    body: JSON.stringify({ mode: "delete", conversationId }),
  });
  return res.ok;
}

export async function chatWithAssistant(input: {
  conversationId?: string;
  personaId: AIAssistantPersonaId;
  message: string;
}): Promise<ChatResult> {
  const res = await authedFetch("/api/ai", {
    method: "POST",
    body: JSON.stringify({ mode: "chat", ...input }),
  });
  const data = (await res.json()) as Partial<ChatResult> & { error?: string; code?: string };
  if (!res.ok) {
    return {
      reply: "",
      conversationId: input.conversationId ?? "",
      messageId: "",
      personaId: input.personaId,
      model: "",
      creditsCharged: 0,
      balanceAfter: null,
      billingMode: "meter",
      insufficientCredits: data.code === "INSUFFICIENT_USAGE",
      error: data.error ?? "Something went wrong. Please try again.",
    };
  }
  return data as ChatResult;
}
