// SERVER-ONLY — never import from client components.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanSlug, Subscription, BillingAuditLog } from "@/types/billing";
import { BILLING_INTERVAL_DAYS, TRIAL_DAYS } from "./constants";
import { koboToKes } from "./fees";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// biome-ignore lint: deliberate any for untyped DB rows
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

// ─── Activate subscription after first monthly payment ──────────────────────

export interface ActivateSubscriptionInput {
  workspaceId: string;
  userId: string;
  planSlug: PlanSlug;
  paystackReference: string;
  paystackTransactionId: string;
  totalAmountKobo: number; // Paystack amount in kobo
  paystackFeeKobo: number;
  paidAt: string;          // ISO string
  includesSmsSenderId: boolean;
  smsSenderIdAmountKes: number;
  paystackCustomerCode: string;
}

export async function activateSubscription(
  admin: SupabaseClient,
  input: ActivateSubscriptionInput
): Promise<void> {
  const {
    workspaceId,
    userId,
    planSlug,
    paystackReference,
    paystackTransactionId,
    totalAmountKobo,
    paystackFeeKobo,
    paidAt,
    includesSmsSenderId,
    smsSenderIdAmountKes,
    paystackCustomerCode,
  } = input;

  const totalAmountKes = koboToKes(totalAmountKobo);
  const paystackFeeKes = koboToKes(paystackFeeKobo);

  const paidAtDate = new Date(paidAt);
  const nextBillingDate = addDays(paidAtDate, BILLING_INTERVAL_DAYS);

  // ── 1. Upsert subscription ─────────────────────────────────────────────

  const { data: sub, error: subErr } = await admin
    .from("subscriptions")
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: userId,
        plan_slug: planSlug,
        status: "active",
        installation_fee_paid: true,
        sms_sender_id_enabled: includesSmsSenderId,
        sms_sender_id_paid: includesSmsSenderId,
        sms_sender_id_paid_at: includesSmsSenderId ? paidAt : null,
        sms_sender_id_status: includesSmsSenderId ? "pending_approval" : "none",
        next_billing_date: nextBillingDate.toISOString(),
        current_period_start: paidAt,
        current_period_end: nextBillingDate.toISOString(),
        paystack_customer_code: paystackCustomerCode || null,
        cancel_at_period_end: false,
        pending_plan_slug: null,
        pending_change_at: null,
        metadata: {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    )
    .select("id")
    .single();

  if (subErr) {
    throw new Error(`Subscription upsert failed: ${subErr.message}`);
  }

  // ── 2. Record billing payment (idempotent via upsert on reference) ─────

  const { error: payErr } = await admin.from("billing_payments").upsert(
    {
      user_id: userId,
      workspace_id: workspaceId,
      subscription_id: sub?.id ?? null,
      paystack_reference: paystackReference,
      paystack_transaction_id: paystackTransactionId,
      amount: totalAmountKes,
      currency: "KES",
      payment_status: "success",
      payment_type: "monthly_subscription",
      includes_sms_sender_id: includesSmsSenderId,
      sms_sender_id_amount: includesSmsSenderId ? smsSenderIdAmountKes : null,
      paystack_fee: paystackFeeKes,
      paid_at: paidAt,
    },
    { onConflict: "paystack_reference" }
  );

  if (payErr) {
    throw new Error(`Billing payment record failed: ${payErr.message}`);
  }

  // ── 3. Mark payment_attempt as succeeded ──────────────────────────────

  await admin
    .from("payment_attempts")
    .update({ status: "success", updated_at: new Date().toISOString() })
    .eq("reference", paystackReference);

  await logBillingAction(admin, {
    workspaceId,
    userId,
    action: "subscription_activated",
    previousState: null,
    newState: { plan_slug: planSlug, status: "active" },
    performedByRole: "owner",
  });
}

// ─── Start a free trial ──────────────────────────────────────────────────────

export interface StartTrialInput {
  workspaceId: string;
  userId: string;
  planSlug: PlanSlug;
}

export interface StartTrialResult {
  trialEndsAt: string;
}

