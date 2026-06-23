// Public endpoint — no auth required.
// Returns whether the platform has been initialized (at least one owner exists).
// Multiple owners are supported; registration is gated by SYSTEM_OWNER_PASSCODE.
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

    const { data: owner, error: paErr } = await db
      .from("platform_admins")
      .select("id")
      .eq("role", "owner")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!paErr) {
      // System is initialized if at least one owner exists.
      // Registration is always open (gated by passcode, not owner count).
      return NextResponse.json({ ownerExists: !!owner, initialized: !!owner, registrationOpen: true });
    }

    // Fallback: system_config (pre-migration installs)
    const { data: config, error: configErr } = await db
      .from("system_config")
      .select("value")
      .eq("key", "system_owner_uid")
      .maybeSingle();

    if (configErr) {
      return NextResponse.json({ ownerExists: false, initialized: false, registrationOpen: true });
    }

    const uid = config?.value;
    const ownerExists =
      uid !== null &&
      uid !== undefined &&
      String(uid).replace(/^"|"$/g, "") !== "null" &&
      String(uid).replace(/^"|"$/g, "").length > 0;

    return NextResponse.json({ ownerExists, initialized: ownerExists, registrationOpen: true });
  } catch {
    return NextResponse.json({ ownerExists: false, initialized: false, registrationOpen: true });
  }
}
