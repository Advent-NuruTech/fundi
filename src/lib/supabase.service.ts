import { supabase } from "@/lib/supabase";
import { transformKeysToCamel, transformKeysToSnake, transformArrayToCamel, toDate, snakeToCamel } from "@/lib/case-utils";
import { formatKes } from "@/lib/utils";
import { provisionPortalAccount } from "@/services/customer-portal.service";
import { DEFAULT_DELIVERY_CONFIG } from "@/types/domain";
import {
  getCachedCollection,
  cacheCollection,
  cacheLocalRecord,
  patchCachedRecord,
  enqueueSyncOperation,
  generateId,
} from "@/lib/local-db";
import {
  isOffline,
  isNetworkError,
  withOfflineFallback,
  offlineCreate,
  offlineUpdate,
  offlineDelete,
  getCachedById,
  onLocalWrite,
  notifyLocalWrite,
} from "@/lib/offline-write";
import type {
  Customer,
  CustomerType,
  MeasurementSet,
  DeliveryStatus,
  DeliveryMethod,
  DeliveryStage,
  DeliveryTimelineEntry,
  DeliveryPartner,
  BusinessDeliveryConfig,
  OrderReturn,
  ReturnStatus,
  OrderCancellation,
  CancellationBy,
  RefundStatus,
  EmployeeInvitation,
  Business,
  InventoryMaterial,
  Order,
  OrderItem,
  OrderItemType,
  OrderItemMaterialUsage,
  OrderType,
  OrderMember,
  OrderMemberGarment,
  Payment,
  PurchaseOrder,
  StockMovement,
  Supplier,
  UserProfile,
  UserRole,
  PaymentMethod,
  ProductionStage,
  ProductionStageConfig,
  StageMilestone,
  DbUnit,
  DbCategory,
  MaterialUsageRecord,
  FabricMeta,
  Notification,
  NotificationType,
  Conversation,
  ConversationType,
  Message,
  AnnouncementPriority,
  Expense,
  ExpenseCategory,
  Withdrawal,
  WithdrawalCategory,
  Transaction,
  FinanceAlert,
  ConsumptionReport,
  CustomerChangeEntry,
  SmsLog,
  Investment,
  SavingsGoal,
  SavingsDeposit,
} from "@/types/domain";

function generateTrackingToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return "ord_" + Array.from({ length: 9 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const orderStageSort: Record<ProductionStage, number> = {
  cutting: 1,
  stitching: 2,
  fitting: 3,
  finishing: 4,
  ready_for_pickup: 5,
  delivered: 6,
};

function normalizedRoles(roles: UserRole[]) {
  return Array.from(new Set(roles));
}

function roleFromRoles(roles: UserRole[]): UserRole {
  if (roles.includes("owner")) return "owner";
  if (roles.includes("admin_manager")) return "admin_manager";
  if (roles.includes("tailor")) return "tailor";
  if (roles.includes("receptionist")) return "receptionist";
  if (roles.includes("inventory_manager")) return "inventory_manager";
  return "cashier";
}

// â”€â”€â”€ BRANCH SCOPING â”€â”€â”€
//
// Branches isolate transactional data inside a business. The active branch is a
// per-user UI choice held in the auth context and pushed here via setActiveBranch.
// Reads on branch-scoped tables filter by it; writes stamp it. Everything is
// guarded by `branchScopingAvailable`: the first time a branch_id query fails
// with Postgres "column does not exist" (42703) — i.e. migration 00029 hasn't
// been applied yet — scoping disables itself so the app keeps working untouched.

const BRANCH_SCOPED_TABLES = new Set<string>([
  'customers', 'orders', 'payments', 'inventory_materials', 'stock_movements',
  'purchase_orders', 'suppliers', 'expenses', 'withdrawals', 'investments',
  'savings_goals', 'savings_deposits', 'transactions', 'consumption_reports',
  'sms_logs', 'images', 'delivery_partners', 'order_returns', 'order_cancellations',
]);

let activeBranchId: string | null = null;
let branchScopingAvailable = true;

export function setActiveBranch(branchId: string | null) {
  activeBranchId = branchId;
}

export function getActiveBranch(): string | null {
  return activeBranchId;
}

function isBranchScoped(table: string): boolean {
  return branchScopingAvailable && !!activeBranchId && BRANCH_SCOPED_TABLES.has(table);
}

function isMissingColumnError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '42703';
}

/**
 * Spread into an insert payload (camelCase, before transformKeysToSnake) to
 * stamp the active branch when branch scoping is on. Returns nothing when
 * scoping is off so the DB default-branch trigger fills it in instead.
 */
function branchFields(table: string): Record<string, unknown> {
  return isBranchScoped(table) ? { branchId: activeBranchId } : {};
}

// â”€â”€â”€ LISTENER HELPER â”€â”€â”€

// Attach a refetch to the browser's `online` event so listeners recover
// immediately when connectivity returns. Returns a cleanup function.
function refetchOnReconnect(fetchAndCallback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => setTimeout(fetchAndCallback, 300);
  window.addEventListener("online", handler, { passive: true });
  return () => window.removeEventListener("online", handler);
}

function listenToTable<T>(
  table: string,
  businessId: string,
  callback: (rows: T[]) => void,
  options?: { orderBy?: string; orderDir?: 'asc' | 'desc'; limit?: number }
): () => void {
  let destroyed = false;
  let gotFresh = false;

  // Serve the Dexie cache (used for instant first paint, offline mode, and
  // network-error fallback). Only overrides fresher server data when forced
  // by an optimistic local write.
  const serveCache = async (force = false) => {
    const cached = await getCachedCollection<T>(table, businessId).catch(() => []);
    if (!destroyed && (force || !gotFresh) && cached.length > 0) callback(cached);
  };

  const fetchAndCallback = async () => {
    if (destroyed) return;

    if (isOffline()) {
      await serveCache(true);
      return;
    }

    let query = supabase.from(table).select('*').eq('business_id', businessId);
    if (isBranchScoped(table)) {
      query = query.eq('branch_id', activeBranchId as string);
    }
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderDir === 'asc' });
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    const { data, error } = await query;
    if (error && isMissingColumnError(error)) {
      // Migration 00029 not applied yet — disable branch scoping and retry
      // unscoped so the app keeps working.
      branchScopingAvailable = false;
      if (!destroyed) fetchAndCallback();
      return;
    }
    if (data && !destroyed) {
      gotFresh = true;
      const rows = transformArrayToCamel<T>(data as Record<string, unknown>[]);
      callback(rows);
      // Cache for offline use (fire-and-forget). Windowed queries must not
      // prune cached rows that fall outside the window.
      cacheCollection(table, businessId, rows as unknown as Array<Record<string, unknown>>, !options?.limit).catch(() => {});
    } else if (!destroyed && error) {
      // Network/Supabase error — fall back to cache
      await serveCache();
    }
  };
  serveCache();
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite([table], () => serveCache(true));
  const channel = supabase
    .channel(`${table}-${businessId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

function listenToTableWithoutBusinessId<T>(
  table: string,
  callback: (rows: T[]) => void,
  options?: { orderBy?: string; orderDir?: 'asc' | 'desc'; limit?: number }
): () => void {
  let destroyed = false;
  const fetchAndCallback = async () => {
    if (destroyed) return;
    let query = supabase.from(table).select('*');
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderDir === 'asc' });
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    const { data } = await query;
    if (data && !destroyed) callback(transformArrayToCamel<T>(data as Record<string, unknown>[]));
  };
  fetchAndCallback();
  const channel = supabase
    .channel(`${table}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
}

// â”€â”€â”€ BUSINESS â”€â”€â”€

export async function bootstrapBusiness(input: {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  businessName: string;
  location: string;
}) {
  const { data: businessData, error: businessError } = await supabase
    .from('businesses')
    .insert(transformKeysToSnake({
      name: input.businessName,
      phone: input.phone,
      location: input.location,
      currency: "KES",
      country: "Kenya",
      ownerUid: input.uid,
      orderCounter: 0,
      employeeCounter: 0,
    } as Record<string, unknown>))
    .select('id')
    .single();

  if (businessError || !businessData) throw businessError || new Error("Failed to create business");
  const businessId = businessData.id;

  const userPayload = {
    uid: input.uid,
    email: input.email,
    displayName: input.displayName,
    role: "owner" as const,
    roles: ["owner"] as UserRole[],
    businessId,
    active: true,
    mustChangePassword: false,
  };

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(transformKeysToSnake({ ...userPayload, id: input.uid } as Record<string, unknown>, false), { onConflict: 'id' });
  if (profileError) throw profileError;

  const { error: memberError } = await supabase
    .from('business_members')
    .insert(transformKeysToSnake({ ...userPayload, uid: input.uid } as Record<string, unknown>));
  if (memberError) throw memberError;

  const defaultUnits = ["Pieces", "Meters", "Cones", "Kilograms", "Liters"];
  const defaultCategories = ["Fabrics", "Threads", "Buttons", "Zips", "Elastic", "Lining", "Accessories"];

  for (const name of defaultUnits) {
    const { error } = await supabase
      .from('inventory_units')
      .insert(transformKeysToSnake({ businessId, name } as Record<string, unknown>));
    if (error) console.error("Failed to create unit:", name, error);
  }

  for (const name of defaultCategories) {
    const { error } = await supabase
      .from('inventory_categories')
      .insert(transformKeysToSnake({ businessId, name } as Record<string, unknown>));
    if (error) console.error("Failed to create category:", name, error);
  }

  return businessId;
}

export async function initializeUserAccount(input: {
  uid: string;
  email: string;
  displayName?: string;
  phone?: string;
  businessName?: string;
  location?: string;
}): Promise<{ profile: UserProfile; business: Business }> {
  const existingProfile = await fetchUserProfile(input.uid);
  if (existingProfile && existingProfile.businessId) {
    const existingBusiness = await fetchBusinessProfile(existingProfile.businessId);
    if (existingBusiness) {
      return { profile: existingProfile, business: existingBusiness };
    }
  }

  const businessName = input.businessName || (input.displayName ? `${input.displayName}'s Workshop` : "My Workshop");
  const phone = input.phone || "";
  const location = input.location || "";
  const displayName = input.displayName || input.email.split("@")[0];

  // Step 1: Create profile first (business_id is nullable, so this is allowed)
  await supabase
    .from('profiles')
    .upsert(transformKeysToSnake({
      id: input.uid,
      email: input.email,
      displayName,
      role: "owner" as const,
      roles: ["owner"] as UserRole[],
      active: true,
      mustChangePassword: false,
    } as Record<string, unknown>, false), { onConflict: 'id' });

  // Step 2: Create business (references profile via owner_uid)
  const { data: businessData, error: businessError } = await supabase
    .from('businesses')
    .insert(transformKeysToSnake({
      name: businessName,
      phone,
      location,
      currency: "KES",
      country: "Kenya",
      ownerUid: input.uid,
      orderCounter: 0,
      employeeCounter: 0,
    } as Record<string, unknown>))
    .select('id')
    .single();

  if (businessError || !businessData) throw businessError || new Error("Failed to create business");
  const businessId = businessData.id;

  // Step 3: Link profile to the newly created business
  const { error: linkError } = await supabase
    .from('profiles')
    .update(transformKeysToSnake({ businessId } as Record<string, unknown>))
    .eq('id', input.uid);
  if (linkError) throw linkError;

  // Step 4: Create business_member record
  const { error: memberError } = await supabase
    .from('business_members')
    .insert(transformKeysToSnake({
      profileId: input.uid,
      businessId,
      role: "owner" as const,
      roles: ["owner"] as UserRole[],
      active: true,
    } as Record<string, unknown>));
  if (memberError) throw memberError;

  const defaultUnits = ["Pieces", "Meters", "Cones", "Kilograms", "Liters"];
  const defaultCategories = ["Fabrics", "Threads", "Buttons", "Zips", "Elastic", "Lining", "Accessories"];

  for (const name of defaultUnits) {
    const { error } = await supabase
      .from('inventory_units')
      .insert(transformKeysToSnake({ businessId, name } as Record<string, unknown>));
    if (error) console.error("Failed to create unit:", name, error);
  }

  for (const name of defaultCategories) {
    const { error } = await supabase
      .from('inventory_categories')
      .insert(transformKeysToSnake({ businessId, name } as Record<string, unknown>));
    if (error) console.error("Failed to create category:", name, error);
  }

  const profile = await fetchUserProfile(input.uid);
  const business = await fetchBusinessProfile(businessId);
  if (!profile || !business) throw new Error("Failed to verify created account records");

  return { profile, business };
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle();
  if (!data) return null;
  const camel = transformKeysToCamel<UserProfile & { id: string; photoUrl?: string }>(data as Record<string, unknown>);
  return normalizeProfilePhoto({ ...camel, uid: camel.id });
}

/**
 * All businesses a login can access, with the role they hold in each. Backs the
 * multi-business switcher. Falls back gracefully (empty array) when RLS hides
 * other businesses or the user has no membership rows yet.
 */
export async function fetchUserMemberships(
  uid: string,
): Promise<import("@/types/domain").BusinessMembership[]> {
  const { data: members } = await supabase
    .from('business_members')
    .select('business_id, role, roles, active')
    .eq('profile_id', uid)
    .eq('active', true);
  if (!members?.length) return [];

  const ids = members.map((m) => (m as { business_id: string }).business_id);
  const { data: bizRows } = await supabase
    .from('businesses')
    .select('id, name, business_type')
    .in('id', ids);
  const bizMap = new Map(
    (bizRows ?? []).map((b) => [(b as { id: string }).id, b as { id: string; name: string; business_type?: string }]),
  );

  return members.map((m) => {
    const row = m as { business_id: string; role: UserRole; roles?: UserRole[] };
    const biz = bizMap.get(row.business_id);
    return {
      businessId: row.business_id,
      businessName: biz?.name ?? 'My Business',
      businessType: biz?.business_type as import("@/lib/business-types").BusinessType | undefined,
      role: row.role,
      roles: row.roles?.length ? row.roles : row.role ? [row.role] : [],
    };
  });
}

export async function fetchUserProfileByEmail(email: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (!data) return null;
  const camel = transformKeysToCamel<UserProfile & { id: string; photoUrl?: string }>(data as Record<string, unknown>);
  return normalizeProfilePhoto({ ...camel, uid: camel.id });
}

export async function fetchBusinessProfile(businessId: string): Promise<Business | null> {
  const { data } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .maybeSingle();
  if (!data) return null;
  return transformKeysToCamel<Business>(data as Record<string, unknown>);
}

export async function updateBusinessProfile(
  businessId: string,
  data: Partial<
    Pick<
      Business,
      | "name"
      | "email"
      | "phone"
      | "address"
      | "location"
      | "smsSenderId"
      | "logoUrl"
      | "receiptFooter"
      | "taxEnabled"
      | "taxRate"
      | "taxMode"
      | "taxLabel"
      | "deliveryConfig"
    >
  >,
) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('businesses')
        .update(transformKeysToSnake(data as Record<string, unknown>))
        .eq('id', businessId);
      if (error) throw error;
    },
    () => offlineUpdate(businessId, 'businesses', businessId, data as Record<string, unknown>)
  );
}

/**
 * Switch an existing business to a different industry preset. Updates the
 * `business_type` column and seeds that industry's default inventory taxonomy
 * (idempotent). Existing materials/units/categories are never removed — only
 * the new presets are added — so the change is fully non-destructive.
 */
export async function updateBusinessType(
  businessId: string,
  businessType: import("@/lib/business-types").BusinessType,
) {
  const { error } = await supabase
    .from('businesses')
    .update({ business_type: businessType })
    .eq('id', businessId);
  if (error) throw error;
}

// â”€â”€â”€ BRANCHES â”€â”€â”€

/** All branches for a business, default first. Empty array if not yet migrated. */
export async function fetchBranches(
  businessId: string,
): Promise<import("@/types/domain").Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('business_id', businessId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return transformArrayToCamel<import("@/types/domain").Branch>(data as Record<string, unknown>[]);
}

export async function createBranch(
  businessId: string,
  input: { name: string; location?: string },
): Promise<import("@/types/domain").Branch> {
  const { data, error } = await supabase
    .from('branches')
    .insert(transformKeysToSnake({ businessId, name: input.name, location: input.location ?? null } as Record<string, unknown>))
    .select('*')
    .single();
  if (error || !data) throw error || new Error("Failed to create branch");
  return transformKeysToCamel<import("@/types/domain").Branch>(data as Record<string, unknown>);
}

export async function renameBranch(branchId: string, name: string, location?: string) {
  const { error } = await supabase
    .from('branches')
    .update(transformKeysToSnake({ name, location: location ?? null } as Record<string, unknown>))
    .eq('id', branchId);
  if (error) throw error;
}

/** Upsert default categories/units for a business (idempotent, never deletes). */
export async function seedInventoryTaxonomy(
  businessId: string,
  categories: string[],
  units: string[],
) {
  await Promise.allSettled([
    ...units.map((name) =>
      supabase
        .from('inventory_units')
        .upsert(transformKeysToSnake({ businessId, name } as Record<string, unknown>), {
          onConflict: 'business_id,name',
        })
    ),
    ...categories.map((name) =>
      supabase
        .from('inventory_categories')
        .upsert(transformKeysToSnake({ businessId, name } as Record<string, unknown>), {
          onConflict: 'business_id,name',
        })
    ),
  ]);
}

export async function updateFinanceAccess(businessId: string, settings: import("@/types/domain").FinanceAccessSettings) {
  const { error } = await supabase
    .from('businesses')
    .update({ finance_access: settings })
    .eq('id', businessId);
  if (error) throw error;
}

// â”€â”€â”€ CUSTOMERS â”€â”€â”€

export interface CreateCustomerInput {
  businessId?: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: 'male' | 'female';
  preferences?: string;
  notes?: string;
  measurements?: Record<string, unknown>;
  /** 'individual' (default) or 'group' (organization billing account). */
  customerType?: CustomerType;
  /** For members: the group account they belong to. Billing is inherited from it. */
  parentCustomerId?: string;
  organizationName?: string;
  contactPerson?: string;
  contactRole?: string;
  taxId?: string;
  paymentTerms?: string;
  address?: string;
  department?: string;
}

export async function createCustomer(
  businessId: string,
  payload: Omit<Customer, "id" | "createdAt" | "updatedAt" | "outstandingBalance" | "lastOrderAt">
) {
  const { measurements, ...customerData } = payload as typeof payload & { measurements?: Record<string, unknown> };
  const isMember = Boolean(customerData.parentCustomerId);
  const isGroup = customerData.customerType === "group";

  // Group accounts display their organization name; members keep their own
  // full name. The DB name column stays `full_name` for backwards compat.
  const fullName = isGroup
    ? customerData.organizationName || customerData.fullName
    : customerData.fullName;

  // ── Offline path ─────────────────────────────────────────────────────────
  const createOffline = async () => {
    // Duplicate-phone guard against the local cache (best effort offline) —
    // skipped for members, who may share a phone within the organization.
    if (!isMember) {
      const cached = await getCachedCollection<Customer>('customers', businessId).catch(() => [] as Customer[]);
      if (cached.some((c) => c.phone === customerData.phone)) {
        throw new Error("A customer with this phone number already exists.");
      }
    }
    const customerId = await offlineCreate(businessId, 'customers', {
      ...customerData,
      fullName,
      outstandingBalance: 0,
    } as unknown as Record<string, unknown>);
    // measurements live in their own table — queue separately so the replay
    // doesn't try to write a non-existent column on `customers`
    if (measurements && Object.values(measurements).some((v) => v !== null && v !== undefined)) {
      await enqueueSyncOperation(
        businessId,
        'customer_measurements',
        'create',
        { customerId, values: measurements },
        generateId(),
        'normal'
      ).catch(() => {});
      await patchCachedRecord('customers', customerId, { measurements }).catch(() => {});
    }
    return customerId;
  };
  if (isOffline()) return createOffline();

  if (!isMember) {
    const { data: phoneExisting } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', businessId)
      .eq('phone', customerData.phone)
      .maybeSingle();
    if (phoneExisting) {
      throw new Error("A customer with this phone number already exists.");
    }

    if (customerData.email) {
      const { data: emailExisting } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', businessId)
        .eq('email', customerData.email)
        .maybeSingle();
      if (emailExisting) {
        throw new Error("A customer with this email already exists.");
      }
    }
  }

  const { data: insertData, error } = await supabase
    .from('customers')
    .insert(transformKeysToSnake({
      ...customerData,
      fullName,
      outstandingBalance: 0,
      ...branchFields('customers'),
    } as Record<string, unknown>))
    .select('id')
    .single();

  if (error || !insertData) throw error || new Error("Failed to create customer");

  if (measurements && Object.values(measurements).some((v) => v !== null && v !== undefined)) {
    await supabase
      .from('customer_measurements')
      .insert(transformKeysToSnake({ customerId: insertData.id, values: measurements } as Record<string, unknown>));
  }

  // Members inherit billing from the parent account — they don't get their
  // own customer-portal login. Only standalone individuals and group accounts
  // (whose contact person manages invoices) are provisioned.
  if (!isMember) {
    try {
      const provision = await provisionPortalAccount(businessId, insertData.id);
      if ("error" in provision && provision.error) {
        console.warn("[customer-portal] Provisioning failed:", provision.error);
      }
    } catch (error) {
      console.warn("[customer-portal] Provisioning error:", error);
    }
  }

  return insertData.id;
}

/**
 * Create a member under a group customer. The member is an ordinary customer
 * row (own measurements, gender, notes, history) linked to the group via
 * `parentCustomerId` — billing, invoices and balances stay on the group.
 */
export async function createGroupMember(
  businessId: string,
  parentCustomerId: string,
  payload: Omit<Customer, "id" | "createdAt" | "updatedAt" | "outstandingBalance" | "lastOrderAt" | "parentCustomerId" | "customerType">
) {
  const { data: parent } = await supabase
    .from('customers')
    .select('id, customer_type')
    .eq('id', parentCustomerId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (!parent) throw new Error("Group customer not found");
  if (parent.customer_type !== "group") {
    throw new Error("Members can only be added under a Group customer.");
  }
  return createCustomer(businessId, {
    ...payload,
    customerType: "individual",
    parentCustomerId,
  } as unknown as Omit<Customer, "id" | "createdAt" | "updatedAt" | "outstandingBalance" | "lastOrderAt">);
}

/** All members under a group customer. */
export function listenGroupMembers(
  businessId: string,
  parentCustomerId: string,
  callback: (rows: Customer[]) => void
): () => void {
  let destroyed = false;
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) {
      const cached = await getCachedCollection<Customer>('customers', businessId).catch(() => [] as Customer[]);
      if (!destroyed) callback(cached.filter((c) => c.parentCustomerId === parentCustomerId));
      return;
    }
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('parent_customer_id', parentCustomerId)
      .order('created_at', { ascending: false });
    if (!destroyed && data) {
      callback(transformArrayToCamel<Customer>(data as Record<string, unknown>[]));
    } else if (!destroyed && error) {
      const cached = await getCachedCollection<Customer>('customers', businessId).catch(() => [] as Customer[]);
      if (!destroyed) callback(cached.filter((c) => c.parentCustomerId === parentCustomerId));
    }
  };
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['customers'], fetchAndCallback);
  const channel = supabase
    .channel(`group-members-${parentCustomerId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `parent_customer_id=eq.${parentCustomerId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

export function listenCustomers(businessId: string, callback: (rows: Customer[]) => void) {
  return listenToTable<Customer>('customers', businessId, callback, { orderBy: 'created_at', orderDir: 'desc' });
}

export function listenCustomer(businessId: string, customerId: string, callback: (row: Customer | null) => void) {
  let destroyed = false;
  const serveCache = async () => {
    const cached = await getCachedById<Customer>('customers', businessId, customerId);
    if (!destroyed && cached) callback({ ...cached, measurements: cached.measurements ?? {} } as Customer);
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) {
      await serveCache();
      return;
    }
    const { data, error } = await supabase
      .from('customers')
      .select('*, customer_measurements(*)')
      .eq('id', customerId)
      .maybeSingle();
    if (destroyed) return;
    if (error) {
      await serveCache();
      return;
    }
    if (!data) {
      callback(null);
      return;
    }
    const { customer_measurements: measurementRows, ...customerRow } =
      data as Record<string, unknown> & { customer_measurements?: Record<string, unknown>[] };
    const customer = transformKeysToCamel<Customer>(customerRow as Record<string, unknown>);
    if (measurementRows && measurementRows.length > 0) {
      const latest = [...measurementRows].sort((a, b) =>
        String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
      )[0];
      // Read from the JSONB `values` column (single source of truth for unlimited measurements)
      const rawValues = (latest.values as Record<string, unknown>) ?? {};
      const camelValues: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rawValues)) {
        camelValues[snakeToCamel(k)] = v;
      }
      customer.measurements = camelValues as MeasurementSet;
    } else {
      customer.measurements = {};
    }
    callback(customer);
  };
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['customers'], fetchAndCallback);
  const channel = supabase
    .channel(`customer-${customerId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `id=eq.${customerId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

// --- CUSTOMER UPDATE / AUDIT LOG -------------------------------------------

function computeDiff(oldData: Partial<Customer>, newData: Partial<Customer>): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
  const fields: (keyof Customer)[] = [
    "fullName", "phone", "email", "gender", "preferences", "notes",
    "customerType", "parentCustomerId", "organizationName", "contactPerson",
    "contactRole", "taxId", "paymentTerms", "address", "department",
  ];
  for (const key of fields) {
    const oldVal = oldData[key];
    const newVal = newData[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, oldValue: oldVal, newValue: newVal });
    }
  }
  const oldMeas = oldData.measurements ?? {};
  const newMeas = newData.measurements ?? {};
  const allMeasKeys = [...new Set([...Object.keys(oldMeas), ...Object.keys(newMeas)])];
  for (const key of allMeasKeys) {
    const oldVal = oldMeas[key];
    const newVal = newMeas[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: `measurements.${key}`, oldValue: oldVal ?? null, newValue: newVal ?? null });
    }
  }
  return changes;
}

