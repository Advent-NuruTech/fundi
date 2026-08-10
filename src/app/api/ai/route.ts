import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { getWorkspaceSubscription } from "@/lib/billing/subscription-service";
import { getEffectivePlanConfig } from "@/lib/billing/dynamic-config";
import { DEFAULT_BUSINESS_PERSONA_ID, getBusinessPersona, isPersonaId } from "@/lib/ai/personas";
import { buildBusinessPersonaPrompt } from "@/lib/ai/prompts";
import { buildBusinessContext } from "@/lib/ai/context";
import { buildInstantGreeting } from "@/lib/ai/greetings";
import { summarizeConversation } from "@/lib/ai/summarize";
import { executeAssistantReply, InsufficientUsageError } from "@/lib/ai/assistant-service";
import { InsufficientAICreditsError } from "@/lib/ai-billing/wallet-service";
import { AI_FEATURE_CHAT } from "@/lib/ai/feature";
import { allowedAIContextScopes, intersectAIContextScopes } from "@/lib/ai/access";
import { buildRecordContext } from "@/lib/ai/record-context";
import type { AIMessageRecord, AIConversationSummary } from "@/lib/ai/types";
import type { AIProviderUsage } from "@/types/ai-billing";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

// Conversation memory strategy:
//   * The most recent RECENT_WINDOW_MESSAGES are always resent raw — this
//     prefix is prompt-cached by the provider, so resending it is cheap.
//   * Anything older is collapsed into a stored conversation summary that is
//     reused instead of being re-sent every turn (see src/lib/ai/summarize.ts).
const RECENT_WINDOW_MESSAGES = 30;
const SUMMARY_REFRESH_MESSAGES = 10;

interface Caller {
  userId: string;
  businessId: string;
  role: string;
  roles: string[];
  isFinanceOwner: boolean;
}

// ─── Auth: resolve the caller and verify active membership ──────────────────

async function resolveCaller(admin: SupabaseClient, req: Request): Promise<Caller | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("business_id, role, roles")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.business_id) return null;

  // Active-membership check — a deactivated member must not reach tenant data.
  const { data: member } = await admin
    .from("business_members")
    .select("id, role, roles")
    .eq("business_id", profile.business_id)
    .eq("profile_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (!member) return null;

  const roles = Array.isArray(member.roles)
    ? member.roles.map(String)
    : Array.isArray(profile.roles)
      ? profile.roles.map(String)
      : [String(member.role ?? profile.role ?? "tailor")];
  const { data: business } = await admin
    .from("businesses")
    .select("finance_access")
    .eq("id", profile.business_id)
    .maybeSingle();
  const coOwners = (business?.finance_access as { coOwnerUids?: unknown } | null)?.coOwnerUids;

  return {
    userId: user.id,
    businessId: profile.business_id as string,
    role: String(member.role ?? profile.role ?? "tailor"),
    roles,
    isFinanceOwner: roles.includes("owner") || (Array.isArray(coOwners) && coOwners.includes(user.id)),
  };
}

// ─── Plan gate: AI Assistant must be included in the business plan ──────────

async function planAllowsAi(admin: SupabaseClient, businessId: string): Promise<boolean> {
  try {
    const sub = await getWorkspaceSubscription(admin, businessId);
    if (!sub?.planSlug) return true; // no plan → default open (usage is still metered)
    const plan = await getEffectivePlanConfig(sub.planSlug, admin);
    return plan?.features.aiAssistant !== "none";
  } catch {
    return true; // fail open on config errors; credits remain the hard gate
  }
}

// ─── Row mappers ─────────────────────────────────────────────────────────────

