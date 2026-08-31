// SERVER-ONLY — canonical SMS accounting across tenant credits and platform stock.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureUsageMeter,
  InsufficientUsageError,
} from "@/lib/billing/usage-metering";

export class PlatformSmsExhaustedError extends Error {
  constructor(
    public readonly available: number,
    public readonly required: number
  ) {
    super(`Platform SMS stock is exhausted — available ${available}, required ${required}`);
    this.name = "PlatformSmsExhaustedError";
  }
}

interface AccountedSmsResult {
  ok?: boolean;
  error?: string;
  available?: number;
  required?: number;
  available_after?: number;
}

/**
 * Atomically reserves tenant allowance and provider stock for one send.
 * The database reference is idempotent, so retrying the same reservation is safe.
 */
export async function reserveAccountedSms(
  admin: SupabaseClient,
  workspaceId: string,
  units: number,
  reference: string,
  metadata: Record<string, unknown> = {}
) {
  await ensureUsageMeter(admin, workspaceId, "sms");

  const { data, error } = await admin.rpc("consume_sms_accounted", {
    p_workspace: workspaceId,
    p_units: units,
    p_reference: reference,
    p_metadata: metadata,
  });
  if (error) throw new Error(`SMS accounting reservation failed: ${error.message}`);

  const result = data as AccountedSmsResult;
  if (!result?.ok) {
    if (result?.error === "insufficient") {
      throw new InsufficientUsageError(
        "sms",
        result.available ?? 0,
        result.required ?? units
      );
    }
    if (result?.error === "platform_insufficient") {
      throw new PlatformSmsExhaustedError(
        result.available ?? 0,
        result.required ?? units
      );
    }
    throw new Error(result?.error ?? "SMS accounting reservation failed");
  }

  return { availableAfter: result.available_after ?? 0 };
}

/** Refunds the matching tenant credit and platform unit after provider failure. */
export async function refundAccountedSms(
  admin: SupabaseClient,
  workspaceId: string,
  consumedReference: string,
  metadata: Record<string, unknown> = {}
) {
  const { data, error } = await admin.rpc("refund_sms_accounted", {
    p_workspace: workspaceId,
    p_units: 1,
    p_reference: `refund_${consumedReference}`,
    p_consumed_reference: consumedReference,
    p_metadata: metadata,
  });
  if (error) throw new Error(`SMS accounting refund failed: ${error.message}`);

  const result = data as AccountedSmsResult;
  if (!result?.ok) {
    throw new Error(result?.error ?? "SMS accounting refund failed");
  }
}
