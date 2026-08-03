// SERVER-ONLY — never import from client components.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PlanConfig,
  UsageLedgerEntry,
  UsageLedgerSource,
  UsageResource,
  UsageSummary,
  UsageTopup,
} from "@/types/billing";
import { getEffectivePlanConfig } from "./dynamic-config";
import { getWorkspaceSubscription } from "./subscription-service";
import { koboToKes } from "./fees";
import { GB } from "./topup-packages";

const UNLIMITED = 999_999_999_999;

const USAGE_RESOURCES: UsageResource[] = ["sms", "ai_credits", "storage"];

export class InsufficientUsageError extends Error {
  constructor(
    public readonly resource: UsageResource,
    public readonly available: number,
    public readonly required: number
  ) {
    super(
      `Insufficient ${resource} credits — available ${available}, required ${required}`
    );
    this.name = "InsufficientUsageError";
  }
}

// ─── Plan quota helpers ──────────────────────────────────────────────────────

function quotaForResource(resource: UsageResource, plan: PlanConfig | null): number {
  if (!plan) return UNLIMITED; // no/custom plan → effectively unlimited
  const limits = plan.limits;
  switch (resource) {
    case "sms":
      return limits.smsPerMonth ?? UNLIMITED;
    case "ai_credits":
      return limits.aiCreditsPerMonth ?? UNLIMITED;
    case "storage":
      return limits.storageGb != null ? limits.storageGb * GB : UNLIMITED;
  }
}

// ─── Meter creation / refresh ────────────────────────────────────────────────

export interface EnsureMeterOptions {
  plan?: PlanConfig | null;
  cycleStart?: string | null;
  cycleEnd?: string | null;
}

/**
 * Creates the (workspace, resource) meter if it does not exist, and refreshes
 * its plan quota + billing cycle from the current subscription / plan config.
 * Also lazily rolls `plan_used` back to 0 when a cycle has lapsed.
 */
export async function ensureUsageMeter(
  admin: SupabaseClient,
  workspaceId: string,
  resource: UsageResource,
  opts: EnsureMeterOptions = {}
): Promise<void> {
  let plan = opts.plan ?? null;
  let cycleStart = opts.cycleStart ?? null;
  let cycleEnd = opts.cycleEnd ?? null;

  if (!plan) {
    const sub = await getWorkspaceSubscription(admin, workspaceId);
    if (sub?.planSlug) {
      plan = await getEffectivePlanConfig(sub.planSlug, admin);
      cycleStart = sub.currentPeriodStart ?? null;
      cycleEnd = sub.currentPeriodEnd ?? null;
    }
  }

  const quota = quotaForResource(resource, plan);
  const resetsCycle = resource !== "storage";

  const { data: existing } = await admin
    .from("usage_meters")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("resource", resource)
    .maybeSingle();

  if (!existing) {
    const { error } = await admin.from("usage_meters").insert({
      workspace_id: workspaceId,
      resource,
      plan_quota: quota,
      plan_used: 0,
      top_up_credits: 0,
      resets_cycle: resetsCycle,
      cycle_start: cycleStart,
      cycle_end: cycleEnd,
    });
    if (error) throw new Error(`Could not create usage meter: ${error.message}`);
    return;
  }

  const patch: Record<string, unknown> = {
    plan_quota: quota,
    updated_at: new Date().toISOString(),
  };
  if (cycleStart) patch.cycle_start = cycleStart;
  if (cycleEnd) patch.cycle_end = cycleEnd;
  if (
    existing.resets_cycle &&
    existing.cycle_end &&
    new Date(existing.cycle_end).getTime() < Date.now()
  ) {
    patch.plan_used = 0;
  }

  const { error } = await admin.from("usage_meters").update(patch).eq("id", existing.id);
  if (error) throw new Error(`Could not refresh usage meter: ${error.message}`);
}

export async function ensureAllUsageMeters(
  admin: SupabaseClient,
  workspaceId: string
): Promise<void> {
  const sub = await getWorkspaceSubscription(admin, workspaceId);
  let plan: PlanConfig | null = null;
  let cycleStart: string | null = null;
  let cycleEnd: string | null = null;
  if (sub?.planSlug) {
    plan = await getEffectivePlanConfig(sub.planSlug, admin);
    cycleStart = sub.currentPeriodStart ?? null;
    cycleEnd = sub.currentPeriodEnd ?? null;
  }
  await Promise.all(
    USAGE_RESOURCES.map((r) =>
      ensureUsageMeter(admin, workspaceId, r, { plan, cycleStart, cycleEnd })
    )
  );
}

// ─── Consumption (atomic, via DB) ────────────────────────────────────────────

export interface ConsumeResult {
  availableAfter: number;
}

/**
 * Atomically deduct units from a meter. Throws `InsufficientUsageError` when the
 * balance is too low, and `reference` makes the consumption idempotent (safe on
 * retries).
 */
