import { supabase } from "@/lib/supabase";
import { transformArrayToCamel } from "@/lib/case-utils";
import type { Customer, Payment, ProductionStage, PaymentStatus } from "@/types/domain";

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
  paymentStatus: PaymentStatus;
  dueDate: string;
  subtotalAmount: number;
  amountPaid: number;
  balanceAmount: number;
  garments: Array<{ name: string; quantity: number }>;
  createdAt: string;
  updatedAt: string;
  imageUrls?: string[];
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
  // Prevent duplicate portal accounts: if any customer record for this phone
  // already has a portal account, the customer should sign in instead.
  const { data: existingCustomers } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", params.phone)
    .not("portal_user_id", "is", null)
    .limit(1);
  if (existingCustomers?.length) {
    return { error: "An account already exists for this phone number. Please sign in instead." };
  }

  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        portal_type: "customer",
        display_name: params.name,
        phone: params.phone,
      },
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Registration failed. Please try again." };

  // Link auth user to all customer records matching this phone
  await supabase
    .from("customers")
    .update({ portal_user_id: data.user.id })
    .eq("phone", params.phone)
    .is("portal_user_id", null);

  return {};
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
    .eq("portal_user_id", uid);

  return data ? transformArrayToCamel<Customer>(data as Record<string, unknown>[]) : [];
}

// ── Orders (customer-safe) ─────────────────────────────────────────────────────

export async function getMyOrders(customerIds: string[]): Promise<CustomerSafeOrder[]> {
  if (!customerIds.length) return [];

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, tracking_token, order_number, business_id, customer_name, stage, payment_status, due_date, subtotal_amount, amount_paid, balance_amount, created_at, updated_at, image_urls"
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
    .select("order_id, name, quantity")
    .in("order_id", orderIds);

  const garmentMap: Record<string, Array<{ name: string; quantity: number }>> = {};
  for (const g of garments ?? []) {
    const key = g.order_id as string;
    if (!garmentMap[key]) garmentMap[key] = [];
    garmentMap[key].push({ name: g.name as string, quantity: g.quantity as number });
  }

  return orders.map((o) => ({
    id: o.id as string,
    trackingToken: (o.tracking_token as string) ?? "",
    orderNumber: o.order_number as string,
    businessId: o.business_id as string,
    businessName: bizMap[o.business_id as string] ?? "Workshop",
    customerName: o.customer_name as string,
    stage: o.stage as ProductionStage,
    paymentStatus: o.payment_status as PaymentStatus,
    dueDate: o.due_date as string,
    subtotalAmount: Number(o.subtotal_amount),
    amountPaid: Number(o.amount_paid),
    balanceAmount: Number(o.balance_amount),
    garments: garmentMap[o.id as string] ?? [],
    createdAt: o.created_at as string,
    updatedAt: o.updated_at as string,
    imageUrls: (o.image_urls as string[]) ?? [],
  }));
}

export async function getMyOrderById(orderId: string): Promise<CustomerSafeOrder | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) return null;

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, tracking_token, order_number, business_id, customer_id, customer_name, stage, payment_status, due_date, subtotal_amount, amount_paid, balance_amount, created_at, updated_at, image_urls"
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
    .select("name, quantity")
    .eq("order_id", orderId);

  return {
    id: order.id as string,
    trackingToken: (order.tracking_token as string) ?? "",
    orderNumber: order.order_number as string,
    businessId: order.business_id as string,
    businessName: (biz?.name as string) ?? "Workshop",
    customerName: order.customer_name as string,
    stage: order.stage as ProductionStage,
    paymentStatus: order.payment_status as PaymentStatus,
    dueDate: order.due_date as string,
    subtotalAmount: Number(order.subtotal_amount),
    amountPaid: Number(order.amount_paid),
    balanceAmount: Number(order.balance_amount),
    garments: (garments ?? []).map((g) => ({
      name: g.name as string,
      quantity: g.quantity as number,
    })),
    createdAt: order.created_at as string,
    updatedAt: order.updated_at as string,
    imageUrls: (order.image_urls as string[]) ?? [],
  };
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function getMyPayments(customerIds: string[]): Promise<Payment[]> {
  if (!customerIds.length) return [];

  const { data } = await supabase
    .from("payments")
    .select("id, business_id, customer_id, customer_name, order_id, order_number, amount, method, description, recorded_at, recorded_by_uid, recorded_by_name")
    .in("customer_id", customerIds)
    .order("recorded_at", { ascending: false });

  return data ? transformArrayToCamel<Payment>(data as Record<string, unknown>[]) : [];
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
    .single();

  if (existing?.id) return existing.id as string;

  // Create new support conversation
  const now = new Date().toISOString();
  const { data: created } = await supabase
    .from("conversations")
    .insert({
      business_id: businessId,
      participants: [portalUserId, ownerUid],
      participant_profiles: [
        { uid: portalUserId, display_name: portalUserName },
        { uid: ownerUid, display_name: ownerName },
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
      .select("id, sender_uid, sender_name, text, created_at, attachments")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!destroyed && data) {
      callback(
        data.map((m) => ({
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
    .channel(`portal-msgs-${conversationId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, fetch)
    .subscribe();

  return () => {
    destroyed = true;
    supabase.removeChannel(channel);
  };
}

export async function sendSupportMessage(
  conversationId: string,
  senderUid: string,
  senderName: string,
  text: string
): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_uid: senderUid,
    sender_name: senderName,
    text,
    created_at: now,
    updated_at: now,
    deleted: false,
  });

  await supabase
    .from("conversations")
    .update({ last_message_text: text, last_message_at: now, updated_at: now })
    .eq("id", conversationId);
}
