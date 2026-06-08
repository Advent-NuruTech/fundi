import { NextResponse } from "next/server";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { mapDbToSubscription, mapDbToBillingPayment } from "@/lib/billing/subscription-service";
import { getPlanConfig } from "@/lib/billing/constants";
import type { PlanSlug } from "@/types/billing";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getBillingAdminClient();

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) {
      return NextResponse.json({ error: "No workspace" }, { status: 404 });
    }

    // Only owner can view billing portal
    if (profile.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const workspaceId = profile.business_id as string;

    // Fetch subscription
    const { data: subRow, error: subErr } = await admin
      .from("subscriptions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (subErr) {
      return NextResponse.json({ error: subErr.message }, { status: 500 });
    }

    // Fetch last 20 billing payments
    const { data: paymentRows } = await admin
      .from("billing_payments")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(20);

    const subscription = subRow ? mapDbToSubscription(subRow) : null;
    const payments = (paymentRows ?? []).map(mapDbToBillingPayment);
    const plan = subscription
      ? getPlanConfig(subscription.planSlug as PlanSlug)
      : null;

    return NextResponse.json({ subscription, payments, plan });
  } catch (err) {
    console.error("[billing/portal]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
