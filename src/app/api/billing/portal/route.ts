import { NextResponse } from "next/server";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import {
  mapDbToSubscription,
  mapDbToBillingPayment,
  mapDbToAuditLog,
} from "@/lib/billing/subscription-service";
import { getPlanConfig as getDefaultPlanConfig } from "@/lib/billing/constants";
import { getEffectivePlanConfig } from "@/lib/billing/dynamic-config";
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

    // ── Fetch subscription ─────────────────────────────────────────────────
    const { data: subRow, error: subErr } = await admin
      .from("subscriptions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (subErr) {
      return NextResponse.json({ error: subErr.message }, { status: 500 });
    }

    // ── Apply pending downgrade if change_at has passed ────────────────────
    if (
      subRow?.pending_plan_slug &&
      subRow?.pending_change_at &&
      new Date(subRow.pending_change_at) <= new Date()
    ) {
      await admin
        .from("subscriptions")
        .update({
          plan_slug: subRow.pending_plan_slug,
          pending_plan_slug: null,
          pending_change_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspaceId);

      // Reload the row after applying the downgrade
      const { data: refreshed } = await admin
        .from("subscriptions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (refreshed) Object.assign(subRow, refreshed);
    }

    // ── Apply cancel_at_period_end if period has ended ─────────────────────
    if (
      subRow?.cancel_at_period_end &&
      subRow?.current_period_end &&
      new Date(subRow.current_period_end) <= new Date()
    ) {
      await admin
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspaceId);

      const { data: refreshed } = await admin
        .from("subscriptions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (refreshed) Object.assign(subRow, refreshed);
    }

    // ── Fetch last 20 billing payments ─────────────────────────────────────
    const { data: paymentRows } = await admin
      .from("billing_payments")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(20);

    // ── Fetch last 10 audit log entries ────────────────────────────────────
    const { data: auditRows } = await admin
      .from("billing_audit_logs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(10);

    const subscription = subRow ? mapDbToSubscription(subRow) : null;
    const payments = (paymentRows ?? []).map(mapDbToBillingPayment);
    const auditLogs = (auditRows ?? []).map(mapDbToAuditLog);
    const plan = subscription
      ? (await getEffectivePlanConfig(subscription.planSlug as PlanSlug, admin)) ??
        getDefaultPlanConfig(subscription.planSlug as PlanSlug)
      : null;

    // Launch offer: the first renewal (month 2) bills at the intro rate, then
    // the standard monthly rate applies from month 3 onwards.
    let nextRenewalAmount: number | null = null;
    if (plan) {
      const { count } = await admin
        .from("billing_payments")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("payment_type", "renewal")
        .eq("payment_status", "success");
      nextRenewalAmount =
        (count ?? 0) === 0 ? (plan.introPrice ?? plan.monthlyPrice) : plan.monthlyPrice;
    }

    return NextResponse.json({ subscription, payments, plan, auditLogs, nextRenewalAmount });
  } catch (err) {
    console.error("[billing/portal]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
