import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase";

// Public, no-auth endpoint. Uses service role to bypass RLS.
// Returns only customer-safe fields — never internal notes, costs, tailor data.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;

  if (!trackingId || !trackingId.startsWith("ord_")) {
    return NextResponse.json({ error: "Invalid tracking ID" }, { status: 400 });
  }

  const db = createServiceSupabaseClient();

  const { data: order, error } = await db
    .from("orders")
    .select(
      "id, tracking_token, order_number, business_id, customer_name, stage, payment_status, due_date, subtotal_amount, amount_paid, balance_amount, created_at, updated_at, image_urls, delivery_status"
    )
    .eq("tracking_token", trackingId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Business info
  const { data: biz } = await db
    .from("businesses")
    .select("id, name, phone, location")
    .eq("id", order.business_id as string)
    .single();

  // Garments (non-sensitive — name and quantity only)
  const { data: garments } = await db
    .from("order_garments")
    .select("name, quantity")
    .eq("order_id", order.id as string);

  return NextResponse.json({
    id: order.id,
    trackingToken: order.tracking_token,
    orderNumber: order.order_number,
    businessId: order.business_id,
    businessName: biz?.name ?? "Workshop",
    businessPhone: biz?.phone ?? null,
    businessLocation: biz?.location ?? null,
    customerName: order.customer_name,
    stage: order.stage,
    deliveryStatus: order.delivery_status,
    paymentStatus: order.payment_status,
    dueDate: order.due_date,
    subtotalAmount: Number(order.subtotal_amount),
    amountPaid: Number(order.amount_paid),
    balanceAmount: Number(order.balance_amount),
    garments: (garments ?? []).map((g) => ({ name: g.name, quantity: g.quantity })),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    imageUrls: order.image_urls ?? [],
  });
}
