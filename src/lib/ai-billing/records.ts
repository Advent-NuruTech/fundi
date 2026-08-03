import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIBillingRecord } from "@/types/ai-billing";
import { transformKeysToSnake } from "@/lib/case-utils";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

function mapRecordRow(row: Record<string, unknown>): AIBillingRecord {
  return {
    id: row.id as string,
    idempotencyKey: row.idempotency_key as string,
    requestId: row.request_id as string,
    businessId: row.business_id as string,
    userId: (row.user_id as string) ?? null,
    provider: row.provider as string,
    model: row.model as string,
    feature: row.feature as string,
    featureCategory: (row.feature_category as string) ?? null,
    inputTokens: Number(row.input_tokens),
    cachedInputTokens: Number(row.cached_input_tokens),
    outputTokens: Number(row.output_tokens),
    reasoningTokens: Number(row.reasoning_tokens),
    imageTokens: Number(row.image_tokens),
    audioTokens: Number(row.audio_tokens),
    providerCostUsd: Number(row.provider_cost_usd),
    exchangeRate: Number(row.exchange_rate),
    exchangeSource: row.exchange_source as AIBillingRecord["exchangeSource"],
    costKes: Number(row.cost_kes),
    revenueMultiplier: Number(row.revenue_multiplier),
    revenueKes: Number(row.revenue_kes),
    creditValueKes: Number(row.credit_value_kes),
    roundingMode: row.rounding_mode as AIBillingRecord["roundingMode"],
    creditsCharged: Number(row.credits_charged),
    minimumCredits: Number(row.minimum_credits),
    balanceAfter: row.balance_after != null ? Number(row.balance_after) : null,
    latencyMs: row.latency_ms != null ? Number(row.latency_ms) : null,
    configVersion: Number(row.config_version),
    status: row.status as AIBillingRecord["status"],
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at as string,
  };
}

/**
 * Writes an immutable billing record. Records are append-only and never
 * deleted. Writing is idempotent on `idempotency_key`: a retried request that
 * already billed returns the EXISTING record instead of double-charging.
 */
export async function writeBillingRecord(
  db: SupabaseClient,
  record: AIBillingRecord
): Promise<AIBillingRecord> {
  const payload = transformKeysToSnake(record as unknown as Record<string, unknown>);
  delete payload.id;

  const { data, error } = await db
    .from("ai_billing_records")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (!error && data) return mapRecordRow(data);

  if (error && isUniqueViolation(error)) {
    const { data: existing } = await db
      .from("ai_billing_records")
      .select("*")
      .eq("idempotency_key", record.idempotencyKey)
      .maybeSingle();
    if (existing) return mapRecordRow(existing);
  }

  throw new Error(error ? `Could not write billing record: ${error.message}` : "Could not write billing record");
}

export async function getBillingRecords(
  db: SupabaseClient,
  opts: {
    limit?: number;
    offset?: number;
    businessId?: string;
    provider?: string;
    feature?: string;
  } = {}
): Promise<{ records: AIBillingRecord[]; total: number }> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  let query = db.from("ai_billing_records").select("*", { count: "exact" });
  if (opts.businessId) query = query.eq("business_id", opts.businessId);
  if (opts.provider) query = query.eq("provider", opts.provider);
  if (opts.feature) query = query.eq("feature", opts.feature);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Could not read billing records: ${error.message}`);
  return { records: (data ?? []).map(mapRecordRow), total: count ?? 0 };
}

export async function getMostExpensiveRequests(
  db: SupabaseClient,
  limit = 10
): Promise<AIBillingRecord[]> {
  const { data, error } = await db
    .from("ai_billing_records")
    .select("*")
    .order("provider_cost_usd", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapRecordRow);
}
