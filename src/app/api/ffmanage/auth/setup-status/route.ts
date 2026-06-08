import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public endpoint — no auth required. Returns only a boolean.
// Rate-limited by middleware; response never reveals sensitive data.
export const dynamic = "force-dynamic";

function getDb() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET() {
  try {
    const db = getDb();

    const { data, error } = await db
      .from("system_config")
      .select("value")
      .eq("key", "system_owner_uid")
      .maybeSingle();

    if (error) {
      // system_config table may not exist yet — treat as not initialized
      return NextResponse.json({ ownerExists: false, initialized: false });
    }

    const uid = data?.value;
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
