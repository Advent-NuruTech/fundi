import { NextResponse } from "next/server";
import { z } from "zod";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { initializeTransaction, getAppBaseUrl } from "@/lib/billing/paystack-client";
import { calculateCheckoutTotals, kesToKobo } from "@/lib/billing/fees";
import { generateReference } from "@/lib/billing/reference";
import { isValidPlanSlug, getPlanConfig, SMS_SENDER_ID_PRICE } from "@/lib/billing/constants";
import type { PlanSlug } from "@/types/billing";

const bodySchema = z.object({
  planSlug: z.string().min(1),
  addSmsSenderId: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    // ── Auth ───────────────────────────────────────────────────────────────
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getBillingAdminClient();

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user?.email) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // ── Body validation ────────────────────────────────────────────────────
    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { planSlug, addSmsSenderId } = parsed.data;

    // ── Validate plan slug ────────────────────────────────────────────────
    if (!isValidPlanSlug(planSlug)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    const slug = planSlug as PlanSlug;
    const planConfig = getPlanConfig(slug);
    if (!planConfig) {
      return NextResponse.json({ error: "Plan not found" }, { status: 400 });
    }

    // ── Workspace resolution ──────────────────────────────────────────────
    const { data: profile } = await admin
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }
    const workspaceId = profile.business_id as string;

    // ── Idempotency: check for existing active subscription ───────────────
    const { data: existing } = await admin
      .from("subscriptions")
      .select("status")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (existing?.status === "active") {
      return NextResponse.json(
        { error: "Workspace already has an active subscription" },
        { status: 409 }
      );
    }

    // ── Server-side amount calculation (NEVER trust frontend amounts) ──────
    const totals = calculateCheckoutTotals(slug, addSmsSenderId);
    const amountKobo = kesToKobo(totals.total);

    // ── Generate unique reference ─────────────────────────────────────────
    const reference = generateReference("first");

    // ── Save payment_attempt BEFORE redirect (anti-double-charge) ─────────
    const { error: attemptErr } = await admin.from("payment_attempts").insert({
      reference,
      user_id: user.id,
      workspace_id: workspaceId,
      amount: totals.total,
      status: "pending",
    });

    if (attemptErr) {
      // Check if it's a duplicate (shouldn't happen given random reference)
      return NextResponse.json(
        { error: `Could not create payment record: ${attemptErr.message}` },
        { status: 500 }
      );
    }

    // ── Also create/update pending billing_payment record ─────────────────
    await admin.from("billing_payments").insert({
      user_id: user.id,
      workspace_id: workspaceId,
      paystack_reference: reference,
      amount: totals.total,
      currency: "KES",
      payment_status: "pending",
      payment_type: "monthly_subscription",
      includes_sms_sender_id: addSmsSenderId,
      sms_sender_id_amount: addSmsSenderId ? SMS_SENDER_ID_PRICE : null,
      paystack_fee: totals.paystackFee,
      metadata: {
        plan_slug: slug,
        first_month_amount: totals.firstPayment,
      },
    });

    // ── Initialize Paystack transaction ───────────────────────────────────
    const baseUrl = getAppBaseUrl();
    const paystackRes = await initializeTransaction({
      email: user.email,
      amount: amountKobo,
      reference,
      callback_url: `${baseUrl}/thank-you`,
      metadata: {
        plan_slug: slug,
        user_id: user.id,
        workspace_id: workspaceId,
        payment_type: "monthly_subscription",
        includes_sms_sender_id: addSmsSenderId,
        sms_sender_id_amount: addSmsSenderId ? SMS_SENDER_ID_PRICE : 0,
        monthly_price: planConfig.monthlyPrice,
      },
    });

    if (!paystackRes.status) {
      // Clean up the attempt record
      await admin.from("payment_attempts").delete().eq("reference", reference);
      await admin.from("billing_payments").delete().eq("paystack_reference", reference);
      return NextResponse.json(
        { error: "Payment gateway error" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      authorizationUrl: paystackRes.data.authorization_url,
      reference,
      totals,
    });
  } catch (err) {
    console.error("[billing/checkout]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