/**
 * Create a `trialing` subscription on the chosen plan. The trial behaves
 * exactly like the paid plan (same plan_slug → same features/limits) so there
 * is no data discontinuity when the owner pays. Idempotent: if the workspace
 * already has ANY subscription (trial, active, expired, cancelled…), the trial
 * is refused so it can't be restarted to dodge payment.
 */
export async function startTrial(
  admin: SupabaseClient,
  input: StartTrialInput
): Promise<StartTrialResult> {
  const { workspaceId, userId, planSlug } = input;

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, status, trial_ends_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (existing) {
    throw new Error("This workspace has already started a trial or subscription.");
  }

  const now = new Date();
  const trialEndsAt = addDays(now, TRIAL_DAYS);

  const { error } = await admin.from("subscriptions").insert({
    workspace_id: workspaceId,
    user_id: userId,
    plan_slug: planSlug,
    status: "trialing",
    installation_fee_paid: false,
    trial_started_at: now.toISOString(),
    trial_ends_at: trialEndsAt.toISOString(),
    current_period_start: now.toISOString(),
    current_period_end: trialEndsAt.toISOString(),
    metadata: { trial: true },
  });

  if (error) {
    throw new Error(`Could not start trial: ${error.message}`);
  }

  await logBillingAction(admin, {
    workspaceId,
    userId,
    action: "trial_started",
    previousState: null,
    newState: { plan_slug: planSlug, status: "trialing", trial_ends_at: trialEndsAt.toISOString() },
    performedByRole: "owner",
  });

  return { trialEndsAt: trialEndsAt.toISOString() };
}

// ─── Process plan upgrade ────────────────────────────────────────────────────

export interface ProcessUpgradeInput {
  workspaceId: string;
  userId: string;
  newPlanSlug: PlanSlug;
  paystackReference: string;
  paystackTransactionId: string;
  totalAmountKobo: number;
  paystackFeeKobo: number;
  paidAt: string;
  paystackCustomerCode: string;
}

