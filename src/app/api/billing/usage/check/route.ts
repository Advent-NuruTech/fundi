import { NextResponse } from "next/server";
import { z } from "zod";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { getUsageBalance, measureStorageUsage } from "@/lib/billing/usage-metering";

const querySchema = z.object({
  resource: z.enum(["storage"]),
  units: z.coerce.number().min(0),
});

/**
 * Pre-flight capacity check used before a client-side Cloudinary upload.
 * Returns whether the workspace has enough free storage for `units` bytes.
 */
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

    const parsed = querySchema.safeParse({
      resource: new URL(request.url).searchParams.get("resource"),
      units: new URL(request.url).searchParams.get("units"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { resource, units } = parsed.data;

    const { data: profile } = await admin
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }
    const workspaceId = profile.business_id as string;

    // Keep measured storage current before answering
    await measureStorageUsage(admin, workspaceId).catch(() => {});
    const balance = await getUsageBalance(admin, workspaceId, resource);

    return NextResponse.json({
      resource,
      ok: balance.available >= units,
      available: balance.available,
      required: units,
    });
  } catch (err) {
    console.error("[billing/usage/check]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