export async function consumeUsage(
  admin: SupabaseClient,
  workspaceId: string,
  resource: UsageResource,
  units: number,
  reference?: string
): Promise<ConsumeResult> {
  await ensureUsageMeter(admin, workspaceId, resource);

  const { data, error } = await admin.rpc("consume_usage", {
    p_workspace: workspaceId,
    p_resource: resource,
    p_units: units,
    p_reference: reference ?? null,
  });

  if (error) throw new Error(`Usage consume failed: ${error.message}`);

  const res = data as {
    ok: boolean;
    error?: string;
    available?: number;
    required?: number;
    available_after?: number;
  };

  if (!res.ok) {
    if (res.error === "insufficient") {
      throw new InsufficientUsageError(resource, res.available ?? 0, res.required ?? units);
    }
    throw new Error(res.error ?? "Usage consume failed");
  }

  return { availableAfter: res.available_after ?? 0 };
}

// ─── Balance queries ─────────────────────────────────────────────────────────

export interface UsageBalance {
  available: number;
  quota: number;
  used: number;
  topUpCredits: number;
  unlimited: boolean;
}

export async function getUsageBalance(
  admin: SupabaseClient,
  workspaceId: string,
  resource: UsageResource
): Promise<UsageBalance> {
  await ensureUsageMeter(admin, workspaceId, resource);
  const { data } = await admin
    .from("usage_meters")
    .select("plan_quota, plan_used, top_up_credits")
    .eq("workspace_id", workspaceId)
    .eq("resource", resource)
    .maybeSingle();

  if (!data) {
    return { available: 0, quota: 0, used: 0, topUpCredits: 0, unlimited: false };
  }
  const quota = Number(data.plan_quota);
  const used = Number(data.plan_used);
  const topUpCredits = Number(data.top_up_credits);
  return {
    quota,
    used,
    topUpCredits,
    available: Math.max(0, quota - used) + topUpCredits,
    unlimited: quota >= UNLIMITED,
  };
}

/** Full summary for all measurable resources (keeps storage measurement current). */
export async function getUsageSummary(
  admin: SupabaseClient,
  workspaceId: string
): Promise<UsageSummary[]> {
  await ensureAllUsageMeters(admin, workspaceId);
  await measureStorageUsage(admin, workspaceId).catch(() => {});

  const { data } = await admin
    .from("usage_meters")
    .select("resource, plan_quota, plan_used, top_up_credits, resets_cycle, cycle_start, cycle_end")
    .eq("workspace_id", workspaceId);

  const rows = new Map(
    (data ?? []).map((r) => [r.resource as UsageResource, r])
  );

  return USAGE_RESOURCES.map((resource) => {
    const row = rows.get(resource);
    if (!row) {
      return {
        resource,
        quota: 0,
        used: 0,
        topUpCredits: 0,
        available: 0,
        unlimited: false,
        resetsCycle: resource !== "storage",
        cycleStart: null,
        cycleEnd: null,
      };
    }
    const quota = Number(row.plan_quota);
    const used = Number(row.plan_used);
    const topUpCredits = Number(row.top_up_credits);
    return {
      resource,
      quota,
      used,
      topUpCredits,
      available: Math.max(0, quota - used) + topUpCredits,
      unlimited: quota >= UNLIMITED,
      resetsCycle: row.resets_cycle,
      cycleStart: row.cycle_start ?? null,
      cycleEnd: row.cycle_end ?? null,
    };
  });
}

// ─── Storage measurement ─────────────────────────────────────────────────────

/** Recomputes a workspace's stored bytes from the images table. */
export async function measureStorageUsage(
  admin: SupabaseClient,
  workspaceId: string
): Promise<number> {
  await ensureUsageMeter(admin, workspaceId, "storage");
  const { data, error } = await admin
    .from("images")
    .select("size_bytes")
    .eq("business_id", workspaceId);

  if (error) return 0;
  const measured = (data ?? []).reduce(
    (sum, r) => sum + (Number(r.size_bytes) || 0),
    0
  );

  await admin.rpc("measure_usage", {
    p_workspace: workspaceId,
    p_resource: "storage",
    p_measured: measured,
  });

  return measured;
}

// ─── Top-up crediting (exact units ↔ exact price) ───────────────────────────

export interface CreditTopupInput {
  paystackReference: string;
  paystackTransactionId: string;
  paidAt: string;
  /** Verified kobo amount from Paystack — must match the stored price exactly. */
  verifiedAmountKobo: number;
  paystackFeeKobo: number;
}

/**
 * Credits a completed top-up. Idempotent on the paystack reference. The amount
 * the customer actually paid is checked against the stored package price so we
 * can never over- or under-credit — the units credited are always exactly the
 * units recorded on the pending top-up.
 */
