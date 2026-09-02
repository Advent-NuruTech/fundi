import { supabase } from "@/lib/supabase";
import { transformKeysToCamel, transformArrayToCamel } from "@/lib/case-utils";
import type { Customer, Order, OrderItemPart, Payment, ProductionStage, PaymentStatus } from "@/types/domain";
import type { EcommerceOrder, EcommerceOrderItem, EcommerceOrderPayment, EcommerceStore } from "@/types/ecommerce";
import type { ReceiptBusiness } from "@/lib/receipt";
import { shopUrl } from "@/lib/storefront-url";

// ── API helper ────────────────────────────────────────────────────────────────

async function portalFetch<T>(action: string, body: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { error: "Not signed in" };

  try {
    const res = await fetch("/api/customer-portal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...body }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & T;
    if (!res.ok) return { error: (data.error as string) ?? "Request failed" };
    return { data: data as T };
  } catch {
    return { error: "Network error. Please try again." };
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CustomerSafeOrder {
  id: string;
  trackingToken: string;
  orderNumber: string;
  businessName: string;
  businessId: string;
  customerName: string;
  stage: ProductionStage;
  currentStageName?: string | null;
  paymentStatus: PaymentStatus;
  dueDate: string;
  subtotalAmount: number;
  amountPaid: number;
  balanceAmount: number;
  garments: Array<{ name: string; quantity: number; agreedPrice: number; includedParts?: OrderItemPart[] }>;
  createdAt: string;
  updatedAt: string;
}

export interface PublicTrackingOrder extends CustomerSafeOrder {
  businessPhone?: string;
  businessLocation?: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function registerCustomerPortal(params: {
  email: string;
  password: string;
  name: string;
  phone: string;
}): Promise<{ error?: string }> {
  // Registration runs through the service-role API route. Creating the account
  // and linking the customer record(s) client-side was silently blocked by RLS
  // (a fresh portal customer is not a business member), leaving `portal_user_id`
  // NULL and the portal showing zero records despite orders existing.
  const res = await fetch("/api/customer-portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "register", ...params }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    loginId?: string;
  };

  if (!res.ok || data.error) {
    return { error: data.error ?? "Registration failed. Please try again." };
  }

  // The account is created server-side, so sign the customer in explicitly.
  const loginRes = await loginCustomerPortal(data.loginId ?? params.email, params.password);
  if (loginRes.error) return { error: loginRes.error };

  return {};
}

/**
 * Self-healing linkage: tells the server to link any customer record matching
 * this portal user's phone / email that never got a `portal_user_id`. Called on
 * every portal load so broken accounts repair themselves automatically.
 */
export async function relinkPortalCustomers(): Promise<{ linked?: number; error?: string }> {
  const { data, error } = await portalFetch<{ linked: number }>("relink", {});
  if (error) return { error };
  return { linked: data?.linked ?? 0 };
}

/**
 * Sign a customer in. Accepts EITHER their email OR their phone number as the
 * login id. Goes through the protected /api/auth/login endpoint which applies
 * escalating lockouts and always returns a generic error (so the response
 * never reveals whether an account exists).
 */
export async function loginCustomerPortal(
  loginId: string,
  password: string
): Promise<{ error?: string }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId, password }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    session?: { access_token?: string; refresh_token?: string; expires_in?: number; expires_at?: number; token_type?: string; user?: unknown };
  };

  if (!res.ok) {
    return { error: data.error ?? "Invalid login credentials." };
  }

  if (!data.session?.access_token || !data.session?.refresh_token) {
    return { error: "Invalid login credentials." };
  }

  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  return {};
}

// ── Account provisioning (automatic, behind the scenes) ──────────────────────

export interface ProvisionResult {
  status: "created" | "linked" | "skipped";
  loginId?: string;
  password?: string;
  reason?: string;
}

export async function provisionPortalAccount(
  businessId: string,
  customerId: string
): Promise<ProvisionResult | { error: string }> {
  const { data, error } = await portalFetch<ProvisionResult>("provision", { businessId, customerId });
  if (error) return { error };
  return data ?? { status: "skipped" };
}

export async function processPendingPortalAccounts(businessId: string): Promise<void> {
  await portalFetch<{ processed: number }>("process", { businessId });
}

// ── Account management ────────────────────────────────────────────────────────

export async function checkPortalLoginAvailability(
  loginId: string,
  excludeUserId?: string
): Promise<{ available: boolean } | { error: string }> {
  const { data, error } = await portalFetch<{ available: boolean }>("check-login", {
    loginId,
    ...(excludeUserId ? { excludeUserId } : {}),
  });
  if (error) return { error };
  return data ?? { available: false };
}

export interface UpdatePortalContactParams {
  customerId: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface PortalContactResult {
  fullName: string;
  email: string | null;
  phone: string;
  loginId: string | null;
  loginEmail: string;
}

export async function updatePortalContact(
  params: UpdatePortalContactParams
): Promise<{ data?: PortalContactResult; error?: string }> {
  return portalFetch<PortalContactResult>("update-contact", params as unknown as Record<string, unknown>);
}

/** Update a standalone Global Sell customer that is not yet linked to a workshop customer record. */
export async function updatePortalIdentity(params: {
  fullName: string;
  email?: string;
  phone: string;
}): Promise<{ data?: PortalContactResult; error?: string }> {
  return portalFetch<PortalContactResult>("update-identity", params);
}

// ── First-notification onboarding ─────────────────────────────────────────────

export interface CustomerMessagingInfo {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  portalOnboardingSent: boolean;
}

export async function getCustomerMessagingInfo(
  businessId: string,
  customerId: string
): Promise<CustomerMessagingInfo | null> {
  const { data, error } = await portalFetch<{ customer: CustomerMessagingInfo }>("message-info", {
    businessId,
    customerId,
  });
  if (error || !data?.customer) return null;
  return data.customer;
}

export async function markPortalOnboardingSent(
  businessId: string,
  customerId: string
): Promise<void> {
  await portalFetch<{ success: boolean }>("mark-onboarding", { businessId, customerId });
}

export async function logoutCustomerPortal(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getPortalSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ── Customer records ──────────────────────────────────────────────────────────

export async function getMyCustomerRecords(): Promise<Customer[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) return [];

  const { data } = await supabase
    .from("customers")
    .select("id, business_id, full_name, phone, email, portal_login_id, outstanding_balance, last_order_at, created_at, updated_at")
    .eq("portal_user_id", uid)
    .order("created_at", { ascending: true });

  return data ? transformArrayToCamel<Customer>(data as Record<string, unknown>[]) : [];
}

export interface PortalBusinessConnection {
  id: string;
  name: string;
  location?: string;
  customerId: string;
  customerName: string;
}

/** Businesses that recognise this login as one of their customers. */
export async function getMyPortalBusinesses(
  customers: Customer[]
): Promise<PortalBusinessConnection[]> {
  const businessIds = [...new Set(customers.map((customer) => customer.businessId).filter(Boolean))];
  if (!businessIds.length) return [];

  const { data } = await supabase
    .from("businesses")
    .select("id, name, location")
    .in("id", businessIds);

  const businessMap = new Map(
    (data ?? []).map((business) => [business.id as string, business])
  );

  const connections: PortalBusinessConnection[] = [];
  for (const businessId of businessIds) {
    const customer = customers.find((record) => record.businessId === businessId);
    const business = businessMap.get(businessId);
    if (!business || !customer) continue;
    connections.push({
      id: business.id as string,
      name: business.name as string,
      location: (business.location as string | null) ?? undefined,
      customerId: customer.id,
      customerName: customer.fullName,
    });
  }

  return connections.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Orders (customer-safe) ─────────────────────────────────────────────────────

export async function getMyOrders(customerIds: string[]): Promise<CustomerSafeOrder[]> {
  if (!customerIds.length) return [];

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, tracking_token, order_number, business_id, customer_name, stage, current_stage_name, payment_status, due_date, subtotal_amount, amount_paid, balance_amount, created_at, updated_at"
    )
    .in("customer_id", customerIds)
    .order("created_at", { ascending: false });

  if (!orders?.length) return [];

  // Resolve business names in a single query
  const bizIds = [...new Set(orders.map((o) => o.business_id as string))];
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .in("id", bizIds);

  const bizMap = Object.fromEntries((businesses ?? []).map((b) => [b.id, b.name as string]));

  // Resolve garments in a single query
  const orderIds = orders.map((o) => o.id as string);
  const { data: garments } = await supabase
    .from("order_garments")
    .select("order_id, name, quantity, agreed_price")
    .in("order_id", orderIds);

  const { data: orderItems } = await supabase
    .from("order_items")
    .select("order_id, inventory_item_name, quantity, unit_price, included_parts")
    .in("order_id", orderIds);

  const garmentMap: Record<string, Array<{ name: string; quantity: number; agreedPrice: number }>> = {};
  for (const g of garments ?? []) {
    const key = g.order_id as string;
    if (!garmentMap[key]) garmentMap[key] = [];
    garmentMap[key].push({
      name: g.name as string,
      quantity: g.quantity as number,
      agreedPrice: Number(g.agreed_price ?? 0),
    });
  }

  const itemMap: Record<string, Array<{ name: string; quantity: number; agreedPrice: number; includedParts?: OrderItemPart[] }>> = {};
  for (const item of orderItems ?? []) {
    const key = item.order_id as string;
    if (!itemMap[key]) itemMap[key] = [];
    itemMap[key].push({
      name: (item.inventory_item_name as string) || "Item",
      quantity: Number(item.quantity),
      agreedPrice: Number(item.unit_price ?? 0),
      includedParts: Array.isArray(item.included_parts)
        ? transformArrayToCamel<OrderItemPart>(item.included_parts as Record<string, unknown>[])
        : [],
    });
  }

  return orders.map((o) => ({
    id: o.id as string,
    trackingToken: (o.tracking_token as string) ?? "",
    orderNumber: o.order_number as string,
    businessId: o.business_id as string,
    businessName: bizMap[o.business_id as string] ?? "Workshop",
    customerName: o.customer_name as string,
    stage: o.stage as ProductionStage,
    currentStageName: (o.current_stage_name as string | null) ?? null,
    paymentStatus: o.payment_status as PaymentStatus,
    dueDate: o.due_date as string,
    subtotalAmount: Number(o.subtotal_amount),
    amountPaid: Number(o.amount_paid),
    balanceAmount: Number(o.balance_amount),
    garments: itemMap[o.id as string]?.length ? itemMap[o.id as string] : garmentMap[o.id as string] ?? [],
    createdAt: o.created_at as string,
    updatedAt: o.updated_at as string,
  }));
}

export async function getMyOrderById(orderId: string): Promise<CustomerSafeOrder | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) return null;

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, tracking_token, order_number, business_id, customer_id, customer_name, stage, current_stage_name, payment_status, due_date, subtotal_amount, amount_paid, balance_amount, created_at, updated_at"
    )
    .eq("id", orderId)
    .single();

  if (!order) return null;

  // Verify ownership
  const { data: customers } = await supabase
    .from("customers")
    .select("id")
    .eq("portal_user_id", uid)
    .eq("id", order.customer_id as string);

  if (!customers?.length) return null;

  const { data: biz } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", order.business_id as string)
    .single();

  const { data: garments } = await supabase
    .from("order_garments")
    .select("name, quantity, agreed_price")
    .eq("order_id", orderId);

  const { data: orderItems } = await supabase
    .from("order_items")
    .select("inventory_item_name, quantity, unit_price, included_parts")
    .eq("order_id", orderId)
    .order("sort_order", { ascending: true });

  const safeItems = (orderItems ?? []).map((item) => ({
    name: (item.inventory_item_name as string) || "Item",
    quantity: Number(item.quantity),
    agreedPrice: Number(item.unit_price ?? 0),
    includedParts: Array.isArray(item.included_parts)
      ? transformArrayToCamel<OrderItemPart>(item.included_parts as Record<string, unknown>[])
      : [],
  }));

  return {
    id: order.id as string,
    trackingToken: (order.tracking_token as string) ?? "",
    orderNumber: order.order_number as string,
    businessId: order.business_id as string,
    businessName: (biz?.name as string) ?? "Workshop",
    customerName: order.customer_name as string,
    stage: order.stage as ProductionStage,
    currentStageName: (order.current_stage_name as string | null) ?? null,
    paymentStatus: order.payment_status as PaymentStatus,
    dueDate: order.due_date as string,
    subtotalAmount: Number(order.subtotal_amount),
    amountPaid: Number(order.amount_paid),
    balanceAmount: Number(order.balance_amount),
    garments: safeItems.length > 0 ? safeItems : (garments ?? []).map((g) => ({
        name: g.name as string,
        quantity: g.quantity as number,
        agreedPrice: Number(g.agreed_price ?? 0),
      })),
    createdAt: order.created_at as string,
    updatedAt: order.updated_at as string,
  };
}