export async function updateCustomer(
  businessId: string,
  customerId: string,
  payload: Partial<Omit<Customer, "id" | "businessId" | "createdAt" | "updatedAt" | "outstandingBalance" | "lastOrderAt">>,
  user: { uid: string; displayName: string }
) {
  const { measurements, ...customerFields } = payload as typeof payload & { measurements?: Record<string, unknown> };

  if (isOffline()) {
    await enqueueSyncOperation(businessId, 'customers', 'update', customerFields, customerId, 'normal');
    if (measurements && Object.keys(measurements).length > 0) {
      await enqueueSyncOperation(businessId, 'customer_measurements', 'create', { customerId, values: measurements }, generateId(), 'normal');
    }
    const updated: Partial<Customer> = { ...customerFields };
    if (measurements) updated.measurements = measurements;
    await patchCachedRecord('customers', customerId, updated).catch(() => {});
    return;
  }

  const { data: currentData } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .maybeSingle();

  if (!currentData) throw new Error("Customer not found");

  const current = transformKeysToCamel<Customer>(currentData as Record<string, unknown>);

  // Group members may share phone/email within the organization — only guard
  // uniqueness for standalone customers and group billing accounts.
  const isMember = Boolean(current.parentCustomerId || customerFields.parentCustomerId);

  if (customerFields.phone && customerFields.phone !== current.phone && !isMember) {
    const { data: phoneExisting } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', businessId)
      .eq('phone', customerFields.phone)
      .maybeSingle();
    if (phoneExisting) throw new Error("A customer with this phone number already exists.");
  }

  if (customerFields.email && customerFields.email !== current.email && !isMember) {
    const { data: emailExisting } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', businessId)
      .eq('email', customerFields.email)
      .maybeSingle();
    if (emailExisting) throw new Error("A customer with this email already exists.");
  }

  const { error: updateError } = await supabase
    .from('customers')
    .update(transformKeysToSnake({ ...customerFields, updatedAt: new Date().toISOString() } as Record<string, unknown>))
    .eq('id', customerId);

  if (updateError) throw updateError;

  if (measurements && Object.keys(measurements).length > 0) {
    const { error: measError } = await supabase
      .from('customer_measurements')
      .insert(transformKeysToSnake({ customerId, values: measurements } as Record<string, unknown>));
    if (measError) throw measError;
  }

  const mergedNew = { ...current, ...customerFields, ...(measurements ? { measurements } : {}) };
  const changes = computeDiff(current, mergedNew);

  if (changes.length > 0) {
    await supabase
      .from('customer_changes')
      .insert({
        customer_id: customerId,
        business_id: businessId,
        changed_by_uid: user.uid,
        changed_by_name: user.displayName,
        changes: changes as unknown as string,
      });
  }
}

export function listenCustomerChanges(
  businessId: string,
  customerId: string,
  callback: (rows: CustomerChangeEntry[]) => void
): () => void {
  let destroyed = false;

  const fetchAndCallback = async () => {
    if (destroyed) return;
    const { data, error } = await supabase
      .from('customer_changes')
      .select('*')
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!destroyed && data) {
      callback(transformArrayToCamel<CustomerChangeEntry>(data as Record<string, unknown>[]));
    }
  };
  fetchAndCallback();

  const channel = supabase
    .channel(`customer-changes-${customerId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'customer_changes', filter: `customer_id=eq.${customerId}` }, fetchAndCallback)
    .subscribe();

  return () => { destroyed = true; supabase.removeChannel(channel); };
}

// --- MEMBERS -----------------------------------------------------------------

function normalizeProfilePhoto<T extends { photoURL?: string }>(profile: T & { photoUrl?: string }): T {
  if (!profile.photoURL && profile.photoUrl) {
    (profile as Record<string, unknown>).photoURL = profile.photoUrl;
  }
  return profile;
}

function profileRowsToMembers(rows: Record<string, unknown>[]): UserProfile[] {
  return rows.map(row => {
    const camel = transformKeysToCamel<UserProfile & { id: string; photoUrl?: string }>(row);
    return normalizeProfilePhoto({ ...camel, uid: camel.id });
  });
}

// Fetch roles from business_members and overlay onto profiles rows.
// The RLS on `profiles` blocks owners from updating other users' rows, so
// role/roles changes are only reliably persisted in business_members.
async function fetchProfilesWithRoles(businessId: string) {
  const [{ data: profilesData, error }, { data: membersData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('business_id', businessId),
    supabase.from('business_members').select('profile_id, role, roles').eq('business_id', businessId),
  ]);
  if (!profilesData) return { data: null, error };
  const rolesMap = new Map(
    (membersData ?? []).map((m) => [m.profile_id as string, { role: m.role, roles: m.roles }])
  );
  const merged = profilesData.map((p) => {
    const r = p as Record<string, unknown>;
    const overrides = rolesMap.get(r.id as string);
    return overrides ? { ...r, ...overrides } : r;
  });
  return { data: merged as Record<string, unknown>[], error: null };
}

export async function fetchMembers(businessId: string): Promise<UserProfile[]> {
  const { data } = await fetchProfilesWithRoles(businessId);
  return profileRowsToMembers(data || []);
}

export function listenMembers(businessId: string, callback: (rows: UserProfile[]) => void): () => void {
  let destroyed = false;
  const fetchAndCallback = async () => {
    if (destroyed) return;

    // ── Offline path ───────────────────────────────────────────────────────
    if (isOffline()) {
      const cached = await getCachedCollection<UserProfile>('members', businessId).catch(() => []);
      if (!destroyed && cached.length > 0) callback(cached);
      return;
    }

    const { data, error } = await fetchProfilesWithRoles(businessId);
    if (data && !destroyed) {
      const members = profileRowsToMembers(data);
      callback(members);
      // Cache with uid-as-id so Dexie can index by docId
      cacheCollection(
        'members',
        businessId,
        members.map((m) => ({ ...m, id: m.uid })) as unknown as Array<Record<string, unknown>>
      ).catch(() => {});
    } else if (!destroyed && error) {
      const cached = await getCachedCollection<UserProfile>('members', businessId).catch(() => []);
      if (cached.length > 0) callback(cached);
    }
  };
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const uuid = crypto.randomUUID();
  // Subscribe to both tables: profiles for identity changes, business_members for role changes
  const profilesChannel = supabase
    .channel(`profiles-members-${businessId}-${uuid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  const bMembersChannel = supabase
    .channel(`bm-roles-${businessId}-${uuid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'business_members', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => {
    destroyed = true;
    offReconnect();
    supabase.removeChannel(profilesChannel);
    supabase.removeChannel(bMembersChannel);
  };
}

export async function deactivateMember(businessId: string, memberUid: string, active: boolean) {
  const payload = transformKeysToSnake({ active, lastActiveAt: new Date().toISOString() } as Record<string, unknown>);
  await supabase.from('business_members').update(payload).eq('business_id', businessId).eq('profile_id', memberUid);
  await supabase.from('profiles').update(payload).eq('id', memberUid);
}

export async function removeMemberFromBusiness(businessId: string, memberUid: string) {
  await supabase.from('business_members').delete().eq('business_id', businessId).eq('profile_id', memberUid);
  const payload = transformKeysToSnake({ active: false, lastActiveAt: new Date().toISOString() } as Record<string, unknown>);
  await supabase.from('profiles').update(payload).eq('id', memberUid);
}

export async function updateMemberRoles(businessId: string, memberUid: string, roles: UserRole[]) {
  const cleanRoles = normalizedRoles(roles);
  const payload = transformKeysToSnake({ roles: cleanRoles, role: roleFromRoles(cleanRoles) } as Record<string, unknown>);
  await supabase.from('business_members').update(payload).eq('business_id', businessId).eq('profile_id', memberUid);
  await supabase.from('profiles').update(payload).eq('id', memberUid);
}

export async function updateMemberCompensation(
  businessId: string,
  memberUid: string,
  payload: {
    payRate: number;
    payPeriod: "daily" | "weekly" | "monthly";
    nextPayDate: string;
  }
) {
  const snakePayload = transformKeysToSnake(payload as Record<string, unknown>);
  await supabase.from('business_members').update(snakePayload).eq('business_id', businessId).eq('profile_id', memberUid);
  await supabase.from('profiles').update(snakePayload).eq('id', memberUid);
}

// â”€â”€â”€ INVITATIONS â”€â”€â”€

export async function createInvitationRecord(
  businessId: string,
  payload: Omit<EmployeeInvitation, "id" | "createdAt" | "status" | "expiresAt">
) {
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('employee_invitations')
    .insert(transformKeysToSnake({
      ...payload,
      businessId,
      status: "pending",
      expiresAt,
    } as Record<string, unknown>))
    .select('id')
    .single();
  if (error || !data) throw error || new Error("Failed to create invitation");
  return data.id;
}

export async function upsertInvitedMember(input: {
  businessId: string;
  uid: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  invitedByUid: string;
  invitedByName: string;
  payRate?: number;
  payPeriod?: "daily" | "weekly" | "monthly";
  nextPayDate?: string;
}) {
  const roles = normalizedRoles(input.roles);
  const employeeNumber = await getNextEmployeeNumber(input.businessId);

  const profileSnake = transformKeysToSnake({
    email: input.email,
    displayName: input.displayName,
    employeeNumber,
    roles,
    role: roleFromRoles(roles),
    businessId: input.businessId,
    active: false,
    invitedByUid: input.invitedByUid,
    invitedByName: input.invitedByName,
    payRate: input.payRate ?? 0,
    payPeriod: input.payPeriod ?? "monthly",
    nextPayDate: input.nextPayDate ?? "",
  } as unknown as Record<string, unknown>, false);

  const memberSnake = transformKeysToSnake({
    profileId: input.uid,
    businessId: input.businessId,
    employeeNumber,
    roles,
    role: roleFromRoles(roles),
    active: false,
    invitedByUid: input.invitedByUid,
    invitedByName: input.invitedByName,
    payRate: input.payRate ?? 0,
    payPeriod: input.payPeriod ?? "monthly",
    nextPayDate: input.nextPayDate ?? "",
  } as unknown as Record<string, unknown>, false);

  await supabase.from('profiles').upsert({ ...profileSnake, id: input.uid } as any, { onConflict: 'id' });
  await supabase.from('business_members').upsert(memberSnake as any, { onConflict: 'profile_id,business_id' });
}

export function listenInvitations(businessId: string, callback: (rows: EmployeeInvitation[]) => void) {
  let destroyed = false;
  const serveCache = async () => {
    const cached = await getCachedCollection<EmployeeInvitation>('invitations', businessId).catch(() => []);
    if (!destroyed && cached.length > 0) callback(cached);
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) {
      await serveCache();
      return;
    }
    const { data, error } = await supabase
      .from('employee_invitations')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (destroyed) return;
    if (!data) {
      if (error) await serveCache();
      return;
    }

    const now = Date.now();
    const invitations = transformArrayToCamel<EmployeeInvitation>(data as Record<string, unknown>[]);
    const expiredPending = invitations.filter((invite) => {
      const expiresAt = toDate(invite.expiresAt as unknown as string);
      return invite.status === "pending" && expiresAt && expiresAt.getTime() <= now;
    });

    await Promise.all(
      expiredPending.map((invite) =>
        supabase.from('employee_invitations').delete().eq('id', invite.id)
      )
    );

    const active = invitations.filter((invite) => {
      const expiresAt = toDate(invite.expiresAt as unknown as string);
      return invite.status !== "pending" || !expiresAt || expiresAt.getTime() > now;
    });
    callback(active);
    cacheCollection('invitations', businessId, active as unknown as Array<Record<string, unknown>>).catch(() => {});
  };
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const channel = supabase
    .channel(`invitations-${businessId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_invitations', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); supabase.removeChannel(channel); };
}

export async function deleteInvitation(businessId: string, invitationId: string) {
  await supabase.from('employee_invitations').delete().eq('id', invitationId).eq('business_id', businessId);
}

export async function acceptInvitationByToken(token: string, uid: string) {
  const { data: invites } = await supabase
    .from('employee_invitations')
    .select('*')
    .eq('token', token);
  if (!invites || invites.length === 0) return null;

  const inviteData = invites[0];
  const invite = transformKeysToCamel<EmployeeInvitation>(inviteData as Record<string, unknown>);
  const businessId = invite.businessId;
  const expiresAt = toDate(invite.expiresAt as unknown as string);

  if (invite.status !== "pending" || invite.invitedUid !== uid || (expiresAt && expiresAt.getTime() <= Date.now())) {
    throw new Error("This invitation has expired or is no longer valid.");
  }

  await supabase.from('employee_invitations').update({ status: 'accepted', accepted_at: new Date().toISOString() } as any).eq('id', invite.id);
  await supabase.from('profiles').update({ active: true } as any).eq('id', uid);
  await supabase.from('business_members').update({ active: true } as any).eq('profile_id', uid).eq('business_id', businessId);
  return businessId;
}

// â”€â”€â”€ DYNAMIC UNITS & CATEGORIES â”€â”€â”€

export async function createUnit(businessId: string, name: string): Promise<string> {
  return withOfflineFallback(
    async () => {
      const { data, error } = await supabase
        .from('inventory_units')
        .insert(transformKeysToSnake({ businessId, name } as Record<string, unknown>))
        .select('id')
        .single();
      if (error || !data) throw error || new Error("Failed to create unit");
      return data.id as string;
    },
    () => offlineCreate(businessId, 'inventory_units', { businessId, name })
  );
}

export async function createCategory(businessId: string, name: string): Promise<string> {
  return withOfflineFallback(
    async () => {
      const { data, error } = await supabase
        .from('inventory_categories')
        .insert(transformKeysToSnake({ businessId, name } as Record<string, unknown>))
        .select('id')
        .single();
      if (error || !data) throw error || new Error("Failed to create category");
      return data.id as string;
    },
    () => offlineCreate(businessId, 'inventory_categories', { businessId, name })
  );
}

export function listenUnits(businessId: string, callback: (rows: DbUnit[]) => void) {
  return listenToTable<DbUnit>('inventory_units', businessId, callback, { orderBy: 'name', orderDir: 'asc' });
}

export function listenCategories(businessId: string, callback: (rows: DbCategory[]) => void) {
  return listenToTable<DbCategory>('inventory_categories', businessId, callback, { orderBy: 'name', orderDir: 'asc' });
}

export async function fetchUnits(businessId: string): Promise<DbUnit[]> {
  if (isOffline()) {
    return getCachedCollection<DbUnit>('inventory_units', businessId).catch(() => []);
  }
  const { data } = await supabase
    .from('inventory_units')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true });
  if (!data) return getCachedCollection<DbUnit>('inventory_units', businessId).catch(() => []);
  return transformArrayToCamel<DbUnit>(data as Record<string, unknown>[]);
}

export async function fetchCategories(businessId: string): Promise<DbCategory[]> {
  if (isOffline()) {
    return getCachedCollection<DbCategory>('inventory_categories', businessId).catch(() => []);
  }
  const { data } = await supabase
    .from('inventory_categories')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true });
  if (!data) return getCachedCollection<DbCategory>('inventory_categories', businessId).catch(() => []);
  return transformArrayToCamel<DbCategory>(data as Record<string, unknown>[]);
}

export async function updateCategory(businessId: string, categoryId: string, name: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase.from('inventory_categories').update({ name }).eq('id', categoryId).eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineUpdate(businessId, 'inventory_categories', categoryId, { name })
  );
}

export async function deleteCategory(businessId: string, categoryId: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase.from('inventory_categories').delete().eq('id', categoryId).eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineDelete(businessId, 'inventory_categories', categoryId)
  );
}

// â”€â”€â”€ COUNTER HELPERS â”€â”€â”€

export async function getNextOrderNumber(businessId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_next_order_number', { biz_id: businessId });
  if (error) throw error;
  return data as string;
}

export async function getNextEmployeeNumber(businessId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_next_employee_number', { biz_id: businessId });
  if (error) throw error;
  return data as string;
}

// â”€â”€â”€ ORDERS â”€â”€â”€

export interface OrderMemberInput {
  memberCustomerId: string;
  memberName: string;
  gender?: string;
  department?: string;
  measurements?: Record<string, unknown>;
  notes?: string;
  garments?: Array<{ name: string; quantity: number; agreedPrice: number; styleNotes?: string }>;
}

/**
 * One unified line item on an order. itemType decides the workflow the item
 * follows; inventoryItemId points at the shared inventory record (the single
 * source of truth) when the item comes from stock.
 */
export interface OrderItemInput {
  itemType: OrderItemType;
  inventoryItemId?: string;
  inventoryItemName?: string;
  sku?: string;
  categoryName?: string;
  size?: string;
  color?: string;
  brand?: string;
  quantity: number;
  unit?: string;
  /** Actual selling price charged at the time of the transaction. */
  unitPrice: number;
  /** Cost price snapshot at the time of the transaction. */
  costPrice?: number;
  discount?: number;
  totalAmount?: number;
  measurements?: Record<string, unknown>;
  styleNotes?: string;
  assignedTailorId?: string;
  assignedTailorName?: string;
  status?: string;
  readyDate?: string;
  notes?: string;
}

export const ORDER_ITEM_TYPES: OrderItemType[] = [
  "tailored",
  "ready_made",
  "alteration",
  "material",
  "service",
];

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  tailoring: "Tailoring Order",
  ready_made_sale: "Ready-made Sale",
  ready_made_alteration: "Ready-made + Alteration",
  material_sale: "Material Sale",
  mixed: "Mixed Order",
};

/** Default production stage a new line item starts at, per item type. */
export function defaultOrderItemStage(itemType: OrderItemType): ProductionStage {
  switch (itemType) {
    case "tailored":
    case "alteration":
      return "cutting";
    case "ready_made":
    case "material":
    case "service":
      return "ready_for_pickup";
    default:
      return "cutting";
  }
}

/** Infer the order-level type from its line items. */
export function deriveOrderType(items: OrderItemInput[]): OrderType {
  if (items.length === 0) return "tailoring";
  const types = new Set(items.map((i) => i.itemType));
  if (types.size > 1) return "mixed";
  switch (items[0].itemType) {
    case "tailored":
      return "tailoring";
    case "ready_made":
      return "ready_made_sale";
    case "alteration":
      return "ready_made_alteration";
    case "material":
      return "material_sale";
    case "service":
      return "tailoring";
    default:
      return "tailoring";
  }
}

// ─── PRODUCTION STAGES (customizable workflow) ────────────────────────────────

/**
 * The six seeded defaults — mirror the legacy `production_stage` enum 1:1 so
 * existing orders and the compatibility stage stay intact for every business.
 */
export const DEFAULT_PRODUCTION_STAGE_TEMPLATE: Array<{
  name: string;
  description: string;
  color: string;
  notifyCustomer: boolean;
  milestone: StageMilestone;
}> = [
  { name: "Cutting", description: "Garment has been cut from fabric", color: "bg-sky-500", notifyCustomer: false, milestone: "none" },
  { name: "Stitching", description: "Garment is being stitched or sewn", color: "bg-blue-500", notifyCustomer: false, milestone: "none" },
  { name: "Fitting", description: "Garment is being fitted on the customer", color: "bg-indigo-500", notifyCustomer: false, milestone: "none" },
  { name: "Finishing", description: "Final touches and finishing work", color: "bg-violet-500", notifyCustomer: false, milestone: "none" },
  { name: "Ready for Pickup", description: "Order is complete and awaiting collection", color: "bg-emerald-500", notifyCustomer: true, milestone: "ready_for_pickup" },
  { name: "Delivered", description: "Order has been delivered to the customer", color: "bg-green-600", notifyCustomer: true, milestone: "delivered" },
];

const LEGACY_STAGE_BY_NAME: Record<string, ProductionStage> = {
  cutting: "cutting",
  stitching: "stitching",
  fitting: "fitting",
  finishing: "finishing",
  "ready for pickup": "ready_for_pickup",
  delivered: "delivered",
};

function sortStages(stages: ProductionStageConfig[]): ProductionStageConfig[] {
  return [...stages].sort((a, b) => a.displayOrder - b.displayOrder);
}

function defaultStageRows(businessId: string): Record<string, unknown>[] {
  return DEFAULT_PRODUCTION_STAGE_TEMPLATE.map((t, i) => ({
    business_id: businessId,
    name: t.name,
    description: t.description,
    display_order: i + 1,
    color: t.color,
    is_active: true,
    notify_customer: t.notifyCustomer,
    milestone: t.milestone,
    is_seeded: true,
  }));
}

/** Idempotently create the default pipeline for a business that has none yet. */
async function ensureProductionStagesOnline(businessId: string): Promise<void> {
  if (!businessId) return;
  // Best-effort: seeding is a one-time bootstrap. Users without orders.write
  // (e.g. tailors) can still read an already-seeded pipeline, and the upsert
  // below is intentionally ignored when it's not permitted.
  try {
    const { count, error: countError } = await supabase
      .from('production_stages')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId);
    if (countError || (count ?? 0) > 0) return;
  } catch {
    return;
  }
  try {
    await supabase
      .from('production_stages')
      .upsert(defaultStageRows(businessId), { onConflict: 'business_id,name', ignoreDuplicates: true });
  } catch {
    // ignore — the pipeline may be seeded server-side already
  }
}

async function seedProductionStagesOffline(businessId: string): Promise<ProductionStageConfig[]> {
  const now = new Date().toISOString();
  const stages = DEFAULT_PRODUCTION_STAGE_TEMPLATE.map((t, i) => ({
    id: generateId(),
    businessId,
    name: t.name,
    description: t.description,
    displayOrder: i + 1,
    color: t.color,
    isActive: true,
    notifyCustomer: t.notifyCustomer,
    milestone: t.milestone,
    isSeeded: true,
    createdAt: now,
    updatedAt: now,
  }));
  for (const s of stages) {
    await offlineCreate(businessId, 'production_stages', s as unknown as Record<string, unknown>, 'high');
  }
  return stages;
}

/** Load a business's production pipeline (all stages, ordered). Seeds defaults when none exist. */
export async function getProductionStages(businessId: string): Promise<ProductionStageConfig[]> {
  if (!businessId) return [];
  if (isOffline()) {
    const cached = await getCachedCollection<ProductionStageConfig>('production_stages', businessId).catch(() => []);
    if (cached.length > 0) return sortStages(cached);
    return sortStages(await seedProductionStagesOffline(businessId));
  }
  await ensureProductionStagesOnline(businessId);
  const { data, error } = await supabase
    .from('production_stages')
    .select('*')
    .eq('business_id', businessId)
    .order('display_order', { ascending: true });
  if (error) throw error;
  const rows = transformArrayToCamel<ProductionStageConfig>((data ?? []) as Record<string, unknown>[]);
  cacheCollection('production_stages', businessId, rows as unknown as Array<Record<string, unknown>>).catch(() => {});
  return sortStages(rows);
}

