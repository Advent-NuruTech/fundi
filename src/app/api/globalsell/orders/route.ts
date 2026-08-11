import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase";
import { transformKeysToCamel, transformArrayToCamel } from "@/lib/case-utils";
import type { CartItem, CheckoutInput, EcommerceOrder, EcommerceOrderItem } from "@/types/ecommerce";
import { formatPhone, isValidKenyanPhone } from "@/lib/sms/formatPhone";

type OrderRequestBody = {
  sellerBusinessId: string;
  cartItems: CartItem[];
  checkout: CheckoutInput;
};

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GS-${ts}-${rand}`;
}

async function sendOrderSms(
  notificationPhone: string,
  storeName: string,
  orderNumber: string,
  buyerName: string,
  items: CartItem[],
  total: number
) {
  const formattedPhone = formatPhone(notificationPhone);
  if (!isValidKenyanPhone(formattedPhone)) return;

  const itemSummary = items
    .slice(0, 3)
    .map((i) => `${i.quantity} ${i.productName}`)
    .join(", ");
  const moreItems = items.length > 3 ? ` and ${items.length - 3} more` : "";

  const message =
    `Dear merchant, a customer has placed a new order! ` +
    `Customer: ${buyerName}. ` +
    `Items: ${itemSummary}${moreItems}. ` +
    `Total: KES ${total.toLocaleString()}. ` +
    `Order #${orderNumber}. ` +
    `Login to FundiFlow to confirm. ` +
    `Thank you for trusting FundiFlow.`;

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    await fetch(`${baseUrl}/api/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: formattedPhone, message }),
    });
  } catch {
    console.error("Failed to send order SMS notification");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OrderRequestBody;
    const { sellerBusinessId, cartItems, checkout } = body;

    if (!sellerBusinessId || !cartItems?.length || !checkout?.buyerName || !checkout?.buyerPhone || !checkout?.deliveryLocation) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = createServiceSupabaseClient();
    const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return NextResponse.json({ error: "Please sign in before checking out" }, { status: 401 });
    }

    // Never trust identity fields sent by the browser. A single FundiFlow
    // Supabase identity can represent either a business member or a customer,
    // so resolve it from the verified session on every order.
    const { data: authData, error: authError } = await client.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
    }

    const { data: profile } = await client
      .from("profiles")
      .select("business_id")
      .eq("id", authData.user.id)
      .maybeSingle();

    const buyerUserId = authData.user.id;
    const buyerBusinessId = profile?.business_id ?? null;

    const subtotal = cartItems.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
    const total = subtotal;
    const orderNumber = generateOrderNumber();

    // Create order
    const orderPayload = {
      order_number: orderNumber,
      seller_business_id: sellerBusinessId,
      buyer_business_id: buyerBusinessId,
      buyer_user_id: buyerUserId,
      buyer_name: checkout.buyerName,
      buyer_phone: checkout.buyerPhone,
      buyer_email: checkout.buyerEmail ?? null,
      delivery_location: checkout.deliveryLocation ?? null,
      notes: checkout.notes ?? null,
      subtotal,
      total,
      currency: "KES",
      status: "pending",
      payment_method: checkout.paymentMethod ?? "manual",
      payment_status: "unpaid",
    };

    const { data: orderData, error: orderError } = await client
      .from("ecommerce_orders")
      .insert(orderPayload)
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    const order = transformKeysToCamel<EcommerceOrder>(
      orderData as Record<string, unknown>
    );

    // Create order items
    const itemPayloads = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId ?? null,
      product_name: item.productName,
      variant_name: item.variantName ?? null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity,
    }));

    const { data: itemsData, error: itemsError } = await client
      .from("ecommerce_order_items")
      .insert(itemPayloads)
      .select();

    if (itemsError) {
      console.error("Order items error:", itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    order.items = transformArrayToCamel<EcommerceOrderItem>(
      (itemsData ?? []) as Record<string, unknown>[]
    );

    // Reserve stock for each item (non-critical — don't fail the order if this errors)
    for (const item of cartItems) {
      try {
        if (item.variantId) {
          const { data: variantData } = await client
            .from("ecommerce_product_variants")
            .select("reserved_quantity")
            .eq("id", item.variantId)
            .maybeSingle();

          if (variantData) {
            await client
              .from("ecommerce_product_variants")
              .update({
                reserved_quantity:
                  ((variantData as { reserved_quantity: number }).reserved_quantity ?? 0) +
                  item.quantity,
              })
              .eq("id", item.variantId);
          }
        } else {
          const { data: productData } = await client
            .from("ecommerce_products")
            .select("reserved_stock")
            .eq("id", item.productId)
            .maybeSingle();

          if (productData) {
            await client
              .from("ecommerce_products")
              .update({
                reserved_stock:
                  ((productData as { reserved_stock: number }).reserved_stock ?? 0) +
                  item.quantity,
              })
              .eq("id", item.productId);
          }
        }
      } catch {
        /* non-critical */
      }
    }

    // Log inventory changes
    try {
      const inventoryLogs = cartItems.map((item) => ({
        business_id: sellerBusinessId,
        product_id: item.productId,
        variant_id: item.variantId ?? null,
        order_id: order.id,
        change_type: "reserved",
        quantity_change: -item.quantity,
        note: `Reserved for order ${orderNumber}`,
      }));
      await client.from("ecommerce_inventory_logs").insert(inventoryLogs);
    } catch {
      /* non-critical */
    }

    // In-app notification for seller
    try {
      await client.from("ecommerce_notifications").insert({
        business_id: sellerBusinessId,
        order_id: order.id,
        type: "new_order",
        title: "New Order Received",
        message: `${checkout.buyerName} placed order ${orderNumber} — KES ${total.toLocaleString()}`,
        read: false,
      });
    } catch {
      /* non-critical */
    }

    // Update seller's order count + send SMS
    try {
      const { data: storeData } = await client
        .from("ecommerce_stores")
        .select("id, total_orders, notification_phone, store_name")
        .eq("business_id", sellerBusinessId)
        .maybeSingle();

      if (storeData) {
        const { notification_phone, store_name, total_orders, id: storeId } = storeData as {
          id: string;
          notification_phone: string | null;
          store_name: string;
          total_orders: number;
        };

        await client
          .from("ecommerce_stores")
          .update({ total_orders: (total_orders ?? 0) + 1 })
          .eq("id", storeId);

        if (notification_phone) {
          await sendOrderSms(
            notification_phone,
            store_name,
            orderNumber,
            checkout.buyerName,
            cartItems,
            total
          );
        }
      }
    } catch {
      /* non-critical */
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("Order API error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