// ── Global Sell (ecommerce) orders — customer-safe ──────────────────────────

/**
 * Unified order card shown across the customer portal. Both tailoring
 * (`orders`) and Global Sell marketplace (`ecommerce_orders`) orders are
 * merged so the customer sees everything they have ever purchased in one list.
 */
export interface PortalOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  includedParts?: OrderItemPart[];
}

export interface PortalOrder {
  id: string;
  source: "tailoring" | "globalsell";
  orderNumber: string;
  businessId: string;
  businessName: string;
  customerName: string;
  /** Tailoring: ProductionStage. Global Sell: EcommerceOrderStatus. */
  statusKey: string;
  /** Tailoring: PaymentStatus. Global Sell: EcommercePaymentStatus. */
  paymentStatus: string;
  isActive: boolean;
  isDelivered: boolean;
  isCancelled: boolean;
  totalAmount: number;
  amountPaid: number;
  balanceAmount: number;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  items: PortalOrderItem[];
  /** Deep-link to the public Global Sell tracking portal for this order. */
  trackingUrl?: string;
  tailoring?: CustomerSafeOrder;
  globalsell?: EcommerceOrder;
}

type PortalStoreSummary = Pick<EcommerceStore, "id" | "slug" | "storeName">;

async function getPortalStoreMap(businessIds: string[]): Promise<Map<string, PortalStoreSummary>> {
  const uniqueIds = [...new Set(businessIds.filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  const { data } = await supabase
    .from("ecommerce_stores")
    .select("id, business_id, slug, store_name")
    .in("business_id", uniqueIds);

  return new Map(
    (data ?? []).map((row) => [
      row.business_id as string,
      transformKeysToCamel<PortalStoreSummary>(row as Record<string, unknown>),
    ])
  );
}

function mapPortalEcommerceOrder(
  row: Record<string, unknown>,
  stores: Map<string, PortalStoreSummary>
): EcommerceOrder {
  const order = transformKeysToCamel<EcommerceOrder>(row);
  if (Array.isArray(row.items)) {
    order.items = transformArrayToCamel<EcommerceOrderItem>(
      row.items as Record<string, unknown>[]
    );
  }
  if (Array.isArray(row.payments)) {
    order.payments = transformArrayToCamel<EcommerceOrderPayment>(
      row.payments as Record<string, unknown>[]
    );
  }
  order.store = stores.get(order.sellerBusinessId);
  return order;
}

/** Orders placed from the customer's portal account on Global Sell. */
export async function getMyEcommerceOrders(userId: string): Promise<EcommerceOrder[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("ecommerce_orders")
    .select(
      `
      *,
      items:ecommerce_order_items(*),
      payments:ecommerce_order_payments(*)
    `
    )
    .eq("buyer_user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data?.length) return [];

  const rows = data as Record<string, unknown>[];
  const stores = await getPortalStoreMap(
    rows.map((row) => row.seller_business_id as string)
  );
  return rows.map((row) => mapPortalEcommerceOrder(row, stores));
}

export async function getMyEcommerceOrderById(
  orderId: string,
  userId: string
): Promise<EcommerceOrder | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("ecommerce_orders")
    .select(
      `
      *,
      items:ecommerce_order_items(*),
      payments:ecommerce_order_payments(*)
    `
    )
    .eq("id", orderId)
    .eq("buyer_user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  const stores = await getPortalStoreMap([row.seller_business_id as string]);
  return mapPortalEcommerceOrder(row, stores);
}

function toPortalOrder(order: CustomerSafeOrder): PortalOrder {
  return {
    id: order.id,
    source: "tailoring",
    orderNumber: order.orderNumber,
    businessId: order.businessId,
    businessName: order.businessName,
    customerName: order.customerName,
    statusKey: order.stage,
    paymentStatus: order.paymentStatus,
    isActive: order.stage !== "delivered",
    isDelivered: order.stage === "delivered",
    isCancelled: false,
    totalAmount: order.subtotalAmount,
    amountPaid: order.amountPaid,
    balanceAmount: order.balanceAmount,
    dueDate: order.dueDate,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.garments.map((g) => ({
      name: g.name,
      quantity: g.quantity,
      unitPrice: g.agreedPrice,
      includedParts: g.includedParts,
    })),
    tailoring: order,
  };
}

function toEcommercePortalOrder(order: EcommerceOrder): PortalOrder {
  const isCancelled = order.status === "cancelled" || order.status === "rejected";
  const isDelivered = order.status === "delivered";
  const isPaid = order.paymentStatus === "paid" || order.paymentStatus === "refunded";
  const recordedAmount = (order.payments ?? []).reduce((total, payment) => total + Number(payment.amount), 0);
  const amountPaid = recordedAmount > 0 ? Math.min(Number(order.total), recordedAmount) : isPaid ? Number(order.total) : 0;
  const balanceAmount = isCancelled ? 0 : Math.max(Number(order.total) - amountPaid, 0);

  return {
    id: order.id,
    source: "globalsell",
    orderNumber: order.orderNumber,
    businessId: order.sellerBusinessId,
    businessName: order.store?.storeName ?? "Global Sell",
    customerName: order.buyerName,
    statusKey: order.status,
    paymentStatus: order.paymentStatus,
    isActive: !isCancelled && !isDelivered,
    isDelivered,
    isCancelled,
    totalAmount: order.total,
    amountPaid,
    balanceAmount,
    dueDate: order.deliveredAt ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: (order.items ?? []).map((i) => ({
      name: i.variantName ? `${i.productName} (${i.variantName})` : i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
    trackingUrl: `${shopUrl("track")}?order=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(order.buyerPhone)}`,
    globalsell: order,
  };
}

/** All of the customer's orders: tailoring + Global Sell purchases. */
export async function getMyPortalOrders(
  customerIds: string[],
  userId: string
): Promise<PortalOrder[]> {
  const [tailoring, ecommerce] = await Promise.all([
    getMyOrders(customerIds),
    getMyEcommerceOrders(userId),
  ]);

  const all = [
    ...tailoring.map(toPortalOrder),
    ...ecommerce.map(toEcommercePortalOrder),
  ];

  return all.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function getMyPortalOrderById(
  orderId: string,
  customerIds: string[],
  userId: string
): Promise<PortalOrder | null> {
  const tailoring = await getMyOrderById(orderId);
  if (tailoring) return toPortalOrder(tailoring);

  const ecommerce = await getMyEcommerceOrderById(orderId, userId);
  if (ecommerce) return toEcommercePortalOrder(ecommerce);

  return null;
}

/** Fetch the authoritative invoice/receipt data after server-side ownership verification. */
export async function getMyOrderDocument(orderId: string): Promise<{
  order: Order;
  business: ReceiptBusiness;
} | null> {
  const result = await portalFetch<{ order: Order; business: ReceiptBusiness }>("order-document", { orderId });
  return result.data ?? null;
}

// ── Payments ──────────────────────────────────────────────────────────────────

export interface PortalPayment {
  id: string;
  source: "tailoring" | "globalsell";
  businessId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  method: string;
  description?: string;
  recordedAt: string;
}

/** Payments for both workshop orders and Global Sell purchases. */
export async function getMyPayments(customerIds: string[], userId: string): Promise<PortalPayment[]> {
  const tailoringRequest = customerIds.length
    ? supabase
        .from("payments")
        .select("id, business_id, order_id, order_number, amount, method, description, recorded_at")
        .in("customer_id", customerIds)
        .order("recorded_at", { ascending: false })
    : Promise.resolve({ data: [] as Record<string, unknown>[] });
  const ecommerceRequest = getMyEcommerceOrders(userId);
  const [{ data }, ecommerceOrders] = await Promise.all([tailoringRequest, ecommerceRequest]);
  const tailoring = data
    ? transformArrayToCamel<Pick<Payment, "id" | "businessId" | "orderId" | "orderNumber" | "amount" | "method" | "description" | "recordedAt">>(data as Record<string, unknown>[])
    : [];
  const ecommerce = ecommerceOrders.flatMap((order) =>
    (order.payments ?? []).map((payment) => ({
      id: payment.id,
      source: "globalsell" as const,
      businessId: payment.businessId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(payment.amount),
      method: payment.method,
      description: payment.note,
      recordedAt: payment.createdAt,
    }))
  );

  return [
    ...tailoring.map((payment) => ({ ...payment, source: "tailoring" as const })),
    ...ecommerce,
  ].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

// ── Support conversation meta (for unread badges) ─────────────────────────────

export interface SupportConversationMeta {
  id: string;
  businessId: string;
  lastMessageAt: string | null;
  updatedAt: string;
  lastMessageText: string;
  lastMessageSenderUid: string | null;
  lastMessageCreatedAt: string | null;
}

export async function getMySupportConversations(userId: string): Promise<SupportConversationMeta[]> {
  if (!userId) return [];

  const { data } = await supabase
    .from("conversations")
    .select("id, business_id, last_message, last_message_at, last_message_text, updated_at")
    .contains("participants", [userId]);

  return (data ?? []).map((c) => {
    const lm = (c.last_message as { messageId?: string; text?: string; senderUid?: string; senderName?: string; createdAt?: string } | null) ?? null;
    return {
      id: c.id as string,
      businessId: c.business_id as string,
      lastMessageAt: (c.last_message_at as string) ?? null,
      updatedAt: (c.updated_at as string) ?? new Date().toISOString(),
      lastMessageText: (lm?.text as string) ?? (c.last_message_text as string) ?? "",
      lastMessageSenderUid: (lm?.senderUid as string) ?? null,
      lastMessageCreatedAt: (lm?.createdAt as string) ?? null,
    };
  });
}

export function listenMySupportConversations(
  userId: string,
  callback: (rows: SupportConversationMeta[]) => void
): () => void {
  let destroyed = false;

  const fetchRows = async () => {
    if (destroyed) return;
    const rows = await getMySupportConversations(userId);
    if (!destroyed) callback(rows);
  };

  fetchRows();

  const channel = supabase
    .channel(`portal-convs-${userId}-${crypto.randomUUID()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, fetchRows)
    .subscribe();

  return () => {
    destroyed = true;
    supabase.removeChannel(channel);
  };
}

// ── Support conversations ─────────────────────────────────────────────────────

export async function getOrCreateSupportConversation(
  businessId: string,
  customerId: string,
  portalUserId: string,
  portalUserName: string,
  ownerUid: string,
  ownerName: string
): Promise<string> {
  // Look for existing support conversation between this customer and business
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .contains("participants", [portalUserId])
    .eq("type", "direct")
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  // Create new support conversation
  const now = new Date().toISOString();
  const { data: created } = await supabase
    .from("conversations")
    .insert({
      business_id: businessId,
      participants: [portalUserId, ownerUid],
      participant_profiles: [
        { uid: portalUserId, displayName: portalUserName, photoURL: undefined },
        { uid: ownerUid, displayName: ownerName, photoURL: undefined },
      ],
      type: "direct",
      title: `Support — ${portalUserName}`,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  return (created?.id as string) ?? "";
}

// ── Real-time support messages ────────────────────────────────────────────────

export function listenSupportMessages(
  conversationId: string,
  callback: (messages: Array<{
    id: string;
    senderUid: string;
    senderName: string;
    text: string;
    createdAt: string;
    attachments?: Array<{ url: string; name: string }>;
  }>) => void
): () => void {
  let destroyed = false;

  const fetch = async () => {
    if (destroyed) return;
    const { data } = await supabase
      .from("messages")
      .select("id, sender_uid, sender_name, text, created_at, attachments, deleted_at, is_deleted")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!destroyed && data) {
      callback(
        data
          .filter((m) => !m.is_deleted && !m.deleted_at)
          .map((m) => ({
            id: m.id as string,
            senderUid: m.sender_uid as string,
            senderName: m.sender_name as string,
            text: m.text as string,
            createdAt: m.created_at as string,
            attachments: m.attachments as Array<{ url: string; name: string }> | undefined,
          }))
      );
    }
  };

  fetch();

  const channel = supabase
    .channel(`portal-msgs-${conversationId}-${crypto.randomUUID()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, fetch)
    .subscribe();

  return () => {
    destroyed = true;
    supabase.removeChannel(channel);
  };
}

export async function sendSupportMessage(
  conversationId: string,
  businessId: string,
  senderUid: string,
  senderName: string,
  text: string,
  attachments?: Array<{ type: "image" | "file"; url: string; name?: string }>
): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    business_id: businessId,
    sender_uid: senderUid,
    sender_name: senderName,
    text,
    attachments: attachments ?? [],
    read_by: [senderUid],
    created_at: now,
  });
}