/** Realtime subscription to a business's production pipeline. */
export function listenProductionStages(businessId: string, callback: (stages: ProductionStageConfig[]) => void): () => void {
  let destroyed = false;
  let gotFresh = false;
  const serveCache = async (force = false) => {
    const cached = await getCachedCollection<ProductionStageConfig>('production_stages', businessId).catch(() => []);
    if (!destroyed && (force || !gotFresh) && cached.length > 0) {
      callback(sortStages(cached));
    }
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) {
      await serveCache(true);
      return;
    }
    try {
      const stages = await getProductionStages(businessId);
      if (destroyed) return;
      gotFresh = true;
      callback(stages);
    } catch {
      await serveCache(true);
    }
  };
  serveCache();
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['production_stages'], () => serveCache(true));
  const channel = supabase
    .channel(`production-stages-${businessId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'production_stages', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

export interface ProductionStageInput {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  notifyCustomer: boolean;
  milestone: StageMilestone;
}

/**
 * Replace a business's pipeline with the submitted list. New stages are
 * inserted, existing ones updated, removed ones hard-deleted when no order
 * sits on them and deactivated when one does (offline always deactivates,
 * since the usage check needs the server).
 */
export async function saveProductionStages(businessId: string, stages: ProductionStageInput[]): Promise<void> {
  if (!businessId) return;
  if (stages.length > 20) throw new Error("A business can have at most 20 production stages");

  if (isOffline()) {
    const existing = await getCachedCollection<ProductionStageConfig>('production_stages', businessId).catch(() => []);
    const incomingIds = new Set(stages.map((s) => s.id).filter(Boolean) as string[]);
    for (const [index, s] of stages.entries()) {
      const displayOrder = index + 1;
      if (s.id) {
        await offlineUpdate(businessId, 'production_stages', s.id, {
          id: s.id,
          name: s.name,
          description: s.description ?? null,
          color: s.color ?? null,
          icon: s.icon ?? null,
          isActive: s.isActive,
          notifyCustomer: s.notifyCustomer,
          milestone: s.milestone,
          displayOrder,
        } as Record<string, unknown>, 'normal');
      } else {
        await offlineCreate(businessId, 'production_stages', {
          businessId,
          name: s.name,
          description: s.description ?? null,
          color: s.color ?? null,
          icon: s.icon ?? null,
          isActive: s.isActive,
          notifyCustomer: s.notifyCustomer,
          milestone: s.milestone,
          displayOrder,
        } as Record<string, unknown>, 'normal');
      }
    }
    for (const gone of existing) {
      if (!incomingIds.has(gone.id)) {
        await offlineUpdate(businessId, 'production_stages', gone.id, { id: gone.id, isActive: false } as Record<string, unknown>, 'normal');
      }
    }
    return;
  }

  const { data: existingData, error: fetchError } = await supabase
    .from('production_stages')
    .select('id')
    .eq('business_id', businessId);
  if (fetchError) throw fetchError;
  const existingIds = new Set((existingData ?? []).map((r: Record<string, unknown>) => r.id as string));
  const incomingIds = new Set<string>();

  for (const [index, s] of stages.entries()) {
    const displayOrder = index + 1;
    const row: Record<string, unknown> = {
      name: s.name,
      description: s.description ?? null,
      display_order: displayOrder,
      color: s.color ?? null,
      icon: s.icon ?? null,
      is_active: s.isActive,
      notify_customer: s.notifyCustomer,
      milestone: s.milestone,
    };
    if (s.id && existingIds.has(s.id)) {
      const { error } = await supabase
        .from('production_stages')
        .update(row)
        .eq('id', s.id)
        .eq('business_id', businessId);
      if (error) throw error;
      incomingIds.add(s.id);
    } else if (!s.id) {
      const { data: created } = await supabase
        .from('production_stages')
        .insert({ ...row, business_id: businessId, is_seeded: false })
        .select('id')
        .single();
      if (created) incomingIds.add(created.id as string);
    }
  }

  const removedIds = [...existingIds].filter((id) => !incomingIds.has(id));
  if (removedIds.length > 0) {
    const { data: usedRows } = await supabase
      .from('orders')
      .select('current_stage_id')
      .in('current_stage_id', removedIds)
      .limit(1);
    const used = new Set((usedRows ?? []).map((r: Record<string, unknown>) => r.current_stage_id as string));
    for (const id of removedIds) {
      if (used.has(id)) {
        await supabase
          .from('production_stages')
          .update({ is_active: false })
          .eq('id', id)
          .eq('business_id', businessId);
      } else {
        await supabase
          .from('production_stages')
          .delete()
          .eq('id', id)
          .eq('business_id', businessId);
      }
    }
  }
}

/**
 * Derive the legacy compatibility stage for a custom stage. Milestones
 * override everything; otherwise a known default name is used verbatim, and
 * anything else is bucketed proportionally across the pipeline (cosmetic —
 * only used for legacy grouping/sorting).
 */
export function compatStageFromConfig(target: ProductionStageConfig, index: number, total: number): ProductionStage {
  if (target.milestone === "delivered") return "delivered";
  if (target.milestone === "ready_for_pickup") return "ready_for_pickup";
  const byName = LEGACY_STAGE_BY_NAME[target.name.trim().toLowerCase()];
  if (byName) return byName;
  const buckets: ProductionStage[] = ["cutting", "stitching", "fitting", "finishing"];
  return buckets[Math.min(buckets.length - 1, Math.floor(((index + 1) / Math.max(total, 1)) * buckets.length))];
}

/**
 * Compute the persistence payload for an order that now sits on `stageId`:
 * the custom pointers + maintained compatibility `stage`/`delivery_status`.
 */
export function buildOrderProgress(
  stages: ProductionStageConfig[],
  stageId: string
): { progress: {
  currentStageId: string;
  currentStageName: string;
  completedStageIds: string[];
  stage: ProductionStage;
  deliveryStatus: DeliveryStatus;
}; target: ProductionStageConfig; index: number } | null {
  const ordered = sortStages(stages);
  const index = ordered.findIndex((s) => s.id === stageId);
  if (index < 0) return null;
  const target = ordered[index];
  const completedStageIds = ordered.slice(0, index + 1).map((s) => s.id);
  const stage = compatStageFromConfig(target, index, ordered.length);
  const deliveryStatus: DeliveryStatus = stage === "delivered" ? "picked" : stage === "ready_for_pickup" ? "ready" : "pending";
  return {
    progress: { currentStageId: target.id, currentStageName: target.name, completedStageIds, stage, deliveryStatus },
    target,
    index,
  };
}

/** Persist custom stage progress (+ maintained compat fields) on an order. */
export async function setOrderStageProgress(
  businessId: string,
  orderId: string,
  progress: {
    currentStageId: string;
    currentStageName: string;
    completedStageIds: string[];
    stage: ProductionStage;
    deliveryStatus: DeliveryStatus;
  }
): Promise<void> {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('orders')
        .update({ ...transformKeysToSnake(progress as unknown as Record<string, unknown>), updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineUpdate(businessId, 'orders', orderId, { ...progress, updatedAt: new Date().toISOString() } as unknown as Record<string, unknown>, 'high')
  );
}

/**
 * Find the custom stage a legacy enum value maps onto. Matches the default
 * six by name first, then by milestone, then proportionally by position.
 */
export function resolveLegacyStage(stages: ProductionStageConfig[], legacy: ProductionStage): ProductionStageConfig | null {
  const normalized = legacy.replaceAll("_", " ").toLowerCase();
  const byName = stages.find((s) => s.name.trim().toLowerCase() === normalized);
  if (byName) return byName;
  if (legacy === "delivered") return stages.find((s) => s.milestone === "delivered") ?? null;
  if (legacy === "ready_for_pickup") return stages.find((s) => s.milestone === "ready_for_pickup") ?? null;
  const ordered = sortStages(stages);
  const buckets: ProductionStage[] = ["cutting", "stitching", "fitting", "finishing"];
  const bucketIndex = buckets.indexOf(legacy);
  if (bucketIndex < 0 || ordered.length === 0) return null;
  const idx = Math.max(0, Math.min(ordered.length - 1, Math.round(((bucketIndex + 1) / 4) * (ordered.length - 1))));
  return ordered[idx];
}

/** Map a legacy enum value onto the custom pipeline and persist it. */
export async function applyLegacyStage(businessId: string, orderId: string, legacy: ProductionStage): Promise<void> {
  if (!businessId || !orderId) return;
  const stages = await getProductionStages(businessId);
  const target = resolveLegacyStage(stages, legacy);
  if (!target) return;
  const built = buildOrderProgress(stages, target.id);
  if (!built) return;
  await setOrderStageProgress(businessId, orderId, built.progress);
}

/**
 * Compute the initial custom-stage point for a brand-new order: the first
 * active stage of the business's pipeline (or null when the pipeline can't be
 * resolved, in which case only the legacy fields are written).
 */
export async function buildInitialStagePoint(businessId: string): Promise<{
  currentStageId?: string;
  currentStageName?: string;
  completedStageIds?: string[];
} | null> {
  try {
    const stages = await getProductionStages(businessId);
    const ordered = sortStages(stages);
    const first = ordered.find((s) => s.isActive) ?? ordered[0];
    if (!first) return null;
    return {
      currentStageId: first.id,
      currentStageName: first.name,
      completedStageIds: [first.id],
    };
  } catch {
    return null;
  }
}

/** Map a client OrderItemInput into the snake_case row persisted to order_items. */
function buildOrderItemRow(orderId: string, item: OrderItemInput, sortOrder: number): Record<string, unknown> {
  const quantity = Number(item.quantity) || 1;
  const unitPrice = Number(item.unitPrice) || 0;
  const discount = Number(item.discount) || 0;
  const totalAmount = item.totalAmount != null
    ? Number(item.totalAmount)
    : Math.max(0, unitPrice * quantity - discount);
  return {
    order_id: orderId,
    item_type: item.itemType,
    inventory_item_id: item.inventoryItemId ?? null,
    inventory_item_name: item.inventoryItemName ?? null,
    sku: item.sku ?? null,
    category_name: item.categoryName ?? null,
    size: item.size ?? null,
    color: item.color ?? null,
    brand: item.brand ?? null,
    quantity,
    unit: item.unit ?? "pcs",
    unit_price: unitPrice,
    cost_price: Number(item.costPrice) || 0,
    discount,
    total_amount: totalAmount,
    measurements: item.measurements ?? {},
    style_notes: item.styleNotes ?? null,
    assigned_tailor_id: item.assignedTailorId ?? null,
    assigned_tailor_name: item.assignedTailorName ?? null,
    stage: defaultOrderItemStage(item.itemType),
    delivery_status: defaultOrderItemStage(item.itemType) === "ready_for_pickup" ? "ready" : "pending",
    status: item.status ?? "active",
    ready_date: item.readyDate ?? null,
    notes: item.notes ?? null,
    sort_order: sortOrder,
  };
}

/** OrderItem rows that come out of inventory stock (deduct + movement). */
function inventoryBoundOrderItems(items: OrderItemInput[]): OrderItemInput[] {
  return items.filter(
    (i) =>
      (i.itemType === "ready_made" || i.itemType === "material") &&
      !!i.inventoryItemId
  );
}

/**
 * Deduct stock for ready-made / material sale items and log a stock_out
 * movement. Called immediately after an order is created so the ledger stays
 * in sync with the sale (online path).
 */
async function deductOrderItemStockOnline(
  businessId: string,
  orderId: string,
  orderNumber: string,
  items: OrderItemInput[],
  actor: { uid: string; name: string }
) {
  const saleItems = inventoryBoundOrderItems(items);
  if (saleItems.length === 0) return;
  const now = new Date().toISOString();
  for (const item of saleItems) {
    const { data: materialData } = await supabase
      .from("inventory_materials")
      .select("quantity, unit_name")
      .eq("id", item.inventoryItemId)
      .single();
    const currentQty = Number((materialData as any)?.quantity ?? 0);
    const newQty = Math.max(0, currentQty - Math.abs(Number(item.quantity) || 1));
    await supabase
      .from("inventory_materials")
      .update({ quantity: newQty, updated_at: now })
      .eq("id", item.inventoryItemId);
    await supabase.from("stock_movements").insert(
      transformKeysToSnake({
        businessId,
        ...branchFields("stock_movements"),
        movementType: "stock_out",
        materialId: item.inventoryItemId,
        materialName: item.inventoryItemName ?? "",
        orderId,
        quantityChange: -Math.abs(Number(item.quantity) || 1),
        unit: item.unit ?? (materialData as any)?.unit_name ?? "pcs",
        reason: `Sold in order ${orderNumber}`,
        createdByUid: actor.uid,
        createdByName: actor.name,
      } as unknown as Record<string, unknown>)
    );
  }
}

/**
 * Queue the same stock deduction + movements offline (offline path of
 * createOrder). The sync engine replays them once the connection returns.
 */
async function deductOrderItemStockOffline(
  businessId: string,
  orderId: string,
  orderNumber: string,
  items: OrderItemInput[],
  actor: { uid: string; name: string }
) {
  const saleItems = inventoryBoundOrderItems(items);
  if (saleItems.length === 0) return;
  for (const item of saleItems) {
    const qty = Math.abs(Number(item.quantity) || 1);
    const cachedMat = await getCachedById<InventoryMaterial>(
      "inventory_materials",
      businessId,
      item.inventoryItemId as string
    );
    const newQty = Math.max(0, Number(cachedMat?.quantity ?? 0) - qty);
    await offlineUpdate(businessId, "inventory_materials", item.inventoryItemId as string, {
      quantity: newQty,
    });
    await offlineCreate(businessId, "stock_movements", {
      businessId,
      ...branchFields("stock_movements"),
      movementType: "stock_out",
      materialId: item.inventoryItemId,
      materialName: item.inventoryItemName ?? "",
      orderId,
      quantityChange: -qty,
      unit: item.unit ?? cachedMat?.unitName ?? "pcs",
      reason: `Sold in order ${orderNumber}`,
      createdByUid: actor.uid,
      createdByName: actor.name,
    });
  }
}

export type CreateOrderInput = Omit<
  Order,
  | "id"
  | "orderNumber"
  | "createdAt"
  | "updatedAt"
  | "paymentStatus"
  | "amountPaid"
  | "balanceAmount"
  | "fittingRecords"
  | "materialUsage"
  | "imageIds"
  | "deliveryStatus"
  | "stage"
  | "garments"
  | "items"
  | "members"
> & {
  garments?: Array<{ name: string; quantity: number; agreedPrice: number; styleNotes?: string }>;
  items?: OrderItemInput[];
  members?: OrderMemberInput[];
  isGroupOrder?: boolean;
  fabricSelections?: unknown[];
};

export async function createOrder(
  businessId: string,
  payload: CreateOrderInput,
  depositAmount: number,
  actor: { uid: string; name: string }
) {
  // garments, fabricSelections, members and items live in separate tables —
  // strip them before inserting into orders
  const { garments, fabricSelections, members, items, isGroupOrder, ...orderFields } = payload;
  void fabricSelections;

  const orderItems: OrderItemInput[] = items ?? [];
  const groupMembers: OrderMemberInput[] = members ?? [];
  const inferredOrderType = deriveOrderType(orderItems);

  // ── Offline path ─────────────────────────────────────────────────────────
  // The order is created locally with a provisional number; the sync engine
  // claims a real per-business order number when the create replays online.
  const createOffline = async () => {
    const orderId = generateId();
    const offlineTrackingToken = generateTrackingToken();
    const now = new Date().toISOString();
    const provisionalNumber = `PND-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const deliveryMethod = payload.deliveryMethod ?? "delivery";
    const deliveryFee = deliveryMethod === "pickup" ? 0 : Number(payload.deliveryFee ?? 0);
    const needsProduction = orderItems.some((i) => i.itemType === "tailored" || i.itemType === "alteration");
    const autoDeliver = !needsProduction && DEFAULT_DELIVERY_CONFIG.autoDeliverReadyMade;
    const initialStagePoint = await buildInitialStagePoint(businessId);
    const balance = Math.max(0, payload.subtotalAmount + deliveryFee - depositAmount);

    const deliveryStage: DeliveryStage = autoDeliver
      ? deliveryMethod === "pickup" ? "pickup_ready" : "delivered"
      : "pending";
    const stage: ProductionStage = autoDeliver
      ? deliveryMethod === "pickup" ? "ready_for_pickup" : "delivered"
      : "cutting";
    const deliveryTimeline: DeliveryTimelineEntry[] = autoDeliver
      ? [{
          stage: deliveryStage,
          label: deliveryStage === "delivered" ? "Delivered" : "Ready for pickup",
          at: now,
          by: actor.name,
        }]
      : [];

    const orderRecord = {
      ...orderFields,
      id: orderId,
      businessId,
      orderNumber: provisionalNumber,
      trackingToken: offlineTrackingToken,
      isGroupOrder: groupMembers.length > 0,
      orderType: orderFields.orderType ?? inferredOrderType,
      stage,
      deliveryStatus: stage === "delivered" ? "picked" : stage === "ready_for_pickup" ? "ready" : "pending",
      currentStageId: autoDeliver ? null : initialStagePoint?.currentStageId ?? null,
      currentStageName: autoDeliver ? null : initialStagePoint?.currentStageName ?? null,
      completedStageIds: autoDeliver ? [] : initialStagePoint?.completedStageIds ?? [],
      paymentStatus: depositAmount > 0 ? "partial" : "unpaid",
      amountPaid: depositAmount,
      balanceAmount: balance,
      deliveryMethod,
      deliveryFee,
      deliveryAddress: payload.deliveryAddress ?? null,
      deliveryPartnerId: payload.deliveryPartnerId ?? null,
      deliveryPartnerName: payload.deliveryPartnerName ?? null,
      deliveryStage,
      deliveryNotes: payload.deliveryNotes ?? null,
      deliveryTimeline,
      deliveredAt: deliveryStage === "delivered" ? now : null,
      createdAt: now,
      updatedAt: now,
    } as unknown as Record<string, unknown>;

    await enqueueSyncOperation(
      businessId, 'orders', 'create',
      { ...orderRecord, _needsOrderNumber: true },
      orderId, 'high'
    );
    await cacheLocalRecord('orders', orderId, businessId, {
      ...orderRecord,
      garments: garments ?? [],
      items: orderItems.map((item, index) => ({
        id: generateId(),
        orderId,
        ...item,
        stage: defaultOrderItemStage(item.itemType),
        deliveryStatus: defaultOrderItemStage(item.itemType) === "ready_for_pickup" ? "ready" : "pending",
        totalAmount: item.totalAmount ?? Math.max(0, Number(item.unitPrice || 0) * (Number(item.quantity) || 1) - (Number(item.discount) || 0)),
        sortOrder: index,
      })),
      members: groupMembers.map((m, index) => ({
        id: generateId(),
        memberCustomerId: m.memberCustomerId,
        memberName: m.memberName,
        gender: m.gender,
        department: m.department,
        measurementsSnapshot: m.measurements ?? {},
        stage: "cutting",
        deliveryStatus: "pending",
        notes: m.notes,
        sortOrder: index,
        garments: m.garments ?? [],
      })),
      _localOnly: true,
    }).catch(() => {});

    for (const [index, g] of (garments ?? []).entries()) {
      await enqueueSyncOperation(
        businessId, 'order_garments', 'create',
        {
          orderId,
          name: g.name,
          quantity: g.quantity,
          agreedPrice: g.agreedPrice,
          styleNotes: g.styleNotes ?? "",
          sortOrder: index,
        },
        generateId(), 'high'
      );
    }

    for (const [index, item] of orderItems.entries()) {
      const itemId = generateId();
      await enqueueSyncOperation(
        businessId, 'order_items', 'create',
        buildOrderItemRow(orderId, item, index),
        itemId, 'high'
      );
    }
    await deductOrderItemStockOffline(businessId, orderId, provisionalNumber, orderItems, actor);

    // Group members each get their own order_members + order_member_garments
    // rows so production can be tracked per person even offline.
    for (const [index, m] of groupMembers.entries()) {
      const memberRowId = generateId();
      await enqueueSyncOperation(
        businessId, 'order_members', 'create',
        {
          id: memberRowId,
          orderId,
          memberCustomerId: m.memberCustomerId,
          memberName: m.memberName,
          gender: m.gender ?? null,
          department: m.department ?? null,
          measurementsSnapshot: m.measurements ?? {},
          stage: "cutting",
          deliveryStatus: "pending",
          notes: m.notes ?? null,
          sortOrder: index,
        },
        memberRowId, 'high'
      );
      for (const [gIndex, g] of (m.garments ?? []).entries()) {
        await enqueueSyncOperation(
          businessId, 'order_member_garments', 'create',
          {
            orderMemberId: memberRowId,
            name: g.name,
            quantity: g.quantity,
            agreedPrice: g.agreedPrice,
            styleNotes: g.styleNotes ?? "",
            sortOrder: gIndex,
          },
          generateId(), 'high'
        );
      }
    }

    const cachedCustomer = await getCachedById<Customer>('customers', businessId, payload.customerId);
    await offlineUpdate(businessId, 'customers', payload.customerId, {
      outstandingBalance: Number(cachedCustomer?.outstandingBalance ?? 0) + balance,
      lastOrderAt: now,
    });

    if (depositAmount > 0) {
      const nowDate = new Date();
      await offlineCreate(businessId, 'payments', {
        businessId,
        customerId: payload.customerId,
        customerName: payload.customerName,
        orderId,
        orderNumber: provisionalNumber,
        amount: depositAmount,
        method: "cash",
        description: `${payload.customerName} paid - deposit of ${formatKes(depositAmount)} on ${nowDate.toLocaleDateString()} at ${nowDate.toLocaleTimeString()}`,
        recordedByUid: actor.uid,
        recordedByName: actor.name,
        recordedAt: now,
      }, 'high');
    }

    notifyLocalWrite('orders');
    return { id: orderId, orderNumber: provisionalNumber, trackingToken: offlineTrackingToken };
  };
  if (isOffline()) return createOffline();

  // Claim the order number first; if the network drops before any server
  // write has happened, fall back to the fully-offline path.
  let orderNumber: string;
  try {
    orderNumber = await getNextOrderNumber(businessId);
  } catch (error) {
    if (isOffline() || isNetworkError(error)) return createOffline();
    throw error;
  }
  const trackingToken = generateTrackingToken();
  const initialStagePoint = await buildInitialStagePoint(businessId);

  // ── Delivery policy ─────────────────────────────────────────────────────
  // Default the method/fee from the business config, then auto-complete
  // ready-made, no-alteration orders (they need no production work).
  const deliveryConfig = await getDeliveryConfig(businessId);
  const deliveryMethod = payload.deliveryMethod ?? deliveryConfig?.defaultMethod ?? "delivery";
  const deliveryFee = deliveryMethod === "pickup"
    ? 0
    : Number(payload.deliveryFee ?? deliveryConfig?.defaultDeliveryFee ?? 0);
  const needsProduction = orderItems.some((i) => i.itemType === "tailored" || i.itemType === "alteration");
  const autoDeliver = !needsProduction && (deliveryConfig?.autoDeliverReadyMade ?? true);
  const nowIso = new Date().toISOString();
  const deliveryStage: DeliveryStage = autoDeliver
    ? deliveryMethod === "pickup" ? "pickup_ready" : "delivered"
    : "pending";
  const stage: ProductionStage = autoDeliver
    ? deliveryMethod === "pickup" ? "ready_for_pickup" : "delivered"
    : "cutting";
  const deliveryTimeline: DeliveryTimelineEntry[] = autoDeliver
    ? [{
        stage: deliveryStage,
        label: deliveryStage === "delivered" ? "Delivered" : "Ready for pickup",
        at: nowIso,
        by: actor.name,
      }]
    : [];

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert(transformKeysToSnake({
      ...orderFields,
      businessId,
      ...branchFields('orders'),
      orderNumber,
      trackingToken,
      isGroupOrder: groupMembers.length > 0,
      orderType: orderFields.orderType ?? inferredOrderType,
      stage,
      deliveryStatus: stage === "delivered" ? "picked" : stage === "ready_for_pickup" ? "ready" : "pending",
      currentStageId: autoDeliver ? null : initialStagePoint?.currentStageId ?? null,
      currentStageName: autoDeliver ? null : initialStagePoint?.currentStageName ?? null,
      completedStageIds: autoDeliver ? [] : initialStagePoint?.completedStageIds ?? [],
      paymentStatus: depositAmount > 0 ? "partial" : "unpaid",
      amountPaid: depositAmount,
      balanceAmount: Math.max(0, payload.subtotalAmount + deliveryFee - depositAmount),
      deliveryMethod,
      deliveryFee,
      deliveryAddress: payload.deliveryAddress ?? null,
      deliveryPartnerId: payload.deliveryPartnerId ?? null,
      deliveryPartnerName: payload.deliveryPartnerName ?? null,
      deliveryStage,
      deliveryNotes: payload.deliveryNotes ?? null,
      deliveryTimeline,
      deliveredAt: deliveryStage === "delivered" ? nowIso : null,
    } as unknown as Record<string, unknown>))
    .select('id, order_number')
    .single();

  if (orderError || !orderData) throw orderError || new Error("Failed to create order");
  const orderId = orderData.id;

  if (garments && garments.length > 0) {
    await supabase.from('order_garments').insert(
      garments.map((g, index) => transformKeysToSnake({
        orderId,
        name: g.name,
        quantity: g.quantity,
        agreedPrice: g.agreedPrice,
        styleNotes: g.styleNotes ?? "",
        sortOrder: index,
      } as Record<string, unknown>))
    );
  }

  if (orderItems.length > 0) {
    await supabase.from('order_items').insert(
      orderItems.map((item, index) => buildOrderItemRow(orderId, item, index))
    );
    // Ready-made / material sales leave inventory immediately.
    await deductOrderItemStockOnline(businessId, orderId, orderData.order_number as string, orderItems, actor);
  }

  // Group orders: persist each member line + their garments so production can
  // be tracked per person.
  for (const [index, m] of groupMembers.entries()) {
    const { data: memberRow } = await supabase
      .from('order_members')
      .insert(transformKeysToSnake({
        orderId,
        memberCustomerId: m.memberCustomerId,
        memberName: m.memberName,
        gender: m.gender ?? null,
        department: m.department ?? null,
        measurementsSnapshot: m.measurements ?? {},
        stage: "cutting",
        deliveryStatus: "pending",
        notes: m.notes ?? null,
        sortOrder: index,
      } as Record<string, unknown>))
      .select('id')
      .single();
    if (!memberRow) continue;
    if (m.garments && m.garments.length > 0) {
      await supabase.from('order_member_garments').insert(
        m.garments.map((g, gIndex) => transformKeysToSnake({
          orderMemberId: memberRow.id,
          name: g.name,
          quantity: g.quantity,
          agreedPrice: g.agreedPrice,
          styleNotes: g.styleNotes ?? "",
          sortOrder: gIndex,
        } as Record<string, unknown>))
      );
    }
  }

  const { data: customerData } = await supabase
    .from('customers')
    .select('outstanding_balance, updated_at, last_order_at')
    .eq('id', payload.customerId)
    .single();

  if (customerData) {
    const currentBalance = Number(customerData.outstanding_balance ?? 0);
    const newBalance = currentBalance + Math.max(0, payload.subtotalAmount + deliveryFee - depositAmount);
    await supabase
      .from('customers')
      .update({ outstanding_balance: newBalance, last_order_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', payload.customerId);
  }

  if (depositAmount > 0) {
    const now = new Date();
    const depositDescription = `${payload.customerName} paid - deposit of ${formatKes(depositAmount)} on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
    await supabase
      .from('payments')
      .insert(transformKeysToSnake({
        businessId,
        ...branchFields('payments'),
        customerId: payload.customerId,
        customerName: payload.customerName,
        orderId,
        orderNumber,
        amount: depositAmount,
        method: "cash",
        description: depositDescription,
        recordedByUid: actor.uid,
        recordedByName: actor.name,
      } as unknown as Record<string, unknown>));
  }

  return { id: orderId, orderNumber: orderData.order_number as string, trackingToken };
}

export function listenOrders(businessId: string, callback: (rows: Order[]) => void) {
  let destroyed = false;
  let gotFresh = false;
  const serveCache = async (force = false) => {
    const cached = await getCachedCollection<Order>('orders', businessId).catch(() => []);
    if (!destroyed && (force || !gotFresh) && cached.length > 0) {
      callback([...cached].sort((a, b) => (orderStageSort[a.stage] ?? 9) - (orderStageSort[b.stage] ?? 9)));
    }
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;

    // ── Offline path ───────────────────────────────────────────────────────
    if (isOffline()) {
      await serveCache(true);
      return;
    }

    const runOrdersQuery = () => {
      let ordersQuery = supabase
        .from('orders')
        .select('*, order_garments(name, quantity, agreed_price, sort_order), order_items(id, item_type, inventory_item_id, inventory_item_name, sku, quantity, unit, unit_price, cost_price, discount, total_amount, size, color, brand, assigned_tailor_name, stage, delivery_status, status, sort_order)')
        .eq('business_id', businessId);
      if (isBranchScoped('orders')) {
        ordersQuery = ordersQuery.eq('branch_id', activeBranchId as string);
      }
      return ordersQuery.order('updated_at', { ascending: false });
    };

    const { data, error } = await runOrdersQuery();

    // Fetch the (lightweight) member summary for every order in one extra query
    // so the list can show member counts and per-member progress.
    let memberRowsByOrder = new Map<string, Array<Record<string, unknown>>>();
    if (data && !destroyed) {
      const orderIds = (data as Record<string, unknown>[]).map((row) => row.id as string);
      const { data: memberRows } = await supabase
        .from('order_members')
        .select('order_id, id, member_name, stage, delivery_status, sort_order')
        .in('order_id', orderIds)
        .order('sort_order', { ascending: true });
      memberRowsByOrder = new Map();
      for (const row of (memberRows ?? []) as Record<string, unknown>[]) {
        const orderId = row.order_id as string;
        const list = memberRowsByOrder.get(orderId) ?? [];
        list.push(row);
        memberRowsByOrder.set(orderId, list);
      }
    }
    if (error && isMissingColumnError(error)) {
      branchScopingAvailable = false;
      if (!destroyed) fetchAndCallback();
      return;
    }
    if (data && !destroyed) {
      const rows = (data as Record<string, unknown>[]).map((row) => {
        const garmentRows = (row.order_garments as Record<string, unknown>[] | null) ?? [];
        const itemRows = (row.order_items as Record<string, unknown>[] | null) ?? [];
        const memberRows = memberRowsByOrder.get(row.id as string) ?? [];
        const base = transformKeysToCamel<Order>({ ...row, order_garments: undefined, order_items: undefined } as Record<string, unknown>);
        return {
          ...base,
          garments: garmentRows
            .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
            .map((g) => ({
              name: g.name as string,
              quantity: Number(g.quantity),
              agreedPrice: Number(g.agreed_price),
              styleNotes: g.style_notes as string | undefined,
            })),
          items: itemRows
            .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
            .map((i) => ({
              id: i.id as string,
              orderId: row.id as string,
              itemType: i.item_type as OrderItemType,
              inventoryItemId: i.inventory_item_id as string | undefined,
              inventoryItemName: i.inventory_item_name as string | undefined,
              sku: i.sku as string | undefined,
              size: i.size as string | undefined,
              color: i.color as string | undefined,
              brand: i.brand as string | undefined,
              quantity: Number(i.quantity),
              unit: i.unit as string | undefined,
              unitPrice: Number(i.unit_price),
              costPrice: i.cost_price == null ? undefined : Number(i.cost_price),
              discount: Number(i.discount) || 0,
              totalAmount: Number(i.total_amount),
              assignedTailorName: i.assigned_tailor_name as string | undefined,
              stage: i.stage as ProductionStage | undefined,
              deliveryStatus: i.delivery_status as DeliveryStatus,
              status: i.status as string | undefined,
              sortOrder: Number(i.sort_order) || 0,
            })) as OrderItem[],
          memberCount: memberRows.length,
          members: memberRows
            .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
            .map((m) => ({
              id: m.id as string,
              memberCustomerId: m.member_customer_id as string,
              memberName: m.member_name as string,
              stage: m.stage as ProductionStage,
              deliveryStatus: m.delivery_status as string,
              sortOrder: Number(m.sort_order) || 0,
            })),
        } as Order;
      }).sort((a, b) => orderStageSort[a.stage] - orderStageSort[b.stage]);
      gotFresh = true;
      callback(rows);
      cacheCollection('orders', businessId, rows as unknown as Array<Record<string, unknown>>).catch(() => {});
    } else if (!destroyed && error) {
      await serveCache();
    }
  };
  serveCache();
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['orders'], () => serveCache(true));
  const channel = supabase
    .channel(`orders-list-${businessId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_garments' }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_members' }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

export function listenOrdersAssignedToUser(businessId: string, uid: string, callback: (rows: Order[]) => void) {
  let destroyed = false;
  const serveCache = async () => {
    const cached = await getCachedCollection<Order>('orders', businessId).catch(() => []);
    const mine = cached.filter((o) => o.assignedTailorId === uid);
    if (!destroyed && mine.length > 0) callback(mine);
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) {
      await serveCache();
      return;
    }
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', businessId)
      .eq('assigned_tailor_id', uid)
      .order('updated_at', { ascending: false });
    if (data && !destroyed) {
      callback(transformArrayToCamel<Order>(data as Record<string, unknown>[]));
    } else if (!destroyed && error) {
      await serveCache();
    }
  };
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['orders'], fetchAndCallback);
  const channel = supabase
    .channel(`orders-assigned-${businessId}-${uid}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

async function assembleOrder(orderId: string): Promise<Order | null> {
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  if (!data) return null;

  const [{ data: garments }, { data: materialUsage }, { data: fittingRecords }, { data: directImages }, { data: junctionImageIds }, { data: memberRows }, { data: itemRows }] = await Promise.all([
    supabase.from('order_garments').select('*').eq('order_id', orderId).order('sort_order', { ascending: true }),
    supabase.from('order_material_usage').select('*').eq('order_id', orderId).order('recorded_at', { ascending: true }),
    supabase.from('order_fitting_records').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
    supabase.from('images').select('id,url').eq('order_id', orderId),
    supabase.from('order_images').select('image_id').eq('order_id', orderId),
    supabase.from('order_members').select('*').eq('order_id', orderId).order('sort_order', { ascending: true }),
    supabase.from('order_items').select('*').eq('order_id', orderId).order('sort_order', { ascending: true }),
  ]);

  // Load per-item material usage for every order item in one batched query.
  const orderItems: OrderItem[] = [];
  if (itemRows && itemRows.length > 0) {
    const itemIds = (itemRows as Record<string, unknown>[]).map((r) => r.id as string);
    const { data: itemUsageRows } = await supabase
      .from('order_item_material_usage')
      .select('*')
      .in('order_item_id', itemIds)
      .order('recorded_at', { ascending: true });
    const usageByItem = new Map<string, OrderItemMaterialUsage[]>();
    for (const row of (itemUsageRows ?? []) as Record<string, unknown>[]) {
      const itemId = row.order_item_id as string;
      const list = usageByItem.get(itemId) ?? [];
      list.push({
        id: row.id as string,
        orderItemId: itemId,
        materialId: row.material_id as string | undefined,
        materialName: row.material_name as string,
        quantityUsed: Number(row.quantity_used),
        unit: row.unit as string,
        recordedByUid: row.recorded_by_uid as string | undefined,
        recordedByName: row.recorded_by_name as string | undefined,
        recordedAt: row.recorded_at as string,
      });
      usageByItem.set(itemId, list);
    }
    for (const row of (itemRows as Record<string, unknown>[]).sort(
      (a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)
    )) {
      const itemId = row.id as string;
      orderItems.push({
        id: itemId,
        orderId: row.order_id as string,
        itemType: row.item_type as OrderItemType,
        inventoryItemId: row.inventory_item_id as string | undefined,
        inventoryItemName: row.inventory_item_name as string | undefined,
        sku: row.sku as string | undefined,
        categoryName: row.category_name as string | undefined,
        size: row.size as string | undefined,
        color: row.color as string | undefined,
        brand: row.brand as string | undefined,
        quantity: Number(row.quantity),
        unit: row.unit as string | undefined,
        unitPrice: Number(row.unit_price),
        costPrice: row.cost_price == null ? undefined : Number(row.cost_price),
        discount: Number(row.discount) || 0,
        totalAmount: Number(row.total_amount),
        measurements: (row.measurements as unknown as MeasurementSet) ?? undefined,
        styleNotes: row.style_notes as string | undefined,
        assignedTailorId: row.assigned_tailor_id as string | undefined,
        assignedTailorName: row.assigned_tailor_name as string | undefined,
        stage: row.stage as ProductionStage | undefined,
        deliveryStatus: row.delivery_status as DeliveryStatus,
        status: row.status as string | undefined,
        readyDate: row.ready_date as string | undefined,
        notes: row.notes as string | undefined,
        sortOrder: Number(row.sort_order) || 0,
        materialUsage: usageByItem.get(itemId) ?? [],
        createdAt: row.created_at as string | undefined,
        updatedAt: row.updated_at as string | undefined,
      });
    }
  }

  const members: OrderMember[] = [];
  if (memberRows && memberRows.length > 0) {
    const memberIds = (memberRows as Record<string, unknown>[]).map((r) => r.id as string);
    const { data: memberGarmentRows } = await supabase
      .from('order_member_garments')
      .select('*')
      .in('order_member_id', memberIds)
      .order('sort_order', { ascending: true });
    const garmentsByMember = new Map<string, OrderMemberGarment[]>();
    for (const row of (memberGarmentRows ?? []) as Record<string, unknown>[]) {
      const memberId = row.order_member_id as string;
      const list = garmentsByMember.get(memberId) ?? [];
      list.push({
        id: row.id as string,
        name: row.name as string,
        quantity: Number(row.quantity),
        agreedPrice: Number(row.agreed_price),
        styleNotes: row.style_notes as string | undefined,
        fabricUsed: row.fabric_used == null ? undefined : Number(row.fabric_used),
        notes: row.notes as string | undefined,
        sortOrder: Number(row.sort_order) || 0,
      });
      garmentsByMember.set(memberId, list);
    }
    for (const row of memberRows as Record<string, unknown>[]) {
      const memberId = row.id as string;
      members.push({
        id: memberId,
        orderId: row.order_id as string,
        memberCustomerId: row.member_customer_id as string,
        memberName: row.member_name as string,
        gender: row.gender as string | undefined,
        department: row.department as string | undefined,
        measurementsSnapshot: (row.measurements_snapshot as unknown as MeasurementSet) ?? {},
        stage: row.stage as ProductionStage,
        deliveryStatus: row.delivery_status as DeliveryStatus,
        notes: row.notes as string | undefined,
        sortOrder: Number(row.sort_order) || 0,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        garments: garmentsByMember.get(memberId) ?? [],
      });
    }
  }

  // Collect all unique image IDs from both sources
  const directImageIdSet = new Set((directImages ?? []).map((img: Record<string, unknown>) => img.id as string));
  const extraImageIds = (junctionImageIds ?? [])
    .map((row: Record<string, unknown>) => row.image_id as string)
    .filter((id) => !directImageIdSet.has(id));

  let extraUrls: string[] = [];
  if (extraImageIds.length > 0) {
    const { data: extra } = await supabase.from('images').select('url').in('id', extraImageIds);
    extraUrls = (extra ?? []).map((img: Record<string, unknown>) => img.url as string).filter(Boolean);
  }

  const allImageIds = [...Array.from(directImageIdSet), ...extraImageIds];
  const directUrls = (directImages ?? []).map((img: Record<string, unknown>) => img.url as string).filter(Boolean);
  const imageUrls = [...directUrls, ...extraUrls];

  const base = transformKeysToCamel<Order>(data as Record<string, unknown>);
  return {
    ...base,
    garments: transformArrayToCamel(((garments ?? []) as Record<string, unknown>[])),
    items: orderItems,
    materialUsage: (materialUsage ?? []).map((r: Record<string, unknown>) => ({
      materialId: r.material_id as string,
      materialName: r.material_name as string,
      quantityUsed: Number(r.quantity_used),
      unit: r.unit as string,
      recordedByUid: r.recorded_by_uid as string,
      recordedByName: r.recorded_by_name as string,
      recordedAt: r.recorded_at as string,
    })),
    fittingRecords: (fittingRecords ?? []).map((r: Record<string, unknown>) => ({
      notes: r.notes as string,
      adjustmentSummary: r.adjustment_summary as string | undefined,
      byUid: r.recorded_by_uid as string,
      byName: r.recorded_by_name as string,
      date: r.created_at as string,
    })),
    imageIds: allImageIds,
    imageUrls,
    members,
  } as Order & { imageUrls: string[] };
}

export function listenOrder(businessId: string, orderId: string, callback: (row: Order | null) => void) {
  let destroyed = false;
  const serveCache = async () => {
    const cached = await getCachedById<Order>('orders', businessId, orderId);
    if (!destroyed && cached) {
      callback({
        ...cached,
        materialUsage: cached.materialUsage ?? [],
        fittingRecords: cached.fittingRecords ?? [],
        imageIds: cached.imageIds ?? [],
      } as Order);
    }
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) {
      await serveCache();
      return;
    }
    try {
      const order = await assembleOrder(orderId);
      if (destroyed) return;
      if (order) callback(order);
      else await serveCache();
    } catch {
      await serveCache();
    }
  };
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['orders'], fetchAndCallback);
  const channelName = `order-full-${orderId}-${crypto.randomUUID()}`;
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_garments', filter: `order_id=eq.${orderId}` }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_material_usage', filter: `order_id=eq.${orderId}` }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_item_material_usage' }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_fitting_records', filter: `order_id=eq.${orderId}` }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_members', filter: `order_id=eq.${orderId}` }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_member_garments' }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

export async function updateOrderStage(businessId: string, orderId: string, stage: ProductionStage) {
  const deliveryStatus = stage === "delivered" ? "picked" : stage === "ready_for_pickup" ? "ready" : "pending";
  await applyLegacyStage(businessId, orderId, stage);
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('orders')
        .update({ stage, delivery_status: deliveryStatus })
        .eq('id', orderId)
        .eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineUpdate(businessId, 'orders', orderId, { stage, deliveryStatus }, 'high')
  );
}

/**
 * Advance a single member's production stage within a group order. The master
 * order's stage is only advanced (by the caller, e.g. the order-detail page)
 * once every member has moved on, so the group stays coherent.
 */
export async function updateOrderMemberStage(
  businessId: string,
  orderMemberId: string,
  stage: ProductionStage
) {
  const deliveryStatus = stage === "delivered" ? "picked" : stage === "ready_for_pickup" ? "ready" : "pending";
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('order_members')
        .update({ stage, delivery_status: deliveryStatus })
        .eq('id', orderMemberId);
      if (error) throw error;
    },
    () => enqueueSyncOperation(
      businessId,
      'order_members',
      'update',
      { id: orderMemberId, stage, deliveryStatus },
      orderMemberId,
      'high'
    ).then(() => undefined)
  );
}

/**
 * Advance a single order item's production stage. Each item owns its own
 * lifecycle (trouser goes through cutting → stitching, while a ready-made
 * t-shirt on the same order is already ready for pickup).
 */
export async function updateOrderItemStage(
  businessId: string,
  orderItemId: string,
  stage: ProductionStage
) {
  const deliveryStatus = stage === "delivered" ? "picked" : stage === "ready_for_pickup" ? "ready" : "pending";
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('order_items')
        .update({ stage, delivery_status: deliveryStatus, updated_at: new Date().toISOString() })
        .eq('id', orderItemId);
      if (error) throw error;
    },
    () => enqueueSyncOperation(
      businessId,
      'order_items',
      'update',
      { id: orderItemId, stage, deliveryStatus },
      orderItemId,
      'high'
    ).then(() => undefined)
  );
}

/**
 * Edit a line item (price, quantity, tailor, notes…). Recomputes the item's
 * total and the order subtotal so the invoice stays accurate.
 */
export async function updateOrderItem(
  businessId: string,
  orderId: string,
  orderItemId: string,
  fields: Partial<
    Pick<OrderItem, 'unitPrice' | 'discount' | 'quantity' | 'styleNotes' | 'notes' | 'status' | 'assignedTailorId' | 'assignedTailorName' | 'readyDate'>
  >
) {
  const withOffline = async (onlineFn: () => Promise<void>) =>
    withOfflineFallback(
      async () => { await onlineFn(); },
      async () => {
        await enqueueSyncOperation(
          businessId,
          'order_items',
          'update',
          { id: orderItemId, ...fields } as Record<string, unknown>,
          orderItemId,
          'normal'
        );
        notifyLocalWrite('orders');
      }
    );

  return withOffline(async () => {
    const { data: itemData } = await supabase
      .from('order_items')
      .select('quantity, unit_price, discount')
      .eq('id', orderItemId)
      .single();
    const quantity = Number(fields.quantity ?? (itemData as any)?.quantity ?? 1);
    const unitPrice = Number(fields.unitPrice ?? (itemData as any)?.unit_price ?? 0);
    const discount = Number(fields.discount ?? (itemData as any)?.discount ?? 0);
    const totalAmount = Math.max(0, unitPrice * quantity - discount);
    const { error } = await supabase
      .from('order_items')
      .update({ ...transformKeysToSnake(fields as Record<string, unknown>), total_amount: totalAmount, updated_at: new Date().toISOString() })
      .eq('id', orderItemId);
    if (error) throw error;
    await recomputeOrderSubtotal(businessId, orderId);
  });
}

/** Sum order_items (+ legacy order_garments as fallback) into orders.subtotal_amount. */
async function recomputeOrderSubtotal(businessId: string, orderId: string) {
  const { data: itemRows } = await supabase
    .from('order_items')
    .select('total_amount')
    .eq('order_id', orderId);
  const { data: orderData } = await supabase
    .from('orders')
    .select('subtotal_amount')
    .eq('id', orderId)
    .single();
  const currentSubtotal = Number((orderData as any)?.subtotal_amount ?? 0);
  if (itemRows && itemRows.length > 0) {
    const subtotal = (itemRows as Array<{ total_amount: number }>).reduce(
      (sum, r) => sum + Number(r.total_amount),
      0
    );
    if (Math.abs(subtotal - currentSubtotal) > 0.01) {
      await supabase
        .from('orders')
        .update({ subtotal_amount: subtotal, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('business_id', businessId);
    }
  }
}

/**
 * Record material consumption against a specific order item (e.g. the fabric
 * used to make the trouser). Deducts inventory and logs a used_in_order stock
 * movement, mirroring the order-level recordMaterialUsage.
 */
export async function recordOrderItemMaterialUsage(
  businessId: string,
  orderId: string,
  orderItemId: string,
  items: Omit<MaterialUsageRecord, 'recordedAt'>[],
  actor: { uid: string; name: string }
) {
  const { data: orderData } = await supabase
    .from('orders')
    .select('order_number')
    .eq('id', orderId)
    .single();
  const orderNumber = orderData?.order_number ?? '';
  const now = new Date().toISOString();

  const usageRecords: MaterialUsageRecord[] = items.map((item) => ({
    ...item,
    recordedByUid: actor.uid,
    recordedByName: actor.name,
    recordedAt: now,
  }));

  await supabase.from('order_item_material_usage').insert(
    usageRecords.map((record) => transformKeysToSnake({
      orderItemId,
      materialId: record.materialId || null,
      materialName: record.materialName,
      quantityUsed: record.quantityUsed,
      unit: record.unit,
      recordedByUid: record.recordedByUid || null,
      recordedByName: record.recordedByName,
    } as Record<string, unknown>))
  );

  for (const record of usageRecords) {
    if (!record.materialId) continue;
    const { data: materialData } = await supabase
      .from('inventory_materials')
      .select('quantity')
      .eq('id', record.materialId)
      .single();
    const currentQty = Number((materialData as any)?.quantity ?? 0);
    const newQty = Math.max(0, currentQty - Math.abs(record.quantityUsed));
    await supabase
      .from('inventory_materials')
      .update({ quantity: newQty, updated_at: now })
      .eq('id', record.materialId);
    await supabase.from('stock_movements').insert(
      transformKeysToSnake({
        businessId,
        ...branchFields('stock_movements'),
        movementType: 'used_in_order',
        materialId: record.materialId,
        materialName: record.materialName,
        orderId,
        quantityChange: -Math.abs(record.quantityUsed),
        unit: record.unit,
        reason: `Used in order ${orderNumber}`,
        createdByUid: actor.uid,
        createdByName: actor.name,
      } as unknown as Record<string, unknown>)
    );
  }

  notifyLocalWrite('orders');
  return usageRecords;
}

export async function logSmsEntry(
  businessId: string,
  data: {
    orderId: string;
    recipient: string;
    message: string;
    type:
      | "ready_for_pickup"
      | "delay_notification"
      | "stage_notification"
      | "delivery_notification"
      | "delivery_dispatch"
      | "delivery_courier_assigned"
      | "delivery_picked_up"
      | "delivery_in_transit"
      | "delivery_attempted"
      | "delivery_delivered";
    status: "success" | "failed";
    response: unknown;
  }
) {
  try {
    if (isOffline()) {
      await offlineCreate(businessId, 'sms_logs', { ...data, businessId } as unknown as Record<string, unknown>, 'low');
      return;
    }
    await supabase
      .from('sms_logs')
      .insert(transformKeysToSnake({
        ...data,
        businessId,
      } as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("Failed to log SMS entry:", error);
  }
}

export async function updateOrderSmsFields(
  businessId: string,
  orderId: string,
  fields: {
    readyPickupSmsSent?: boolean;
    readyPickupSmsSentAt?: string;
    expectedReadyDate?: string | null;
    delayNotificationSentAt?: string | null;
    delayReason?: string | null;
  }
) {
  return withOfflineFallback(
    async () => {
      const snakePayload = transformKeysToSnake(fields as unknown as Record<string, unknown>);
      const { error } = await supabase
        .from('orders')
        .update(snakePayload as any)
        .eq('id', orderId)
        .eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineUpdate(businessId, 'orders', orderId, fields as unknown as Record<string, unknown>)
  );
}

export async function addFittingRecord(
  businessId: string,
  orderId: string,
  payload: { notes: string; adjustmentSummary?: string; byUid: string; byName: string }
) {
  const record = {
    orderId,
    notes: payload.notes,
    adjustmentSummary: payload.adjustmentSummary ?? null,
    recordedByUid: payload.byUid,
    recordedByName: payload.byName,
  };
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('order_fitting_records')
        .insert(transformKeysToSnake(record as Record<string, unknown>));
      if (error) throw error;
      await supabase
        .from('orders')
        .update({ stage: 'fitting', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('business_id', businessId);
    },
    async () => {
      await enqueueSyncOperation(businessId, 'order_fitting_records', 'create', record, generateId(), 'normal');
      await offlineUpdate(businessId, 'orders', orderId, { stage: 'fitting' });
    }
  );
}

export async function updateOrderProductionNotes(businessId: string, orderId: string, notes: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('orders')
        .update({ production_notes: notes })
        .eq('id', orderId)
        .eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineUpdate(businessId, 'orders', orderId, { productionNotes: notes })
  );
}

export async function updateOrderDetails(
  businessId: string,
  orderId: string,
  fields: Partial<
    Pick<
      Order,
      | "dueDate"
      | "designNotes"
      | "assignedTailorId"
      | "assignedTailorName"
      | "customerPhone"
      | "deliveryMethod"
      | "deliveryFee"
      | "deliveryAddress"
      | "deliveryPartnerId"
      | "deliveryPartnerName"
      | "deliveryNotes"
    >
  >
) {
  // Delivery fee is part of the balance (goods + delivery − paid). Changing it
  // must ripple through order.balance_amount and the customer's outstanding
  // balance so the ledger and receipts stay truthful.
  const reconcileFee = async (oldFee: number) => {
    const newFee = Number(fields.deliveryFee ?? oldFee);
    const delta = newFee - oldFee;
    if (Math.abs(delta) < 0.01) return;
    const { data: orderRow } = await supabase
      .from('orders')
      .select('balance_amount, customer_id')
      .eq('id', orderId)
      .single();
    const orderRowData = orderRow as { balance_amount: number; customer_id: string } | null;
    const nextBalance = Math.max(0, Number(orderRowData?.balance_amount ?? 0) + delta);
    await supabase
      .from('orders')
      .update({ balance_amount: nextBalance, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('business_id', businessId);
    if (orderRowData?.customer_id) {
      const { data: custRow } = await supabase
        .from('customers')
        .select('outstanding_balance')
        .eq('id', orderRowData.customer_id)
        .single();
      const cust = custRow as { outstanding_balance: number } | null;
      if (cust) {
        await supabase
          .from('customers')
          .update({ outstanding_balance: Math.max(0, Number(cust.outstanding_balance ?? 0) + delta) })
          .eq('id', orderRowData.customer_id);
      }
    }
  };

  return withOfflineFallback(
    async () => {
      const now = new Date().toISOString();
      const { data: existing } = await supabase
        .from('orders')
        .select('delivery_fee')
        .eq('id', orderId)
        .single();
      const oldFee = Number((existing as { delivery_fee?: number } | null)?.delivery_fee ?? 0);
      const { error } = await supabase
        .from('orders')
        .update({ ...transformKeysToSnake(fields as Record<string, unknown>), updated_at: now })
        .eq('id', orderId)
        .eq('business_id', businessId);
      if (error) throw error;
      await reconcileFee(oldFee);
    },
    async () => {
      const cached = await getCachedById<Order>('orders', businessId, orderId);
      const oldFee = Number(cached?.deliveryFee ?? 0);
      const delta = Number(fields.deliveryFee ?? oldFee) - oldFee;
      const patch = { ...fields } as Record<string, unknown>;
      if (fields.deliveryFee != null && Math.abs(delta) >= 0.01) {
        const nextBalance = Math.max(0, Number(cached?.balanceAmount ?? 0) + delta);
        patch.balanceAmount = nextBalance;
        const cachedCustomer = await getCachedById<Customer>('customers', businessId, cached?.customerId ?? "");
        if (cachedCustomer) {
          await offlineUpdate(businessId, 'customers', cachedCustomer.id ?? cached?.customerId ?? "", {
            outstandingBalance: Math.max(0, Number(cachedCustomer.outstandingBalance ?? 0) + delta),
          });
        }
      }
      await offlineUpdate(businessId, 'orders', orderId, patch);
    }
  );
}

export async function updateOrderGarments(
  businessId: string,
  orderId: string,
  garments: import("@/types/domain").OrderGarmentItem[]
) {
  const now = new Date().toISOString();
  await supabase.from('order_garments').delete().eq('order_id', orderId);
  if (garments.length > 0) {
    await supabase.from('order_garments').insert(
      garments.map((g, index) => transformKeysToSnake({
        orderId, name: g.name, quantity: g.quantity,
        agreedPrice: g.agreedPrice, styleNotes: g.styleNotes ?? "", sortOrder: index,
      } as Record<string, unknown>))
    );
  }
  const subtotal = garments.reduce((s, g) => s + g.agreedPrice * g.quantity, 0);
  await supabase
    .from('orders')
    .update({ subtotal_amount: subtotal, updated_at: now })
    .eq('id', orderId)
    .eq('business_id', businessId);
}

export async function deleteFittingRecord(businessId: string, orderId: string, recordedAt: string) {
  await supabase
    .from('order_fitting_records')
    .delete()
    .eq('order_id', orderId)
    .eq('created_at', recordedAt);
}

// ════════════════════════════════════════════════════════════════════════════
// DELIVERY MANAGEMENT
// ──────────────────────────────────────────────────────────────────────────────
// The delivery workflow is tracked per order on orders.delivery_* columns and
// lives OUTSIDE the production pipeline: production completes → the order
// enters the delivery workflow → it ends in a terminal stage (delivered or
// picked_by_customer). Every step appends to orders.delivery_timeline so the
// full journey is auditable.
// ════════════════════════════════════════════════════════════════════════════

/** Courier-chain stages in the order they must be traversed. */
const COURIER_FLOW: DeliveryStage[] = [
  "ready_for_dispatch",
  "courier_assigned",
  "picked_up",
  "in_transit",
  "delivery_attempted",
  "delivered",
];

const PICKUP_FLOW: DeliveryStage[] = ["pickup_ready", "picked_by_customer"];

export const DELIVERY_STAGE_LABELS: Record<DeliveryStage, string> = {
  pending: "Pending",
  ready_for_dispatch: "Ready for Dispatch",
  courier_assigned: "Courier Assigned",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivery_attempted: "Delivery Attempted",
  delivered: "Delivered",
  pickup_ready: "Ready for Pickup",
  picked_by_customer: "Picked by Customer",
};

export const DELIVERY_STAGE_COLORS: Record<DeliveryStage, string> = {
  pending: "bg-slate-400",
  ready_for_dispatch: "bg-sky-500",
  courier_assigned: "bg-blue-500",
  picked_up: "bg-indigo-500",
  in_transit: "bg-violet-500",
  delivery_attempted: "bg-amber-500",
  delivered: "bg-green-600",
  pickup_ready: "bg-emerald-500",
  picked_by_customer: "bg-green-600",
};

/** Default structured return reasons (businesses may add their own via "other"). */
export const DEFAULT_RETURN_REASONS = [
  { key: "sizing_issue", label: "Wrong size / poor fit" },
  { key: "defect", label: "Defective workmanship or material" },
  { key: "wrong_order", label: "Wrong garment / item delivered" },
  { key: "damaged", label: "Damaged in transit" },
  { key: "color_fabric", label: "Wrong colour or fabric" },
  { key: "customer_change", label: "Customer changed their mind" },
  { key: "other", label: "Other reason" },
] as const;

const deliveryConfigCache = new Map<string, BusinessDeliveryConfig | null>();

function normalizeDeliveryConfig(value: unknown): BusinessDeliveryConfig {
  if (!value || typeof value !== "object") return { ...DEFAULT_DELIVERY_CONFIG };
  const raw = value as Record<string, unknown>;
  return {
    ...DEFAULT_DELIVERY_CONFIG,
    ...raw,
    sms: { ...DEFAULT_DELIVERY_CONFIG.sms, ...((raw.sms as Record<string, unknown>) ?? {}) },
    freeDeliveryAbove: raw.freeDeliveryAbove == null ? null : Number(raw.freeDeliveryAbove),
    defaultDeliveryFee: Number(raw.defaultDeliveryFee ?? DEFAULT_DELIVERY_CONFIG.defaultDeliveryFee),
  } as BusinessDeliveryConfig;
}

/**
 * Per-business delivery policy. Falls back to the seeded defaults when the
 * config is missing (fresh DB or migration not yet applied), so the feature
 * degrades gracefully.
 */
export async function getDeliveryConfig(businessId: string): Promise<BusinessDeliveryConfig | null> {
  if (deliveryConfigCache.has(businessId)) return deliveryConfigCache.get(businessId) ?? null;
  try {
    const { data } = await supabase
      .from('businesses')
      .select('delivery_config')
      .eq('id', businessId)
      .maybeSingle();
    const config = normalizeDeliveryConfig((data as { delivery_config?: unknown } | null)?.delivery_config);
    deliveryConfigCache.set(businessId, config);
    return config;
  } catch {
    return { ...DEFAULT_DELIVERY_CONFIG };
  }
}

export async function updateDeliveryConfig(businessId: string, config: BusinessDeliveryConfig) {
  await updateBusinessProfile(businessId, { deliveryConfig: config });
  deliveryConfigCache.set(businessId, config);
}

/** Allowable next delivery stages from a given position, per fulfilment method. */
export function nextDeliveryStages(stage: DeliveryStage, method: DeliveryMethod): DeliveryStage[] {
  if (stage === "pending") {
    return method === "pickup" ? ["pickup_ready"] : ["ready_for_dispatch"];
  }
  if (method === "pickup") {
    const idx = PICKUP_FLOW.indexOf(stage);
    return idx >= 0 && idx + 1 < PICKUP_FLOW.length ? [PICKUP_FLOW[idx + 1]] : [];
  }
  const idx = COURIER_FLOW.indexOf(stage);
  if (idx < 0) return [];
  // Delivery attempted is a retryable state — it may loop back into transit.
  if (stage === "delivery_attempted") return ["in_transit", "delivered"];
  return idx + 1 < COURIER_FLOW.length ? [COURIER_FLOW[idx + 1]] : [];
}

/**
 * Move an order onto a delivery stage. Appends a timeline entry, stamps
 * delivered_at on the terminal stages and keeps the production compat `stage`
 * in sync for legacy grouping/filters. Rejects backward moves.
 */
export async function setOrderDeliveryStage(
  businessId: string,
  orderId: string,
  input: { stage: DeliveryStage; note?: string; byUid?: string; byName?: string }
): Promise<void> {
  const applyOnline = async () => {
    const { data: orderRow } = await supabase
      .from('orders')
      .select('delivery_stage, delivery_method, delivery_timeline, stage')
      .eq('id', orderId)
      .eq('business_id', businessId)
      .single();
    if (!orderRow) throw new Error("Order not found.");
    const row = orderRow as { delivery_stage?: DeliveryStage; delivery_method?: DeliveryMethod; delivery_timeline?: unknown; stage?: ProductionStage };
    const current = row.delivery_stage ?? "pending";
    const method = row.delivery_method ?? "delivery";
    const allowed = nextDeliveryStages(current, method);
    if (current !== input.stage && !allowed.includes(input.stage)) {
      throw new Error(`Cannot move from "${DELIVERY_STAGE_LABELS[current]}" to "${DELIVERY_STAGE_LABELS[input.stage]}".`);
    }
    const timeline = (row.delivery_timeline as unknown as DeliveryTimelineEntry[] | null) ?? [];
    const entry: DeliveryTimelineEntry = {
      stage: input.stage,
      label: DELIVERY_STAGE_LABELS[input.stage],
      at: new Date().toISOString(),
      by: input.byName ?? input.byUid,
      note: input.note,
    };
    const patch: Record<string, unknown> = {
      delivery_stage: input.stage,
      delivery_timeline: [...timeline, entry],
    };
    if (input.stage === "delivered") {
      patch.delivered_at = new Date().toISOString();
      patch.stage = "delivered";
      patch.delivery_status = "picked";
    } else if (input.stage === "picked_by_customer") {
      patch.delivered_at = new Date().toISOString();
      patch.stage = "delivered";
      patch.delivery_status = "picked";
    } else if (input.stage === "ready_for_dispatch" || input.stage === "pickup_ready") {
      patch.stage = "ready_for_pickup";
      patch.delivery_status = "ready";
    }
    const { error } = await supabase
      .from('orders')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('business_id', businessId);
    if (error) throw error;
  };

  const applyOffline = async () => {
    const cached = await getCachedById<Order>('orders', businessId, orderId);
    if (!cached) throw new Error("Order not found.");
    const current = cached.deliveryStage ?? "pending";
    const method = cached.deliveryMethod ?? "delivery";
    const allowed = nextDeliveryStages(current, method);
    if (current !== input.stage && !allowed.includes(input.stage)) {
      throw new Error(`Cannot move from "${DELIVERY_STAGE_LABELS[current]}" to "${DELIVERY_STAGE_LABELS[input.stage]}".`);
    }
    const entry: DeliveryTimelineEntry = {
      stage: input.stage,
      label: DELIVERY_STAGE_LABELS[input.stage],
      at: new Date().toISOString(),
      by: input.byName ?? input.byUid,
      note: input.note,
    };
    const patch: Record<string, unknown> = {
      deliveryStage: input.stage,
      deliveryTimeline: [...(cached.deliveryTimeline ?? []), entry],
    };
    if (input.stage === "delivered" || input.stage === "picked_by_customer") {
      patch.deliveredAt = new Date().toISOString();
      patch.stage = "delivered";
      patch.deliveryStatus = "picked";
    } else if (input.stage === "ready_for_dispatch" || input.stage === "pickup_ready") {
      patch.stage = "ready_for_pickup";
      patch.deliveryStatus = "ready";
    }
    await offlineUpdate(businessId, 'orders', orderId, patch, 'high');
  };

  await withOfflineFallback(applyOnline, applyOffline);
}

// ── Delivery partners ─────────────────────────────────────────────────────────

export function listenDeliveryPartners(businessId: string, callback: (rows: DeliveryPartner[]) => void) {
  let destroyed = false;
  let gotFresh = false;
  const serveCache = async (force = false) => {
    const cached = await getCachedCollection<DeliveryPartner>('delivery_partners', businessId).catch(() => []);
    if (!destroyed && (force || !gotFresh) && cached.length > 0) callback(cached);
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) { await serveCache(true); return; }
    let query = supabase.from('delivery_partners').select('*').eq('business_id', businessId);
    if (isBranchScoped('delivery_partners')) query = query.eq('branch_id', activeBranchId as string);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error && isMissingColumnError(error)) { branchScopingAvailable = false; if (!destroyed) fetchAndCallback(); return; }
    if (data && !destroyed) {
      gotFresh = true;
      const rows = transformArrayToCamel<DeliveryPartner>(data as Record<string, unknown>[]);
      callback(rows);
      cacheCollection('delivery_partners', businessId, rows as unknown as Array<Record<string, unknown>>).catch(() => {});
    } else if (!destroyed && error) {
      await serveCache();
    }
  };
  serveCache();
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['delivery_partners'], () => serveCache(true));
  const channel = supabase
    .channel(`delivery-partners-${businessId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_partners', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

export async function createDeliveryPartner(
  businessId: string,
  input: Omit<DeliveryPartner, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>
): Promise<DeliveryPartner> {
  const createOnline = async () => {
    const { data, error } = await supabase
      .from('delivery_partners')
      .insert(transformKeysToSnake({
        businessId,
        ...branchFields('delivery_partners'),
        name: input.name,
        phone: input.phone,
        company: input.company ?? null,
        vehicleType: input.vehicleType ?? null,
        registrationNumber: input.registrationNumber ?? null,
        notes: input.notes ?? null,
        isActive: input.isActive,
      } as Record<string, unknown>))
      .select('*')
      .single();
    if (error || !data) throw error || new Error("Failed to create delivery partner");
    return transformKeysToCamel<DeliveryPartner>(data as Record<string, unknown>);
  };
  const createOffline = async () => {
    const id = await offlineCreate(businessId, 'delivery_partners', {
      businessId,
      name: input.name,
      phone: input.phone,
      company: input.company ?? null,
      vehicleType: input.vehicleType ?? null,
      registrationNumber: input.registrationNumber ?? null,
      notes: input.notes ?? null,
      isActive: input.isActive,
    } as Record<string, unknown>, 'normal');
    return {
      id,
      businessId,
      name: input.name,
      phone: input.phone,
      company: input.company,
      vehicleType: input.vehicleType,
      registrationNumber: input.registrationNumber,
      notes: input.notes,
      isActive: input.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as DeliveryPartner;
  };
  return withOfflineFallback(createOnline, createOffline);
}

export async function updateDeliveryPartner(
  businessId: string,
  partnerId: string,
  input: Partial<Omit<DeliveryPartner, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>>
) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('delivery_partners')
        .update({ ...transformKeysToSnake(input as unknown as Record<string, unknown>), updated_at: new Date().toISOString() })
        .eq('id', partnerId)
        .eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineUpdate(businessId, 'delivery_partners', partnerId, input as Record<string, unknown>)
  );
}

export async function deleteDeliveryPartner(businessId: string, partnerId: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('delivery_partners')
        .delete()
        .eq('id', partnerId)
        .eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineDelete(businessId, 'delivery_partners', partnerId)
  );
}

// ── Returns & alterations ─────────────────────────────────────────────────────

export function listenOrderReturns(businessId: string, callback: (rows: OrderReturn[]) => void) {
  let destroyed = false;
  let gotFresh = false;
  const serveCache = async (force = false) => {
    const cached = await getCachedCollection<OrderReturn>('order_returns', businessId).catch(() => []);
    if (!destroyed && (force || !gotFresh) && cached.length > 0) callback(cached);
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) { await serveCache(true); return; }
    let query = supabase.from('order_returns').select('*').eq('business_id', businessId);
    if (isBranchScoped('order_returns')) query = query.eq('branch_id', activeBranchId as string);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error && isMissingColumnError(error)) { branchScopingAvailable = false; if (!destroyed) fetchAndCallback(); return; }
    if (data && !destroyed) {
      gotFresh = true;
      const rows = transformArrayToCamel<OrderReturn>(data as Record<string, unknown>[]);
      callback(rows);
      cacheCollection('order_returns', businessId, rows as unknown as Array<Record<string, unknown>>).catch(() => {});
    } else if (!destroyed && error) {
      await serveCache();
    }
  };
  serveCache();
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['order_returns'], () => serveCache(true));
  const channel = supabase
    .channel(`order-returns-${businessId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_returns', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

export async function createOrderReturn(
  businessId: string,
  orderId: string,
  input: {
    reason: string;
    reasonLabel: string;
    notes?: string;
    additionalCharge?: number;
    expectedCompletionDate?: string | null;
    imageUrls?: string[];
    handledByUid?: string;
    handledByName?: string;
  }
): Promise<OrderReturn> {
  const createOnline = async () => {
    const { data: orderRow } = await supabase
      .from('orders')
      .select('delivery_stage, order_number')
      .eq('id', orderId)
      .eq('business_id', businessId)
      .single();
    const row = orderRow as { delivery_stage?: DeliveryStage; order_number?: string } | null;
    if (!row) throw new Error("Order not found.");
    if (row.delivery_stage !== "delivered" && row.delivery_stage !== "picked_by_customer") {
      throw new Error("Only delivered orders can be returned. Complete delivery first.");
    }
    const { data, error } = await supabase
      .from('order_returns')
      .insert(transformKeysToSnake({
        businessId,
        ...branchFields('order_returns'),
        orderId,
        reason: input.reason,
        reasonLabel: input.reasonLabel,
        notes: input.notes ?? null,
        returnedAt: new Date().toISOString(),
        handledByUid: input.handledByUid ?? null,
        handledByName: input.handledByName ?? null,
        additionalCharge: Number(input.additionalCharge ?? 0),
        expectedCompletionDate: input.expectedCompletionDate ?? null,
        imageUrls: input.imageUrls ?? [],
        status: "returned",
      } as Record<string, unknown>))
      .select('*')
      .single();
    if (error || !data) throw error || new Error("Failed to create return");
    await supabase
      .from('orders')
      .update({ has_active_return: true, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('business_id', businessId);
    notifyLocalWrite('orders');
    return transformKeysToCamel<OrderReturn>(data as Record<string, unknown>);
  };
  const createOffline = async () => {
    const id = await offlineCreate(businessId, 'order_returns', {
      businessId,
      orderId,
      reason: input.reason,
      reasonLabel: input.reasonLabel,
      notes: input.notes ?? null,
      returnedAt: new Date().toISOString(),
      handledByUid: input.handledByUid ?? null,
      handledByName: input.handledByName ?? null,
      additionalCharge: Number(input.additionalCharge ?? 0),
      expectedCompletionDate: input.expectedCompletionDate ?? null,
      imageUrls: input.imageUrls ?? [],
      status: "returned",
    } as Record<string, unknown>, 'high');
    await offlineUpdate(businessId, 'orders', orderId, { hasActiveReturn: true }, 'high');
    return {
      id,
      businessId,
      orderId,
      reason: input.reason,
      reasonLabel: input.reasonLabel,
      notes: input.notes,
      returnedAt: new Date().toISOString(),
      handledByUid: input.handledByUid,
      handledByName: input.handledByName,
      additionalCharge: Number(input.additionalCharge ?? 0),
      expectedCompletionDate: input.expectedCompletionDate ?? null,
      imageUrls: input.imageUrls ?? [],
      status: "returned" as ReturnStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };
  return withOfflineFallback(createOnline, createOffline);
}

export async function updateOrderReturnStatus(
  businessId: string,
  orderId: string,
  returnId: string,
  status: ReturnStatus
) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('order_returns')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', returnId)
        .eq('business_id', businessId);
      if (error) throw error;
      if (status === "completed") {
        const { count } = await supabase
          .from('order_returns')
          .select('id', { count: 'exact', head: true })
          .eq('order_id', orderId)
          .eq('business_id', businessId)
          .neq('status', 'completed');
        await supabase
          .from('orders')
          .update({ has_active_return: (count ?? 0) > 0, updated_at: new Date().toISOString() })
          .eq('id', orderId)
          .eq('business_id', businessId);
        notifyLocalWrite('orders');
      }
    },
    async () => {
      await offlineUpdate(businessId, 'order_returns', returnId, { status });
      if (status === "completed") {
        await offlineUpdate(businessId, 'orders', orderId, { hasActiveReturn: false });
      }
    }
  );
}

export async function deleteOrderReturn(businessId: string, orderId: string, returnId: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('order_returns')
        .delete()
        .eq('id', returnId)
        .eq('business_id', businessId);
      if (error) throw error;
      const { count } = await supabase
        .from('order_returns')
        .select('id', { count: 'exact', head: true })
        .eq('order_id', orderId)
        .eq('business_id', businessId)
        .neq('status', 'completed');
      await supabase
        .from('orders')
        .update({ has_active_return: (count ?? 0) > 0, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('business_id', businessId);
      notifyLocalWrite('orders');
    },
    async () => {
      await offlineDelete(businessId, 'order_returns', returnId);
      await offlineUpdate(businessId, 'orders', orderId, { hasActiveReturn: false });
    }
  );
}

// ── Cancellation ──────────────────────────────────────────────────────────────
// Orders are NEVER hard-deleted. A cancellation is a first-class audit record
// that keeps the order in history and reporting, plus soft-cancel flags on the
// order itself. Delivered orders cannot be cancelled — use Returns instead.

export async function cancelOrder(
  businessId: string,
  orderId: string,
  input: {
    reason: string;
    reasonLabel: string;
    notes?: string;
    cancelledBy: CancellationBy;
    actorUid: string;
    actorName: string;
    refundStatus?: RefundStatus;
    refundAmount?: number;
    /** Optional fee charged for cancelling mid-production. */
    cancellationFee?: number;
  }
): Promise<OrderCancellation> {
  const cancelOnline = async () => {
    const { data: orderRow } = await supabase
      .from('orders')
      .select('delivery_stage, stage, subtotal_amount, delivery_fee, amount_paid, balance_amount, customer_id, order_number, is_cancelled')
      .eq('id', orderId)
      .eq('business_id', businessId)
      .single();
    if (!orderRow) throw new Error("Order not found.");
    const row = orderRow as {
      delivery_stage?: DeliveryStage; stage?: ProductionStage; subtotal_amount?: number;
      delivery_fee?: number; amount_paid?: number; balance_amount?: number; customer_id?: string;
      order_number?: string; is_cancelled?: boolean;
    };
    if (row.is_cancelled) throw new Error("This order is already cancelled.");
    if (row.delivery_stage === "delivered" || row.delivery_stage === "picked_by_customer" || row.stage === "delivered") {
      throw new Error("Delivered orders cannot be cancelled. Start a return instead.");
    }

    const balanceBefore = Number(row.balance_amount ?? 0);
    const amountPaid = Number(row.amount_paid ?? 0);
    const refunded = input.refundStatus === "refunded"
      ? Math.min(Number(input.refundAmount ?? 0), amountPaid)
      : 0;
    const nextAmountPaid = Math.max(0, amountPaid - refunded);
    const nextBalance = Math.max(0, Number(input.cancellationFee ?? 0));
    const customerDelta = nextBalance - balanceBefore;

    const { data: created, error: insertError } = await supabase
      .from('order_cancellations')
      .insert(transformKeysToSnake({
        businessId,
        ...branchFields('order_cancellations'),
        orderId,
        orderNumber: row.order_number,
        reason: input.reason,
        reasonLabel: input.reasonLabel,
        notes: input.notes ?? null,
        cancelledBy: input.cancelledBy,
        cancelledByUid: input.actorUid,
        cancelledByName: input.actorName,
        cancelledAt: new Date().toISOString(),
        refundStatus: input.refundStatus ?? "none",
        refundAmount: refunded,
      } as Record<string, unknown>))
      .select('*')
      .single();
    if (insertError || !created) throw insertError || new Error("Failed to cancel order");

    await supabase
      .from('orders')
      .update({
        is_cancelled: true,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: input.reasonLabel,
        cancellation_notes: input.notes ?? null,
        cancellation_by: input.cancelledBy,
        refund_status: input.refundStatus ?? "none",
        amount_paid: nextAmountPaid,
        balance_amount: nextBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('business_id', businessId);

    if (Math.abs(customerDelta) >= 0.01 && row.customer_id) {
      const { data: custRow } = await supabase
        .from('customers')
        .select('outstanding_balance')
        .eq('id', row.customer_id)
        .single();
      const cust = custRow as { outstanding_balance?: number } | null;
      if (cust) {
        await supabase
          .from('customers')
          .update({ outstanding_balance: Math.max(0, Number(cust.outstanding_balance ?? 0) + customerDelta) })
          .eq('id', row.customer_id);
      }
    }
    notifyLocalWrite('orders');
    return transformKeysToCamel<OrderCancellation>(created as Record<string, unknown>);
  };

  const cancelOffline = async () => {
    const cached = await getCachedById<Order>('orders', businessId, orderId);
    if (!cached) throw new Error("Order not found.");
    if (cached.isCancelled) throw new Error("This order is already cancelled.");
    if (cached.deliveryStage === "delivered" || cached.deliveryStage === "picked_by_customer" || cached.stage === "delivered") {
      throw new Error("Delivered orders cannot be cancelled. Start a return instead.");
    }
    const balanceBefore = Number(cached.balanceAmount ?? 0);
    const amountPaid = Number(cached.amountPaid ?? 0);
    const refunded = input.refundStatus === "refunded"
      ? Math.min(Number(input.refundAmount ?? 0), amountPaid)
      : 0;
    const nextAmountPaid = Math.max(0, amountPaid - refunded);
    const nextBalance = Math.max(0, Number(input.cancellationFee ?? 0));
    const customerDelta = nextBalance - balanceBefore;

    const id = await offlineCreate(businessId, 'order_cancellations', {
      businessId,
      orderId,
      orderNumber: cached.orderNumber,
      reason: input.reason,
      reasonLabel: input.reasonLabel,
      notes: input.notes ?? null,
      cancelledBy: input.cancelledBy,
      cancelledByUid: input.actorUid,
      cancelledByName: input.actorName,
      cancelledAt: new Date().toISOString(),
      refundStatus: input.refundStatus ?? "none",
      refundAmount: refunded,
    } as Record<string, unknown>, 'high');

    await offlineUpdate(businessId, 'orders', orderId, {
      isCancelled: true,
      cancelledAt: new Date().toISOString(),
      cancellationReason: input.reasonLabel,
      cancellationNotes: input.notes ?? null,
      cancellationBy: input.cancelledBy,
      refundStatus: input.refundStatus ?? "none",
      amountPaid: nextAmountPaid,
      balanceAmount: nextBalance,
    }, 'high');

    const cachedCustomer = await getCachedById<Customer>('customers', businessId, cached.customerId);
    if (cachedCustomer) {
      await offlineUpdate(businessId, 'customers', cached.customerId, {
        outstandingBalance: Math.max(0, Number(cachedCustomer.outstandingBalance ?? 0) + customerDelta),
      });
    }

    return {
      id,
      businessId,
      orderId,
      orderNumber: cached.orderNumber,
      reason: input.reason,
      reasonLabel: input.reasonLabel,
      notes: input.notes,
      cancelledBy: input.cancelledBy,
      cancelledByUid: input.actorUid,
      cancelledByName: input.actorName,
      cancelledAt: new Date().toISOString(),
      refundStatus: input.refundStatus ?? "none",
      refundAmount: refunded,
      createdAt: new Date().toISOString(),
    } as OrderCancellation;
  };

  return withOfflineFallback(cancelOnline, cancelOffline);
}

/** Reverse a cancellation (edits made in error). Reverts order flags + record. */
export async function undoCancelOrder(businessId: string, orderId: string, cancellationId: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('order_cancellations')
        .delete()
        .eq('id', cancellationId)
        .eq('business_id', businessId);
      if (error) throw error;
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          is_cancelled: false,
          cancelled_at: null,
          cancellation_reason: null,
          cancellation_notes: null,
          cancellation_by: null,
          refund_status: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('business_id', businessId);
      if (orderError) throw orderError;
      notifyLocalWrite('orders');
    },
    async () => {
      await offlineDelete(businessId, 'order_cancellations', cancellationId);
      await offlineUpdate(businessId, 'orders', orderId, {
        isCancelled: false,
        cancelledAt: null,
        cancellationReason: null,
        cancellationNotes: null,
        cancellationBy: null,
        refundStatus: null,
      });
    }
  );
}

export async function appendOrderImageId(businessId: string, orderId: string, imageId: string) {
  await supabase
    .from('order_images')
    .upsert({ order_id: orderId, image_id: imageId }, { onConflict: 'order_id,image_id', ignoreDuplicates: true });
}

export async function recordMaterialUsage(
  businessId: string,
  orderId: string,
  items: Omit<MaterialUsageRecord, "recordedAt">[],
  actor: { uid: string; name: string }
) {
  // ── Offline path ─────────────────────────────────────────────────────────
  if (isOffline()) {
    const cachedOrder = await getCachedById<Order>('orders', businessId, orderId);
    const offlineOrderNumber = cachedOrder?.orderNumber ?? "";
    const offlineNow = new Date().toISOString();
    const offlineUsage: MaterialUsageRecord[] = items.map((item) => ({
      ...item,
      recordedByUid: actor.uid,
      recordedByName: actor.name,
      recordedAt: offlineNow,
    }));
    for (const record of offlineUsage) {
      await enqueueSyncOperation(businessId, 'order_material_usage', 'create', {
        orderId,
        materialId: record.materialId || null,
        materialName: record.materialName,
        quantityUsed: record.quantityUsed,
        unit: record.unit,
        recordedByUid: record.recordedByUid || null,
        recordedByName: record.recordedByName,
      }, generateId(), 'normal');
      if (record.materialId) {
        const cachedMat = await getCachedById<InventoryMaterial>('inventory_materials', businessId, record.materialId);
        const newQty = Math.max(0, Number(cachedMat?.quantity ?? 0) - Math.abs(record.quantityUsed));
        await offlineUpdate(businessId, 'inventory_materials', record.materialId, { quantity: newQty });
        await offlineCreate(businessId, 'stock_movements', {
          businessId,
          ...branchFields('stock_movements'),
          movementType: "used_in_order",
          materialId: record.materialId,
          materialName: record.materialName,
          orderId,
          quantityChange: -Math.abs(record.quantityUsed),
          unit: record.unit,
          reason: `Used in order ${offlineOrderNumber}`,
          createdByUid: actor.uid,
          createdByName: actor.name,
        });
      }
    }
    await offlineCreate(businessId, 'consumption_reports', {
      businessId,
      orderId,
      orderNumber: offlineOrderNumber,
      items: offlineUsage,
      totalItems: offlineUsage.length,
    });
    notifyLocalWrite('orders');
    return offlineUsage;
  }

  const { data: orderData } = await supabase
    .from('orders')
    .select('order_number')
    .eq('id', orderId)
    .single();
  if (!orderData) throw new Error("Order not found.");

  const orderNumber = orderData.order_number;
  const now = new Date().toISOString();

  const usageRecords: MaterialUsageRecord[] = items.map((item) => ({
    ...item,
    recordedByUid: actor.uid,
    recordedByName: actor.name,
    recordedAt: now,
  }));

  // Insert into proper order_material_usage table
  await supabase.from('order_material_usage').insert(
    usageRecords.map((record) => transformKeysToSnake({
      orderId,
      materialId: record.materialId || null,
      materialName: record.materialName,
      quantityUsed: record.quantityUsed,
      unit: record.unit,
      recordedByUid: record.recordedByUid || null,
      recordedByName: record.recordedByName,
    } as Record<string, unknown>))
  );

  // Deduct from inventory and log stock movements
  for (const record of usageRecords) {
    if (record.materialId) {
      const { data: materialData } = await supabase
        .from('inventory_materials')
        .select('quantity')
        .eq('id', record.materialId)
        .single();

      const currentQty = Number((materialData as any)?.quantity ?? 0);
      const newQty = Math.max(0, currentQty - Math.abs(record.quantityUsed));
      await supabase
        .from('inventory_materials')
        .update({ quantity: newQty, updated_at: now })
        .eq('id', record.materialId);

      const { error: usageMovementError } = await supabase
        .from('stock_movements')
        .insert(transformKeysToSnake({
          businessId,
          ...branchFields('stock_movements'),
          movementType: "used_in_order",
          materialId: record.materialId,
          materialName: record.materialName,
          orderId,
          quantityChange: -Math.abs(record.quantityUsed),
          unit: record.unit,
          reason: `Used in order ${orderNumber}`,
          createdByUid: actor.uid,
          createdByName: actor.name,
        } as unknown as Record<string, unknown>));
      if (usageMovementError) console.error("Failed to insert usage movement:", usageMovementError);
    }
  }

  await supabase
    .from('consumption_reports')
    .insert(transformKeysToSnake({
      businessId,
      orderId,
      orderNumber,
      items: usageRecords,
      totalItems: usageRecords.length,
    } as unknown as Record<string, unknown>));

  return usageRecords;
}

// â”€â”€â”€ MATERIALS â”€â”€â”€

function assembleMaterialImages(rawRow: Record<string, unknown>): InventoryMaterial {
  const imgs = (rawRow.inventory_material_images as Array<{ url: string; public_id: string; sort_order: number }> | null ?? [])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img) => ({ url: img.url, publicId: img.public_id }));
  const base = transformKeysToCamel<InventoryMaterial>({ ...rawRow, inventory_material_images: undefined } as Record<string, unknown>);
  return { ...base, images: imgs.length > 0 ? imgs : undefined };
}

export function listenMaterials(businessId: string, callback: (rows: InventoryMaterial[]) => void) {
  let destroyed = false;
  let gotFresh = false;
  const serveCache = async (force = false) => {
    const cached = await getCachedCollection<InventoryMaterial>('inventory_materials', businessId).catch(() => []);
    if (!destroyed && (force || !gotFresh) && cached.length > 0) callback(cached);
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) {
      await serveCache(true);
      return;
    }
    let matQuery = supabase
      .from('inventory_materials')
      .select('*, inventory_material_images(url, public_id, sort_order)')
      .eq('business_id', businessId);
    if (isBranchScoped('inventory_materials')) {
      matQuery = matQuery.eq('branch_id', activeBranchId as string);
    }
    const { data, error } = await matQuery.order('updated_at', { ascending: false });
    if (error && isMissingColumnError(error)) {
      branchScopingAvailable = false;
      if (!destroyed) fetchAndCallback();
      return;
    }
    if (data && !destroyed) {
      gotFresh = true;
      const rows = (data as Record<string, unknown>[]).map(assembleMaterialImages);
      callback(rows);
      cacheCollection('inventory_materials', businessId, rows as unknown as Array<Record<string, unknown>>).catch(() => {});
    } else if (!destroyed && error) {
      await serveCache();
    }
  };
  serveCache();
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['inventory_materials'], () => serveCache(true));
  const channel = supabase
    .channel(`inventory_materials-${businessId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_materials', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_material_images' }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

export async function fetchMaterialById(businessId: string, materialId: string) {
  if (isOffline()) {
    return getCachedById<InventoryMaterial>('inventory_materials', businessId, materialId);
  }
  const { data, error } = await supabase
    .from('inventory_materials')
    .select('*, inventory_material_images(url, public_id, sort_order)')
    .eq('id', materialId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) return getCachedById<InventoryMaterial>('inventory_materials', businessId, materialId);
  if (!data) return null;
  return assembleMaterialImages(data as Record<string, unknown>);
}

export async function createMaterial(
  businessId: string,
  payload: Omit<InventoryMaterial, "id" | "createdAt" | "updatedAt">
) {
  const { images, ...rest } = payload as typeof payload & { images?: Array<{ url: string; publicId: string }> };
  return withOfflineFallback(
    async () => {
      const { data, error } = await supabase
        .from('inventory_materials')
        .insert(transformKeysToSnake({ ...rest, businessId, ...branchFields('inventory_materials') } as unknown as Record<string, unknown>))
        .select('id')
        .single();
      if (error || !data) throw error || new Error("Failed to create material");

      if (images && images.length > 0) {
        await supabase.from('inventory_material_images').insert(
          images.map((img, i) => ({ material_id: data.id, url: img.url, public_id: img.publicId, sort_order: i }))
        );
      }
      return data.id as string;
    },
    async () => {
      const materialId = await offlineCreate(businessId, 'inventory_materials', {
        ...rest,
        businessId,
      } as unknown as Record<string, unknown>);
      if (images && images.length > 0) {
        for (const [i, img] of images.entries()) {
          await enqueueSyncOperation(businessId, 'inventory_material_images', 'create', {
            materialId,
            url: img.url,
            publicId: img.publicId,
            sortOrder: i,
          }, generateId(), 'normal');
        }
        await patchCachedRecord('inventory_materials', materialId, { images }).catch(() => {});
      }
      return materialId;
    }
  );
}

export async function deleteMaterial(businessId: string, materialId: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase.from('inventory_materials').delete().eq('id', materialId).eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineDelete(businessId, 'inventory_materials', materialId)
  );
}

