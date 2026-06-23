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

/**
 * Create an ADDITIONAL business for an already-onboarded user. Unlike
 * /api/auth/onboard (which bootstraps a user's first business and links it as
 * their primary), this leaves the existing profile untouched and just adds a
 * new business + owner membership + industry inventory taxonomy. The new
 * business id is returned so the client can switch to it.
 */
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

    // Domain guard: platform operators are never tenants.
    const { data: platformAdmin } = await admin
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (platformAdmin) {
      return NextResponse.json(
        { error: "Platform administrator accounts cannot own businesses." },
        { status: 403 }
      );
    }

    // The caller must already have a profile (be an onboarded tenant).
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, display_name, phone")
      .eq("id", user.id)
      .maybeSingle();
    if (!existingProfile) {
      return NextResponse.json(
        { error: "Finish setting up your first business before adding another." },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { businessName, location, phone, businessType: rawType } = body as {
      businessName?: string;
      location?: string;
      phone?: string;
      businessType?: string;
    };

    if (!businessName || businessName.trim().length < 2) {
      return NextResponse.json({ error: "Please enter a business name." }, { status: 400 });
    }

    const businessType = isBusinessType(rawType) ? rawType : DEFAULT_BUSINESS_TYPE;
    const typeConfig = getBusinessTypeConfig(businessType);

    // ── Create the business ────────────────────────────────────────────────
    const { data: bizData, error: bizErr } = await admin
      .from("businesses")
      .insert({
        name: businessName.trim(),
        phone: phone ?? existingProfile.phone ?? "",
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
    const businessId = bizData.id;

    // ── Owner membership ───────────────────────────────────────────────────
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

    // ── Industry inventory taxonomy (idempotent) ───────────────────────────
    await Promise.allSettled([
      ...typeConfig.inventoryUnits.map((name) =>
        admin.from("inventory_units").upsert({ business_id: businessId, name }, { onConflict: "business_id,name" })
      ),
      ...typeConfig.inventoryCategories.map((name) =>
        admin.from("inventory_categories").upsert({ business_id: businessId, name }, { onConflict: "business_id,name" })
      ),
    ]);

    return NextResponse.json({ success: true, businessId });
  } catch (err) {
    console.error("[create-business]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create business" },
      { status: 500 }
    );
  }
}
