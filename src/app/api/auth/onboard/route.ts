import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getBusinessTypeConfig, isBusinessType, DEFAULT_BUSINESS_TYPE } from "@/lib/business-types";

function getAdminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceKey) throw new Error("Missing Supabase admin env vars");
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const admin = getAdminClient();

    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user?.email) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { displayName, phone, businessName, location, businessType: rawBusinessType } = body as {
      displayName?: string;
      phone?: string;
      businessName?: string;
      location?: string;
      businessType?: string;
    };

    // Fall back to the metadata captured at sign-up (covers the email-confirm
    // flow where onboarding runs on first login without a request body), then
    // to the safe default. Unknown values are rejected by isBusinessType.
    const metaBusinessType = (user.user_metadata ?? {}).business_type as string | undefined;
    const businessType = isBusinessType(rawBusinessType)
      ? rawBusinessType
      : isBusinessType(metaBusinessType)
      ? metaBusinessType
      : DEFAULT_BUSINESS_TYPE;
    const typeConfig = getBusinessTypeConfig(businessType);

    // ── Domain guard: platform operators are NOT tenants ───────────────────
    // A platform admin (ffmanage) account must never get a profile/business.
    const { data: platformAdmin } = await admin
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (platformAdmin) {
      return NextResponse.json(
        { error: "Platform administrator accounts cannot register as tenant businesses." },
        { status: 403 }
      );
    }

    const meta = user.user_metadata ?? {};
    const resolvedName = displayName || meta.full_name || meta.name || user.email.split("@")[0];
    const resolvedBusiness = businessName || `${resolvedName}'s Workshop`;

    // ── Atomic, idempotent onboarding ─────────────────────────────────────
    // All profile/business/member/inventory work happens inside one DB
    // transaction (onboard_user, migration 0054) that serializes concurrent
    // requests per owner via an advisory lock. Concurrent onboard calls can no
    // longer double-create the business. See supabase/migrations/0054.
    const { data: businessId, error: onboardErr } = await admin.rpc("onboard_user", {
      p_uid: user.id,
      p_email: user.email,
      p_display_name: resolvedName,
      p_phone: phone ?? null,
      p_business_name: resolvedBusiness,
      p_location: location ?? "",
      p_business_type: businessType,
      p_units: typeConfig.inventoryUnits,
      p_categories: typeConfig.inventoryCategories,
    });

    if (onboardErr || !businessId) {
      return NextResponse.json(
        { error: `Account setup failed: ${onboardErr?.message ?? "onboarding did not complete"}` },
        { status: 500 }
      );
    }

    // NOTE: tenants never become the system owner. The platform owner is
    // bootstrapped exclusively via /api/ffmanage/auth/bootstrap-owner
    // (platform domain) — see migration 00022/00026.

    return NextResponse.json({ success: true, businessId });
  } catch (err) {
    console.error("[onboard]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Onboarding failed" },
      { status: 500 }
    );
  }
}