export async function creditTopup(
  admin: SupabaseClient,
  input: CreditTopupInput
): Promise<UsageTopup> {
  const { data: topup } = await admin
    .from("usage_topups")
    .select("*")
    .eq("paystack_reference", input.paystackReference)
    .maybeSingle();

  if (!topup) {
    throw new Error(`No pending top-up for reference ${input.paystackReference}`);
  }

  if (topup.status === "success") {
    return mapTopupRow(topup);
  }

  const amountKes = Number(topup.amount_kes);
  const expectedKobo = Math.round(amountKes * 100);
  if (input.verifiedAmountKobo !== expectedKobo) {
    throw new Error(
      `Amount mismatch for top-up ${input.paystackReference}: expected ${expectedKobo} kobo, paid ${input.verifiedAmountKobo}`
    );
  }

  await ensureUsageMeter(admin, topup.workspace_id as string, topup.resource as UsageResource);

  const units = Number(topup.units);
  const metadata = (topup.metadata ?? {}) as { package_id?: string };

  const rpc = await admin.rpc("credit_usage", {
    p_workspace: topup.workspace_id,
    p_resource: topup.resource,
    p_units: units,
    p_reference: `topup_${input.paystackReference}`,
    p_source: "topup",
    p_metadata: {
      topup_id: topup.id,
      package_id: metadata.package_id ?? null,
      amount_kes: amountKes,
    },
  });

  if (rpc.error || !(rpc.data as { ok?: boolean })?.ok) {
    throw new Error(rpc.error?.message ?? "Usage credit failed");
  }

  const paystackFee = koboToKes(input.paystackFeeKobo);

  const { error: topupErr } = await admin
    .from("usage_topups")
    .update({
      status: "success",
      paystack_transaction_id: input.paystackTransactionId,
      paystack_fee: paystackFee,
      completed_at: input.paidAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", topup.id);
  if (topupErr) throw new Error(`Top-up update failed: ${topupErr.message}`);

  // Mirror into billing_payments so platform dashboards show this revenue.
  await admin.from("billing_payments").upsert(
    {
      user_id: topup.user_id,
      workspace_id: topup.workspace_id,
      paystack_reference: input.paystackReference,
      paystack_transaction_id: input.paystackTransactionId,
      amount: amountKes,
      currency: "KES",
      payment_status: "success",
      payment_type: "topup",
      includes_sms_sender_id: false,
      paystack_fee: paystackFee,
      paid_at: input.paidAt,
      metadata: {
        resource: topup.resource,
        units,
        package_id: metadata.package_id ?? null,
      },
    },
    { onConflict: "paystack_reference" }
  );

  await admin
    .from("payment_attempts")
    .update({ status: "success", updated_at: new Date().toISOString() })
    .eq("reference", input.paystackReference);

  await admin.from("billing_audit_logs").insert({
    workspace_id: topup.workspace_id,
    user_id: topup.user_id,
    action: "topup_credited",
    previous_state: { status: "pending" },
    new_state: { resource: topup.resource, units, amount_kes: amountKes },
    performed_by_role: "owner",
    metadata: { paystack_reference: input.paystackReference },
  });

  return mapTopupRow({
    ...topup,
    status: "success",
    paystack_transaction_id: input.paystackTransactionId,
    paystack_fee: paystackFee,
    completed_at: input.paidAt,
  });
}

// ─── Workspace usage bundle (for the usage page) ─────────────────────────────

export interface WorkspaceUsageData {
  meters: UsageSummary[];
  topups: UsageTopup[];
  ledger: UsageLedgerEntry[];
}

export async function getWorkspaceUsage(
  admin: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceUsageData> {
  const [meters, topupsRes, ledgerRes] = await Promise.all([
    getUsageSummary(admin, workspaceId),
    admin
      .from("usage_topups")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("usage_ledger")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return {
    meters,
    topups: (topupsRes.data ?? []).map(mapTopupRow),
    ledger: (ledgerRes.data ?? []).map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      resource: r.resource as UsageResource,
      units: Number(r.units),
      source: r.source as UsageLedgerSource,
      reference: r.reference ?? null,
      balanceAfter: Number(r.balance_after),
      metadata: r.metadata ?? {},
      createdAt: r.created_at,
    })),
  };
}

// ─── Row mappers ─────────────────────────────────────────────────────────────

function mapTopupRow(row: Record<string, unknown>): UsageTopup {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    userId: (row.user_id as string) ?? null,
    resource: row.resource as UsageResource,
    units: Number(row.units),
    amountKes: Number(row.amount_kes),
    paystackFee: row.paystack_fee != null ? Number(row.paystack_fee) : null,
    status: row.status as UsageTopup["status"],
    paystackReference: row.paystack_reference as string,
    paystackTransactionId: (row.paystack_transaction_id as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}
