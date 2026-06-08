import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { transformKeysToCamel, transformArrayToCamel } from "@/lib/case-utils";
import type { EcommerceOrder, EcommerceOrderItem } from "@/types/ecommerce";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderNumber = searchParams.get("order");
  const phone = searchParams.get("phone");

  if (!orderNumber || !phone) {
    return NextResponse.json(
      { error: "order and phone are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("ecommerce_orders")
    .select("*, items:ecommerce_order_items(*)")
    .eq("order_number", orderNumber.toUpperCase())
    .eq("buyer_phone", phone)
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
