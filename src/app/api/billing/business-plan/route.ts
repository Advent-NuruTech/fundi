import { NextResponse } from "next/server";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { getEffectiveBusinessPlanConfig } from "@/lib/billing/dynamic-config";
import type { PlanSlug } from "@/types/billing";

export const dynamic = "force-dynamic";

/** Effective plan capabilities for the signed-in user's active business. */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getBillingAdminClient();
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .maybeSingle();

    const requestedBusinessId = request.headers.get("X-Business-ID");
    const workspaceId = requestedBusinessId || (profile?.business_id as string | null);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 404 });
    }

    if (profile?.business_id !== workspaceId) {
      const { data: membership } = await admin
        .from("business_members")
        .select("id")
        .eq("business_id", workspaceId)
        .eq("profile_id", user.id)
        .eq("active", true)
        .maybeSingle();
      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data: subscription } = await admin
      .from("subscriptions")
      .select("plan_slug")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!subscription?.plan_slug) {
      return NextResponse.json({ plan: null });
    }

    const plan = await getEffectiveBusinessPlanConfig(
      workspaceId,
      subscription.plan_slug as PlanSlug,
      admin
    );
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("[billing/business-plan]", error);
    return NextResponse.json({ error: "Could not load business plan" }, { status: 500 });
  }
}

