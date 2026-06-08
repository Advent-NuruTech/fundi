import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { transformKeysToCamel } from "@/lib/case-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data, error } = await supabase
    .from("ecommerce_stores")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("is_suspended", false)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  return NextResponse.json({
    store: transformKeysToCamel(data as Record<string, unknown>),
  });
}