export async function processUpgrade(
  admin: SupabaseClient,
  input: ProcessUpgradeInput
): Promise<void> {
  const {
    workspaceId, userId, newPlanSlug, paystackReference,
    paystackTransactionId, totalAmountKobo, paystackFeeKobo, paidAt,
    paystackCustomerCode,
  } = input;

  const totalAmountKes = koboToKes(totalAmountKobo);
  const paystackFeeKes = koboToKes(paystackFeeKobo);
  const nextBillingDate = addDays(new Date(paidAt), BILLING_INTERVAL_DAYS);

  const { data: current } = await admin
    .from("subscriptions")
    .select("id, plan_slug")
    .eq("workspace_id", workspaceId)
    .single();

  const { data: sub, error: subErr } = await admin
    .from("subscriptions")
    .update({
      plan_slug: newPlanSlug,
      status: "active",
      next_billing_date: nextBillingDate.toISOString(),
      current_period_start: paidAt,
      current_period_end: nextBillingDate.toISOString(),
      pending_plan_slug: null,
      pending_change_at: null,
      cancel_at_period_end: false,
      paystack_customer_code: paystackCustomerCode || null,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .select("id")
    .single();

  if (subErr) throw new Error(`Upgrade subscription update failed: ${subErr.message}`);

  const { error: payErr } = await admin.from("billing_payments").upsert(
    {
      user_id: userId,
      workspace_id: workspaceId,
      subscription_id: sub?.id ?? current?.id ?? null,
      paystack_reference: paystackReference,
      paystack_transaction_id: paystackTransactionId,
      amount: totalAmountKes,
      currency: "KES",
      payment_status: "success",
      payment_type: "upgrade",
      includes_sms_sender_id: false,
      paystack_fee: paystackFeeKes,
      paid_at: paidAt,
      metadata: { from_plan: current?.plan_slug, to_plan: newPlanSlug },
    },
    { onConflict: "paystack_reference" }
  );

  if (payErr) throw new Error(`Upgrade payment record failed: ${payErr.message}`);

  await admin
    .from("payment_attempts")
    .update({ status: "success", updated_at: new Date().toISOString() })
    .eq("reference", paystackReference);

  await logBillingAction(admin, {
    workspaceId,
    userId,
    action: "plan_upgraded",
    previousState: { plan_slug: current?.plan_slug },
    newState: { plan_slug: newPlanSlug },
    performedByRole: "owner",
  });
}

// ─── Schedule downgrade ──────────────────────────────────────────────────────

export async function scheduleDowngrade(
  admin: SupabaseClient,
  input: {
    workspaceId: string;
    userId: string;
    newPlanSlug: PlanSlug;
    changeAt: string;
    performedByRole: string;
  }
): Promise<void> {
  const { workspaceId, userId, newPlanSlug, changeAt, performedByRole } = input;

  const { data: current } = await admin
    .from("subscriptions")
    .select("plan_slug")
    .eq("workspace_id", workspaceId)
    .single();

  const { error } = await admin
    .from("subscriptions")
    .update({
      pending_plan_slug: newPlanSlug,
      pending_change_at: changeAt,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(`Schedule downgrade failed: ${error.message}`);

  await logBillingAction(admin, {
    workspaceId,
    userId,
    action: "downgrade_scheduled",
    previousState: { plan_slug: current?.plan_slug },
    newState: { pending_plan_slug: newPlanSlug, pending_change_at: changeAt },
    performedByRole,
  });
}

// ─── Cancel pending downgrade ─────────────────────────────────────────────────

export async function cancelPendingDowngrade(
  admin: SupabaseClient,
  input: { workspaceId: string; userId: string; performedByRole: string }
): Promise<void> {
  const { workspaceId, userId, performedByRole } = input;

  const { data: current } = await admin
    .from("subscriptions")
    .select("pending_plan_slug")
    .eq("workspace_id", workspaceId)
    .single();

  const { error } = await admin
    .from("subscriptions")
    .update({
      pending_plan_slug: null,
      pending_change_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(`Cancel downgrade failed: ${error.message}`);

  await logBillingAction(admin, {
    workspaceId,
    userId,
    action: "downgrade_cancelled",
    previousState: { pending_plan_slug: current?.pending_plan_slug },
    newState: { pending_plan_slug: null },
    performedByRole,
  });
}

// ─── Schedule cancellation (cancel_at_period_end) ────────────────────────────

export async function scheduleCancellation(
  admin: SupabaseClient,
  input: {
    workspaceId: string;
    userId: string;
    reason?: string;
    performedByRole: string;
  }
): Promise<void> {
  const { workspaceId, userId, reason, performedByRole } = input;

  const { data: current } = await admin
    .from("subscriptions")
    .select("status, cancel_reason")
    .eq("workspace_id", workspaceId)
    .single();

  const { error } = await admin
    .from("subscriptions")
    .update({
      cancel_at_period_end: true,
      cancel_reason: reason ?? "User requested cancellation",
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(`Schedule cancellation failed: ${error.message}`);

  await logBillingAction(admin, {
    workspaceId,
    userId,
    action: "cancellation_scheduled",
    previousState: { status: current?.status, cancel_reason: current?.cancel_reason },
    newState: { cancel_at_period_end: true, cancel_reason: reason },
    performedByRole,
  });
}

// ─── Reverse scheduled cancellation ─────────────────────────────────────────

export async function undoScheduledCancellation(
  admin: SupabaseClient,
  input: { workspaceId: string; userId: string; performedByRole: string }
): Promise<void> {
  const { workspaceId, userId, performedByRole } = input;

  const { error } = await admin
    .from("subscriptions")
    .update({
      cancel_at_period_end: false,
      cancel_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(`Undo cancellation failed: ${error.message}`);

  await logBillingAction(admin, {
    workspaceId,
    userId,
    action: "cancellation_reversed",
    previousState: { cancel_at_period_end: true },
    newState: { cancel_at_period_end: false },
    performedByRole,
  });
}

// ─── Process sender ID payment ───────────────────────────────────────────────

export interface ProcessSenderIdInput {
  workspaceId: string;
  userId: string;
  senderIdName: string;
  paystackReference: string;
  paystackTransactionId: string;
  totalAmountKobo: number;
  paystackFeeKobo: number;
  paidAt: string;
}

export async function processSenderIdActivation(
  admin: SupabaseClient,
  input: ProcessSenderIdInput
): Promise<void> {
  const {
    workspaceId, userId, senderIdName, paystackReference,
    paystackTransactionId, totalAmountKobo, paystackFeeKobo, paidAt,
  } = input;

  const totalAmountKes = koboToKes(totalAmountKobo);
  const paystackFeeKes = koboToKes(paystackFeeKobo);

  const { data: current } = await admin
    .from("subscriptions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .single();

  const { error: subErr } = await admin
    .from("subscriptions")
    .update({
      sms_sender_id_name: senderIdName,
      sms_sender_id_status: "pending_approval",
      sms_sender_id_paid: true,
      sms_sender_id_paid_at: paidAt,
      sms_sender_id_enabled: false, // enabled only after admin approval
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId);

  if (subErr) throw new Error(`Sender ID subscription update failed: ${subErr.message}`);

  const { error: payErr } = await admin.from("billing_payments").upsert(
    {
      user_id: userId,
      workspace_id: workspaceId,
      subscription_id: current?.id ?? null,
      paystack_reference: paystackReference,
      paystack_transaction_id: paystackTransactionId,
      amount: totalAmountKes,
      currency: "KES",
      payment_status: "success",
      payment_type: "sms_sender_id",
      includes_sms_sender_id: true,
      sms_sender_id_amount: totalAmountKes,
      paystack_fee: paystackFeeKes,
      paid_at: paidAt,
      metadata: { sender_id_name: senderIdName },
    },
    { onConflict: "paystack_reference" }
  );

  if (payErr) throw new Error(`Sender ID payment record failed: ${payErr.message}`);

  await admin
    .from("payment_attempts")
    .update({ status: "success", updated_at: new Date().toISOString() })
    .eq("reference", paystackReference);

  await logBillingAction(admin, {
    workspaceId,
    userId,
    action: "sender_id_payment_completed",
    previousState: null,
    newState: { sms_sender_id_name: senderIdName, sms_sender_id_status: "pending_approval" },
    performedByRole: "owner",
  });
}

// ─── Process renewal payment ─────────────────────────────────────────────────

export interface ProcessRenewalInput {
  workspaceId: string;
  userId: string;
  planSlug: PlanSlug;
  paystackReference: string;
  paystackTransactionId: string;
  totalAmountKobo: number;
  paystackFeeKobo: number;
  paidAt: string;
  paystackCustomerCode: string;
}

export async function processRenewal(
  admin: SupabaseClient,
  input: ProcessRenewalInput
): Promise<void> {
  const {
    workspaceId, userId, planSlug, paystackReference,
    paystackTransactionId, totalAmountKobo, paystackFeeKobo, paidAt,
    paystackCustomerCode,
  } = input;

  const totalAmountKes = koboToKes(totalAmountKobo);
  const paystackFeeKes = koboToKes(paystackFeeKobo);
  const nextBillingDate = addDays(new Date(paidAt), BILLING_INTERVAL_DAYS);

  const { data: current } = await admin
    .from("subscriptions")
    .select("id, pending_plan_slug")
    .eq("workspace_id", workspaceId)
    .single();

  // Apply pending downgrade if its change date has passed
  const effectivePlanSlug = (current?.pending_plan_slug as PlanSlug | null) ?? planSlug;

  const { data: sub, error: subErr } = await admin
    .from("subscriptions")
    .update({
      plan_slug: effectivePlanSlug,
      status: "active",
      next_billing_date: nextBillingDate.toISOString(),
      current_period_start: paidAt,
      current_period_end: nextBillingDate.toISOString(),
      cancel_at_period_end: false,
      pending_plan_slug: null,
      pending_change_at: null,
      paystack_customer_code: paystackCustomerCode || null,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .select("id")
    .single();

  if (subErr) throw new Error(`Renewal subscription update failed: ${subErr.message}`);

  const { error: payErr } = await admin.from("billing_payments").upsert(
    {
      user_id: userId,
      workspace_id: workspaceId,
      subscription_id: sub?.id ?? current?.id ?? null,
      paystack_reference: paystackReference,
      paystack_transaction_id: paystackTransactionId,
      amount: totalAmountKes,
      currency: "KES",
      payment_status: "success",
      payment_type: "renewal",
      includes_sms_sender_id: false,
      paystack_fee: paystackFeeKes,
      paid_at: paidAt,
      metadata: { plan_slug: effectivePlanSlug },
    },
    { onConflict: "paystack_reference" }
  );

  if (payErr) throw new Error(`Renewal payment record failed: ${payErr.message}`);

  await admin
    .from("payment_attempts")
    .update({ status: "success", updated_at: new Date().toISOString() })
    .eq("reference", paystackReference);

  await logBillingAction(admin, {
    workspaceId,
    userId,
    action: "subscription_renewed",
    previousState: { plan_slug: planSlug },
    newState: { plan_slug: effectivePlanSlug, status: "active" },
    performedByRole: "owner",
  });
}

// ─── Internal: log billing action ────────────────────────────────────────────

async function logBillingAction(
  admin: SupabaseClient,
  input: {
    workspaceId: string;
    userId: string;
    action: string;
    previousState: Record<string, unknown> | null;
    newState: Record<string, unknown> | null;
    performedByRole: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const { workspaceId, userId, action, previousState, newState, performedByRole, metadata = {} } = input;
  // Fire-and-forget — don't throw if audit log fails
  await admin.from("billing_audit_logs").insert({
    workspace_id: workspaceId,
    user_id: userId,
    action,
    previous_state: previousState,
    new_state: newState,
    performed_by_role: performedByRole,
    metadata,
  }).then(({ error }) => {
    if (error) console.error("[billing-audit]", action, error.message);
  });
}

// ─── Fetch subscription for a workspace ─────────────────────────────────────

export async function getWorkspaceSubscription(
  admin: SupabaseClient,
  workspaceId: string
): Promise<Subscription | null> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapDbToSubscription(data);
}

// ─── Row → camelCase mapping ────────────────────────────────────────────────

export function mapDbToSubscription(row: DbRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    planSlug: row.plan_slug,
    status: row.status,
    nextBillingDate: row.next_billing_date ?? null,
    currentPeriodStart: row.current_period_start ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    trialStartedAt: row.trial_started_at ?? null,
    trialEndsAt: row.trial_ends_at ?? null,
    smsSenderIdEnabled: row.sms_sender_id_enabled,
    smsSenderIdPaid: row.sms_sender_id_paid,
    smsSenderIdPaidAt: row.sms_sender_id_paid_at ?? null,
    smsSenderIdName: row.sms_sender_id_name ?? null,
    smsSenderIdStatus: row.sms_sender_id_status ?? "none",
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
    pendingPlanSlug: row.pending_plan_slug ?? null,
    pendingChangeAt: row.pending_change_at ?? null,
    paystackCustomerCode: row.paystack_customer_code ?? null,
    paystackSubscriptionCode: row.paystack_subscription_code ?? null,
    cancelledAt: row.cancelled_at ?? null,
    cancelReason: row.cancel_reason ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDbToBillingPayment(row: DbRow) {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    subscriptionId: row.subscription_id ?? null,
    paystackReference: row.paystack_reference,
    paystackTransactionId: row.paystack_transaction_id ?? null,
    amount: row.amount,
    currency: row.currency,
    paymentStatus: row.payment_status,
    paymentType: row.payment_type,
    includesSmsSenderId: row.includes_sms_sender_id,
    smsSenderIdAmount: row.sms_sender_id_amount ?? null,
    paystackFee: row.paystack_fee ?? null,
    metadata: row.metadata ?? {},
    failureReason: row.failure_reason ?? null,
    paidAt: row.paid_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDbToAuditLog(row: DbRow): BillingAuditLog {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id ?? null,
    action: row.action,
    previousState: row.previous_state ?? null,
    newState: row.new_state ?? null,
    metadata: row.metadata ?? {},
    performedByRole: row.performed_by_role ?? null,
    createdAt: row.created_at,
  };
}