export async function updateMaterial(
  businessId: string,
  materialId: string,
  payload: Partial<Omit<InventoryMaterial, "id" | "businessId" | "createdAt" | "updatedAt">>
) {
  const { images, ...rest } = payload as typeof payload & { images?: Array<{ url: string; publicId: string }> };
  return withOfflineFallback(
    async () => {
      if (Object.keys(rest).length > 0) {
        const { error } = await supabase
          .from('inventory_materials')
          .update(transformKeysToSnake(rest as unknown as Record<string, unknown>))
          .eq('id', materialId)
          .eq('business_id', businessId);
        if (error) throw error;
      }
      if (images !== undefined) {
        await supabase.from('inventory_material_images').delete().eq('material_id', materialId);
        if (images.length > 0) {
          await supabase.from('inventory_material_images').insert(
            images.map((img, i) => ({ material_id: materialId, url: img.url, public_id: img.publicId, sort_order: i }))
          );
        }
      }
    },
    async () => {
      // Image set changes need a connection (replace-all delete can't be queued)
      if (Object.keys(rest).length > 0) {
        await offlineUpdate(businessId, 'inventory_materials', materialId, rest as unknown as Record<string, unknown>);
      }
      if (images !== undefined) {
        throw new Error("Material photos can only be changed while online. Your other changes were saved and will sync.");
      }
    }
  );
}

