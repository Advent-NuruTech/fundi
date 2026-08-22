import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase";
import { transformArrayToCamel, transformKeysToCamel } from "@/lib/case-utils";
import { formatPhone, isValidKenyanPhone } from "@/lib/sms/formatPhone";
import type { CheckoutInput, EcommerceOrder, EcommerceOrderItem } from "@/types/ecommerce";

type UntrustedCartItem = { productId?: string; variantId?: string; quantity?: number };
type OrderRequestBody = {
  sellerBusinessId?: string;
  cartItems?: UntrustedCartItem[];
  checkout?: CheckoutInput;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAYMENT_METHODS = new Set(["manual", "cash", "mpesa", "bank_transfer"]);
const SAFE_CHECKOUT_ERRORS = [
  "Cart is empty",
  "Cart contains too many items",
  "Invalid item quantity",
  "Seller store is unavailable",
  "Valid buyer and delivery details are required",
  "A cart product is unavailable",
  "A selected product option is unavailable",
  "A product has an invalid price",
];

function safeCheckoutError(message?: string) {
  if (!message) return "Unable to place this order";
  const known = SAFE_CHECKOUT_ERRORS.find((candidate) => message.includes(candidate));
  if (known) return known;
  if (message.includes("Insufficient stock for")) return "One or more items do not have enough stock";
  return "Unable to place this order";
}

async function sendOrderSms(input: {
  notificationPhone: string;
  storeName: string;
  orderNumber: string;
  buyerName: string;
  items: EcommerceOrderItem[];
  total: number;
}) {
  const formattedPhone = formatPhone(input.notificationPhone);
  if (!isValidKenyanPhone(formattedPhone)) return;
  const itemSummary = input.items.slice(0, 3).map((item) => `${item.quantity} ${item.productName}`).join(", ");
  const moreItems = input.items.length > 3 ? ` and ${input.items.length - 3} more` : "";
  const message =
    `Dear merchant, a customer has placed a new order! Customer: ${input.buyerName}. ` +
    `Items: ${itemSummary}${moreItems}. Total: KES ${input.total.toLocaleString()}. ` +
    `Order #${input.orderNumber}. Login to FundiFlow to confirm.`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  await fetch(`${baseUrl}/api/send-sms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: formattedPhone, message }),
  });
}
export async function POST(request: Request) {
  try {
    const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return NextResponse.json({ error: "Please sign in before checking out" }, { status: 401 });
    }
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || !/^[a-zA-Z0-9-]{16,128}$/.test(idempotencyKey)) {
      return NextResponse.json({ error: "A valid checkout request key is required" }, { status: 400 });
    }

    let body: OrderRequestBody;
    try {
      body = (await request.json()) as OrderRequestBody;
    } catch {
      return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
    }
    if (!body.sellerBusinessId || !body.cartItems?.length || !body.checkout) {
      return NextResponse.json({ error: "Missing required checkout fields" }, { status: 400 });
    }
    if (!UUID_PATTERN.test(body.sellerBusinessId) || body.cartItems.length > 100) {
      return NextResponse.json({ error: "Cart contains invalid data" }, { status: 400 });
    }
    const cartItems = body.cartItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId ?? null,
      quantity: item.quantity,
    }));
    if (cartItems.some((item) =>
      !item.productId ||
      !UUID_PATTERN.test(item.productId) ||
      (item.variantId !== null && !UUID_PATTERN.test(item.variantId)) ||
      !Number.isInteger(item.quantity) ||
      Number(item.quantity) < 1 ||
      Number(item.quantity) > 1000
    )) {
      return NextResponse.json({ error: "Cart contains an invalid item" }, { status: 400 });
    }
    const paymentMethod = body.checkout.paymentMethod ?? "manual";
    if (!PAYMENT_METHODS.has(paymentMethod)) {
      return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
    }

    const db = createServiceSupabaseClient();
    const { data: authData, error: authError } = await db.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
    }
    const { data: profile } = await db
      .from("profiles")
      .select("business_id")
      .eq("id", authData.user.id)
      .maybeSingle();

    const { data: orderId, error: checkoutError } = await db.rpc("place_ecommerce_order", {
      p_idempotency_key: idempotencyKey,
      p_buyer_user_id: authData.user.id,
      p_buyer_business_id: profile?.business_id ?? null,
      p_seller_business_id: body.sellerBusinessId,
      p_cart_items: cartItems,
      p_checkout: {
        buyerName: body.checkout.buyerName,
        buyerPhone: body.checkout.buyerPhone,
        buyerEmail: body.checkout.buyerEmail ?? "",
        deliveryLocation: body.checkout.deliveryLocation ?? "",
        notes: body.checkout.notes ?? "",
        paymentMethod,
      },
    });
    if (checkoutError || !orderId) {
      return NextResponse.json({ error: safeCheckoutError(checkoutError?.message) }, { status: 400 });
    }

    const { data: orderRow, error: orderError } = await db
      .from("ecommerce_orders")
      .select("*, items:ecommerce_order_items(*)")
      .eq("id", orderId)
      .eq("buyer_user_id", authData.user.id)
      .single();
    if (orderError || !orderRow) throw orderError ?? new Error("Order could not be loaded");

    const row = orderRow as Record<string, unknown>;
    const order = transformKeysToCamel<EcommerceOrder>(row);
    order.items = transformArrayToCamel<EcommerceOrderItem>(
      (Array.isArray(row.items) ? row.items : []) as Record<string, unknown>[]
    );

    const { data: store } = await db
      .from("ecommerce_stores")
      .select("store_name, notification_phone")
      .eq("business_id", order.sellerBusinessId)
      .maybeSingle();
    if (store?.notification_phone && !order.smsSent) {
      try {
        await sendOrderSms({
          notificationPhone: store.notification_phone,
          storeName: store.store_name,
          orderNumber: order.orderNumber,
          buyerName: order.buyerName,
          items: order.items,
          total: Number(order.total),
        });
        await db.from("ecommerce_orders").update({ sms_sent: true }).eq("id", order.id).eq("sms_sent", false);
      } catch (error) {
        console.error("Failed to send ecommerce order SMS", error);
      }
    }

    return NextResponse.json({ order, storeName: store?.store_name ?? "Store" }, { status: 201 });
  } catch (error) {
    console.error("Secure ecommerce checkout failed", error);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
}
