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

    // ── Idempotency check: profile + member both exist? ───────────────────
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, business_id")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfile?.business_id) {
      // Repair missing business_member record (can happen if a prior run
      // crashed between step 3 and step 4).
      await admin.from("business_members").upsert(
        {
          profile_id: user.id,
          business_id: existingProfile.business_id,
          role: "owner",
          roles: ["owner"],
          active: true,
        },
        { onConflict: "profile_id,business_id" }
      );
      return NextResponse.json({ success: true });
    }

    // ── Also check if a business already exists for this owner ─────────────
    const { data: existingBusiness } = await admin
      .from("businesses")
      .select("id")
      .eq("owner_uid", user.id)
      .maybeSingle();

    // ── Step 1: upsert profile (no business_id yet) ────────────────────────
    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        display_name: resolvedName,
        role: "owner",
        roles: ["owner"],
        active: true,
        must_change_password: false,
        phone: phone ?? null,
      },
      { onConflict: "id" }
    );
    if (profileErr) {
      return NextResponse.json({ error: `Profile setup failed: ${profileErr.message}` }, { status: 500 });
    }

    // ── Step 2: create or reuse business ──────────────────────────────────
    let businessId: string;
    if (existingBusiness) {
      businessId = existingBusiness.id;
    } else {
      const { data: bizData, error: bizErr } = await admin
        .from("businesses")
        .insert({
          name: resolvedBusiness,
          phone: phone ?? "",
          location: location ?? "",
          currency: "KES",
          country: "Kenya",
          business_type: businessType,
          owner_uid: user.id,
          order_counter: 0,
          employee_counter: 0,
        })
        .select("id")
        .single();
      if (bizErr || !bizData) {
        return NextResponse.json({ error: `Business setup failed: ${bizErr?.message}` }, { status: 500 });
      }
      businessId = bizData.id;
    }

    // ── Step 3: link profile → business ───────────────────────────────────
    const { error: linkErr } = await admin
      .from("profiles")
      .update({ business_id: businessId })
      .eq("id", user.id);
    if (linkErr) {
      return NextResponse.json({ error: `Account link failed: ${linkErr.message}` }, { status: 500 });
    }

    // ── Step 4: upsert business_members ───────────────────────────────────
    const { error: memberErr } = await admin.from("business_members").upsert(
      {
        profile_id: user.id,
        business_id: businessId,
        role: "owner",
        roles: ["owner"],
        active: true,
      },
      { onConflict: "profile_id,business_id" }
    );
    if (memberErr) {
      return NextResponse.json({ error: `Member setup failed: ${memberErr.message}` }, { status: 500 });
    }

    // ── Step 5: industry-specific inventory units & categories (idempotent) ─
    const units = typeConfig.inventoryUnits;
    const categories = typeConfig.inventoryCategories;
    await Promise.allSettled([
      ...units.map((name) =>
        admin.from("inventory_units").upsert({ business_id: businessId, name }, { onConflict: "business_id,name" })
      ),
      ...categories.map((name) =>
        admin.from("inventory_categories").upsert({ business_id: businessId, name }, { onConflict: "business_id,name" })
      ),
    ]);

    // NOTE: tenants never become the system owner. The platform owner is
    // bootstrapped exclusively via /api/ffmanage/auth/bootstrap-owner
    // (platform domain) — see migration 00022/00026.

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[onboard]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Onboarding failed" },
      { status: 500 }
    );
  }
}
