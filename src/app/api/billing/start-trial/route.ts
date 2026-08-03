import { NextResponse } from "next/server";
import { z } from "zod";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { startTrial } from "@/lib/billing/subscription-service";
import { getFreeTrialEnabled } from "@/lib/billing/free-trial-flag";
import { isValidPlanSlug } from "@/lib/billing/constants";
import type { PlanSlug } from "@/types/billing";

const bodySchema = z.object({
  planSlug: z.string().min(1),
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
    if (authErr || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // ── Body / plan validation ─────────────────────────────────────────────
    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (!isValidPlanSlug(parsed.data.planSlug)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    const planSlug = parsed.data.planSlug as PlanSlug;

    // ── Workspace + owner check ────────────────────────────────────────────
    const { data: profile } = await admin
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }
    if (profile.role !== "owner") {
      return NextResponse.json(
        { error: "Only the workspace owner can start a trial." },
        { status: 403 }
      );
    }

    // ── Platform flag: no trials when the free trial is turned OFF ──────────
    if (!(await getFreeTrialEnabled())) {
      return NextResponse.json(
        { error: "Free trials are currently disabled. Choose a plan to continue." },
        { status: 403 }
      );
    }

    // ── Start the trial ────────────────────────────────────────────────────
    try {
      const { trialEndsAt } = await startTrial(admin, {
        workspaceId: profile.business_id as string,
        userId: user.id,
        planSlug,
      });
      return NextResponse.json({ trialEndsAt });
    } catch (err) {
      // startTrial throws when a subscription already exists for the workspace.
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Could not start trial" },
        { status: 409 }
      );
    }
  } catch (err) {
    console.error("[billing/start-trial]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
