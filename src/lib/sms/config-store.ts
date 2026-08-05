// SERVER-ONLY — never import from client components.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceSupabaseClient } from "@/lib/supabase";
import type { SmsPack } from "@/types/billing";
import type { TopupPackage } from "@/lib/billing/topup-packages";

function resolveDb(db?: SupabaseClient): SupabaseClient {
  return db ?? createServiceSupabaseClient();
}

const SMS_PACK_COLUMNS =
  "id, label, units, price_kes, active, sort_order, updated_at, created_at";

function mapRow(row: Record<string, unknown>): SmsPack {
  return {
    id: row.id as string,
    label: row.label as string,
    units: Number(row.units),
    priceKes: Number(row.price_kes),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order),
    updatedAt: (row.updated_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

/** All SMS packs (admin view), ordered by sort_order. */
export async function getSmsPacks(db?: SupabaseClient): Promise<SmsPack[]> {
  const client = resolveDb(db);
  const { data, error } = await client
    .from("sms_packs")
    .select(SMS_PACK_COLUMNS)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

/** Only active SMS packs — what customers actually see when topping up. */
export async function getActiveSmsPacks(db?: SupabaseClient): Promise<SmsPack[]> {
  const client = resolveDb(db);
  const { data, error } = await client
    .from("sms_packs")
    .select(SMS_PACK_COLUMNS)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

/** Single active pack lookup used to price a purchase server-side. */
export async function getActiveSmsPackById(
  db: SupabaseClient,
  id: string
): Promise<SmsPack | null> {
  const { data, error } = await db
    .from("sms_packs")
    .select(SMS_PACK_COLUMNS)
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

/** Active SMS packs flattened to the generic top-up package shape. */
export async function getSmsTopupPackages(db?: SupabaseClient): Promise<TopupPackage[]> {
  const packs = await getActiveSmsPacks(db);
  return packs.map((p) => ({
    id: p.id,
    resource: "sms" as const,
    label: p.label,
    units: p.units,
    priceKes: p.priceKes,
  }));
}

export type SmsPackInput = Omit<SmsPack, "updatedAt" | "createdAt">;

/**
 * Replaces the full SMS pack list atomically (same strategy as AI credit packs).
 * Deactivate a pack and it disappears from every customer's top-up screen
 * immediately; the next purchase bills at the updated price.
 */
export async function saveSmsPacks(
  db: SupabaseClient,
  packs: SmsPackInput[],
  updatedBy?: string | null
): Promise<SmsPack[]> {
  const { error } = await db.from("sms_packs").delete().gte("sort_order", 0);
  if (error) throw new Error(`Could not reset SMS packs: ${error.message}`);

  const rows = packs.map((p) => ({
    label: p.label,
    units: p.units,
    price_kes: p.priceKes,
    active: p.active,
    sort_order: p.sortOrder,
    updated_by: updatedBy ?? null,
  }));
  const { data, error: insertErr } = await db
    .from("sms_packs")
    .insert(rows)
    .select(SMS_PACK_COLUMNS);
  if (insertErr) throw new Error(`Could not save SMS packs: ${insertErr.message}`);

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}