function mapConversation(row: Record<string, unknown>): AIConversationSummary {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    userId: (row.user_id as string | null) ?? null,
    title: String(row.title ?? "New conversation"),
    personaId: (row.persona_id as AIConversationSummary["personaId"]) ?? DEFAULT_BUSINESS_PERSONA_ID,
    lastMessageAt: (row.last_message_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapMessage(row: Record<string, unknown>): AIMessageRecord {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    businessId: String(row.business_id),
    role: (row.role as AIMessageRecord["role"]) ?? "user",
    content: String(row.content ?? ""),
    model: (row.model as string | null) ?? null,
    creditsCharged: Number(row.credits_charged ?? 0),
    tokensTotal: Number(row.tokens_total ?? 0),
    createdAt: String(row.created_at),
  };
}

// ─── Greeting fast path ──────────────────────────────────────────────────────
//
// Standalone greetings ("hi", "thanks", "good morning") are answered locally
// with zero LLM cost and zero credit charges. The exchange is still persisted
// so the conversation memory stays complete and the UI adopts the new
// conversation id.

async function handleGreeting(
  admin: SupabaseClient,
  caller: Caller,
  conversationId: string,
  personaId: AIConversationSummary["personaId"],
  message: string,
  reply: string
): Promise<NextResponse> {
  const { data: userMsg, error: userMsgErr } = await admin
    .from("ai_messages")
    .insert({
      conversation_id: conversationId,
      business_id: caller.businessId,
      user_id: caller.userId,
      role: "user",
      content: message,
    })
    .select("id")
    .single();
  if (userMsgErr) {
    console.error("[ai] save user message failed", userMsgErr);
    return json({ error: "Could not save your message" }, 500);
  }

  await admin.from("ai_messages").insert({
    conversation_id: conversationId,
    business_id: caller.businessId,
    user_id: caller.userId,
    role: "assistant",
    content: reply,
    credits_charged: 0,
    tokens_total: 0,
    metadata: { handled: "greeting" },
  });

  await admin
    .from("ai_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return json({
    reply,
    conversationId,
    messageId: userMsg.id,
    personaId,
    model: "instant",
    creditsCharged: 0,
    balanceAfter: null,
    billingMode: "greeting",
  });
}

// ─── Chat turn ───────────────────────────────────────────────────────────────

