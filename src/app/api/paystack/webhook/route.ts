import { NextResponse } from "next/server";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { verifyWebhookSignature, verifyTransaction } from "@/lib/billing/paystack-client";
import {
  activateSubscription,
  processUpgrade,
  processSenderIdActivation,
  processRenewal,
} from "@/lib/billing/subscription-service";
import { koboToKes } from "@/lib/billing/fees";
import type { PlanSlug } from "@/types/billing";

// Must be read as raw text BEFORE any parsing for signature verification
export async function POST(request: Request) {
  const rawBody = await request.text();

  // ── Signature verification (MANDATORY) ────────────────────────────────────
  const signature = request.headers.get("x-paystack-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[webhook] Invalid Paystack signature — rejecting request");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    event: string;
    data: Record<string, unknown>;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = getBillingAdminClient();

  // ── Audit log: record every webhook event ─────────────────────────────────
  const reference =
    (payload.data?.reference as string) ??
    (payload.data?.transaction_reference as string) ??
    null;

  const { data: webhookRecord } = await admin
    .from("billing_webhook_events")
    .insert({
      event: payload.event,
      paystack_reference: reference,
      payload: payload as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  // ── Idempotency: skip already-processed events ─────────────────────────────
  if (webhookRecord) {
    const existing = await admin
      .from("billing_webhook_events")
      .select("processed")
      .eq("event", payload.event)
      .eq("paystack_reference", reference ?? "")
      .eq("processed", true)
      .maybeSingle();

    if (existing.data) {
      return NextResponse.json({ received: true, skipped: true });
    }
  }

  try {
    switch (payload.event) {
      case "charge.success": {
        await handleChargeSuccess(admin, payload.data, reference);
        break;
      }

      case "subscription.create": {
        const subCode = payload.data.subscription_code as string | undefined;
        const customerCode =
          (payload.data.customer as Record<string, string>)?.customer_code ?? "";
        if (reference && subCode) {
          await admin
            .from("subscriptions")
            .update({
              paystack_subscription_code: subCode,
              paystack_customer_code: customerCode || null,
              updated_at: new Date().toISOString(),
            })
            .eq("paystack_customer_code", customerCode);
        }
        break;
      }

      case "invoice.payment_failed": {
        if (reference) {
          await admin
            .from("billing_payments")
            .update({
              payment_status: "failed",
              failure_reason: "Invoice payment failed",
              updated_at: new Date().toISOString(),
            })
            .eq("paystack_reference", reference);

          const { data: bp } = await admin
            .from("billing_payments")
            .select("workspace_id")
            .eq("paystack_reference", reference)
            .maybeSingle();

          if (bp?.workspace_id) {
            await admin
              .from("subscriptions")
              .update({
                status: "past_due",
                updated_at: new Date().toISOString(),
              })
              .eq("workspace_id", bp.workspace_id);
          }
        }
        break;
      }

      case "subscription.disable": {
        const customerCode =
          (payload.data.customer as Record<string, string>)?.customer_code ?? "";
        if (customerCode) {
          await admin
            .from("subscriptions")
            .update({
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
              cancel_reason: "Paystack subscription disabled",
              updated_at: new Date().toISOString(),
            })
            .eq("paystack_customer_code", customerCode);
        }
        break;
      }

      default:
        break;
    }

    // Mark webhook as processed
    if (webhookRecord?.id) {
      await admin
        .from("billing_webhook_events")
        .update({ processed: true })
        .eq("id", webhookRecord.id);
    }
  } catch (err) {
    console.error("[webhook] Processing error", payload.event, err);
    if (webhookRecord?.id) {
      await admin
        .from("billing_webhook_events")
        .update({
          processing_error:
            err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", webhookRecord.id);
    }
    // Return 200 so Paystack doesn't retry — failure is logged above
    return NextResponse.json({ received: true, error: "processing_failed" });
  }

  return NextResponse.json({ received: true });
}

// ─── charge.success dispatcher ───────────────────────────────────────────────

async function handleChargeSuccess(
  admin: Awaited<ReturnType<typeof getBillingAdminClient>>,
  _data: Record<string, unknown>,
  reference: string | null
) {
  if (!reference) return;

  // Re-verify server-side (never trust webhook payload alone)
  const verified = await verifyTransaction(reference);
  if (!verified.status || verified.data.status !== "success") {
    console.warn("[webhook] charge.success but verify returned non-success", reference);
    return;
  }

  const tx = verified.data;
  const meta = tx.metadata as {
    payment_type?: string;
    plan_slug?: string;
    user_id?: string;
    workspace_id?: string;
    includes_sms_sender_id?: boolean;
    sms_sender_id_amount?: number;
    sender_id_name?: string;
    from_plan_slug?: string;
    to_plan_slug?: string;
  };

  if (!meta?.workspace_id || !meta?.user_id) {
    console.warn("[webhook] Missing metadata on transaction", reference, meta);
    return;
  }

  // Check idempotency — skip if already processed
  const { data: existingPayment } = await admin
    .from("billing_payments")
    .select("payment_status")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (existingPayment?.payment_status === "success") {
    return; // Already processed
  }

  const paymentType = meta.payment_type ?? "monthly_subscription";

  switch (paymentType) {
    // "installation_fee" is legacy — kept so in-flight transactions started
    // before the installation fee was removed still activate correctly.
    case "installation_fee":
    case "monthly_subscription": {
      if (!meta.plan_slug) {
        console.warn("[webhook] Missing plan_slug for first payment", reference);
        return;
      }
      await activateSubscription(admin, {
        workspaceId: meta.workspace_id,
        userId: meta.user_id,
        planSlug: meta.plan_slug as PlanSlug,
        paystackReference: reference,
        paystackTransactionId: String(tx.id),
        totalAmountKobo: tx.amount,
        paystackFeeKobo: tx.fees ?? 0,
        paidAt: tx.paid_at,
        includesSmsSenderId: meta.includes_sms_sender_id ?? false,
        smsSenderIdAmountKes: meta.sms_sender_id_amount
          ? koboToKes(meta.sms_sender_id_amount)
          : 0,
        paystackCustomerCode: tx.customer.customer_code ?? "",
      });
      break;
    }

    case "upgrade": {
      const toPlan = (meta.to_plan_slug ?? meta.plan_slug) as PlanSlug | undefined;
      if (!toPlan) {
        console.warn("[webhook] Missing to_plan_slug for upgrade", reference);
        return;
      }
      await processUpgrade(admin, {
        workspaceId: meta.workspace_id,
        userId: meta.user_id,
        newPlanSlug: toPlan,
        paystackReference: reference,
        paystackTransactionId: String(tx.id),
        totalAmountKobo: tx.amount,
        paystackFeeKobo: tx.fees ?? 0,
        paidAt: tx.paid_at,
        paystackCustomerCode: tx.customer.customer_code ?? "",
      });
      break;
    }

    case "sms_sender_id": {
      // Read sender ID name from subscription record (stored pre-payment)
      const { data: sub } = await admin
        .from("subscriptions")
        .select("sms_sender_id_name")
        .eq("workspace_id", meta.workspace_id)
        .maybeSingle();

      const senderIdName = meta.sender_id_name ?? sub?.sms_sender_id_name ?? "unknown";

      await processSenderIdActivation(admin, {
        workspaceId: meta.workspace_id,
        userId: meta.user_id,
        senderIdName,
        paystackReference: reference,
        paystackTransactionId: String(tx.id),
        totalAmountKobo: tx.amount,
        paystackFeeKobo: tx.fees ?? 0,
        paidAt: tx.paid_at,
      });
      break;
    }

    case "renewal": {
      const planSlug = (meta.plan_slug) as PlanSlug | undefined;
      if (!planSlug) {
        console.warn("[webhook] Missing plan_slug for renewal", reference);
        return;
      }
      await processRenewal(admin, {
        workspaceId: meta.workspace_id,
        userId: meta.user_id,
        planSlug,
        paystackReference: reference,
        paystackTransactionId: String(tx.id),
        totalAmountKobo: tx.amount,
        paystackFeeKobo: tx.fees ?? 0,
        paidAt: tx.paid_at,
        paystackCustomerCode: tx.customer.customer_code ?? "",
      });
      break;
    }

    default:
      console.warn("[webhook] Unknown payment_type in charge.success", paymentType, reference);
      break;
  }
}
