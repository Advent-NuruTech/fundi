import { NextResponse } from "next/server";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { verifyTransaction } from "@/lib/billing/paystack-client";
import { activateSubscription } from "@/lib/billing/subscription-service";
import { koboToKes } from "@/lib/billing/fees";
import type { PlanSlug } from "@/types/billing";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference || !reference.startsWith("ff_")) {
      return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
    }

    const admin = getBillingAdminClient();

    // ── Auth ───────────────────────────────────────────────────────────────
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // ── Check if already processed (idempotency) ──────────────────────────
    const { data: existingPayment } = await admin
      .from("billing_payments")
      .select("payment_status, workspace_id")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (existingPayment?.payment_status === "success") {
      // Already processed — return cached success
      const { data: sub } = await admin
        .from("subscriptions")
        .select("*")
        .eq("workspace_id", existingPayment.workspace_id)
        .single();

      return NextResponse.json({ verified: true, subscription: sub });
    }

    // ── Verify with Paystack (server-side) ────────────────────────────────
    const paystackRes = await verifyTransaction(reference);

    if (!paystackRes.status || paystackRes.data.status !== "success") {
      return NextResponse.json(
        {
          verified: false,
          status: paystackRes.data.status,
          message: paystackRes.message,
        },
        { status: 200 }
      );
    }

    const tx = paystackRes.data;
    const meta = tx.metadata as {
      plan_slug?: string;
      user_id?: string;
      workspace_id?: string;
      includes_sms_sender_id?: boolean;
      sms_sender_id_amount?: number;
    };

    if (!meta?.workspace_id || !meta?.plan_slug) {
      return NextResponse.json(
        { error: "Malformed transaction metadata" },
        { status: 422 }
      );
    }

    // ── Activate subscription ──────────────────────────────────────────────
    await activateSubscription(admin, {
      workspaceId: meta.workspace_id,
      userId: user.id,
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

    const { data: sub } = await admin
      .from("subscriptions")
      .select("*")
      .eq("workspace_id", meta.workspace_id)
      .single();

    return NextResponse.json({ verified: true, subscription: sub });
  } catch (err) {
    console.error("[billing/verify]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 500 }
    );
  }
}