export async function adjustMaterialStock(
  businessId: string,
  payload: {
    materialId: string;
    materialName: string;
    adjustment: number;
    unit: string;
    reason: string;
    actorUid: string;
    actorName: string;
  }
) {
  const movement = {
    businessId,
    ...branchFields('stock_movements'),
    movementType: "adjustment",
    materialId: payload.materialId,
    materialName: payload.materialName,
    quantityChange: payload.adjustment,
    unit: payload.unit,
    reason: payload.reason,
    createdByUid: payload.actorUid,
    createdByName: payload.actorName,
  };
  return withOfflineFallback(
    async () => {
      const { data: materialData } = await supabase
        .from('inventory_materials')
        .select('quantity')
        .eq('id', payload.materialId)
        .single();
      const currentQty = Number((materialData as any)?.quantity ?? 0);
      const newQty = currentQty + payload.adjustment;

      const { error } = await supabase
        .from('inventory_materials')
        .update({ quantity: newQty })
        .eq('id', payload.materialId)
        .eq('business_id', businessId);
      if (error) throw error;

      const { error: adjMovErr } = await supabase
        .from('stock_movements')
        .insert(transformKeysToSnake(movement as unknown as Record<string, unknown>));
      if (adjMovErr) console.error("Failed to insert adjustment movement:", adjMovErr);
    },
    async () => {
      const cachedMat = await getCachedById<InventoryMaterial>('inventory_materials', businessId, payload.materialId);
      const newQty = Number(cachedMat?.quantity ?? 0) + payload.adjustment;
      await offlineUpdate(businessId, 'inventory_materials', payload.materialId, { quantity: newQty });
      await offlineCreate(businessId, 'stock_movements', movement);
    }
  );
}

