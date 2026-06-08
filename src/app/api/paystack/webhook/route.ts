import { NextResponse } from "next/server";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { verifyWebhookSignature, verifyTransaction } from "@/lib/billing/paystack-client";
import { activateSubscription } from "@/lib/billing/subscription-service";
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
      // Already processed a matching event — safe no-op
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
        // Paystack subscription object created — update paystack_subscription_code
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

          // Optionally mark subscription past_due
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
        // Unhandled event — logged above, no action needed
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
    // Return 200 so Paystack doesn't retry — we've logged the failure
    return NextResponse.json({ received: true, error: "processing_failed" });
  }

  return NextResponse.json({ received: true });
}

// ─── charge.success handler ──────────────────────────────────────────────────

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
    plan_slug?: string;
    user_id?: string;
    workspace_id?: string;
    includes_sms_sender_id?: boolean;
    sms_sender_id_amount?: number;
  };

  if (!meta?.workspace_id || !meta?.plan_slug || !meta?.user_id) {
    console.warn("[webhook] Missing metadata on transaction", reference, meta);
    return;
  }

  // Check idempotency — skip if already activated
  const { data: existingPayment } = await admin
    .from("billing_payments")
    .select("payment_status")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (existingPayment?.payment_status === "success") {
    return; // Already processed
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
}