async function handleChat(
  admin: SupabaseClient,
  caller: Caller,
  body: Record<string, unknown>
): Promise<NextResponse> {
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return json({ error: "Message is required" }, 400);
  if (message.length > 4_000) return json({ error: "Please keep messages under 4,000 characters." }, 400);

  if (!(await planAllowsAi(admin, caller.businessId))) {
    return json(
      {
        error: "The AI Assistant is not included in your current plan. Upgrade to start using it.",
        code: "AI_FEATURE_DISABLED",
      },
      403
    );
  }

  // Resolve the conversation (existing keeps its persona; new uses the request).
  const requestedPersonaId = isPersonaId(body.personaId) ? body.personaId : DEFAULT_BUSINESS_PERSONA_ID;
  let conversationId =
    typeof body.conversationId === "string" && body.conversationId ? body.conversationId : null;
  let persona = getBusinessPersona(requestedPersonaId);

  let convRow: Record<string, unknown> | null = null;
  if (conversationId) {
    const { data: conv } = await admin
      .from("ai_conversations")
      .select("business_id, user_id, persona_id, summary, summary_message_count")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv || conv.business_id !== caller.businessId || conv.user_id !== caller.userId) {
      return json({ error: "Conversation not found" }, 404);
    }
    convRow = conv;
    persona = getBusinessPersona(conv.persona_id);
  } else {
    const { data, error } = await admin
      .from("ai_conversations")
      .insert({
        business_id: caller.businessId,
        user_id: caller.userId,
        persona_id: persona.id,
        title: message.slice(0, 60),
      })
      .select("id")
      .single();
    if (error) {
      console.error("[ai] create conversation failed", error);
      return json({ error: "Could not start a conversation" }, 500);
    }
    conversationId = data.id as string;
  }

  const { data: biz } = await admin
    .from("businesses")
    .select("name")
    .eq("id", caller.businessId)
    .maybeSingle();
  const businessName = biz?.name ? String(biz.name) : "Your business";

  // Greeting fast path — a standalone "hi"/"thanks"/"good morning" is answered
  // instantly with zero LLM cost and zero credit charges.
  const instantReply = buildInstantGreeting(message, {
    assistantName: `${businessName} Assistant`,
    role: persona.role,
  });
  if (instantReply) {
    return handleGreeting(admin, caller, conversationId, persona.id, message, instantReply);
  }

  // ── Conversation memory ────────────────────────────────────────────────────
  // Always resend the most recent window raw — this prefix is stable between
  // turns, so the provider's prompt cache makes resending nearly free. Older
  // turns are collapsed into a stored summary that is reused (and only
  // regenerated every SUMMARY_REFRESH_MESSAGES) instead of re-sent every turn.
  const { count: existingCount } = await admin
    .from("ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);
  const totalMessages = (existingCount ?? 0) + 1; // + the incoming user turn

  const { data: history } = await admin
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(RECENT_WINDOW_MESSAGES);
  const historyMessages = [...(history ?? [])].reverse();

  const llmHistory: { role: "system" | "user" | "assistant"; content: string }[] =
    historyMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: String(m.content ?? ""),
    }));

  let summary = (convRow?.summary as string | null) ?? null;
  if (totalMessages > RECENT_WINDOW_MESSAGES) {
    const summarizedSoFar = Number(convRow?.summary_message_count ?? 0);
    const needsRefresh = !summary || totalMessages - summarizedSoFar >= SUMMARY_REFRESH_MESSAGES;
    if (needsRefresh) {
      // Only the turns that fall outside the recent window get collapsed.
      const olderCount = Math.max(0, (existingCount ?? 0) - RECENT_WINDOW_MESSAGES);
      const { data: older } = await admin
        .from("ai_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(olderCount);
      const refreshed = await summarizeConversation({
        db: admin,
        businessId: caller.businessId,
        userId: caller.userId,
        turns: (older ?? []) as { role: "user" | "assistant"; content: string }[],
        idempotencyKey: `${caller.businessId}:${conversationId}:summary:${totalMessages}`,
        requestId: randomUUID(),
      }).catch(() => null);
      if (refreshed) {
        summary = refreshed;
        await admin
          .from("ai_conversations")
          .update({ summary, summary_message_count: totalMessages })
          .eq("id", conversationId);
      }
    }
    if (summary) {
      llmHistory.unshift({
        role: "system",
        content: `Earlier in this conversation (memory):\n${summary}`,
      });
    }
  }

  // Business memory — private snapshot scoped to the persona's data permissions.
  // Cached per business (see context.ts) so the system prompt stays stable and
  // the provider's prompt cache keeps hitting across turns.
  const permittedScopes = intersectAIContextScopes(
    persona.contextScopes,
    allowedAIContextScopes(caller)
  );
  const [context, recordContext] = await Promise.all([
    buildBusinessContext(admin, caller.businessId, permittedScopes).catch(() => ""),
    buildRecordContext(admin, caller.businessId, message, permittedScopes).catch(() => ""),
  ]);

  const systemPrompt = buildBusinessPersonaPrompt(persona, businessName);
  const llmMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    {
      role: "system",
      content: [systemPrompt, context, recordContext].filter(Boolean).join("\n\n"),
    },
    ...llmHistory,
    { role: "user", content: message },
  ];

  const { data: userMsg, error: userMsgErr } = await admin
    .from("ai_messages")
    .insert({
      conversation_id: conversationId,
      business_id: caller.businessId,
      user_id: caller.userId,
      role: "user",
      content: message,
    })
    .select("id")
    .single();
  if (userMsgErr) {
    console.error("[ai] save user message failed", userMsgErr);
    return json({ error: "Could not save your message" }, 500);
  }

  const requestId = randomUUID();
  const idempotencyKey = `${caller.businessId}:${conversationId}:${userMsg.id}`;

  try {
    const result = await executeAssistantReply({
      db: admin,
      businessId: caller.businessId,
      userId: caller.userId,
      messages: llmMessages,
      feature: AI_FEATURE_CHAT,
      maxTokens: 1200,
      idempotencyKey,
      requestId,
    });

    const totalTokens = totalTokensOf(result.usage);

    const { data: aiMsg } = await admin
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        business_id: caller.businessId,
        user_id: caller.userId,
        role: "assistant",
        content: result.content,
        model: result.model,
        credits_charged: result.creditsCharged,
        tokens_total: totalTokens,
        metadata: { billing_mode: result.billingMode, request_id: requestId },
      })
      .select("id")
      .single();

    await admin
      .from("ai_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    return json({
      reply: result.content,
      conversationId,
      messageId: aiMsg?.id ?? userMsg.id,
      personaId: persona.id,
      model: result.model,
      creditsCharged: result.creditsCharged,
      balanceAfter: result.balanceAfter,
      billingMode: result.billingMode,
    });
  } catch (err) {
    if (
      err instanceof InsufficientUsageError ||
      err instanceof InsufficientAICreditsError ||
      (err as { name?: string })?.name === "InsufficientAICreditsError"
    ) {
      return json(
        {
          error:
            "Your AI credit allowance is used up. Add more credits in Settings → Usage & Top-ups to keep using the AI Assistant.",
          code: "INSUFFICIENT_USAGE",
          resource: "ai_credits",
        },
        429
      );
    }
    console.error("[ai] chat failed", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}

function totalTokensOf(usage: AIProviderUsage): number {
  return usage.inputTokens + usage.cachedInputTokens + usage.outputTokens;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const admin = getBillingAdminClient();
  const caller = await resolveCaller(admin, req);
  if (!caller) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "conversations";

  if (mode === "conversations") {
    const personaId = url.searchParams.get("personaId");
    let query = admin
      .from("ai_conversations")
      .select("*")
      .eq("business_id", caller.businessId)
      .eq("user_id", caller.userId)
      .eq("status", "active");
    if (personaId && isPersonaId(personaId)) query = query.eq("persona_id", personaId);
    const { data } = await query
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);
    return json({ conversations: (data ?? []).map(mapConversation) });
  }

  if (mode === "messages") {
    const conversationId = url.searchParams.get("conversationId");
    if (!conversationId) return json({ error: "conversationId is required" }, 400);
    const { data: conv } = await admin
      .from("ai_conversations")
      .select("business_id, user_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv || conv.business_id !== caller.businessId || conv.user_id !== caller.userId) {
      return json({ error: "Conversation not found" }, 404);
    }
    const { data } = await admin
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);
    return json({ messages: (data ?? []).map(mapMessage) });
  }

  return json({ error: "Unknown mode" }, 400);
}

