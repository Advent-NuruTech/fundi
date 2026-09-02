import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  buildPortalLoginId,
  buildPortalSyntheticEmail,
  buildDefaultPortalPassword,
  normalizePhoneForAuth,
  isSyntheticPortalEmail,
} from "@/lib/customer-portal";
import { transformKeysToCamel } from "@/lib/case-utils";
import type { Order, OrderItem, OrderMember } from "@/types/domain";
import type { ReceiptBusiness } from "@/lib/receipt";

function getSupabaseUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "");
}

function getAdminClient() {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceKey) throw new Error("Missing Supabase admin env vars");
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type AdminClient = ReturnType<typeof getAdminClient>;

async function findAuthUserByEmail(email: string) {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !serviceKey || !anonKey) return null;

  try {
    const res = await fetch(`${url}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: Array<{ id: string; email?: string | null; user_metadata?: Record<string, unknown> }> };
    return (
      (data.users ?? []).find(
        (u) => (u.email ?? "").toLowerCase() === email.toLowerCase()
      ) ?? null
    );
  } catch {
    return null;
  }
}

function isPortalUser(user: { user_metadata?: Record<string, unknown> }): boolean {
  return user.user_metadata?.portal_type === "customer";
}

function extractToken(request: Request): string | null {
  const header = request.headers.get("Authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

async function requireCaller(admin: AdminClient, request: Request) {
  const token = extractToken(request);
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  return { caller: data.user };
}

async function requireBusinessMember(admin: AdminClient, userId: string, businessId: string) {
  if (!businessId) return { error: NextResponse.json({ error: "Missing businessId" }, { status: 400 }) };
  const { data: member } = await admin
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .eq("profile_id", userId)
    .maybeSingle();
  if (!member) return { error: NextResponse.json({ error: "Not a member of this business" }, { status: 403 }) };
  return { member };
}

interface CustomerRow {
  id: string;
  business_id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  portal_user_id?: string | null;
}

/**
 * Canonical phone variants that can appear in the `customers` table for a
 * single number: "254712345678", "+254712345678", "0712345678", "712345678".
 */
function phoneMatchForms(phone: string): string[] {
  const n = normalizePhoneForAuth(phone);
  if (!n) return [];
  const forms = [n, `+${n}`];
  if (n.startsWith("254") && n.length === 12) {
    forms.push(`0${n.slice(3)}`, n.slice(3));
  }
  return [...new Set(forms)];
}

/**
 * Provision the portal account for ONE customer.
 * - login id = email (if present) else normalized phone
 * - default password = normalized phone
 * Reuses an existing portal account whose login id matches (dedupe), and
 * creates a Supabase auth user + profiles row when none exists.
 */
async function provisionCustomerAccount(
  admin: AdminClient,
  customer: CustomerRow
): Promise<{ status: "created" | "linked" | "skipped"; userId?: string; loginId?: string; password?: string; reason?: string }> {
  const phone = normalizePhoneForAuth(customer.phone ?? "");
  if (!phone) {
    return { status: "skipped", reason: "missing-phone" };
  }

  const email = customer.email?.trim() || undefined;
  const password = buildDefaultPortalPassword(phone);

  // Resolve the human-facing login id and the canonical auth email.
  const loginIdByEmail = buildPortalLoginId(email, phone);
  const authEmailByEmail = email ? email.toLowerCase() : buildPortalSyntheticEmail(phone);

  let existing = await findAuthUserByEmail(authEmailByEmail);

  // The requested email is already held by a NON-customer (e.g. a staff or
  // owner account). Fall back to phone-based login when the customer gave us
  // an email; if phone login is also unavailable, skip and retry later.
  if (existing && !isPortalUser(existing) && !email) {
    return { status: "skipped", reason: "login-taken" };
  }
  if (existing && !isPortalUser(existing) && email) {
    const phoneLoginEmail = buildPortalSyntheticEmail(phone);
    existing = await findAuthUserByEmail(phoneLoginEmail);
    if (existing && !isPortalUser(existing)) {
      return { status: "skipped", reason: "login-taken" };
    }
    return createAndLinkPortalUser(admin, customer, phone, phoneLoginEmail, phone, password);
  }

  if (existing) {
    // Same customer already has an account — just link the record.
    await admin
      .from("customers")
      .update({ portal_user_id: existing.id, portal_login_id: loginIdByEmail, portal_provision_needed: false })
      .eq("id", customer.id);
    return { status: "linked", userId: existing.id, loginId: loginIdByEmail, password };
  }

  return createAndLinkPortalUser(admin, customer, phone, authEmailByEmail, loginIdByEmail, password);
}

async function createAndLinkPortalUser(
  admin: AdminClient,
  customer: CustomerRow,
  phone: string,
  authEmail: string,
  loginId: string,
  password: string
): Promise<{ status: "created"; userId: string; loginId: string; password: string }> {
  const { data, error } = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: {
      portal_type: "customer",
      display_name: customer.full_name,
      phone,
      business_id: customer.business_id,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Failed to create portal account");
  }

  const uid = data.user.id;

  await admin.from("profiles").upsert(
    {
      id: uid,
      email: authEmail,
      display_name: customer.full_name,
      role: "customer",
      roles: ["customer"],
      business_id: null,
      active: true,
    },
    { onConflict: "id" }
  );

  await admin
    .from("customers")
    .update({
      portal_user_id: uid,
      portal_login_id: loginId,
      portal_provision_needed: false,
    })
    .eq("id", customer.id);

  return { status: "created", userId: uid, loginId, password };
}

async function handleProvision(admin: AdminClient, caller: { id: string }, body: Record<string, unknown>) {
  const { businessId, customerId } = body as { businessId: string; customerId: string };
  if (!businessId || !customerId) {
    return NextResponse.json({ error: "Missing businessId or customerId" }, { status: 400 });
  }
  const check = await requireBusinessMember(admin, caller.id, businessId);
  if (check.error) return check.error;

  const { data: customer } = await admin
    .from("customers")
    .select("id, business_id, full_name, phone, email, portal_user_id")
    .eq("id", customerId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const result = await provisionCustomerAccount(admin, customer as CustomerRow);
  return NextResponse.json({ success: true, ...result });
}

async function handleProcess(admin: AdminClient, caller: { id: string }, body: Record<string, unknown>) {
  const { businessId } = body as { businessId: string };
  const check = await requireBusinessMember(admin, caller.id, businessId);
  if (check.error) return check.error;

  const { data: pending } = await admin
    .from("customers")
    .select("id, business_id, full_name, phone, email, portal_user_id")
    .eq("business_id", businessId)
    .eq("portal_provision_needed", true)
    .is("portal_user_id", null)
    .limit(500);

  let created = 0;
  let linked = 0;
  let skipped = 0;

  for (const customer of pending ?? []) {
    try {
      const result = await provisionCustomerAccount(admin, customer as CustomerRow);
      if (result.status === "created") created++;
      else if (result.status === "linked") linked++;
      else skipped++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ success: true, processed: (pending ?? []).length, created, linked, skipped });
}

async function handleCheckLogin(admin: AdminClient, body: Record<string, unknown>) {
  const { loginId, excludeUserId } = body as { loginId: string; excludeUserId?: string };
  if (!loginId) return NextResponse.json({ error: "Missing loginId" }, { status: 400 });

  const loginEmail = isSyntheticPortalEmail(loginId)
    ? loginId.toLowerCase()
    : loginId.includes("@")
      ? loginId.toLowerCase()
      : buildPortalSyntheticEmail(loginId);

  const existing = await findAuthUserByEmail(loginEmail);
  const available = !existing || existing.id === excludeUserId;

  return NextResponse.json({ success: true, available });
}

async function handleUpdateContact(admin: AdminClient, caller: { id: string }, body: Record<string, unknown>) {
  const { customerId, fullName, email, phone } = body as {
    customerId: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };

  if (!customerId) return NextResponse.json({ error: "Missing customerId" }, { status: 400 });

  // Portal customers may only update their OWN customer record.
  const { data: customer } = await admin
    .from("customers")
    .select("id, business_id, full_name, phone, email, portal_user_id, portal_login_id")
    .eq("id", customerId)
    .maybeSingle();

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  if (customer.portal_user_id !== caller.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const currentLoginId = (customer.portal_login_id as string) || "";
  const currentPhone = normalizePhoneForAuth((customer.phone as string) || "");

  const nextFullName = fullName?.trim() || (customer.full_name as string);
  const nextEmailRaw = email?.trim() || "";
  const nextPhone = phone ? normalizePhoneForAuth(phone) : currentPhone;

  if (!nextPhone) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  if (nextEmailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmailRaw)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const nextEmail = nextEmailRaw.toLowerCase();

  // ── Uniqueness validation ──────────────────────────────────────────────────
  // Email / phone login ids must stay unique across the whole platform.
  const newLoginCandidate = nextEmail || nextPhone;
  if (newLoginCandidate) {
    const existing = await findAuthUserByEmail(
      nextEmail ? nextEmail : buildPortalSyntheticEmail(nextPhone)
    );
    if (existing && existing.id !== caller.id) {
      return NextResponse.json(
        { error: `That ${nextEmail ? "email" : "phone number"} is already used by another account` },
        { status: 409 }
      );
    }
  }

  const { data: linkedCustomers } = await admin
    .from("customers")
    .select("id, business_id")
    .eq("portal_user_id", caller.id);

  // Phone must stay unique in every business connected to this account.
  if (nextPhone !== currentPhone) {
    const linkedIds = new Set((linkedCustomers ?? []).map((row) => row.id as string));
    const linkedBusinessIds = [...new Set((linkedCustomers ?? []).map((row) => row.business_id as string))];
    const { data: possibleClashes } = await admin
      .from("customers")
      .select("id, business_id")
      .in("business_id", linkedBusinessIds)
      .eq("phone", nextPhone);
    const clash = (possibleClashes ?? []).find((row) => !linkedIds.has(row.id as string));
    if (clash) {
      return NextResponse.json({ error: "Another customer in a connected business already uses that phone number" }, { status: 409 });
    }
  }

  // ── Apply changes ──────────────────────────────────────────────────────────
  const { data: authUser } = await admin.auth.admin.getUserById(caller.id);
  const authEmail = authUser?.user?.email ?? "";
  const isPhoneLogin = !nextEmailRaw && isSyntheticPortalEmail(authEmail);

  const newAuthEmail = nextEmailRaw ? nextEmail : isPhoneLogin ? buildPortalSyntheticEmail(nextPhone) : authEmail;

  if (newAuthEmail !== authEmail) {
    await admin.auth.admin.updateUserById(caller.id, {
      email: newAuthEmail,
      email_confirm: true,
      user_metadata: {
        ...(authUser?.user?.user_metadata ?? {}),
        display_name: nextFullName,
        phone: nextPhone,
        email: nextEmail || undefined,
      },
    });
  }

  const nextLoginId = nextEmail || (!nextEmailRaw && isPhoneLogin ? nextPhone : currentLoginId);

  await admin
    .from("customers")
    .update({
      full_name: nextFullName,
      email: nextEmail || null,
      phone: nextPhone,
      portal_login_id: nextLoginId || null,
    })
    .eq("portal_user_id", caller.id);

  await admin
    .from("profiles")
    .upsert(
      {
        id: caller.id,
        email: newAuthEmail,
        display_name: nextFullName,
        role: "customer",
        roles: ["customer"],
        active: true,
      },
      { onConflict: "id" }
    );

  return NextResponse.json({
    success: true,
    fullName: nextFullName,
    email: nextEmail || null,
    phone: nextPhone,
    loginId: nextLoginId || null,
    loginEmail: newAuthEmail,
  });
}

async function handleUpdateIdentity(
  admin: AdminClient,
  caller: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  body: Record<string, unknown>
) {
  if (!isPortalUser(caller)) {
    return NextResponse.json({ error: "This is not a customer account" }, { status: 403 });
  }

  const { fullName, email, phone } = body as { fullName?: string; email?: string; phone?: string };
  const nextFullName = (fullName ?? "").trim();
  const nextEmail = (email ?? "").trim().toLowerCase();
  const nextPhone = normalizePhoneForAuth(phone ?? "");

  if (!nextFullName) return NextResponse.json({ error: "Your name is required" }, { status: 400 });
  if (!nextPhone) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  if (nextEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const { data: linkedCustomer } = await admin
    .from("customers")
    .select("id")
    .eq("portal_user_id", caller.id)
    .limit(1)
    .maybeSingle();
  if (linkedCustomer) {
    return NextResponse.json({ error: "Update your connected customer profile instead" }, { status: 409 });
  }

  const currentAuthEmail = caller.email ?? "";
  const nextAuthEmail = nextEmail || buildPortalSyntheticEmail(nextPhone);
  if (nextAuthEmail !== currentAuthEmail) {
    const existing = await findAuthUserByEmail(nextAuthEmail);
    if (existing && existing.id !== caller.id) {
      return NextResponse.json({ error: "That email or phone number is already used by another account" }, { status: 409 });
    }
  }

  const { error: authError } = await admin.auth.admin.updateUserById(caller.id, {
    email: nextAuthEmail,
    email_confirm: true,
    user_metadata: {
      ...(caller.user_metadata ?? {}),
      portal_type: "customer",
      display_name: nextFullName,
      phone: nextPhone,
      email: nextEmail || undefined,
    },
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  await admin.from("profiles").upsert(
    {
      id: caller.id,
      email: nextAuthEmail,
      display_name: nextFullName,
      role: "customer",
      roles: ["customer"],
      business_id: null,
      active: true,
    },
    { onConflict: "id" }
  );

  return NextResponse.json({
    success: true,
    fullName: nextFullName,
    email: nextEmail || null,
    phone: nextPhone,
    loginId: nextEmail || nextPhone,
    loginEmail: nextAuthEmail,
  });
}

async function handleMarkOnboarding(admin: AdminClient, caller: { id: string }, body: Record<string, unknown>) {
  const { businessId, customerId } = body as { businessId: string; customerId: string };
  const check = await requireBusinessMember(admin, caller.id, businessId);
  if (check.error) return check.error;
  if (!customerId) return NextResponse.json({ error: "Missing customerId" }, { status: 400 });

  await admin
    .from("customers")
    .update({ portal_onboarding_sent: true })
    .eq("id", customerId)
    .eq("business_id", businessId);

  return NextResponse.json({ success: true });
}

async function handleMessageInfo(admin: AdminClient, caller: { id: string }, body: Record<string, unknown>) {
  const { businessId, customerId } = body as { businessId: string; customerId: string };
  const check = await requireBusinessMember(admin, caller.id, businessId);
  if (check.error) return check.error;
  if (!customerId) return NextResponse.json({ error: "Missing customerId" }, { status: 400 });

  const { data: customer } = await admin
    .from("customers")
    .select("id, full_name, phone, email, portal_onboarding_sent")
    .eq("id", customerId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  return NextResponse.json({
    success: true,
    customer: {
      id: customer.id,
      fullName: customer.full_name,
      phone: customer.phone,
      email: customer.email,
      portalOnboardingSent: customer.portal_onboarding_sent,
    },
  });
}

/**
 * Public self-registration for the customer portal.
 *
 * This MUST run with the service role: a brand-new portal customer has no
 * business membership, so RLS would silently block the account→customer link
 * (that was the root cause of "portal shows zero records despite the order
 * existing"). Using the service role here makes the link persist.
 */
async function handleRegister(admin: AdminClient, body: Record<string, unknown>) {
  const { email, password, name, phone } = body as {
    email?: string;
    password?: string;
    name?: string;
    phone?: string;
  };

  const normalizedEmail = (email ?? "").trim().toLowerCase();
  const normalizedPhone = normalizePhoneForAuth(phone ?? "");
  const displayName = (name ?? "").trim();

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }
  if (!normalizedPhone) {
    return NextResponse.json({ error: "A valid phone number is required" }, { status: 400 });
  }
  if (!displayName) {
    return NextResponse.json({ error: "Your name is required" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // ── Duplicate account prevention ──────────────────────────────────────────
  // If ANY customer row for this phone already has a portal account, the
  // customer should sign in instead of creating a second account.
  const phoneForms = phoneMatchForms(normalizedPhone);
  const { data: phoneCustomers } = await admin
    .from("customers")
    .select("id, business_id, full_name, phone, email, portal_user_id")
    .in("phone", phoneForms)
    .limit(50);
  const alreadyLinked = (phoneCustomers ?? []).some((c) => c.portal_user_id != null);
  if (alreadyLinked) {
    return NextResponse.json(
      { error: "An account already exists for this phone number. Please sign in instead." },
      { status: 409 }
    );
  }

  // ── Resolve the canonical auth email ──────────────────────────────────────
  // Prefer the real email unless it is held by a NON-customer account (e.g. a
  // staff member) — then fall back to the phone-based login so the customer can
  // still sign in with their phone number.
  let authEmail = normalizedEmail;
  let loginId = normalizedEmail;

  const emailExisting = await findAuthUserByEmail(normalizedEmail);
  if (emailExisting && isPortalUser(emailExisting)) {
    return NextResponse.json(
      { error: "An account already exists for this email. Please sign in instead." },
      { status: 409 }
    );
  }
  if (emailExisting && !isPortalUser(emailExisting)) {
    authEmail = buildPortalSyntheticEmail(normalizedPhone);
    loginId = normalizedPhone;
  }

  const synthetic = await findAuthUserByEmail(buildPortalSyntheticEmail(normalizedPhone));
  if (synthetic) {
    if (isPortalUser(synthetic)) {
      return NextResponse.json(
        { error: "An account already exists for this phone number. Please sign in instead." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "This phone number is already in use. Please contact support." },
      { status: 409 }
    );
  }

  // ── Create the auth user + profile ────────────────────────────────────────
  const { data, error } = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: {
      portal_type: "customer",
      display_name: displayName,
      phone: normalizedPhone,
      email: normalizedEmail,
    },
  });
  if (error || !data?.user) {
    return NextResponse.json({ error: error?.message ?? "Failed to create account" }, { status: 500 });
  }
  const uid = data.user.id;

  await admin.from("profiles").upsert(
    {
      id: uid,
      email: authEmail,
      display_name: displayName,
      role: "customer",
      roles: ["customer"],
      business_id: null,
      active: true,
    },
    { onConflict: "id" }
  );

  // ── Link every customer record for this phone ─────────────────────────────
  // A single phone may map to customer records in multiple businesses; all of
  // them get linked to the same portal account.
  const { data: linkable } = await admin
    .from("customers")
    .select("id, phone, email")
    .in("phone", phoneForms)
    .is("portal_user_id", null);
  for (const c of linkable ?? []) {
    await admin
      .from("customers")
      .update({
        portal_user_id: uid,
        portal_login_id: buildPortalLoginId(c.email as string | undefined, c.phone as string),
        portal_provision_needed: false,
      })
      .eq("id", c.id);
  }

  return NextResponse.json({ success: true, loginId });
}

/**
 * Self-healing linkage. Runs on every portal session load: links any customer
 * record that matches this portal user's phone / email but never got linked
 * (e.g. because the older client-side registration was silently blocked by
 * RLS). Uses the service role so RLS cannot interfere.
 */
async function handleRelink(admin: AdminClient, caller: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  const meta = caller.user_metadata ?? {};
  if (meta.portal_type !== "customer") {
    return NextResponse.json({ success: true, linked: 0 });
  }

  const callerEmail = (caller.email ?? "").trim().toLowerCase();
  const phoneRaw = typeof meta.phone === "string" ? meta.phone : "";
  const phoneForms = phoneMatchForms(phoneRaw);

  const seen = new Set<string>();
  const toLink: CustomerRow[] = [];

  if (phoneForms.length) {
    const { data } = await admin
      .from("customers")
      .select("id, business_id, full_name, phone, email, portal_user_id")
      .in("phone", phoneForms)
      .is("portal_user_id", null)
      .limit(500);
    for (const c of data ?? []) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        toLink.push(c as CustomerRow);
      }
    }
  }

  if (callerEmail && !isSyntheticPortalEmail(callerEmail)) {
    const { data } = await admin
      .from("customers")
      .select("id, business_id, full_name, phone, email, portal_user_id")
      .ilike("email", callerEmail)
      .is("portal_user_id", null)
      .limit(500);
    for (const c of data ?? []) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        toLink.push(c as CustomerRow);
      }
    }
  }

  for (const c of toLink) {
    await admin
      .from("customers")
      .update({
        portal_user_id: caller.id,
        portal_login_id: buildPortalLoginId(c.email as string | undefined, c.phone as string),
        portal_provision_needed: false,
      })
      .eq("id", c.id);
  }

  const { data: linkedCustomers } = await admin
    .from("customers")
    .select("phone, email")
    .eq("portal_user_id", caller.id)
    .limit(500);
  // Pass every canonical Kenyan phone representation to the database repair
  // function. Older marketplace checkouts commonly stored 07..., while portal
  // auth stores 254...; punctuation-only normalization cannot equate those.
  const phones = [
    ...new Set(
      [phoneRaw, ...(linkedCustomers ?? []).map((customer) => customer.phone as string)]
        .filter(Boolean)
        .flatMap(phoneMatchForms)
    ),
  ];
  const emails = [...new Set([callerEmail, ...(linkedCustomers ?? []).map((customer) => (customer.email as string | null) ?? "")].filter((email) => email && !isSyntheticPortalEmail(email)))];
  const { data: ecommerceLinked, error: ecommerceRelinkError } = await admin.rpc("relink_portal_ecommerce_orders", {
    p_user_id: caller.id,
    p_phones: phones,
    p_emails: emails,
  });
  if (ecommerceRelinkError) {
    console.error("[customer-portal] Could not relink Global Sell orders", ecommerceRelinkError);
  }

  return NextResponse.json({ success: true, linked: toLink.length, ecommerceLinked: ecommerceLinked ?? 0 });
}

/** Return the complete, customer-safe document for one order the caller owns. */
async function handleOrderDocument(
  admin: AdminClient,
  caller: { id: string },
  body: Record<string, unknown>
) {
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  const { data: orderRow } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!orderRow) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const { data: owner } = await admin
    .from("customers")
    .select("id")
    .eq("id", orderRow.customer_id as string)
    .eq("portal_user_id", caller.id)
    .maybeSingle();
  if (!owner) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const [{ data: itemRows }, { data: garmentRows }, { data: memberRows }, { data: business }] = await Promise.all([
    admin.from("order_items").select("*").eq("order_id", orderId).order("sort_order", { ascending: true }),
    admin.from("order_garments").select("*").eq("order_id", orderId).order("sort_order", { ascending: true }),
    admin.from("order_members").select("*").eq("order_id", orderId).order("sort_order", { ascending: true }),
    admin.from("businesses").select("name, logo_url, phone, email, location, receipt_footer, currency, tax_enabled, tax_rate, tax_mode, tax_label").eq("id", orderRow.business_id as string).maybeSingle(),
  ]);
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const memberIds = (memberRows ?? []).map((member) => member.id as string);
  const { data: memberGarments } = memberIds.length
    ? await admin.from("order_member_garments").select("*").in("order_member_id", memberIds).order("sort_order", { ascending: true })
    : { data: [] };
  const garmentsByMember = new Map<string, Record<string, unknown>[]>();
  for (const garment of memberGarments ?? []) {
    const key = garment.order_member_id as string;
    garmentsByMember.set(key, [...(garmentsByMember.get(key) ?? []), garment as Record<string, unknown>]);
  }

  const order = transformKeysToCamel<Order>(orderRow as Record<string, unknown>);
  order.items = (itemRows ?? []).map((item) => transformKeysToCamel<OrderItem>(item as Record<string, unknown>));
  order.garments = (garmentRows ?? []).map((garment) => transformKeysToCamel<Order["garments"][number]>(garment as Record<string, unknown>));
  order.members = (memberRows ?? []).map((member) => {
    const mapped = transformKeysToCamel<OrderMember>(member as Record<string, unknown>);
    mapped.garments = (garmentsByMember.get(member.id as string) ?? []).map((garment) => transformKeysToCamel<NonNullable<OrderMember["garments"]>[number]>(garment));
    return mapped;
  });

  return NextResponse.json({
    order,
    business: transformKeysToCamel<ReceiptBusiness>(business as Record<string, unknown>),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = body.action as string;

  // Registration happens BEFORE a portal session exists, so it must not go
  // through requireCaller (which needs a signed-in user).
  if (action === "register") {
    try {
      const admin = getAdminClient();
      return await handleRegister(admin, body);
    } catch (err) {
      console.error("[customer-portal]", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Request failed" },
        { status: 500 }
      );
    }
  }

  try {
    const admin = getAdminClient();
    const auth = await requireCaller(admin, request);
    if (auth.error) return auth.error;
    const caller = auth.caller!;

    switch (action) {
      case "relink":
        return await handleRelink(admin, caller);
      case "provision":
        return await handleProvision(admin, caller, body);
      case "process":
        return await handleProcess(admin, caller, body);
      case "check-login":
        return await handleCheckLogin(admin, body);
      case "update-contact":
        return await handleUpdateContact(admin, caller, body);
      case "update-identity":
        return await handleUpdateIdentity(admin, caller, body);
      case "mark-onboarding":
        return await handleMarkOnboarding(admin, caller, body);
      case "message-info":
        return await handleMessageInfo(admin, caller, body);
      case "order-document":
        return await handleOrderDocument(admin, caller, body);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[customer-portal]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Request failed" },
      { status: 500 }
    );
  }
}