// â”€â”€â”€ SUPPLIERS â”€â”€â”€

export async function createSupplier(
  businessId: string,
  payload: Omit<Supplier, "id" | "createdAt">
) {
  return withOfflineFallback(
    async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(transformKeysToSnake({ ...payload, businessId, ...branchFields('suppliers') } as unknown as Record<string, unknown>))
        .select('id')
        .single();
      if (error || !data) throw error || new Error("Failed to create supplier");
      return data.id as string;
    },
    () => offlineCreate(businessId, 'suppliers', { ...payload, businessId } as unknown as Record<string, unknown>)
  );
}

export async function updateSupplier(
  businessId: string,
  supplierId: string,
  payload: Partial<Omit<Supplier, "id" | "businessId" | "createdAt">>
) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('suppliers')
        .update(transformKeysToSnake(payload as unknown as Record<string, unknown>))
        .eq('id', supplierId)
        .eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineUpdate(businessId, 'suppliers', supplierId, payload as unknown as Record<string, unknown>)
  );
}

export async function deleteSupplier(businessId: string, supplierId: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase.from('suppliers').delete().eq('id', supplierId).eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineDelete(businessId, 'suppliers', supplierId)
  );
}

export function listenSuppliers(businessId: string, callback: (rows: Supplier[]) => void) {
  return listenToTable<Supplier>('suppliers', businessId, callback, { orderBy: 'name', orderDir: 'asc' });
}

export async function fetchSupplierById(businessId: string, supplierId: string): Promise<Supplier | null> {
  if (isOffline()) {
    return getCachedById<Supplier>('suppliers', businessId, supplierId);
  }
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) return getCachedById<Supplier>('suppliers', businessId, supplierId);
  if (!data) return null;
  return transformKeysToCamel<Supplier>(data as Record<string, unknown>);
}

// â”€â”€â”€ STOCK MOVEMENTS â”€â”€â”€

export function listenStockMovements(businessId: string, callback: (rows: StockMovement[]) => void) {
  return listenToTable<StockMovement>('stock_movements', businessId, callback, { orderBy: 'created_at', orderDir: 'desc' });
}

// â”€â”€â”€ PURCHASE ORDERS â”€â”€â”€

export async function createPurchaseOrder(
  businessId: string,
  payload: Omit<PurchaseOrder, "id" | "createdAt">
) {
  return withOfflineFallback(
    async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert(transformKeysToSnake({ ...payload, businessId, ...branchFields('purchase_orders') } as unknown as Record<string, unknown>))
        .select('id')
        .single();
      if (error || !data) throw error || new Error("Failed to create purchase order");
      return data.id as string;
    },
    () => offlineCreate(businessId, 'purchase_orders', { ...payload, businessId } as unknown as Record<string, unknown>)
  );
}

export async function fetchPurchaseOrderById(businessId: string, poId: string) {
  if (isOffline()) {
    return getCachedById<PurchaseOrder>('purchase_orders', businessId, poId);
  }
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', poId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) return getCachedById<PurchaseOrder>('purchase_orders', businessId, poId);
  if (!data) return null;
  return transformKeysToCamel<PurchaseOrder>(data as Record<string, unknown>);
}

export async function updatePurchaseOrder(
  businessId: string,
  poId: string,
  payload: Partial<Omit<PurchaseOrder, "id" | "businessId" | "createdAt">>
) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('purchase_orders')
        .update(transformKeysToSnake(payload as unknown as Record<string, unknown>))
        .eq('id', poId)
        .eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineUpdate(businessId, 'purchase_orders', poId, payload as unknown as Record<string, unknown>)
  );
}

export async function deletePurchaseOrder(businessId: string, poId: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase.from('purchase_orders').delete().eq('id', poId).eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineDelete(businessId, 'purchase_orders', poId)
  );
}

export function listenPurchaseOrders(businessId: string, callback: (rows: PurchaseOrder[]) => void) {
  return listenToTable<PurchaseOrder>('purchase_orders', businessId, callback, { orderBy: 'created_at', orderDir: 'desc' });
}

export async function receiveStockFromPurchaseOrder(
  businessId: string,
  payload: {
    purchaseOrderId: string;
    materialId?: string;
    materialName: string;
    categoryId?: string;
    categoryName?: string;
    unitId?: string;
    unitName?: string;
    quantity: number;
    unit: string;
    actorUid: string;
    actorName: string;
  }
) {
  if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) {
    throw new Error("Receive quantity must be greater than zero.");
  }

  // ── Offline path ─────────────────────────────────────────────────────────
  if (isOffline()) {
    const cachedPo = await getCachedById<PurchaseOrder>('purchase_orders', businessId, payload.purchaseOrderId);
    if (!cachedPo) throw new Error("This purchase order isn't available offline yet. Reconnect to receive stock.");

    const currentReceived = Number((cachedPo as any).quantityReceived ?? 0);
    const remaining = Number((cachedPo as any).quantity ?? 0) - currentReceived;
    if (remaining <= 0) throw new Error("Purchase order is already fully received.");
    if (payload.quantity > remaining) {
      throw new Error(`Cannot receive more than the remaining ${remaining} ${payload.unit}.`);
    }

    let materialId = payload.materialId;
    let cachedMat: InventoryMaterial | null = null;
    if (materialId) {
      cachedMat = await getCachedById<InventoryMaterial>('inventory_materials', businessId, materialId);
    } else {
      const allMats = await getCachedCollection<InventoryMaterial>('inventory_materials', businessId).catch(() => [] as InventoryMaterial[]);
      cachedMat = allMats.find((m) => m.name === payload.materialName) ?? null;
      materialId = cachedMat?.id;
    }
    if (!materialId) {
      materialId = await offlineCreate(businessId, 'inventory_materials', {
        businessId,
        name: payload.materialName,
        categoryId: payload.categoryId ?? null,
        categoryName: payload.categoryName || "Uncategorized",
        unitId: payload.unitId || "",
        unitName: payload.unitName || payload.unit,
        quantity: 0,
        reorderLevel: 0,
        averageUnitCost: Number((cachedPo as any).unitCost ?? 0),
      });
    }

    const currentQuantity = Number(cachedMat?.quantity ?? 0);
    const currentAverageCost = Number((cachedMat as any)?.averageUnitCost ?? 0);
    const poUnitCostOffline = Number((cachedPo as any).unitCost ?? 0);
    const newQuantity = currentQuantity + payload.quantity;
    const newAverageCost = newQuantity > 0
      ? ((currentQuantity * currentAverageCost) + (payload.quantity * poUnitCostOffline)) / newQuantity
      : currentAverageCost;
    const newReceived = currentReceived + payload.quantity;
    const newStatus = newReceived >= Number((cachedPo as any).quantity ?? 0) ? "received" : "partial";

    await offlineUpdate(businessId, 'purchase_orders', payload.purchaseOrderId, {
      status: newStatus,
      quantityReceived: newReceived,
    });
    await offlineUpdate(businessId, 'inventory_materials', materialId, {
      quantity: newQuantity,
      averageUnitCost: newAverageCost,
      unitName: payload.unit,
    });
    await offlineCreate(businessId, 'stock_movements', {
      businessId,
      ...branchFields('stock_movements'),
      movementType: "stock_in",
      materialId,
      materialName: payload.materialName,
      quantityChange: payload.quantity,
      unit: payload.unit,
      reason: `Purchase order delivery (${newReceived}/${Number((cachedPo as any).quantity ?? 0)} ${payload.unit})`,
      createdByUid: payload.actorUid,
      createdByName: payload.actorName,
    });
    return materialId;
  }

  const { data: poData } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', payload.purchaseOrderId)
    .single();
  if (!poData) {
    throw new Error("Purchase order not found.");
  }
  const po = transformKeysToCamel<PurchaseOrder>(poData as Record<string, unknown>);

  let materialId = payload.materialId;

  if (!materialId) {
    const { data: existingMaterials } = await supabase
      .from('inventory_materials')
      .select('id')
      .eq('business_id', businessId)
      .eq('name', payload.materialName)
      .maybeSingle();
    if (existingMaterials) {
      materialId = existingMaterials.id;
    } else {
      let resolvedCatId = payload.categoryId;
      if (!resolvedCatId) {
        const resolvedCatName = payload.categoryName || "Uncategorized";
        const { data: existingCat } = await supabase
          .from('inventory_categories')
          .select('id')
          .eq('business_id', businessId)
          .eq('name', resolvedCatName)
          .maybeSingle();
        if (existingCat) {
          resolvedCatId = existingCat.id;
        } else {
          const { data: newCat } = await supabase
            .from('inventory_categories')
            .insert(transformKeysToSnake({ businessId, name: resolvedCatName } as Record<string, unknown>))
            .select('id')
            .single();
          resolvedCatId = newCat!.id;
        }
      }

      const { data: newMat, error: matError } = await supabase
        .from('inventory_materials')
        .insert(transformKeysToSnake({
          businessId,
          name: payload.materialName,
          categoryId: resolvedCatId,
          categoryName: payload.categoryName || "Uncategorized",
          unitId: payload.unitId || "",
          unitName: payload.unitName || payload.unit,
          quantity: 0,
          reorderLevel: 0,
          averageUnitCost: (po as any).unitCost || 0,
        } as unknown as Record<string, unknown>))
        .select('id')
        .single();
      if (matError || !newMat) throw matError || new Error("Failed to create material");
      materialId = newMat.id;
    }
  }

  const { data: freshPoData } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', payload.purchaseOrderId)
    .single();
  if (!freshPoData) throw new Error("Purchase order not found.");
  const freshPo = transformKeysToCamel<PurchaseOrder>(freshPoData as Record<string, unknown>);

  const { data: materialSnapshot } = await supabase
    .from('inventory_materials')
    .select('*')
    .eq('id', materialId)
    .single();
  if (!materialSnapshot) throw new Error("Material not found.");

  const currentReceived = (freshPo as any).quantityReceived ?? 0;
  const remaining = (freshPo as any).quantity - currentReceived;

  if (remaining <= 0) {
    throw new Error("Purchase order is already fully received.");
  }
  if (payload.quantity > remaining) {
    throw new Error(`Cannot receive more than the remaining ${remaining} ${payload.unit}.`);
  }

  const material = materialSnapshot as Record<string, unknown>;
  const currentQuantity = Number(material.quantity ?? 0);
  const currentAverageCost = Number(material.average_unit_cost ?? 0);
  const newQuantity = currentQuantity + payload.quantity;
  const newAverageCost = newQuantity > 0
    ? ((currentQuantity * currentAverageCost) + (payload.quantity * Number((freshPo as any).unitCost ?? 0))) / newQuantity
    : currentAverageCost;
  const newReceived = currentReceived + payload.quantity;
  const newStatus = newReceived >= (freshPo as any).quantity ? "received" : "partial";

  const poUnitCost = Number((freshPo as any).unitCost ?? 0);
  const poQuantity = Number((freshPo as any).quantity ?? 0);

  await supabase
    .from('purchase_orders')
    .update({ status: newStatus, quantity_received: newReceived } as any)
    .eq('id', payload.purchaseOrderId);

  await supabase
    .from('inventory_materials')
    .update({
      quantity: newQuantity,
      average_unit_cost: newAverageCost,
      unit_name: payload.unit,
    } as any)
    .eq('id', materialId);

  const { error: movementError } = await supabase
    .from('stock_movements')
    .insert(transformKeysToSnake({
      businessId,
      ...branchFields('stock_movements'),
      movementType: "stock_in",
      materialId,
      materialName: payload.materialName,
      quantityChange: payload.quantity,
      unit: payload.unit,
      reason: `Purchase order delivery (${newReceived}/${poQuantity} ${payload.unit})`,
      createdByUid: payload.actorUid,
      createdByName: payload.actorName,
    } as unknown as Record<string, unknown>));
  if (movementError) console.error("Failed to insert stock movement:", movementError);

  return materialId;
}

// â”€â”€â”€ PAYMENTS â”€â”€â”€

export function listenPayments(businessId: string, callback: (rows: Payment[]) => void) {
  return listenToTable<Payment>('payments', businessId, callback, { orderBy: 'recorded_at', orderDir: 'desc' });
}

export async function recordPayment(
  businessId: string,
  payload: {
    orderId: string;
    customerId: string;
    customerName: string;
    orderNumber: string;
    amount: number;
    method: PaymentMethod;
    mpesaCode?: string;
    description?: string;
    actorUid: string;
    actorName: string;
  }
) {
  // ── Offline path ─────────────────────────────────────────────────────────
  // Queue the payment row and optimistically reconcile order/customer
  // balances from cached values; the sync engine replays them online.
  const recordOffline = async () => {
    const now = new Date().toISOString();
    await offlineCreate(businessId, 'payments', {
      businessId,
      customerId: payload.customerId, customerName: payload.customerName,
      orderId: payload.orderId, orderNumber: payload.orderNumber,
      amount: payload.amount, method: payload.method,
      mpesaCode: payload.mpesaCode ?? null,
      description: payload.description ?? "",
      recordedByUid: payload.actorUid, recordedByName: payload.actorName,
      recordedAt: now,
    }, 'high');

    const cachedOrder = await getCachedById<Order>('orders', businessId, payload.orderId);
    if (cachedOrder) {
      const nextPaid = Number(cachedOrder.amountPaid ?? 0) + payload.amount;
      const nextBalance = Math.max(0, Number(cachedOrder.subtotalAmount ?? 0) + Number(cachedOrder.deliveryFee ?? 0) - nextPaid);
      await offlineUpdate(businessId, 'orders', payload.orderId, {
        amountPaid: nextPaid,
        balanceAmount: nextBalance,
        paymentStatus: nextBalance === 0 ? "paid" : "partial",
      }, 'high');
    }

    const cachedCustomer = await getCachedById<Customer>('customers', businessId, payload.customerId);
    if (cachedCustomer) {
      await offlineUpdate(businessId, 'customers', payload.customerId, {
        outstandingBalance: Math.max(0, Number(cachedCustomer.outstandingBalance ?? 0) - payload.amount),
      }, 'high');
    }
  };
  if (isOffline()) return recordOffline();

  const { data: orderData, error: orderFetchError } = await supabase
    .from('orders')
    .select('amount_paid, subtotal_amount, delivery_fee')
    .eq('id', payload.orderId)
    .single();
  if (orderFetchError && isNetworkError(orderFetchError)) return recordOffline();
  if (!orderData) {
    throw new Error("Order not found.");
  }

  const currentPaid = Number((orderData as any).amount_paid ?? 0);
  const subtotal = Number((orderData as any).subtotal_amount ?? 0);
  const deliveryFee = Number((orderData as any).delivery_fee ?? 0);
  const nextPaid = currentPaid + payload.amount;
  const nextBalance = Math.max(0, subtotal + deliveryFee - nextPaid);
  const nextStatus = nextBalance === 0 ? "paid" : "partial";

  await supabase
    .from('payments')
    .insert(transformKeysToSnake({
      businessId,
      customerId: payload.customerId,
      customerName: payload.customerName,
      orderId: payload.orderId,
      orderNumber: payload.orderNumber,
      amount: payload.amount,
      method: payload.method,
      mpesaCode: payload.mpesaCode,
      description: payload.description,
      recordedByUid: payload.actorUid,
      recordedByName: payload.actorName,
    } as unknown as Record<string, unknown>));

  await supabase
    .from('orders')
    .update({
      amount_paid: nextPaid,
      balance_amount: nextBalance,
      payment_status: nextStatus,
    } as any)
    .eq('id', payload.orderId)
    .eq('business_id', businessId);

  const { data: customerData } = await supabase
    .from('customers')
    .select('outstanding_balance')
    .eq('id', payload.customerId)
    .single();
  if (customerData) {
    const currentBalance = Number((customerData as any).outstanding_balance ?? 0);
    await supabase
      .from('customers')
      .update({ outstanding_balance: Math.max(0, currentBalance - payload.amount) } as any)
      .eq('id', payload.customerId);
  }
}

// â”€â”€â”€ EXPENSES â”€â”€â”€

export async function createExpense(
  businessId: string,
  payload: {
    category: ExpenseCategory;
    amount: number;
    description: string;
    notes?: string;
    receiptUrl?: string;
    supplierId?: string;
    supplierName?: string;
    expenseDate: Date;
    actorUid: string;
    actorName: string;
  }
) {
  // ── Offline path ─────────────────────────────────────────────────────────
  const createOffline = async () => {
    const expenseId = await offlineCreate(businessId, 'expenses', {
      businessId,
      category: payload.category, amount: payload.amount,
      description: payload.description, notes: payload.notes ?? "",
      receiptUrl: payload.receiptUrl ?? "",
      supplierId: payload.supplierId ?? null, supplierName: payload.supplierName ?? "",
      expenseDate: payload.expenseDate.toISOString(),
      createdByUid: payload.actorUid, createdByName: payload.actorName,
    });
    await offlineCreate(businessId, 'transactions', {
      businessId,
      type: "expense",
      amount: -Math.abs(payload.amount),
      description: `Expense: ${payload.description}`,
      referenceId: expenseId,
      referenceType: "expense",
      referenceLabel: payload.category,
      linkedEntityId: payload.supplierId ?? null,
      linkedEntityType: payload.supplierId ? "supplier" : "",
      linkedEntityName: payload.supplierName ?? "",
      performedByUid: payload.actorUid,
      performedByName: payload.actorName,
      status: "completed",
      notes: payload.notes ?? "",
    });
    return expenseId;
  };
  if (isOffline()) return createOffline();

  const { data: expenseData, error: expenseError } = await supabase
    .from('expenses')
    .insert(transformKeysToSnake({
      businessId,
      ...branchFields('expenses'),
      category: payload.category,
      amount: payload.amount,
      description: payload.description,
      notes: payload.notes ?? "",
      receiptUrl: payload.receiptUrl ?? "",
      supplierId: payload.supplierId ?? null,
      supplierName: payload.supplierName ?? "",
      expenseDate: payload.expenseDate.toISOString(),
      createdByUid: payload.actorUid,
      createdByName: payload.actorName,
    } as unknown as Record<string, unknown>))
    .select('id')
    .single();
  if (expenseError && isNetworkError(expenseError)) return createOffline();
  if (expenseError || !expenseData) throw expenseError || new Error("Failed to create expense");

  await supabase
    .from('transactions')
    .insert(transformKeysToSnake({
      businessId,
      ...branchFields('transactions'),
      type: "expense",
      amount: -Math.abs(payload.amount),
      description: `Expense: ${payload.description}`,
      referenceId: expenseData.id,
      referenceType: "expense",
      referenceLabel: payload.category,
      linkedEntityId: payload.supplierId ?? null,
      linkedEntityType: payload.supplierId ? "supplier" : "",
      linkedEntityName: payload.supplierName ?? "",
      performedByUid: payload.actorUid,
      performedByName: payload.actorName,
      status: "completed",
      notes: payload.notes ?? "",
    } as unknown as Record<string, unknown>));

  return expenseData.id;
}

