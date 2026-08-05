import { NextResponse } from "next/server";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { getWorkspaceUsage } from "@/lib/billing/usage-metering";
import { getAllTopupPackages } from "@/lib/billing/topup-packages";
import { getSmsTopupPackages } from "@/lib/sms/config-store";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getBillingAdminClient();

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    const usage = await getWorkspaceUsage(admin, profile.business_id as string);

    // SMS packs come from the DB (admin-editable, only active ones shown); the
    // rest are the static packages in code.
    const smsPacks = await getSmsTopupPackages(admin);
    const staticPacks = getAllTopupPackages().filter((p) => p.resource !== "sms");

    return NextResponse.json({
      ...usage,
      packages: [...smsPacks, ...staticPacks],
    });
  } catch (err) {
    console.error("[billing/usage]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
