import { NextResponse } from "next/server";
import { resolveStorefront } from "@/services/storefront.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const resolution = await resolveStorefront(slug);
  if (!resolution) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  return NextResponse.json({
    store: resolution.store,
    canonicalHandle: resolution.store.publicHandle,
  });
}
