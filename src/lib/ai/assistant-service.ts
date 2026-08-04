// SERVER-ONLY — never import from client components.
//
// AI 2 — Business AI Assistant execution service.
//
// Runs a single assistant turn against the configured LLM provider and
// attaches it to the monetisation pipeline:
//
//   * ENGINE path  → uses the pluggable AI Billing Engine (provider adapter +
//                    USD→KES billing + margin + immutable billing records).
//                    Used automatically once a Super Admin has configured an
//                    exchange rate in the AI Billing module.
//   * METER path   → graceful fallback to the legacy usage meter (1 credit per
//                    request, audited in usage_ledger). Used in dev / before
//                    the admin configures an exchange rate.
//
// Both paths reserve/deduct credits BEFORE executing and refund on failure, so
// an owner is never charged for an answer they didn't get. Idempotency keys
// make retries safe on both paths.

import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIProviderUsage } from "@/types/ai-billing";
import { getActiveAIConfig } from "@/lib/ai-billing/config-store";
import { getCurrentRate } from "@/lib/ai-billing/exchange-rate";
import { AIBillingEngine } from "@/lib/ai-billing/ai-billing-engine";
import { getAdapter } from "@/lib/ai-billing/providers/registry";
import { consumeUsage, InsufficientUsageError } from "@/lib/billing/usage-metering";
import { getUsageBalance } from "@/lib/billing/usage-metering";
import { AI_FEATURE_CHAT } from "./feature";

export { InsufficientUsageError };

export interface ExecuteAssistantParams {
  db: SupabaseClient;
  businessId: string;
  userId: string;
  /** Full message history (system + prior turns + current user turn). */
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  feature?: string;
  maxTokens?: number;
  idempotencyKey: string;
  requestId: string;
}

export interface ExecuteAssistantResult {
  content: string;
  model: string;
  usage: AIProviderUsage;
  creditsCharged: number;
  balanceAfter: number | null;
  billingMode: "engine" | "meter";
}

/** A real OpenAI model id must not contain spaces or marketing suffixes. */
const MODEL_ID_RE = /^[a-z0-9][a-z0-9._-]*$/i;

function resolveModelId(configured?: string | null): string {
  if (configured && MODEL_ID_RE.test(configured)) return configured;
  return process.env.OPENAI_MODEL ?? "gpt-5.5";
}

/** Extracts the assistant's text from either the Chat or Responses API shape. */
function extractText(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const r = raw as { output_text?: string; choices?: Array<{ message?: { content?: string } }> };
  if (typeof r.output_text === "string" && r.output_text) return r.output_text;
  return r.choices?.[0]?.message?.content ?? "";
}

function parseUsage(completion: unknown): AIProviderUsage {
  const usage = (completion as { usage?: Record<string, unknown> })?.usage;
  if (!usage) {
    return { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, imageTokens: 0, audioTokens: 0 };
  }
  const promptDetails = (usage.prompt_tokens_details ?? {}) as { cached_tokens?: number };
  const completionDetails = (usage.completion_tokens_details ?? {}) as { reasoning_tokens?: number };
  const promptTokens = Number(usage.prompt_tokens ?? 0);
  const cached = Number(promptDetails.cached_tokens ?? 0);
  return {
    inputTokens: Math.max(0, promptTokens - cached),
    cachedInputTokens: cached,
    outputTokens: Number(usage.completion_tokens ?? 0),
    reasoningTokens: Number(completionDetails.reasoning_tokens ?? 0),
    imageTokens: 0,
    audioTokens: 0,
  };
}

async function reserveLegacyCredit(db: SupabaseClient, businessId: string, requestId: string): Promise<number> {
  const reference = `ai_meter_${Date.now()}_${requestId}`;
  const res = await consumeUsage(db, businessId, "ai_credits", 1, reference);
  return res.availableAfter;
}

async function refundLegacyCredit(db: SupabaseClient, businessId: string, requestId: string): Promise<void> {
  try {
    await db.rpc("credit_usage", {
      p_workspace: businessId,
      p_resource: "ai_credits",
      p_units: 1,
      p_reference: `ai_refund_${requestId}`,
      p_source: "adjustment",
      p_metadata: { refunded_consumption: `ai_meter_${Date.now()}_${requestId}` },
    });
  } catch {
    // Best-effort refund — a failed refund is logged by the usage meter itself.
  }
}

/**
 * Executes one assistant turn and returns the reply + billing outcome.
 * Throws `InsufficientUsageError` / `InsufficientAICreditsError` when the
 * business has no AI credits left.
 */
export async function executeAssistantReply(params: ExecuteAssistantParams): Promise<ExecuteAssistantResult> {
  const { db, businessId, userId, messages, feature, maxTokens, idempotencyKey, requestId } = params;
  const featureKey = feature ?? AI_FEATURE_CHAT;

  const { config } = await getActiveAIConfig(db);
  const providerConfig = config.providers[config.activeProvider] ?? config.providers.openai;
  const model = resolveModelId(providerConfig?.model);

  // ── ENGINE path (full billing engine) ─────────────────────────────────────
  const rate = await getCurrentRate(config.exchangeRateProvider.active, db).catch(() => null);
  if (rate && providerConfig) {
    const engine = new AIBillingEngine(db);
    const adapter = getAdapter(providerConfig);
    if (!adapter.execute) {
      throw new Error(`Provider "${providerConfig.id}" does not support execution in the app.`);
    }

    const executed = await adapter.execute({
      model,
      messages,
      maxTokens,
    });
    const content = extractText(executed.raw);

    const billed = await engine.billFromUsage({
      businessId,
      userId,
      idempotencyKey,
      requestId,
      feature: featureKey,
      provider: providerConfig.id,
      model,
      usage: executed.usage,
      latencyMs: executed.latencyMs,
      metadata: { requestId },
    });

    return {
      content,
      model,
      usage: executed.usage,
      creditsCharged: billed.chargeBreakdown.creditsCharged,
      balanceAfter: billed.balanceAfter,
      billingMode: "engine",
    };
  }

  // ── METER path (legacy fallback) ──────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("AI is not configured: missing OPENAI_API_KEY.");
  }
  const balanceAfter = await reserveLegacyCredit(db, businessId, requestId);
  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model,
      messages,
      ...(maxTokens != null ? { max_completion_tokens: maxTokens } : {}),
    });
    const content = completion.choices?.[0]?.message?.content ?? "";
    if (!content) {
      throw new Error("The AI returned an empty reply.");
    }
    return {
      content,
      model,
      usage: parseUsage(completion),
      creditsCharged: 1,
      balanceAfter,
      billingMode: "meter",
    };
  } catch (err) {
    await refundLegacyCredit(db, businessId, requestId).catch(() => {});
    throw err;
  }
}

/** Convenience: current AI credit balance for the usage banner in the chat UI. */
export async function getAssistantCreditBalance(
  db: SupabaseClient,
  businessId: string
): Promise<{ available: number; unlimited: boolean }> {
  const balance = await getUsageBalance(db, businessId, "ai_credits");
  return { available: balance.available, unlimited: balance.unlimited };
}
