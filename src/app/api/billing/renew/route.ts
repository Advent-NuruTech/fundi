import { NextResponse } from "next/server";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { initializeTransaction, getAppBaseUrl } from "@/lib/billing/paystack-client";
import { kesToKobo } from "@/lib/billing/fees";
import { generateReference } from "@/lib/billing/reference";
import { getPlanConfig } from "@/lib/billing/constants";
import type { PlanSlug } from "@/types/billing";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getBillingAdminClient();

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user?.email) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: profile } = await admin
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) return NextResponse.json({ error: "No workspace" }, { status: 400 });
    if (profile.role !== "owner") return NextResponse.json({ error: "Owner-only action" }, { status: 403 });

    const workspaceId = profile.business_id as string;

    const { data: sub } = await admin
      .from("subscriptions")
      .select("status, plan_slug, pending_plan_slug")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!sub) return NextResponse.json({ error: "No subscription found" }, { status: 404 });

    // Allow renewal for past_due, cancelled, or expiring active subscriptions
    const effectivePlanSlug = (sub.pending_plan_slug ?? sub.plan_slug) as PlanSlug;
    const planConfig = getPlanConfig(effectivePlanSlug);
    if (!planConfig) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const amountKes = planConfig.monthlyPrice;
    const amountKobo = kesToKobo(amountKes);
    const reference = generateReference("monthly");

    await admin.from("payment_attempts").insert({
      reference,
      user_id: user.id,
      workspace_id: workspaceId,
      amount: amountKes,
      status: "pending",
    });

    await admin.from("billing_payments").insert({
      user_id: user.id,
      workspace_id: workspaceId,
      paystack_reference: reference,
      amount: amountKes,
      currency: "KES",
      payment_status: "pending",
      payment_type: "renewal",
      includes_sms_sender_id: false,
      metadata: { plan_slug: effectivePlanSlug },
    });

    const baseUrl = getAppBaseUrl();
    const paystackRes = await initializeTransaction({
      email: user.email,
      amount: amountKobo,
      reference,
      callback_url: `${baseUrl}/settings/billing?action=renewal&ref=${reference}`,
      metadata: {
        plan_slug: effectivePlanSlug,
        user_id: user.id,
        workspace_id: workspaceId,
        payment_type: "renewal",
        includes_sms_sender_id: false,
        installation_fee_amount: 0,
        sms_sender_id_amount: 0,
        monthly_price: amountKes,
      },
    });

    if (!paystackRes.status) {
      await admin.from("payment_attempts").delete().eq("reference", reference);
      await admin.from("billing_payments").delete().eq("paystack_reference", reference);
      return NextResponse.json({ error: "Payment gateway error" }, { status: 502 });
    }

    return NextResponse.json({
      authorizationUrl: paystackRes.data.authorization_url,
      reference,
      amount: amountKes,
    });
  } catch (err) {
    console.error("[billing/renew]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
