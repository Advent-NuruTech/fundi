// SERVER-ONLY — never import from client components.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanSlug, Subscription } from "@/types/billing";
import { NEXT_BILLING_DAYS } from "./constants";
import { koboToKes } from "./fees";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Activate subscription after first (installation-fee) payment ───────────

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
  const nextBillingDate = addDays(paidAtDate, NEXT_BILLING_DAYS);

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
        next_billing_date: nextBillingDate.toISOString(),
        current_period_start: paidAt,
        current_period_end: nextBillingDate.toISOString(),
        paystack_customer_code: paystackCustomerCode || null,
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
      payment_type: "installation_fee",
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
// DB rows from Supabase are untyped at runtime; `any` is intentional.
// biome-ignore lint: deliberate any for untyped DB rows
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows are untyped
type DbRow = Record<string, any>;

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
    installationFeePaid: row.installation_fee_paid,
    smsSenderIdEnabled: row.sms_sender_id_enabled,
    smsSenderIdPaid: row.sms_sender_id_paid,
    smsSenderIdPaidAt: row.sms_sender_id_paid_at ?? null,
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
