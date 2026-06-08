import { NextResponse } from "next/server";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { undoScheduledCancellation } from "@/lib/billing/subscription-service";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getBillingAdminClient();

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

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
      .select("cancel_at_period_end")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!sub?.cancel_at_period_end) {
      return NextResponse.json({ error: "No scheduled cancellation to reverse" }, { status: 409 });
    }

    await undoScheduledCancellation(admin, {
      workspaceId,
      userId: user.id,
      performedByRole: profile.role,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[billing/uncancel]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
