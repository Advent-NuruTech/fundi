import { NextResponse } from "next/server";
import { z } from "zod";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { scheduleCancellation } from "@/lib/billing/subscription-service";

const bodySchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getBillingAdminClient();

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw ?? {});
    const reason = parsed.success ? parsed.data.reason : undefined;

    // Resolve workspace + require owner
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
      .select("status, cancel_at_period_end")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!sub || sub.status !== "active") {
      return NextResponse.json({ error: "No active subscription to cancel" }, { status: 409 });
    }

    if (sub.cancel_at_period_end) {
      return NextResponse.json({ error: "Cancellation already scheduled" }, { status: 409 });
    }

    await scheduleCancellation(admin, {
      workspaceId,
      userId: user.id,
      reason,
      performedByRole: profile.role,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[billing/cancel]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