export async function updateExpense(
  businessId: string,
  expenseId: string,
  payload: Partial<Omit<Expense, "id" | "businessId" | "createdAt" | "createdByUid" | "createdByName">>
) {
  const rawDate = (payload as any).expenseDate;
  const expenseDate = rawDate instanceof Date
    ? rawDate.toISOString()
    : typeof rawDate === "string" && rawDate
    ? new Date(rawDate).toISOString()
    : undefined;
  return withOfflineFallback(
    async () => {
      const snakePayload = transformKeysToSnake({
        ...payload,
        expenseDate,
      } as unknown as Record<string, unknown>);

      const { error } = await supabase
        .from('expenses')
        .update(snakePayload as any)
        .eq('id', expenseId)
        .eq('business_id', businessId);
      if (error) throw error;

      const { data: existingTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference_id', expenseId)
        .eq('business_id', businessId);

      if (existingTx) {
        for (const tx of existingTx) {
          await supabase
            .from('transactions')
            .update({
              amount: payload.amount !== undefined ? -Math.abs(payload.amount) : (tx as any).amount,
              description: payload.description ? `Expense: ${payload.description}` : (tx as any).description,
              reference_label: payload.category ?? (tx as any).reference_label,
              linked_entity_id: payload.supplierId ?? (tx as any).linked_entity_id ?? null,
              linked_entity_name: payload.supplierName ?? (tx as any).linked_entity_name ?? "",
              notes: payload.notes ?? (tx as any).notes ?? "",
            } as any)
            .eq('id', (tx as any).id);
        }
      }
    },
    async () => {
      await offlineUpdate(businessId, 'expenses', expenseId, {
        ...payload,
        expenseDate,
      } as unknown as Record<string, unknown>);
      const cachedTxs = await getCachedCollection<Transaction>('transactions', businessId).catch(() => [] as Transaction[]);
      for (const tx of cachedTxs.filter((t) => (t as any).referenceId === expenseId)) {
        await offlineUpdate(businessId, 'transactions', tx.id, {
          amount: payload.amount !== undefined ? -Math.abs(payload.amount) : (tx as any).amount,
          description: payload.description ? `Expense: ${payload.description}` : (tx as any).description,
          referenceLabel: payload.category ?? (tx as any).referenceLabel,
          linkedEntityId: payload.supplierId ?? (tx as any).linkedEntityId ?? null,
          linkedEntityName: payload.supplierName ?? (tx as any).linkedEntityName ?? "",
          notes: payload.notes ?? (tx as any).notes ?? "",
        });
      }
    }
  );
}

export async function deleteExpense(businessId: string, expenseId: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId).eq('business_id', businessId);
      if (error) throw error;
      const { data: txs } = await supabase
        .from('transactions')
        .select('id')
        .eq('reference_id', expenseId)
        .eq('business_id', businessId);
      if (txs) {
        for (const tx of txs) {
          await supabase.from('transactions').delete().eq('id', (tx as any).id);
        }
      }
    },
    async () => {
      await offlineDelete(businessId, 'expenses', expenseId);
      const cachedTxs = await getCachedCollection<Transaction>('transactions', businessId).catch(() => [] as Transaction[]);
      for (const tx of cachedTxs.filter((t) => (t as any).referenceId === expenseId)) {
        await offlineDelete(businessId, 'transactions', tx.id);
      }
    }
  );
}

export async function fetchExpenseById(businessId: string, expenseId: string): Promise<Expense | null> {
  if (isOffline()) {
    return getCachedById<Expense>('expenses', businessId, expenseId);
  }
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) return getCachedById<Expense>('expenses', businessId, expenseId);
  if (!data) return null;
  return transformKeysToCamel<Expense>(data as Record<string, unknown>);
}

export function listenExpenses(businessId: string, callback: (rows: Expense[]) => void) {
  return listenToTable<Expense>('expenses', businessId, callback, { orderBy: 'expense_date', orderDir: 'desc' });
}

export function listenExpensesByCategory(businessId: string, category: ExpenseCategory, callback: (rows: Expense[]) => void) {
  let destroyed = false;
  const serveCache = async () => {
    const cached = await getCachedCollection<Expense>('expenses', businessId).catch(() => []);
    const filtered = cached.filter((e) => e.category === category);
    if (!destroyed && filtered.length > 0) callback(filtered);
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) {
      await serveCache();
      return;
    }
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('business_id', businessId)
      .eq('category', category)
      .order('expense_date', { ascending: false });
    if (data && !destroyed) callback(transformArrayToCamel<Expense>(data as Record<string, unknown>[]));
    else if (!destroyed && error) await serveCache();
  };
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['expenses'], fetchAndCallback);
  const channel = supabase
    .channel(`expenses-cat-${businessId}-${category}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

export async function fetchExpensesInRange(businessId: string, startDate: Date, endDate: Date): Promise<Expense[]> {
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('business_id', businessId)
    .gte('expense_date', startDate.toISOString())
    .lte('expense_date', endDate.toISOString())
    .order('expense_date', { ascending: false });
  return transformArrayToCamel<Expense>((data as Record<string, unknown>[]) || []);
}

// â”€â”€â”€ WITHDRAWALS â”€â”€â”€

export async function createWithdrawal(
  businessId: string,
  payload: {
    amount: number;
    reason: string;
    category: WithdrawalCategory;
    withdrawalDate: Date;
    notes?: string;
    actorUid: string;
    actorName: string;
  }
) {
  // ── Offline path ─────────────────────────────────────────────────────────
  const createOffline = async () => {
    const withdrawalId = await offlineCreate(businessId, 'withdrawals', {
      businessId,
      amount: payload.amount, reason: payload.reason, category: payload.category,
      withdrawnByUid: payload.actorUid, withdrawnByName: payload.actorName,
      withdrawalDate: payload.withdrawalDate.toISOString(),
      notes: payload.notes ?? "",
    });
    await offlineCreate(businessId, 'transactions', {
      businessId,
      type: "withdrawal",
      amount: -Math.abs(payload.amount),
      description: `Withdrawal: ${payload.reason}`,
      referenceId: withdrawalId,
      referenceType: "withdrawal",
      referenceLabel: payload.category,
      performedByUid: payload.actorUid,
      performedByName: payload.actorName,
      status: "completed",
      notes: payload.notes ?? "",
    });
    return withdrawalId;
  };
  if (isOffline()) return createOffline();

  const { data: withdrawalData, error: withdrawalError } = await supabase
    .from('withdrawals')
    .insert(transformKeysToSnake({
      businessId,
      ...branchFields('withdrawals'),
      amount: payload.amount,
      reason: payload.reason,
      category: payload.category,
      withdrawnByUid: payload.actorUid,
      withdrawnByName: payload.actorName,
      withdrawalDate: payload.withdrawalDate.toISOString(),
      notes: payload.notes ?? "",
    } as unknown as Record<string, unknown>))
    .select('id')
    .single();
  if (withdrawalError && isNetworkError(withdrawalError)) return createOffline();
  if (withdrawalError || !withdrawalData) throw withdrawalError || new Error("Failed to create withdrawal");

  await supabase
    .from('transactions')
    .insert(transformKeysToSnake({
      businessId,
      ...branchFields('transactions'),
      type: "withdrawal",
      amount: -Math.abs(payload.amount),
      description: `Withdrawal: ${payload.reason}`,
      referenceId: withdrawalData.id,
      referenceType: "withdrawal",
      referenceLabel: payload.category,
      performedByUid: payload.actorUid,
      performedByName: payload.actorName,
      status: "completed",
      notes: payload.notes ?? "",
    } as unknown as Record<string, unknown>));

  return withdrawalData.id;
}

export async function updateWithdrawal(
  businessId: string,
  withdrawalId: string,
  payload: Partial<Omit<Withdrawal, "id" | "businessId" | "createdAt" | "withdrawnByUid" | "withdrawnByName">>
) {
  const rawWdDate = (payload as any).withdrawalDate;
  const withdrawalDate = rawWdDate instanceof Date
    ? rawWdDate.toISOString()
    : typeof rawWdDate === "string" && rawWdDate
    ? new Date(rawWdDate).toISOString()
    : undefined;
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('withdrawals')
        .update(transformKeysToSnake({
          ...payload,
          withdrawalDate,
        } as unknown as Record<string, unknown>))
        .eq('id', withdrawalId)
        .eq('business_id', businessId);
      if (error) throw error;

      const { data: existingTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference_id', withdrawalId)
        .eq('business_id', businessId);

      if (existingTx) {
        for (const tx of existingTx) {
          await supabase
            .from('transactions')
            .update({
              amount: payload.amount !== undefined ? -Math.abs(payload.amount) : (tx as any).amount,
              description: payload.reason ? `Withdrawal: ${payload.reason}` : (tx as any).description,
              reference_label: payload.category ?? (tx as any).reference_label,
              notes: payload.notes ?? (tx as any).notes ?? "",
            } as any)
            .eq('id', (tx as any).id);
        }
      }
    },
    async () => {
      await offlineUpdate(businessId, 'withdrawals', withdrawalId, {
        ...payload,
        withdrawalDate,
      } as unknown as Record<string, unknown>);
      const cachedTxs = await getCachedCollection<Transaction>('transactions', businessId).catch(() => [] as Transaction[]);
      for (const tx of cachedTxs.filter((t) => (t as any).referenceId === withdrawalId)) {
        await offlineUpdate(businessId, 'transactions', tx.id, {
          amount: payload.amount !== undefined ? -Math.abs(payload.amount) : (tx as any).amount,
          description: payload.reason ? `Withdrawal: ${payload.reason}` : (tx as any).description,
          referenceLabel: payload.category ?? (tx as any).referenceLabel,
          notes: payload.notes ?? (tx as any).notes ?? "",
        });
      }
    }
  );
}

export async function deleteWithdrawal(businessId: string, withdrawalId: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase.from('withdrawals').delete().eq('id', withdrawalId).eq('business_id', businessId);
      if (error) throw error;
      const { data: txs } = await supabase
        .from('transactions')
        .select('id')
        .eq('reference_id', withdrawalId)
        .eq('business_id', businessId);
      if (txs) {
        for (const tx of txs) {
          await supabase.from('transactions').delete().eq('id', (tx as any).id);
        }
      }
    },
    async () => {
      await offlineDelete(businessId, 'withdrawals', withdrawalId);
      const cachedTxs = await getCachedCollection<Transaction>('transactions', businessId).catch(() => [] as Transaction[]);
      for (const tx of cachedTxs.filter((t) => (t as any).referenceId === withdrawalId)) {
        await offlineDelete(businessId, 'transactions', tx.id);
      }
    }
  );
}

export async function fetchWithdrawalById(businessId: string, withdrawalId: string): Promise<Withdrawal | null> {
  if (isOffline()) {
    return getCachedById<Withdrawal>('withdrawals', businessId, withdrawalId);
  }
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('id', withdrawalId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) return getCachedById<Withdrawal>('withdrawals', businessId, withdrawalId);
  if (!data) return null;
  return transformKeysToCamel<Withdrawal>(data as Record<string, unknown>);
}

export function listenWithdrawals(businessId: string, callback: (rows: Withdrawal[]) => void) {
  return listenToTable<Withdrawal>('withdrawals', businessId, callback, { orderBy: 'withdrawal_date', orderDir: 'desc' });
}

export function listenWithdrawalsByCategory(businessId: string, category: WithdrawalCategory, callback: (rows: Withdrawal[]) => void) {
  let destroyed = false;
  const serveCache = async () => {
    const cached = await getCachedCollection<Withdrawal>('withdrawals', businessId).catch(() => []);
    const filtered = cached.filter((w) => w.category === category);
    if (!destroyed && filtered.length > 0) callback(filtered);
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) {
      await serveCache();
      return;
    }
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('business_id', businessId)
      .eq('category', category)
      .order('withdrawal_date', { ascending: false });
    if (data && !destroyed) callback(transformArrayToCamel<Withdrawal>(data as Record<string, unknown>[]));
    else if (!destroyed && error) await serveCache();
  };
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['withdrawals'], fetchAndCallback);
  const channel = supabase
    .channel(`withdrawals-cat-${businessId}-${category}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

export async function fetchWithdrawalsInRange(businessId: string, startDate: Date, endDate: Date): Promise<Withdrawal[]> {
  const { data } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('business_id', businessId)
    .gte('withdrawal_date', startDate.toISOString())
    .lte('withdrawal_date', endDate.toISOString())
    .order('withdrawal_date', { ascending: false });
  return transformArrayToCamel<Withdrawal>((data as Record<string, unknown>[]) || []);
}

// â”€â”€â”€ INVESTMENTS â”€â”€â”€

export async function createInvestment(
  businessId: string,
  payload: {
    type: string;
    amount: number;
    description: string;
    notes?: string;
    investmentDate: Date;
    returnExpected?: number;
    actorUid: string;
    actorName: string;
  }
) {
  const record = {
    businessId,
    type: payload.type,
    amount: payload.amount,
    description: payload.description,
    notes: payload.notes ?? "",
    investmentDate: payload.investmentDate.toISOString(),
    returnExpected: payload.returnExpected ?? 0,
    returnActual: 0,
    status: "active",
    createdByUid: payload.actorUid,
    createdByName: payload.actorName,
  };
  return withOfflineFallback(
    async () => {
      const { data, error } = await supabase
        .from('investments')
        .insert(transformKeysToSnake(record as unknown as Record<string, unknown>))
        .select('id')
        .single();
      if (error || !data) throw error || new Error("Failed to create investment");
      return data.id as string;
    },
    () => offlineCreate(businessId, 'investments', record as unknown as Record<string, unknown>)
  );
}

export async function updateInvestment(
  businessId: string,
  investmentId: string,
  payload: Partial<Omit<Investment, "id" | "businessId" | "createdAt" | "createdByUid" | "createdByName">>
) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('investments')
        .update(transformKeysToSnake(payload as unknown as Record<string, unknown>))
        .eq('id', investmentId)
        .eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineUpdate(businessId, 'investments', investmentId, payload as unknown as Record<string, unknown>)
  );
}

export async function deleteInvestment(businessId: string, investmentId: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase.from('investments').delete().eq('id', investmentId).eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineDelete(businessId, 'investments', investmentId)
  );
}

export function listenInvestments(businessId: string, callback: (rows: Investment[]) => void) {
  return listenToTable<Investment>('investments', businessId, callback, { orderBy: 'investment_date', orderDir: 'desc' });
}

// â”€â”€â”€ SAVINGS â”€â”€â”€

export async function createSavingsGoal(
  businessId: string,
  payload: {
    name: string;
    targetAmount: number;
    deadline?: string;
    description?: string;
    color?: string;
    actorUid: string;
    actorName: string;
  }
) {
  const record = {
    businessId,
    name: payload.name,
    targetAmount: payload.targetAmount,
    currentAmount: 0,
    deadline: payload.deadline ?? null,
    description: payload.description ?? "",
    color: payload.color ?? "#059669",
    status: "active",
    createdByUid: payload.actorUid,
    createdByName: payload.actorName,
  };
  return withOfflineFallback(
    async () => {
      const { data, error } = await supabase
        .from('savings_goals')
        .insert(transformKeysToSnake(record as unknown as Record<string, unknown>))
        .select('id')
        .single();
      if (error || !data) throw error || new Error("Failed to create savings goal");
      return data.id as string;
    },
    () => offlineCreate(businessId, 'savings_goals', record as unknown as Record<string, unknown>)
  );
}

export async function updateSavingsGoal(
  businessId: string,
  goalId: string,
  payload: Partial<Omit<SavingsGoal, "id" | "businessId" | "createdAt" | "createdByUid" | "createdByName">>
) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('savings_goals')
        .update(transformKeysToSnake({ ...payload, updatedAt: new Date().toISOString() } as unknown as Record<string, unknown>))
        .eq('id', goalId)
        .eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineUpdate(businessId, 'savings_goals', goalId, payload as unknown as Record<string, unknown>)
  );
}

export async function deleteSavingsGoal(businessId: string, goalId: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase.from('savings_goals').delete().eq('id', goalId).eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineDelete(businessId, 'savings_goals', goalId)
  );
}

export function listenSavingsGoals(businessId: string, callback: (rows: SavingsGoal[]) => void) {
  return listenToTable<SavingsGoal>('savings_goals', businessId, callback, { orderBy: 'created_at', orderDir: 'desc' });
}

export async function createSavingsDeposit(
  businessId: string,
  payload: {
    goalId: string;
    amount: number;
    notes?: string;
    depositDate: Date;
    actorUid: string;
    actorName: string;
  }
) {
  const record = {
    businessId,
    goalId: payload.goalId,
    amount: payload.amount,
    notes: payload.notes ?? "",
    depositDate: payload.depositDate.toISOString(),
    createdByUid: payload.actorUid,
    createdByName: payload.actorName,
  };
  return withOfflineFallback(
    async () => {
      const { data, error } = await supabase
        .from('savings_deposits')
        .insert(transformKeysToSnake(record as unknown as Record<string, unknown>))
        .select('id')
        .single();
      if (error || !data) throw error || new Error("Failed to record deposit");

      const { data: goal } = await supabase
        .from('savings_goals')
        .select('current_amount, target_amount')
        .eq('id', payload.goalId)
        .single();
      if (goal) {
        const newAmount = Number((goal as any).current_amount ?? 0) + payload.amount;
        const isComplete = newAmount >= Number((goal as any).target_amount ?? 0);
        await supabase
          .from('savings_goals')
          .update({ current_amount: newAmount, status: isComplete ? 'completed' : 'active', updated_at: new Date().toISOString() } as any)
          .eq('id', payload.goalId);
      }

      return data.id as string;
    },
    async () => {
      const depositId = await offlineCreate(businessId, 'savings_deposits', record as unknown as Record<string, unknown>);
      const cachedGoal = await getCachedById<SavingsGoal>('savings_goals', businessId, payload.goalId);
      if (cachedGoal) {
        const newAmount = Number(cachedGoal.currentAmount ?? 0) + payload.amount;
        const isComplete = newAmount >= Number(cachedGoal.targetAmount ?? 0);
        await offlineUpdate(businessId, 'savings_goals', payload.goalId, {
          currentAmount: newAmount,
          status: isComplete ? 'completed' : 'active',
        });
      }
      return depositId;
    }
  );
}

export async function deleteSavingsDeposit(businessId: string, depositId: string, goalId: string, amount: number) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase.from('savings_deposits').delete().eq('id', depositId).eq('business_id', businessId);
      if (error) throw error;
      const { data: goal } = await supabase.from('savings_goals').select('current_amount').eq('id', goalId).single();
      if (goal) {
        const newAmount = Math.max(0, Number((goal as any).current_amount ?? 0) - amount);
        await supabase.from('savings_goals').update({ current_amount: newAmount, status: 'active', updated_at: new Date().toISOString() } as any).eq('id', goalId);
      }
    },
    async () => {
      await offlineDelete(businessId, 'savings_deposits', depositId);
      const cachedGoal = await getCachedById<SavingsGoal>('savings_goals', businessId, goalId);
      if (cachedGoal) {
        await offlineUpdate(businessId, 'savings_goals', goalId, {
          currentAmount: Math.max(0, Number(cachedGoal.currentAmount ?? 0) - amount),
          status: 'active',
        });
      }
    }
  );
}

