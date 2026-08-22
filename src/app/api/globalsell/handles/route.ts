import { NextResponse } from "next/server";
import { createEphemeralSupabaseClient } from "@/lib/supabase";
import { normalizeHandle } from "@/lib/storefront-url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("handle") ?? "";
  const handle = normalizeHandle(requested);

  if (requested !== handle || handle.length < 3 || handle.length > 50) {
    return NextResponse.json({ available: false });
  }

  const db = createEphemeralSupabaseClient();
  const { data, error } = await db.rpc("is_store_handle_available", {
    p_handle: handle,
    p_store_id: null,
  });

  if (error) {
    return NextResponse.json({ error: "Unable to check that address" }, { status: 503 });
  }
  return NextResponse.json(
    { available: Boolean(data) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
