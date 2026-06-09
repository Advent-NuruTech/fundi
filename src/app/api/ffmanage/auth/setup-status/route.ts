// Public endpoint — no auth required. Returns only a boolean.
// Checks whether a platform owner account exists.
// Never reveals sensitive data.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET() {
  try {
    const db = getDb();

    // Primary check: platform_admins table (migration 00022+)
    const { data: owner, error: paErr } = await db
      .from("platform_admins")
      .select("id")
      .eq("role", "owner")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!paErr) {
      return NextResponse.json({ ownerExists: !!owner, initialized: !!owner });
    }

    // Fallback: system_config (pre-migration installs where platform_admins may not exist)
    const { data: config, error: configErr } = await db
      .from("system_config")
      .select("value")
      .eq("key", "system_owner_uid")
      .maybeSingle();

    if (configErr) {
      return NextResponse.json({ ownerExists: false, initialized: false });
    }

    const uid = config?.value;
    const ownerExists =
      uid !== null &&
      uid !== undefined &&
      String(uid).replace(/^"|"$/g, "") !== "null" &&
      String(uid).replace(/^"|"$/g, "").length > 0;

    return NextResponse.json({ ownerExists, initialized: ownerExists });
  } catch {
    return NextResponse.json({ ownerExists: false, initialized: false });
  }
}