export function listenSavingsDeposits(businessId: string, goalId: string, callback: (rows: SavingsDeposit[]) => void) {
  let destroyed = false;
  const serveCache = async () => {
    const cached = await getCachedCollection<SavingsDeposit>('savings_deposits', businessId).catch(() => []);
    const filtered = cached.filter((d) => (d as any).goalId === goalId);
    if (!destroyed && filtered.length > 0) callback(filtered);
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) {
      await serveCache();
      return;
    }
    const { data, error } = await supabase
      .from('savings_deposits')
      .select('*')
      .eq('business_id', businessId)
      .eq('goal_id', goalId)
      .order('deposit_date', { ascending: false });
    if (data && !destroyed) {
      const rows = transformArrayToCamel<SavingsDeposit>(data as Record<string, unknown>[]);
      callback(rows);
      cacheCollection('savings_deposits', businessId, rows as unknown as Array<Record<string, unknown>>, false).catch(() => {});
    } else if (!destroyed && error) {
      await serveCache();
    }
  };
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['savings_deposits'], fetchAndCallback);
  const channel = supabase
    .channel(`savings-deposits-${businessId}-${goalId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_deposits', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

// â”€â”€â”€ TRANSACTIONS â”€â”€â”€

export function listenTransactions(businessId: string, callback: (rows: Transaction[]) => void) {
  return listenToTable<Transaction>('transactions', businessId, callback, { orderBy: 'created_at', orderDir: 'desc' });
}

export async function recordTransaction(
  businessId: string,
  payload: {
    type: Transaction["type"];
    amount: number;
    description: string;
    referenceId?: string;
    referenceType?: string;
    referenceLabel?: string;
    linkedEntityId?: string;
    linkedEntityType?: string;
    linkedEntityName?: string;
    performedByUid: string;
    performedByName: string;
    status: Transaction["status"];
    notes?: string;
  }
) {
  return withOfflineFallback(
    async () => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transformKeysToSnake({
          businessId,
          ...payload,
        } as unknown as Record<string, unknown>))
        .select('id')
        .single();
      if (error || !data) throw error || new Error("Failed to record transaction");
      return data.id as string;
    },
    () => offlineCreate(businessId, 'transactions', { businessId, ...payload } as unknown as Record<string, unknown>)
  );
}

// â”€â”€â”€ NOTIFICATIONS â”€â”€â”€

export async function createNotification(input: {
  businessId: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, string>;
}) {
  const record = {
    businessId: input.businessId,
    recipientUid: input.recipientUid,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? "",
    read: false,
    archived: false,
    metadata: input.metadata ?? {},
  };
  return withOfflineFallback(
    async () => {
      const { data, error } = await supabase
        .from('notifications')
        .insert(transformKeysToSnake(record as unknown as Record<string, unknown>))
        .select('id')
        .single();
      if (error || !data) throw error || new Error("Failed to create notification");
      return data.id as string;
    },
    () => offlineCreate(input.businessId, 'notifications', record as unknown as Record<string, unknown>, 'low')
  );
}

export async function createNotificationForAllMembers(
  businessId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  excludeUid?: string
) {
  // Offline: resolve the member list from cache and queue one notification each
  const members = isOffline()
    ? await getCachedCollection<UserProfile>('members', businessId).catch(() => [] as UserProfile[])
    : await fetchMembers(businessId);
  for (const member of members) {
    if (member.uid === excludeUid) continue;
    if (!member.active) continue;
    await createNotification({
      businessId,
      recipientUid: member.uid,
      type,
      title,
      message,
      link,
    }).catch(() => {});
  }
}

export function listenNotifications(
  businessId: string,
  recipientUid: string,
  callback: (notifications: Notification[]) => void
) {
  let destroyed = false;
  const serveCache = async () => {
    const cached = await getCachedCollection<Notification>('notifications', businessId).catch(() => []);
    const mine = cached
      .filter((n) => (n as any).recipientUid === recipientUid && !(n as any).archived)
      .sort((a, b) => String((b as any).createdAt ?? '').localeCompare(String((a as any).createdAt ?? '')));
    if (!destroyed) callback(mine);
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) {
      await serveCache();
      return;
    }
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('business_id', businessId)
      .eq('recipient_uid', recipientUid)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(50);
    if (destroyed) return;
    if (!data) {
      if (error) await serveCache();
      return;
    }

    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const expiredIds: string[] = [];
    const valid: Record<string, unknown>[] = [];

    for (const row of data) {
      const createdAt = toDate((row as any).created_at);
      if (createdAt && createdAt.getTime() < cutoff) {
        expiredIds.push((row as any).id);
      } else {
        valid.push(row);
      }
    }

    if (expiredIds.length > 0) {
      await supabase.from('notifications').delete().in('id', expiredIds);
    }

    const rows = transformArrayToCamel<Notification>(valid);
    callback(rows);
    cacheCollection('notifications', businessId, rows as unknown as Array<Record<string, unknown>>, false).catch(() => {});
  };
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['notifications'], fetchAndCallback);
  const channel = supabase
    .channel(`notifications-${businessId}-${recipientUid}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

export function listenUnreadCount(
  businessId: string,
  recipientUid: string,
  callback: (count: number) => void
) {
  let destroyed = false;
  const serveCache = async () => {
    const cached = await getCachedCollection<Notification>('notifications', businessId).catch(() => []);
    const count = cached.filter(
      (n) => (n as any).recipientUid === recipientUid && !(n as any).read && !(n as any).archived
    ).length;
    if (!destroyed) callback(count);
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) {
      await serveCache();
      return;
    }
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('recipient_uid', recipientUid)
      .eq('read', false)
      .eq('archived', false);
    if (destroyed) return;
    if (error) {
      await serveCache();
      return;
    }
    callback(count ?? 0);
  };
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['notifications'], fetchAndCallback);
  const channel = supabase
    .channel(`unread-count-${businessId}-${recipientUid}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

export async function markNotificationRead(businessId: string, notificationId: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineUpdate(businessId, 'notifications', notificationId, { read: true }, 'low')
  );
}

export async function markAllNotificationsRead(businessId: string, recipientUid: string) {
  return withOfflineFallback(
    async () => {
      const { data: unread, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('business_id', businessId)
        .eq('recipient_uid', recipientUid)
        .eq('read', false)
        .eq('archived', false);
      if (error) throw error;

      if (unread) {
        for (const n of unread) {
          await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', (n as any).id);
        }
      }
    },
    async () => {
      const cached = await getCachedCollection<Notification>('notifications', businessId).catch(() => [] as Notification[]);
      const unread = cached.filter(
        (n) => (n as any).recipientUid === recipientUid && !(n as any).read && !(n as any).archived
      );
      for (const n of unread) {
        await offlineUpdate(businessId, 'notifications', n.id, { read: true }, 'low');
      }
    }
  );
}

export async function archiveNotification(businessId: string, notificationId: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ archived: true })
        .eq('id', notificationId)
        .eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineUpdate(businessId, 'notifications', notificationId, { archived: true }, 'low')
  );
}

export async function deleteNotification(businessId: string, notificationId: string) {
  return withOfflineFallback(
    async () => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('business_id', businessId);
      if (error) throw error;
    },
    () => offlineDelete(businessId, 'notifications', notificationId, 'low')
  );
}

export async function bulkArchiveNotifications(businessId: string, recipientUid: string) {
  return withOfflineFallback(
    async () => {
      const { data: toArchive, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('business_id', businessId)
        .eq('recipient_uid', recipientUid)
        .eq('archived', false);
      if (error) throw error;

      if (toArchive) {
        for (const n of toArchive) {
          await supabase
            .from('notifications')
            .update({ archived: true })
            .eq('id', (n as any).id);
        }
      }
    },
    async () => {
      const cached = await getCachedCollection<Notification>('notifications', businessId).catch(() => [] as Notification[]);
      const toArchive = cached.filter(
        (n) => (n as any).recipientUid === recipientUid && !(n as any).archived
      );
      for (const n of toArchive) {
        await offlineUpdate(businessId, 'notifications', n.id, { archived: true }, 'low');
      }
    }
  );
}

export async function cleanupOldNotifications() {
  if (isOffline()) return;
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: old } = await supabase
    .from('notifications')
    .select('id')
    .lt('created_at', fortyEightHoursAgo);

  if (old && old.length > 0) {
    const ids = old.map((n: any) => n.id);
    await supabase.from('notifications').delete().in('id', ids);
  }
}

// â”€â”€â”€ CONVERSATIONS â”€â”€â”€

export async function createConversation(input: {
  businessId: string;
  participants: string[];
  participantProfiles: Array<{
    uid: string;
    displayName: string;
    photoURL?: string;
  }>;
  type: ConversationType;
  title?: string;
  priority?: AnnouncementPriority;
}) {
  const record = {
    businessId: input.businessId,
    participants: input.participants,
    participantProfiles: input.participantProfiles.map((p) => ({
      uid: p.uid,
      displayName: p.displayName ?? "User",
      photoURL: p.photoURL || undefined,
    })),
    type: input.type,
    title: input.title ?? "",
    priority: input.priority ?? "normal",
    pinned: false,
  };
  return withOfflineFallback(
    async () => {
      const { data, error } = await supabase
        .from('conversations')
        .insert(transformKeysToSnake(record as unknown as Record<string, unknown>))
        .select('id')
        .single();
      if (error || !data) throw error || new Error("Failed to create conversation");
      return data.id as string;
    },
    () => offlineCreate(input.businessId, 'conversations', record as unknown as Record<string, unknown>, 'high')
  );
}

export function listenConversations(
  businessId: string,
  uid: string,
  callback: (conversations: Conversation[]) => void
) {
  let destroyed = false;
  const serveCache = async () => {
    const cached = await getCachedCollection<Conversation>('conversations', businessId).catch(() => []);
    const mine = cached
      .filter((c) => (c.participants ?? []).includes(uid))
      .sort((a, b) => String((b as any).updatedAt ?? '').localeCompare(String((a as any).updatedAt ?? '')));
    if (!destroyed && mine.length > 0) callback(mine);
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) {
      await serveCache();
      return;
    }
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('business_id', businessId)
      .contains('participants', [uid])
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(50);
    if (data && !destroyed) {
      const rows = transformArrayToCamel<Conversation>(data as Record<string, unknown>[]);
      callback(rows);
      cacheCollection('conversations', businessId, rows as unknown as Array<Record<string, unknown>>, false).catch(() => {});
    } else if (!destroyed && error) {
      await serveCache();
    }
  };
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['conversations'], fetchAndCallback);
  const channel = supabase
    .channel(`conversations-${businessId}-${uid}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

export function listenUnreadMessageCount(
  businessId: string,
  uid: string,
  callback: (count: number) => void
) {
  let destroyed = false;
  const countUnread = (rows: Conversation[]) =>
    rows.filter((c) => (c.participants ?? []).includes(uid) && c.lastMessage && c.lastMessage.senderUid !== uid).length;
  const serveCache = async () => {
    const cached = await getCachedCollection<Conversation>('conversations', businessId).catch(() => []);
    if (!destroyed) callback(countUnread(cached));
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) {
      await serveCache();
      return;
    }
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('business_id', businessId)
      .contains('participants', [uid])
      .order('updated_at', { ascending: false });
    if (destroyed) return;
    if (!data) {
      if (error) await serveCache();
      return;
    }
    callback(countUnread(transformArrayToCamel<Conversation>(data as Record<string, unknown>[])));
  };
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['conversations'], fetchAndCallback);
  const channel = supabase
    .channel(`unread-msg-${businessId}-${uid}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

export async function getUnreadConversationCount(
  businessId: string,
  uid: string
): Promise<number> {
  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('business_id', businessId)
    .contains('participants', [uid]);

  if (!data) return 0;

  let count = 0;
  for (const conv of data) {
    const convData = transformKeysToCamel<Conversation>(conv as Record<string, unknown>);
    if (convData.lastMessage && convData.lastMessage.senderUid !== uid) {
      count += 1;
    }
  }

  return count;
}

export async function markConversationRead(
  businessId: string,
  conversationId: string,
  uid: string
) {
  if (isOffline()) {
    const cached = await getCachedCollection<Message>('messages', businessId).catch(() => [] as Message[]);
    const convoMessages = cached.filter((m) => (m as any).conversationId === conversationId);
    for (const msg of convoMessages) {
      const readBy: string[] = ((msg as any).readBy as string[]) || [];
      if (!readBy.includes(uid)) {
        await offlineUpdate(businessId, 'messages', msg.id, { readBy: [...readBy, uid] }, 'low');
      }
    }
    return;
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('id, read_by')
    .eq('conversation_id', conversationId);

  if (!messages) return;

  for (const msg of messages) {
    const readBy: string[] = (msg as any).read_by || [];
    if (!readBy.includes(uid)) {
      readBy.push(uid);
      await supabase
        .from('messages')
        .update({ read_by: readBy as any })
        .eq('id', (msg as any).id);
    }
  }
}

// â”€â”€â”€ MESSAGES â”€â”€â”€

export async function sendMessage(input: {
  businessId: string;
  conversationId: string;
  senderUid: string;
  senderName: string;
  text: string;
  attachments?: Array<{
    type: "image" | "file";
    url: string;
    name?: string;
  }>;
}) {
  const record = {
    conversationId: input.conversationId,
    businessId: input.businessId,
    senderUid: input.senderUid,
    senderName: input.senderName ?? "User",
    text: input.text,
    attachments: input.attachments ?? [],
    readBy: [input.senderUid],
  };
  return withOfflineFallback(
    async () => {
      const { data: messageData, error } = await supabase
        .from('messages')
        .insert(transformKeysToSnake(record as unknown as Record<string, unknown>))
        .select('id')
        .single();
      if (error || !messageData) throw error || new Error("Failed to send message");

      await supabase
        .from('conversations')
        .update({
          last_message: {
            messageId: messageData.id,
            text: input.text,
            senderUid: input.senderUid,
            senderName: input.senderName ?? "User",
            createdAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', input.conversationId)
        .eq('business_id', input.businessId);

      return messageData.id as string;
    },
    async () => {
      const now = new Date().toISOString();
      const messageId = await offlineCreate(input.businessId, 'messages', record as unknown as Record<string, unknown>, 'high');
      await offlineUpdate(input.businessId, 'conversations', input.conversationId, {
        lastMessage: {
          messageId,
          text: input.text,
          senderUid: input.senderUid,
          senderName: input.senderName ?? "User",
          createdAt: now,
        },
      }, 'high');
      return messageId;
    }
  );
}

export async function updateMessage(input: {
  businessId: string;
  conversationId: string;
  messageId: string;
  senderUid: string;
  text: string;
}) {
  const text = input.text.trim();
  if (!text) {
    throw new Error("Message cannot be empty.");
  }

  if (isOffline()) {
    const cachedMsg = await getCachedById<Message>('messages', input.businessId, input.messageId);
    if (!cachedMsg) throw new Error("Message not found.");
    if (cachedMsg.senderUid !== input.senderUid || (cachedMsg as any).deletedAt) {
      throw new Error("You can only edit your own active messages.");
    }
    await offlineUpdate(input.businessId, 'messages', input.messageId, {
      text,
      editedAt: new Date().toISOString(),
    }, 'high');
    await syncLastMessageAfterChangeOffline(input.businessId, input.conversationId);
    return;
  }

  const { data: messageData } = await supabase
    .from('messages')
    .select('*')
    .eq('id', input.messageId)
    .single();
  if (!messageData) {
    throw new Error("Message not found.");
  }

  const msg = transformKeysToCamel<Message>(messageData as Record<string, unknown>);
  if (msg.senderUid !== input.senderUid || (msg as any).deletedAt) {
    throw new Error("You can only edit your own active messages.");
  }

  await supabase
    .from('messages')
    .update({ text, edited_at: new Date().toISOString() } as any)
    .eq('id', input.messageId);

  await syncLastMessageAfterChange(input.businessId, input.conversationId);
}

export async function deleteMessage(input: {
  businessId: string;
  conversationId: string;
  messageId: string;
  senderUid: string;
}) {
  if (isOffline()) {
    const cachedMsg = await getCachedById<Message>('messages', input.businessId, input.messageId);
    if (!cachedMsg) return;
    if (cachedMsg.senderUid !== input.senderUid) {
      throw new Error("You can only delete your own messages.");
    }
    await offlineUpdate(input.businessId, 'messages', input.messageId, {
      text: "",
      attachments: [],
      deletedAt: new Date().toISOString(),
      deletedByUid: input.senderUid,
    }, 'high');
    await syncLastMessageAfterChangeOffline(input.businessId, input.conversationId);
    return;
  }

  const { data: messageData } = await supabase
    .from('messages')
    .select('*')
    .eq('id', input.messageId)
    .single();
  if (!messageData) return;

  const msg = transformKeysToCamel<Message>(messageData as Record<string, unknown>);
  if (msg.senderUid !== input.senderUid) {
    throw new Error("You can only delete your own messages.");
  }

  await supabase
    .from('messages')
    .update({
      text: "",
      attachments: [],
      deleted_at: new Date().toISOString(),
      deleted_by_uid: input.senderUid,
    } as any)
    .eq('id', input.messageId);

  await syncLastMessageAfterChange(input.businessId, input.conversationId);
}

export async function deleteMessagePermanently(input: {
  businessId: string;
  conversationId: string;
  messageId: string;
  senderUid: string;
}) {
  if (isOffline()) {
    const cachedMsg = await getCachedById<Message>('messages', input.businessId, input.messageId);
    if (!cachedMsg) return;
    if (cachedMsg.senderUid !== input.senderUid) {
      throw new Error("You can only delete your own messages.");
    }
    await offlineDelete(input.businessId, 'messages', input.messageId, 'high');
    await syncLastMessageAfterChangeOffline(input.businessId, input.conversationId);
    return;
  }

  const { data: messageData } = await supabase
    .from('messages')
    .select('*')
    .eq('id', input.messageId)
    .single();
  if (!messageData) return;

  const msg = transformKeysToCamel<Message>(messageData as Record<string, unknown>);
  if (msg.senderUid !== input.senderUid) {
    throw new Error("You can only delete your own messages.");
  }

  await supabase.from('messages').delete().eq('id', input.messageId);
  await syncLastMessageAfterChange(input.businessId, input.conversationId);
}

// Offline counterpart of syncLastMessageAfterChange: recompute the
// conversation's lastMessage preview from the cached message list.
async function syncLastMessageAfterChangeOffline(
  businessId: string,
  conversationId: string
) {
  const cached = await getCachedCollection<Message>('messages', businessId).catch(() => [] as Message[]);
  const convoMessages = cached
    .filter((m) => (m as any).conversationId === conversationId)
    .sort((a, b) => String((b as any).createdAt ?? '').localeCompare(String((a as any).createdAt ?? '')));
  const latest = convoMessages[0] ?? null;
  await offlineUpdate(businessId, 'conversations', conversationId, {
    lastMessage: latest
      ? {
          text: (latest as any).deletedAt
            ? "Message deleted"
            : latest.text || ((latest as any).attachments?.length ? "Image" : ""),
          senderUid: latest.senderUid,
          senderName: latest.senderName ?? "User",
          createdAt: (latest as any).createdAt ?? new Date().toISOString(),
        }
      : null,
  }, 'high');
}

async function syncLastMessageAfterChange(
  businessId: string,
  conversationId: string
) {
  const { data: latestMessages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1);

  const latest = latestMessages && latestMessages.length > 0
    ? transformKeysToCamel<Message>(latestMessages[0] as Record<string, unknown>)
    : null;

  await supabase
    .from('conversations')
    .update({
      last_message: latest
        ? {
            text: (latest as any).deletedAt
              ? "Message deleted"
              : latest.text || ((latest as any).attachments?.length ? "Image" : ""),
            senderUid: latest.senderUid,
            senderName: latest.senderName ?? "User",
            createdAt: (latest as any).createdAt ?? new Date().toISOString(),
          }
        : null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', conversationId)
    .eq('business_id', businessId);
}

export function listenMessages(
  businessId: string,
  conversationId: string,
  callback: (messages: Message[]) => void
) {
  let destroyed = false;
  const serveCache = async () => {
    const cached = await getCachedCollection<Message>('messages', businessId).catch(() => []);
    const convoMessages = cached
      .filter((m) => (m as any).conversationId === conversationId)
      .sort((a, b) => String((a as any).createdAt ?? '').localeCompare(String((b as any).createdAt ?? '')));
    if (!destroyed && convoMessages.length > 0) callback(convoMessages);
  };
  const fetchAndCallback = async () => {
    if (destroyed) return;
    if (isOffline()) {
      await serveCache();
      return;
    }
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data && !destroyed) {
      const rows = transformArrayToCamel<Message>(data as Record<string, unknown>[]);
      callback(rows);
      cacheCollection('messages', businessId, rows as unknown as Array<Record<string, unknown>>, false).catch(() => {});
    } else if (!destroyed && error) {
      await serveCache();
    }
  };
  fetchAndCallback();
  const offReconnect = refetchOnReconnect(fetchAndCallback);
  const offLocalWrite = onLocalWrite(['messages'], fetchAndCallback);
  const channel = supabase
    .channel(`messages-${conversationId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
}

// â”€â”€â”€ WEEKLY REPORTS â”€â”€â”€

export function shouldGenerateWeeklyReport(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  if (day !== 5) return false;
  if (hours < 17 || (hours === 17 && minutes < 0)) return false;
  if (hours > 17 || (hours === 17 && minutes > 5)) return false;

  return true;
}

export function getLastFridayDate(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day <= 5 ? day + 2 : day - 5;
  const lastFriday = new Date(now);
  lastFriday.setDate(now.getDate() - diff);
  lastFriday.setHours(0, 0, 0, 0);
  return lastFriday;
}

export function getWeekStartDate(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  revenue: number;
  expenses: number;
  withdrawals: number;
  netProfit: number;
  profitMargin: number;
  orderCount: number;
  paymentCount: number;
  topExpenseCategory: string;
  generatedAt: string;
}

export function generateWeeklyReportData(
  payments: Payment[],
  expenses: Expense[],
  withdrawals: Withdrawal[],
  orderCount: number
): WeeklyReport {
  const weekStart = getWeekStartDate();
  const weekEnd = new Date();

  const revenue = payments
    .filter((p) => {
      const d = new Date((p as any).recordedAt ?? new Date());
      return d >= weekStart && d <= weekEnd;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const totalExpenses = expenses
    .filter((e) => {
      const d = new Date((e as any).expenseDate ?? new Date());
      return d >= weekStart && d <= weekEnd;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const totalWithdrawals = withdrawals
    .filter((w) => {
      const d = new Date((w as any).withdrawalDate ?? new Date());
      return d >= weekStart && d <= weekEnd;
    })
    .reduce((sum, w) => sum + w.amount, 0);

  const netProfit = revenue - totalExpenses - totalWithdrawals;
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const expenseCategories: Record<string, number> = {};
  expenses.forEach((e) => {
    const d = new Date((e as any).expenseDate ?? new Date());
    if (d >= weekStart && d <= weekEnd) {
      expenseCategories[e.category] = (expenseCategories[e.category] ?? 0) + e.amount;
    }
  });
  const topExpenseCategory = Object.entries(expenseCategories).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";

  return {
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: weekEnd.toISOString().slice(0, 10),
    revenue,
    expenses: totalExpenses,
    withdrawals: totalWithdrawals,
    netProfit,
    profitMargin,
    orderCount,
    paymentCount: payments.length,
    topExpenseCategory,
    generatedAt: new Date().toISOString(),
  };
}

export async function storeWeeklyReportNotification(
  businessId: string,
  report: WeeklyReport,
  actorUid: string
) {
  const profitLabel = report.netProfit >= 0 ? "profit" : "loss";
  await createNotification({
    businessId,
    recipientUid: actorUid,
    type: "system",
    title: `Weekly Financial Report - ${report.weekStart}`,
    message: `Week ending ${report.weekEnd}: Revenue ${report.revenue.toFixed(0)} KES, ${profitLabel} of ${Math.abs(report.netProfit).toFixed(0)} KES. Margin: ${report.profitMargin.toFixed(1)}%.`,
    link: "/finance/reports",
    metadata: {
      reportType: "weekly",
      weekStart: report.weekStart,
      weekEnd: report.weekEnd,
      revenue: report.revenue.toString(),
      netProfit: report.netProfit.toString(),
    },
  });
}

// â”€â”€â”€ PROFILE SERVICE â”€â”€â”€

export async function updateProfileInfo(input: {
  uid: string;
  businessId: string;
  displayName?: string;
  bio?: string;
  photoURL?: string;
}) {
  const updateData: Record<string, unknown> = {};
  if (input.displayName !== undefined) updateData.displayName = input.displayName;
  if (input.bio !== undefined) updateData.bio = input.bio;
  if (input.photoURL !== undefined) updateData.photoURL = input.photoURL;

  if (Object.keys(updateData).length === 0) return;

  return withOfflineFallback(
    async () => {
      const snakePayload = transformKeysToSnake(updateData);
      const { error } = await supabase.from('profiles').update(snakePayload as any).eq('id', input.uid);
      if (error) throw error;
      await supabase.from('business_members').update(snakePayload as any).eq('profile_id', input.uid).eq('business_id', input.businessId);
    },
    async () => {
      // `users` maps to the profiles table in the sync engine; the
      // business_members mirror is reconciled by the next online update.
      await enqueueSyncOperation(input.businessId, 'users', 'update', updateData, input.uid, 'normal');
      await patchCachedRecord('members', input.uid, updateData).catch(() => {});
      notifyLocalWrite('members');
    }
  );
}

export async function changeUserPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw error;
  }
}

export async function uploadProfileAvatar(
  file: File,
  businessId: string,
  uid: string
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Image must be 10MB or smaller.");
  }
  if (!process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Missing Cloudinary upload preset.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error("Missing Cloudinary cloud name.");
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Avatar upload failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const photoURL = data.secure_url;

  await updateProfileInfo({ uid, businessId, photoURL });

  return photoURL;
}

// â”€â”€â”€ FINANCE DATA LISTENER â”€â”€â”€

export interface FinanceData {
  payments: Payment[];
  orders: Order[];
  customers: Customer[];
  members: UserProfile[];
  expenses: Expense[];
  withdrawals: Withdrawal[];
  materials: InventoryMaterial[];
  movements: StockMovement[];
  purchaseOrders: any[];
}

export function listenAllFinanceData(
  businessId: string,
  callback: (data: FinanceData) => void,
  onError?: (err: Error) => void
) {
  const data: Partial<FinanceData> = {};

  function checkReady() {
    if (
      data.payments &&
      data.orders &&
      data.customers &&
      data.members &&
      data.expenses &&
      data.withdrawals &&
      data.materials &&
      data.movements &&
      data.purchaseOrders
    ) {
      callback(data as FinanceData);
    }
  }

  function listenToFinanceTable<T>(
    table: string,
    key: keyof FinanceData,
    orderByCol?: string,
    orderDir?: 'asc' | 'desc'
  ): () => void {
    let destroyed = false;
    const serveCache = async () => {
      const cached = await getCachedCollection<T>(table, businessId).catch(() => [] as T[]);
      if (!destroyed && cached.length > 0) {
        (data as any)[key] = cached;
        checkReady();
      }
    };
    const fetchAndCallback = async () => {
      if (destroyed) return;
      if (isOffline()) {
        await serveCache();
        return;
      }
      try {
        let query = supabase.from(table).select('*').eq('business_id', businessId);
        if (orderByCol) {
          query = query.order(orderByCol, { ascending: orderDir !== 'desc' });
        }
        const result = await query;
        if (result.data && !destroyed) {
          const rows = transformArrayToCamel<T>(result.data as Record<string, unknown>[]);
          (data as any)[key] = rows;
          checkReady();
          // `orders` is cached with richer rows (garments) by listenOrders —
          // don't overwrite that snapshot with the flat finance fetch.
          if (table !== 'orders') {
            cacheCollection(table, businessId, rows as unknown as Array<Record<string, unknown>>).catch(() => {});
          }
        } else if (result.error && !destroyed) {
          await serveCache();
        }
      } catch (err) {
        await serveCache();
        onError?.(err as Error);
      }
    };
    fetchAndCallback();
    const offReconnect = refetchOnReconnect(fetchAndCallback);
    const offLocalWrite = onLocalWrite([table], fetchAndCallback);
    const channel = supabase
      .channel(`finance-${table}-${businessId}-${crypto.randomUUID()}-${key}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `business_id=eq.${businessId}` }, fetchAndCallback)
      .subscribe();
    return () => { destroyed = true; offReconnect(); offLocalWrite(); supabase.removeChannel(channel); };
  }

  const unsub1 = listenToFinanceTable<Payment>('payments', 'payments', 'recorded_at', 'desc');
  const unsub2 = listenToFinanceTable<Order>('orders', 'orders', 'updated_at', 'desc');
  const unsub3 = listenToFinanceTable<Customer>('customers', 'customers', 'created_at', 'desc');
  const unsub4 = listenToFinanceTable<UserProfile>('business_members', 'members', 'display_name', 'asc');
  const unsub5 = listenToFinanceTable<Expense>('expenses', 'expenses', 'expense_date', 'desc');
  const unsub6 = listenToFinanceTable<Withdrawal>('withdrawals', 'withdrawals', 'withdrawal_date', 'desc');
  const unsub7 = listenToFinanceTable<InventoryMaterial>('inventory_materials', 'materials', 'updated_at', 'desc');
  const unsub8 = listenToFinanceTable<StockMovement>('stock_movements', 'movements', 'created_at', 'desc');
  const unsub9 = listenToFinanceTable<any>('purchase_orders', 'purchaseOrders', 'created_at', 'desc');

  return () => {
    unsub1();
    unsub2();
    unsub3();
    unsub4();
    unsub5();
    unsub6();
    unsub7();
    unsub8();
    unsub9();
  };
}

// â”€â”€â”€ HELPERS â”€â”€â”€

export async function paginatedQuery<T>(
  table: string,
  businessId: string,
  options?: {
    orderBy?: string;
    orderDir?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
    filters?: Record<string, unknown>;
  }
): Promise<{ rows: T[]; total: number | null }> {
  let query = supabase.from(table).select('*', { count: 'exact' }).eq('business_id', businessId);

  if (options?.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      query = query.eq(key, value);
    }
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy, { ascending: options.orderDir === 'asc' });
  }

  if (options?.limit) {
    query = query.range(options.offset ?? 0, (options.offset ?? 0) + options.limit - 1);
  }

  const { data, count } = await query;
  return {
    rows: transformArrayToCamel<T>((data as Record<string, unknown>[]) || []),
    total: count,
  };
}

export function lowStockMaterials(materials: InventoryMaterial[]) {
  return materials.filter((material) => material.quantity <= material.reorderLevel);
}

export function materialConsumptionFromMovements(movements: StockMovement[]) {
  return movements
    .filter((movement) => movement.movementType === "used_in_order")
    .reduce<Record<string, number>>((acc, movement) => {
      const key = movement.materialName;
      acc[key] = (acc[key] ?? 0) + Math.abs(movement.quantityChange);
      return acc;
    }, {});
}

export function orderCompletionRate(orders: Order[]) {
  if (orders.length === 0) {
    return 0;
  }
  const done = orders.filter((order) => order.stage === "delivered").length;
  return Math.round((done / orders.length) * 100);
}

export function workerProductivity(orders: Order[]) {
  return Object.values(
    orders.reduce<Record<string, { name: string; delivered: number; active: number }>>((acc, order) => {
      const key = order.assignedTailorId ?? "unassigned";
      if (!acc[key]) {
        acc[key] = { name: order.assignedTailorName ?? "Unassigned", delivered: 0, active: 0 };
      }
      if (order.stage === "delivered") {
        acc[key].delivered += 1;
      } else {
        acc[key].active += 1;
      }
      return acc;
    }, {})
  );
}

export function revenueFromPayments(payments: Payment[]) {
  return payments.reduce((total, payment) => total + payment.amount, 0);
}

export function dueTodayOrders(orders: Order[]) {
  const now = new Date().toISOString().slice(0, 10);
  return orders.filter((order) => order.dueDate <= now && order.stage !== "delivered");
}

// ─── MANAGER PERMISSIONS ───

export async function saveManagerPermissions(
  businessId: string,
  managerUid: string,
  permissions: import("@/types/domain").ManagerPermissions,
  actorUid: string,
  actorName: string,
  previousPermissions?: import("@/types/domain").ManagerPermissions
) {
  const { data: bizData } = await supabase
    .from("businesses")
    .select("finance_access")
    .eq("id", businessId)
    .maybeSingle();

  const currentAccess = (bizData?.finance_access as import("@/types/domain").FinanceAccessSettings) ?? {
    coOwnerUids: [],
    managerCanSeeWeekHistory: false,
    managerCanSeeMonthHistory: false,
    managerCanSeeYearHistory: false,
    managerCanSeeOwnerKpis: false,
    managerPermissions: {},
  };

  const updatedAccess = {
    ...currentAccess,
    managerPermissions: {
      ...((currentAccess.managerPermissions as Record<string, unknown>) ?? {}),
      [managerUid]: permissions,
    },
  };

  const { error } = await supabase
    .from("businesses")
    .update({ finance_access: updatedAccess })
    .eq("id", businessId);

  if (error) throw error;

  // Log the permission change to audit_logs
  await supabase.from("audit_logs").insert({
    business_id: businessId,
    actor_uid: actorUid,
    actor_name: actorName,
    action: "update_manager_permissions",
    target_uid: managerUid,
    previous_value: previousPermissions ? JSON.stringify(previousPermissions) : null,
    new_value: JSON.stringify(permissions),
    created_at: new Date().toISOString(),
  });
}

export async function fetchPermissionAuditLogs(businessId: string): Promise<Array<{
  id: string;
  actorName: string;
  actorUid: string;
  targetUid: string;
  action: string;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
}>> {
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("business_id", businessId)
    .eq("action", "update_manager_permissions")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!data) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    actorName: (row.actor_name ?? "") as string,
    actorUid: (row.actor_uid ?? "") as string,
    targetUid: (row.target_uid ?? "") as string,
    action: (row.action ?? "") as string,
    previousValue: row.previous_value as string | null,
    newValue: row.new_value as string | null,
    createdAt: (row.created_at ?? "") as string,
  }));
}