export async function POST(req: Request) {
  const admin = getBillingAdminClient();
  const caller = await resolveCaller(admin, req);
  if (!caller) return json({ error: "Unauthorized" }, 401);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return json({ error: "Invalid body" }, 400);

  const mode = (body.mode as string) ?? "chat";

  const ownConversation = async (id: string): Promise<boolean> => {
    const { data } = await admin
      .from("ai_conversations")
      .select("business_id, user_id")
      .eq("id", id)
      .maybeSingle();
    return Boolean(data && data.business_id === caller.businessId && data.user_id === caller.userId);
  };

  switch (mode) {
    case "create": {
      const personaId = isPersonaId(body.personaId) ? body.personaId : null;
      if (!personaId) return json({ error: "A valid personaId is required" }, 400);
      const { data, error } = await admin
        .from("ai_conversations")
        .insert({
          business_id: caller.businessId,
          user_id: caller.userId,
          persona_id: personaId,
          title:
            typeof body.title === "string" && body.title.trim()
              ? body.title.trim().slice(0, 80)
              : "New conversation",
        })
        .select("*")
        .single();
      if (error) return json({ error: "Could not create conversation" }, 500);
      return json({ conversation: mapConversation(data) });
    }

    case "rename": {
      if (!body.conversationId || !(await ownConversation(String(body.conversationId)))) {
        return json({ error: "Conversation not found" }, 404);
      }
      const { data, error } = await admin
        .from("ai_conversations")
        .update({ title: String(body.title ?? "Conversation").slice(0, 80) })
        .eq("id", String(body.conversationId))
        .select("*")
        .single();
      if (error) return json({ error: "Could not rename conversation" }, 500);
      return json({ conversation: mapConversation(data) });
    }

    case "delete": {
      if (!body.conversationId || !(await ownConversation(String(body.conversationId)))) {
        return json({ error: "Conversation not found" }, 404);
      }
      const { error } = await admin
        .from("ai_conversations")
        .delete()
        .eq("id", String(body.conversationId));
      if (error) return json({ error: "Could not delete conversation" }, 500);
      return json({ ok: true });
    }

    case "chat":
      return handleChat(admin, caller, body);

    default:
      return json({ error: "Unknown mode" }, 400);
  }
}
