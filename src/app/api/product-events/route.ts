import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBillingAdminClient } from "@/lib/billing/admin-client";

const FEATURE_BY_PREFIX: Array<[string, string]> = [
  ["/ai", "ai_advisor"],
  ["/dashboard", "dashboard"],
  ["/finance", "finance"],
  ["/customers", "customers"],
  ["/orders", "orders"],
  ["/production", "production"],
  ["/delivery", "delivery"],
  ["/inventory", "inventory"],
  ["/payments", "payments"],
  ["/analytics", "analytics"],
  ["/employees", "employees"],
  ["/messages", "messages"],
  ["/sell", "global_sell"],
  ["/branches", "branches"],
  ["/settings", "settings"],
  ["/manual", "manual"],
];

function featureForPath(pathname: string): string | null {
  return FEATURE_BY_PREFIX.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? null;
}

async function resolveBusiness(admin: SupabaseClient, req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.business_id) return null;

  const { data: membership } = await admin
    .from("business_members")
    .select("business_id")
    .eq("profile_id", user.id)
    .eq("business_id", profile.business_id)
    .eq("active", true)
    .maybeSingle();

  return (membership?.business_id as string | undefined) ?? null;
}

export async function POST(request: Request) {
  const admin = getBillingAdminClient();
  const businessId = await resolveBusiness(admin, request);
  if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { pathname?: unknown } | null;
  const featureKey = typeof body?.pathname === "string" ? featureForPath(body.pathname) : null;
  if (!featureKey) return NextResponse.json({ accepted: false });

  const { error } = await admin.rpc("record_platform_feature_event", {
    p_business_id: businessId,
    p_feature_key: featureKey,
  });

  if (error) {
    console.error("[product-events] record failed", error);
    return NextResponse.json({ error: "Could not record product event" }, { status: 500 });
  }

  return NextResponse.json({ accepted: true });
}
