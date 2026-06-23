import { NextResponse } from "next/server";
import { validateAdminRequest, writeAuditLog } from "@/lib/admin/validate";
import type { AdminBusinessDetail } from "@/types/admin";
import { z } from "zod";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend") }),
  z.object({ action: z.literal("reactivate") }),
  z.object({
    action: z.literal("change_plan"),
    planSlug: z.enum(["sindano", "fundi", "dhahabu", "custom"]),
    reason: z.string().optional(),
  }),
  z.object({
    action: z.literal("extend_subscription"),
    days: z.number().int().min(1).max(365),
    reason: z.string().optional(),
  }),
  z.object({
    action: z.literal("cancel_subscription"),
    reason: z.string().optional(),
  }),
  z.object({
    action: z.literal("add_manual_subscription"),
    planSlug: z.enum(["sindano", "fundi", "dhahabu"]),
    durationDays: z.number().int().min(1).max(730),
    reason: z.string().optional(),
  }),
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { db } = admin;

  const { data: biz, error } = await db
    .from("businesses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !biz) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const [subRes, profileRes, paymentsRes, smsRes, auditRes, membersRes] =
    await Promise.allSettled([
      db.from("subscriptions").select("*").eq("workspace_id", id).maybeSingle(),
      db.from("profiles").select("email, display_name").eq("id", biz.owner_uid).single(),
      db
        .from("billing_payments")
        .select("id, paystack_reference, amount, payment_status, payment_type, paid_at, created_at")
        .eq("workspace_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("sms_logs")
        .select("id, recipient_phone, message_type, status, created_at")
        .eq("business_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("billing_audit_logs")
        .select("id, action, previous_state, new_state, performed_by_role, created_at")
        .eq("workspace_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("business_members")
        .select(
          "id, profile_id, role, active, created_at, profiles!business_members_profile_id_fkey(display_name, email)"
        )
        .eq("business_id", id)
        .order("created_at", { ascending: true }),
    ]);

  const sub =
    subRes.status === "fulfilled" ? (subRes.value.data as Record<string, unknown> | null) : null;
  const profile =
    profileRes.status === "fulfilled"
      ? (profileRes.value.data as Record<string, unknown> | null)
      : null;

  const [empCount, custCount, branchCount] = await Promise.all([
    db.from("business_members").select("id", { count: "exact", head: true }).eq("business_id", id).eq("active", true),
    db.from("customers").select("id", { count: "exact", head: true }).eq("business_id", id),
    db.from("branches").select("id", { count: "exact", head: true }).eq("business_id", id),
  ]);

  const detail: AdminBusinessDetail = {
    id: biz.id,
    name: biz.name,
    email: biz.email ?? null,
    phone: biz.phone,
    address: biz.address ?? null,
    location: biz.location ?? null,
    ownerUid: biz.owner_uid,
    ownerEmail: profile?.email as string | undefined,
    ownerName: profile?.display_name as string | undefined,
    isActive: biz.is_active,
    createdAt: biz.created_at,
    businessType: (biz.business_type as string) ?? "tailoring",
    branchCount: branchCount.count ?? 0,
    plan: (sub?.plan_slug as string) ?? biz.plan ?? "none",
    subscriptionStatus: (sub?.status as string) ?? null,
    subscriptionId: (sub?.id as string) ?? null,
    employeeCount: empCount.count ?? 0,
    customerCount: custCount.count ?? 0,
    orderCount: 0,
    totalRevenue: 0,
    smsSentCount: 0,
    lastPaymentAt: null,
    nextBillingDate: (sub?.next_billing_date as string) ?? null,
    currency: biz.currency ?? "KES",
    country: biz.country ?? "Kenya",
    smsSettings: {
      senderId: biz.sms_sender_id ?? null,
      senderIdEnabled: (sub?.sms_sender_id_enabled as boolean) ?? false,
      senderIdStatus: (sub?.sms_sender_id_status as string) ?? "none",
    },
    subscription: sub
      ? {
          id: sub.id as string,
          planSlug: sub.plan_slug as string,
          status: sub.status as string,
          installationFeePaid: sub.installation_fee_paid as boolean,
          currentPeriodStart: sub.current_period_start as string | null,
          currentPeriodEnd: sub.current_period_end as string | null,
          nextBillingDate: sub.next_billing_date as string | null,
          cancelAtPeriodEnd: sub.cancel_at_period_end as boolean,
          cancelledAt: sub.cancelled_at as string | null,
          paystackCustomerCode: sub.paystack_customer_code as string | null,
          paystackSubscriptionCode: sub.paystack_subscription_code as string | null,
          createdAt: sub.created_at as string,
        }
      : null,
    recentPayments:
      paymentsRes.status === "fulfilled"
        ? (paymentsRes.value.data ?? []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            reference: p.paystack_reference as string,
            amount: p.amount as number,
            status: p.payment_status as string,
            type: p.payment_type as string,
            paidAt: p.paid_at as string | null,
            createdAt: p.created_at as string,
          }))
        : [],
    recentSmsLogs:
      smsRes.status === "fulfilled"
        ? (smsRes.value.data ?? []).map((s: Record<string, unknown>) => ({
            id: s.id as string,
            recipientPhone: s.recipient_phone as string,
            messageType: s.message_type as string,
            status: s.status as string,
            createdAt: s.created_at as string,
          }))
        : [],
    auditLogs:
      auditRes.status === "fulfilled"
        ? (auditRes.value.data ?? []).map((a: Record<string, unknown>) => ({
            id: a.id as string,
            action: a.action as string,
            previousState: a.previous_state as Record<string, unknown> | null,
            newState: a.new_state as Record<string, unknown> | null,
            performedByRole: a.performed_by_role as string | null,
            createdAt: a.created_at as string,
          }))
        : [],
    members:
      membersRes.status === "fulfilled"
        ? (membersRes.value.data ?? []).map((m: Record<string, unknown>) => {
            const p = Array.isArray(m.profiles)
              ? (m.profiles[0] as Record<string, unknown>)
              : (m.profiles as Record<string, unknown> | null);
            return {
              id: m.id as string,
              profileId: m.profile_id as string,
              displayName: (p?.display_name as string) ?? "Unknown",
              email: (p?.email as string) ?? "",
              role: m.role as string,
              active: m.active as boolean,
              createdAt: m.created_at as string,
            };
          })
        : [],
  };

  return NextResponse.json({ business: detail });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { db, uid, email, ipAddress, userAgent } = admin;

  const raw = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action", issues: parsed.error.issues }, { status: 400 });
  }

  const { data: biz } = await db.from("businesses").select("id, name, is_active").eq("id", id).single();
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const action = parsed.data;

  switch (action.action) {
    case "suspend": {
      await db.from("businesses").update({ is_active: false }).eq("id", id);
      await db.from("subscriptions").update({ status: "suspended" }).eq("workspace_id", id);
      await writeAuditLog(db, {
        adminUid: uid, adminEmail: email, action: "suspend_business",
        resourceType: "business", resourceId: id, resourceName: biz.name,
        previousState: { isActive: true }, newState: { isActive: false },
        ipAddress, userAgent, severity: "warning",
      });
      return NextResponse.json({ success: true });
    }

    case "reactivate": {
      await db.from("businesses").update({ is_active: true }).eq("id", id);
      await db
        .from("subscriptions")
        .update({ status: "active" })
        .eq("workspace_id", id)
        .eq("status", "suspended");
      await writeAuditLog(db, {
        adminUid: uid, adminEmail: email, action: "reactivate_business",
        resourceType: "business", resourceId: id, resourceName: biz.name,
        previousState: { isActive: false }, newState: { isActive: true },
        ipAddress, userAgent, severity: "info",
      });
      return NextResponse.json({ success: true });
    }

    case "change_plan": {
      const { planSlug, reason } = action;
      const { data: sub } = await db.from("subscriptions").select("plan_slug").eq("workspace_id", id).maybeSingle();
      await db.from("subscriptions").update({ plan_slug: planSlug, updated_at: new Date().toISOString() }).eq("workspace_id", id);
      await db.from("billing_audit_logs").insert({
        workspace_id: id, user_id: uid,
        action: "admin_plan_change",
        previous_state: { plan_slug: sub?.plan_slug },
        new_state: { plan_slug: planSlug },
        metadata: { reason, admin_uid: uid },
        performed_by_role: "system_owner",
      });
      await writeAuditLog(db, {
        adminUid: uid, adminEmail: email, action: "change_business_plan",
        resourceType: "subscription", resourceId: id, resourceName: biz.name,
        previousState: { plan: sub?.plan_slug }, newState: { plan: planSlug },
        metadata: { reason }, ipAddress, userAgent, severity: "warning",
      });
      return NextResponse.json({ success: true });
    }

    case "extend_subscription": {
      const { days, reason } = action;
      const { data: sub } = await db.from("subscriptions").select("current_period_end").eq("workspace_id", id).maybeSingle();
      const base = sub?.current_period_end ? new Date(sub.current_period_end) : new Date();
      const newEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      await db.from("subscriptions").update({ current_period_end: newEnd, status: "active" }).eq("workspace_id", id);
      await writeAuditLog(db, {
        adminUid: uid, adminEmail: email, action: "extend_subscription",
        resourceType: "subscription", resourceId: id, resourceName: biz.name,
        newState: { newPeriodEnd: newEnd, days }, metadata: { reason },
        ipAddress, userAgent, severity: "info",
      });
      return NextResponse.json({ success: true });
    }

    case "cancel_subscription": {
      const { reason } = action;
      await db.from("subscriptions").update({
        status: "cancelled", cancelled_at: new Date().toISOString(),
        cancel_reason: reason ?? "Cancelled by admin",
      }).eq("workspace_id", id);
      await writeAuditLog(db, {
        adminUid: uid, adminEmail: email, action: "cancel_subscription",
        resourceType: "subscription", resourceId: id, resourceName: biz.name,
        metadata: { reason }, ipAddress, userAgent, severity: "warning",
      });
      return NextResponse.json({ success: true });
    }

    case "add_manual_subscription": {
      const { planSlug, durationDays, reason } = action;
      const now = new Date();
      const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      const { data: ownerProfile } = await db.from("profiles").select("id").eq("business_id", id).eq("role", "owner").maybeSingle();
      await db.from("subscriptions").upsert({
        workspace_id: id,
        user_id: ownerProfile?.id ?? uid,
        plan_slug: planSlug,
        status: "active",
        installation_fee_paid: true,
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        metadata: { manual: true, reason, admin_uid: uid },
      }, { onConflict: "workspace_id" });
      await writeAuditLog(db, {
        adminUid: uid, adminEmail: email, action: "add_manual_subscription",
        resourceType: "subscription", resourceId: id, resourceName: biz.name,
        newState: { plan: planSlug, durationDays }, metadata: { reason },
        ipAddress, userAgent, severity: "warning",
      });
      return NextResponse.json({ success: true });
    }
  }
}
