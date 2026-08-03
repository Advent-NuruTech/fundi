import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceSupabaseClient } from "@/lib/supabase";
import type {
  AIBillingConfig,
  AIExchangeRate,
  AICreditPack,
  AIExchangeRateProviderId,
} from "@/types/ai-billing";
import { DEFAULT_AI_BILLING_CONFIG } from "./constants";

function resolveDb(db?: SupabaseClient): SupabaseClient {
  return db ?? createServiceSupabaseClient();
}

/** Fixed primary key of the single active-configuration row (see migration 00043). */
export const ACTIVE_CONFIG_ROW_ID = "00000000-0000-0000-0000-000000000001";

function deepMerge<T>(base: T, override: unknown): T {
  if (override === null || override === undefined || typeof override !== "object") {
    return base;
  }
  if (Array.isArray(base) || Array.isArray(override)) {
    return (override ?? base) as T;
  }
  const baseObj = base as Record<string, unknown>;
  const overrideObj = override as Record<string, unknown>;
  const out: Record<string, unknown> = { ...baseObj };
  for (const [key, value] of Object.entries(overrideObj)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value) && key in baseObj && typeof baseObj[key] === "object" && baseObj[key] !== null && !Array.isArray(baseObj[key])) {
      out[key] = deepMerge(baseObj[key], value);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

export interface ActiveAIConfig {
  version: number;
  config: AIBillingConfig;
}

export async function getActiveAIConfig(db?: SupabaseClient): Promise<ActiveAIConfig> {
  const client = resolveDb(db);
  const { data } = await client
    .from("ai_billing_config")
    .select("version, config, updated_at")
    .maybeSingle();

  if (!data?.config) {
    return { version: 1, config: DEFAULT_AI_BILLING_CONFIG };
  }
  return {
    version: Number(data.version ?? 1),
    config: deepMerge(DEFAULT_AI_BILLING_CONFIG, data.config),
  };
}

export interface SaveAIConfigInput {
  config: AIBillingConfig;
  updatedBy?: string | null;
  note?: string | null;
}

export async function saveAIConfig(
  db: SupabaseClient,
  input: SaveAIConfigInput
): Promise<ActiveAIConfig> {
  const current = await getActiveAIConfig(db);
  const nextVersion = current.version + 1;

  const { error: versionErr } = await db.from("ai_billing_config_versions").insert({
    version: nextVersion,
    config: input.config,
    note: input.note ?? null,
    created_by: input.updatedBy ?? null,
  });
  if (versionErr) throw new Error(`Could not persist config version: ${versionErr.message}`);

  const { error: activeErr } = await db
    .from("ai_billing_config")
    .upsert(
      {
        id: ACTIVE_CONFIG_ROW_ID,
        version: nextVersion,
        config: input.config,
        updated_by: input.updatedBy ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  if (activeErr) {
    throw new Error(`Could not activate config version: ${activeErr.message}`);
  }

  return { version: nextVersion, config: input.config };
}

export interface ConfigVersionSummary {
  id: string;
  version: number;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export async function getConfigVersionHistory(
  db?: SupabaseClient,
  limit = 50
): Promise<ConfigVersionSummary[]> {
  const client = resolveDb(db);
  const { data, error } = await client
    .from("ai_billing_config_versions")
    .select("id, version, note, created_by, created_at")
    .order("version", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id as string,
    version: Number(row.version),
    note: (row.note as string) ?? null,
    createdBy: (row.created_by as string) ?? null,
    createdAt: row.created_at as string,
  }));
}

export async function getActiveExchangeRate(db?: SupabaseClient): Promise<AIExchangeRate | null> {
  const client = resolveDb(db);
  const { data, error } = await client
    .from("ai_exchange_rates")
    .select("id, rate, source, updated_by, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id as string,
    rate: Number(data.rate),
    source: data.source as AIExchangeRateProviderId,
    updatedBy: (data.updated_by as string) ?? null,
    createdAt: data.created_at as string,
  };
}

export async function getExchangeRateHistory(
  db?: SupabaseClient,
  limit = 100
): Promise<AIExchangeRate[]> {
  const client = resolveDb(db);
  const { data, error } = await client
    .from("ai_exchange_rates")
    .select("id, rate, source, updated_by, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id as string,
    rate: Number(row.rate),
    source: row.source as AIExchangeRateProviderId,
    updatedBy: (row.updated_by as string) ?? null,
    createdAt: row.created_at as string,
  }));
}

export async function saveExchangeRate(
  db: SupabaseClient,
  rate: number,
  source: AIExchangeRateProviderId,
  updatedBy?: string | null
): Promise<AIExchangeRate> {
  const { data, error } = await db
    .from("ai_exchange_rates")
    .insert({ rate, source, updated_by: updatedBy ?? null })
    .select("id, rate, source, updated_by, created_at")
    .single();
  if (error) throw new Error(`Could not save exchange rate: ${error.message}`);
  return {
    id: data.id as string,
    rate: Number(data.rate),
    source: data.source as AIExchangeRateProviderId,
    updatedBy: (data.updated_by as string) ?? null,
    createdAt: data.created_at as string,
  };
}

export async function getCreditPacks(db?: SupabaseClient): Promise<AICreditPack[]> {
  const client = resolveDb(db);
  const { data, error } = await client
    .from("ai_credit_packs")
    .select("id, label, credits, price_kes, active, sort_order, updated_at, created_at")
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id as string,
    label: row.label as string,
    credits: Number(row.credits),
    priceKes: Number(row.price_kes),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order),
    updatedAt: (row.updated_at as string) ?? null,
    createdAt: row.created_at as string,
  }));
}

export type CreditPackInput = Omit<AICreditPack, "updatedAt" | "createdAt">;

export async function saveCreditPacks(
  db: SupabaseClient,
  packs: CreditPackInput[],
  updatedBy?: string | null
): Promise<AICreditPack[]> {
  const { error } = await db.from("ai_credit_packs").delete().gte("sort_order", 0);
  if (error) throw new Error(`Could not reset credit packs: ${error.message}`);

  const rows = packs.map((p) => ({
    label: p.label,
    credits: p.credits,
    price_kes: p.priceKes,
    active: p.active,
    sort_order: p.sortOrder,
    updated_by: updatedBy ?? null,
  }));
  const { data, error: insertErr } = await db
    .from("ai_credit_packs")
    .insert(rows)
    .select("id, label, credits, price_kes, active, sort_order, updated_at, created_at");
  if (insertErr) throw new Error(`Could not save credit packs: ${insertErr.message}`);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    label: row.label as string,
    credits: Number(row.credits),
    priceKes: Number(row.price_kes),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order),
    updatedAt: (row.updated_at as string) ?? null,
    createdAt: row.created_at as string,
  }));
}
