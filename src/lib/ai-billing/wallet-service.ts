import type { SupabaseClient } from "@supabase/supabase-js";
import {
  consumeUsage,
  getUsageBalance,
  InsufficientUsageError,
} from "@/lib/billing/usage-metering";

const AI_CREDITS_RESOURCE = "ai_credits" as const;

export class InsufficientAICreditsError extends Error {
  constructor(
    public readonly available: number,
    public readonly required: number
  ) {
    super(
      `Insufficient AI credits — available ${available}, required ${required}`
    );
    this.name = "InsufficientAICreditsError";
  }
}

/**
 * Pre-execution check: the workspace must have at least one credit available
 * before we spend money calling a provider. The EXACT charge is never deducted
 * here — it is always computed from real usage AFTER the provider call and
 * deducted atomically by `deductAICredits`.
 */
export async function validateAICreditAvailability(
  db: SupabaseClient,
  businessId: string,
  estimatedCredits = 1
): Promise<void> {
  const balance = await getUsageBalance(db, businessId, AI_CREDITS_RESOURCE);
  if (balance.available < estimatedCredits) {
    throw new InsufficientAICreditsError(balance.available, estimatedCredits);
  }
}

export async function getAICreditBalance(
  db: SupabaseClient,
  businessId: string
): Promise<number> {
  const balance = await getUsageBalance(db, businessId, AI_CREDITS_RESOURCE);
  return balance.available;
}

/**
 * Atomically deducts credits. `idempotencyKey` makes retries safe — the same
 * key can never be charged twice (the DB function short-circuits on a repeat
 * reference). Returns the balance after the deduction.
 */
export async function deductAICredits(
  db: SupabaseClient,
  businessId: string,
  credits: number,
  idempotencyKey: string
): Promise<number> {
  try {
    const result = await consumeUsage(
      db,
      businessId,
      AI_CREDITS_RESOURCE,
      credits,
      `ai_billing:${idempotencyKey}`
    );
    return result.availableAfter;
  } catch (err) {
    if (err instanceof InsufficientUsageError) {
      throw new InsufficientAICreditsError(err.available, err.required);
    }
    throw err;
  }
}
