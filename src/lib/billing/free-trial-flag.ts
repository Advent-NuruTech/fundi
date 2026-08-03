import { createServiceSupabaseClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Platform-wide feature flag controlling the free trial.
 *
 * ON  → new workspaces can start a free trial (register → /start-trial).
 * OFF → no user may start a free trial; all trial UI is hidden and the
 *       signup journey routes straight to checkout/pricing.
 *
 * The value lives in the service_role-only `system_config` table
 * (see migration 00039_free_trial_feature_flag.sql). Reads fall back to
 * `true` so the existing trial flow keeps working if the row is missing.
 */

const FREE_TRIAL_KEY = "free_trial_enabled";

/** Server-side read of the free-trial flag. Safe to call in RSC pages/API routes. */
export async function getFreeTrialEnabled(): Promise<boolean> {
  try {
    const db = createServiceSupabaseClient();
    const { data, error } = await db
      .from("system_config")
      .select("value")
      .eq("key", FREE_TRIAL_KEY)
      .maybeSingle();

    if (!error && data && typeof data.value === "boolean") {
      return data.value;
    }
    return true;
  } catch {
    return true;
  }
}

/** Server-side write of the free-trial flag (admin routes only). */
export async function setFreeTrialEnabled(
  db: SupabaseClient,
  enabled: boolean,
  updatedByUid: string
): Promise<void> {
  const { error } = await db.from("system_config").upsert(
    {
      key: FREE_TRIAL_KEY,
      value: enabled,
      updated_by: updatedByUid,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) {
    throw new Error(`Could not update free trial setting: ${error.message}`);
  }
}
