import { NextResponse } from "next/server";
import { z } from "zod";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { initializeTransaction, getAppBaseUrl } from "@/lib/billing/paystack-client";
import { kesToKobo } from "@/lib/billing/fees";
import { generateReference } from "@/lib/billing/reference";
import { getPlanConfig } from "@/lib/billing/constants";
import type { PlanSlug } from "@/types/billing";

const PLAN_RANK: Record<string, number> = {
  sindano: 1,
  fundi: 2,
  dhahabu: 3,
};

const bodySchema = z.object({
  newPlanSlug: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getBillingAdminClient();

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user?.email) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { newPlanSlug } = parsed.data;
    const newPlan = getPlanConfig(newPlanSlug as PlanSlug);
    if (!newPlan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    // Resolve workspace + require owner
    const { data: profile } = await admin
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) return NextResponse.json({ error: "No workspace" }, { status: 400 });
    if (profile.role !== "owner") return NextResponse.json({ error: "Owner-only action" }, { status: 403 });

    const workspaceId = profile.business_id as string;

    // Fetch current subscription
    const { data: sub } = await admin
      .from("subscriptions")
      .select("status, plan_slug")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!sub || sub.status !== "active") {
      return NextResponse.json({ error: "No active subscription to upgrade" }, { status: 409 });
    }

    const currentRank = PLAN_RANK[sub.plan_slug] ?? 0;
    const newRank = PLAN_RANK[newPlanSlug] ?? 0;

    if (newRank <= currentRank) {
      return NextResponse.json(
        { error: "Target plan must be a higher tier than current plan" },
        { status: 400 }
      );
    }

    // Charge the new plan's full monthly price (billing period resets from today)
    const amountKes = newPlan.monthlyPrice;
    const amountKobo = kesToKobo(amountKes);
    const reference = generateReference("upgrade");

    // Save payment attempt
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
      payment_type: "upgrade",
      includes_sms_sender_id: false,
      metadata: {
        from_plan_slug: sub.plan_slug,
        to_plan_slug: newPlanSlug,
      },
    });

    const baseUrl = getAppBaseUrl();
    const paystackRes = await initializeTransaction({
      email: user.email,
      amount: amountKobo,
      reference,
      callback_url: `${baseUrl}/settings/billing?action=upgrade&ref=${reference}`,
      metadata: {
        plan_slug: newPlanSlug,
        user_id: user.id,
        workspace_id: workspaceId,
        payment_type: "upgrade",
        includes_sms_sender_id: false,
        sms_sender_id_amount: 0,
        monthly_price: newPlan.monthlyPrice,
        from_plan_slug: sub.plan_slug,
        to_plan_slug: newPlanSlug,
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
    console.error("[billing/upgrade]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
