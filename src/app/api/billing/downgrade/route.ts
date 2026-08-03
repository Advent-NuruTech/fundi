import { NextResponse } from "next/server";
import { z } from "zod";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { scheduleDowngrade } from "@/lib/billing/subscription-service";
import { getEffectivePlanConfig } from "@/lib/billing/dynamic-config";
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
    if (authErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { newPlanSlug } = parsed.data;
    if (!(await getEffectivePlanConfig(newPlanSlug as PlanSlug, admin))) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

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
      .select("status, plan_slug, current_period_end")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!sub || sub.status !== "active") {
      return NextResponse.json({ error: "No active subscription to downgrade" }, { status: 409 });
    }

    const currentRank = PLAN_RANK[sub.plan_slug] ?? 0;
    const newRank = PLAN_RANK[newPlanSlug] ?? 0;

    if (newRank >= currentRank) {
      return NextResponse.json(
        { error: "Target plan must be a lower tier than current plan" },
        { status: 400 }
      );
    }

    // Schedule change at end of current period (or 60 days from now if no period_end)
    const changeAt = sub.current_period_end
      ? new Date(sub.current_period_end).toISOString()
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    await scheduleDowngrade(admin, {
      workspaceId,
      userId: user.id,
      newPlanSlug: newPlanSlug as PlanSlug,
      changeAt,
      performedByRole: profile.role,
    });

    return NextResponse.json({ success: true, pendingPlanSlug: newPlanSlug, pendingChangeAt: changeAt });
  } catch (err) {
    console.error("[billing/downgrade]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
