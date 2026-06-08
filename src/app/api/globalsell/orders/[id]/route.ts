import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { transformKeysToCamel, transformArrayToCamel } from "@/lib/case-utils";
import type { EcommerceOrder, EcommerceOrderItem } from "@/types/ecommerce";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("ecommerce_orders")
    .select("*, items:ecommerce_order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const row = data as Record<string, unknown>;
  const order = transformKeysToCamel<EcommerceOrder>(row);
  if (Array.isArray(row.items)) {
    order.items = transformArrayToCamel<EcommerceOrderItem>(
      row.items as Record<string, unknown>[]
    );
  }

  return NextResponse.json({ order });
}
