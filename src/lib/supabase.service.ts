import { supabase } from "@/lib/supabase";
import { transformKeysToCamel, transformKeysToSnake, transformArrayToCamel, toDate } from "@/lib/case-utils";
import { formatKes } from "@/lib/utils";
import {
  getCachedCollection,
  cacheCollection,
  cacheLocalRecord,
  enqueueSyncOperation,
  generateId,
} from "@/lib/local-db";
import type {
  Customer,
  EmployeeInvitation,
  Business,
  InventoryMaterial,
  Order,
  Payment,
  PurchaseOrder,
  StockMovement,
  Supplier,
  UserProfile,
  UserRole,
  PaymentMethod,
  ProductionStage,
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
  SmsLog,
  Investment,
  SavingsGoal,
  SavingsDeposit,
} from "@/types/domain";

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

// â”€â”€â”€ LISTENER HELPER â”€â”€â”€

function listenToTable<T>(
  table: string,
  businessId: string,
  callback: (rows: T[]) => void,
  options?: { orderBy?: string; orderDir?: 'asc' | 'desc'; limit?: number }
): () => void {
  let destroyed = false;
  const fetchAndCallback = async () => {
    if (destroyed) return;

    // ── Offline path: serve from Dexie cache ──────────────────────────────
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const cached = await getCachedCollection<T>(table, businessId).catch(() => []);
      if (!destroyed && cached.length > 0) callback(cached);
      return;
    }

    let query = supabase.from(table).select('*').eq('business_id', businessId);
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderDir === 'asc' });
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    const { data, error } = await query;
    if (data && !destroyed) {
      const rows = transformArrayToCamel<T>(data as Record<string, unknown>[]);
      callback(rows);
      // Cache for offline use (fire-and-forget)
      cacheCollection(table, businessId, rows as unknown as Array<Record<string, unknown>>).catch(() => {});
    } else if (!destroyed && error) {
      // Network/Supabase error — fall back to cache
      const cached = await getCachedCollection<T>(table, businessId).catch(() => []);
      if (cached.length > 0) callback(cached);
    }
  };
  fetchAndCallback();
  const channel = supabase
    .channel(`${table}-${businessId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
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

export async function updateBusinessProfile(businessId: string, data: Partial<Pick<Business, "name" | "phone" | "location" | "smsSenderId">>) {
  const { error } = await supabase
    .from('businesses')
    .update(transformKeysToSnake(data as Record<string, unknown>))
    .eq('id', businessId);
  if (error) throw error;
}

export async function updateFinanceAccess(businessId: string, settings: import("@/types/domain").FinanceAccessSettings) {
  const { error } = await supabase
    .from('businesses')
    .update({ finance_access: settings })
    .eq('id', businessId);
  if (error) throw error;
}

// â”€â”€â”€ CUSTOMERS â”€â”€â”€

export async function createCustomer(businessId: string, payload: Omit<Customer, "id" | "createdAt" | "updatedAt" | "outstandingBalance" | "lastOrderAt">) {
  const { measurements, ...customerData } = payload as typeof payload & { measurements?: Record<string, unknown> };

  // ── Offline path ─────────────────────────────────────────────────────────
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const localId = generateId();
    const now = new Date().toISOString();
    const record = {
      id: localId,
      ...customerData,
      measurements: measurements ?? {},
      outstandingBalance: 0,
      createdAt: now, updatedAt: now, _localOnly: true,
    };
    await cacheLocalRecord('customers', localId, businessId, record as unknown as Record<string, unknown>).catch(() => {});
    await enqueueSyncOperation(businessId, 'customers', 'create', record, localId, 'normal').catch(() => {});
    return localId;
  }

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

  const { data: insertData, error } = await supabase
    .from('customers')
    .insert(transformKeysToSnake({
      ...customerData,
      outstandingBalance: 0,
    } as Record<string, unknown>))
    .select('id')
    .single();

  if (error || !insertData) throw error || new Error("Failed to create customer");

  if (measurements && Object.values(measurements).some((v) => v !== null && v !== undefined)) {
    await supabase
      .from('customer_measurements')
      .insert(transformKeysToSnake({ customerId: insertData.id, ...measurements } as Record<string, unknown>));
  }

  return insertData.id;
}

export function listenCustomers(businessId: string, callback: (rows: Customer[]) => void) {
  return listenToTable<Customer>('customers', businessId, callback, { orderBy: 'created_at', orderDir: 'desc' });
}

export function listenCustomer(businessId: string, customerId: string, callback: (row: Customer | null) => void) {
  let destroyed = false;
  const fetchAndCallback = async () => {
    if (destroyed) return;
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .maybeSingle();
    if (destroyed) return;
    if (!data) {
      callback(null);
      return;
    }
    callback(transformKeysToCamel<Customer>(data as Record<string, unknown>));
  };
  fetchAndCallback();
  const channel = supabase
    .channel(`customer-${customerId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `id=eq.${customerId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
}

// â”€â”€â”€ MEMBERS â”€â”€â”€

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
    if (typeof navigator !== "undefined" && !navigator.onLine) {
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
  const fetchAndCallback = async () => {
    if (destroyed) return;
    const { data } = await supabase
      .from('employee_invitations')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (destroyed || !data) return;

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

    callback(
      invitations.filter((invite) => {
        const expiresAt = toDate(invite.expiresAt as unknown as string);
        return invite.status !== "pending" || !expiresAt || expiresAt.getTime() > now;
      })
    );
  };
  fetchAndCallback();
  const channel = supabase
    .channel(`invitations-${businessId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_invitations', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
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
  const { data, error } = await supabase
    .from('inventory_units')
    .insert(transformKeysToSnake({ businessId, name } as Record<string, unknown>))
    .select('id')
    .single();
  if (error || !data) throw error || new Error("Failed to create unit");
  return data.id;
}

export async function createCategory(businessId: string, name: string): Promise<string> {
  const { data, error } = await supabase
    .from('inventory_categories')
    .insert(transformKeysToSnake({ businessId, name } as Record<string, unknown>))
    .select('id')
    .single();
  if (error || !data) throw error || new Error("Failed to create category");
  return data.id;
}

export function listenUnits(businessId: string, callback: (rows: DbUnit[]) => void) {
  return listenToTable<DbUnit>('inventory_units', businessId, callback, { orderBy: 'name', orderDir: 'asc' });
}

export function listenCategories(businessId: string, callback: (rows: DbCategory[]) => void) {
  return listenToTable<DbCategory>('inventory_categories', businessId, callback, { orderBy: 'name', orderDir: 'asc' });
}

export async function fetchUnits(businessId: string): Promise<DbUnit[]> {
  const { data } = await supabase
    .from('inventory_units')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true });
  return transformArrayToCamel<DbUnit>((data as Record<string, unknown>[]) || []);
}

export async function fetchCategories(businessId: string): Promise<DbCategory[]> {
  const { data } = await supabase
    .from('inventory_categories')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true });
  return transformArrayToCamel<DbCategory>((data as Record<string, unknown>[]) || []);
}

export async function updateCategory(businessId: string, categoryId: string, name: string) {
  await supabase.from('inventory_categories').update({ name }).eq('id', categoryId).eq('business_id', businessId);
}

export async function deleteCategory(businessId: string, categoryId: string) {
  await supabase.from('inventory_categories').delete().eq('id', categoryId).eq('business_id', businessId);
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

export async function createOrder(
  businessId: string,
  payload: Omit<
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
  >,
  depositAmount: number,
  actor: { uid: string; name: string }
) {
  const orderNumber = await getNextOrderNumber(businessId);

  // garments and fabricSelections live in separate tables â€” strip them before inserting into orders
  const { garments, fabricSelections, ...orderFields } = payload as typeof payload & {
    garments?: Array<{ name: string; quantity: number; agreedPrice: number; styleNotes?: string }>;
    fabricSelections?: unknown[];
  };

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert(transformKeysToSnake({
      ...orderFields,
      businessId,
      orderNumber,
      stage: "cutting",
      deliveryStatus: "pending",
      paymentStatus: depositAmount > 0 ? "partial" : "unpaid",
      amountPaid: depositAmount,
      balanceAmount: Math.max(0, payload.subtotalAmount - depositAmount),
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

  const { data: customerData } = await supabase
    .from('customers')
    .select('outstanding_balance, updated_at, last_order_at')
    .eq('id', payload.customerId)
    .single();

  if (customerData) {
    const currentBalance = Number(customerData.outstanding_balance ?? 0);
    const newBalance = currentBalance + Math.max(0, payload.subtotalAmount - depositAmount);
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

  return { id: orderId, orderNumber: orderData.order_number };
}

export function listenOrders(businessId: string, callback: (rows: Order[]) => void) {
  let destroyed = false;
  const fetchAndCallback = async () => {
    if (destroyed) return;

    // ── Offline path ───────────────────────────────────────────────────────
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const cached = await getCachedCollection<Order>('orders', businessId).catch(() => []);
      if (!destroyed && cached.length > 0) callback(cached);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_garments(name, quantity, agreed_price, sort_order)')
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false });
    if (data && !destroyed) {
      const rows = (data as Record<string, unknown>[]).map((row) => {
        const garmentRows = (row.order_garments as Record<string, unknown>[] | null) ?? [];
        const base = transformKeysToCamel<Order>({ ...row, order_garments: undefined } as Record<string, unknown>);
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
        } as Order;
      }).sort((a, b) => orderStageSort[a.stage] - orderStageSort[b.stage]);
      callback(rows);
      cacheCollection('orders', businessId, rows as unknown as Array<Record<string, unknown>>).catch(() => {});
    } else if (!destroyed && error) {
      const cached = await getCachedCollection<Order>('orders', businessId).catch(() => []);
      if (cached.length > 0) callback(cached);
    }
  };
  fetchAndCallback();
  const channel = supabase
    .channel(`orders-list-${businessId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_garments' }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
}

export function listenOrdersAssignedToUser(businessId: string, uid: string, callback: (rows: Order[]) => void) {
  let destroyed = false;
  const fetchAndCallback = async () => {
    if (destroyed) return;
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', businessId)
      .eq('assigned_tailor_id', uid)
      .order('updated_at', { ascending: false });
    if (data && !destroyed) {
      callback(transformArrayToCamel<Order>(data as Record<string, unknown>[]));
    }
  };
  fetchAndCallback();
  const channel = supabase
    .channel(`orders-assigned-${businessId}-${uid}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
}

async function assembleOrder(orderId: string): Promise<Order | null> {
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  if (!data) return null;

  const [{ data: garments }, { data: materialUsage }, { data: fittingRecords }, { data: directImages }, { data: junctionImageIds }] = await Promise.all([
    supabase.from('order_garments').select('*').eq('order_id', orderId).order('sort_order', { ascending: true }),
    supabase.from('order_material_usage').select('*').eq('order_id', orderId).order('recorded_at', { ascending: true }),
    supabase.from('order_fitting_records').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
    supabase.from('images').select('id,url').eq('order_id', orderId),
    supabase.from('order_images').select('image_id').eq('order_id', orderId),
  ]);

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
  } as Order & { imageUrls: string[] };
}

export function listenOrder(businessId: string, orderId: string, callback: (row: Order | null) => void) {
  let destroyed = false;
  const fetchAndCallback = async () => {
    if (destroyed) return;
    const order = await assembleOrder(orderId);
    if (!destroyed) callback(order);
  };
  fetchAndCallback();
  const channelName = `order-full-${orderId}-${crypto.randomUUID()}`;
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_garments', filter: `order_id=eq.${orderId}` }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_material_usage', filter: `order_id=eq.${orderId}` }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_fitting_records', filter: `order_id=eq.${orderId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
}

export async function updateOrderStage(businessId: string, orderId: string, stage: ProductionStage) {
  const deliveryStatus = stage === "delivered" ? "picked" : stage === "ready_for_pickup" ? "ready" : "pending";
  await supabase
    .from('orders')
    .update({ stage, delivery_status: deliveryStatus })
    .eq('id', orderId)
    .eq('business_id', businessId);
}

export async function logSmsEntry(
  businessId: string,
  data: {
    orderId: string;
    recipient: string;
    message: string;
    type: "ready_for_pickup" | "delay_notification";
    status: "success" | "failed";
    response: unknown;
  }
) {
  try {
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
  const snakePayload = transformKeysToSnake(fields as unknown as Record<string, unknown>);
  await supabase
    .from('orders')
    .update(snakePayload as any)
    .eq('id', orderId)
    .eq('business_id', businessId);
}

export async function addFittingRecord(
  businessId: string,
  orderId: string,
  payload: { notes: string; adjustmentSummary?: string; byUid: string; byName: string }
) {
  await supabase
    .from('order_fitting_records')
    .insert(transformKeysToSnake({
      orderId,
      notes: payload.notes,
      adjustmentSummary: payload.adjustmentSummary ?? null,
      recordedByUid: payload.byUid,
      recordedByName: payload.byName,
    } as Record<string, unknown>));

  await supabase
    .from('orders')
    .update({ stage: 'fitting', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('business_id', businessId);
}

export async function updateOrderProductionNotes(businessId: string, orderId: string, notes: string) {
  await supabase
    .from('orders')
    .update({ production_notes: notes })
    .eq('id', orderId)
    .eq('business_id', businessId);
}

export async function updateOrderDetails(
  businessId: string,
  orderId: string,
  fields: Partial<Pick<Order, "dueDate" | "designNotes" | "assignedTailorId" | "assignedTailorName" | "customerPhone">>
) {
  const now = new Date().toISOString();
  await supabase
    .from('orders')
    .update({ ...transformKeysToSnake(fields as Record<string, unknown>), updated_at: now })
    .eq('id', orderId)
    .eq('business_id', businessId);
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
  const fetchAndCallback = async () => {
    if (destroyed) return;
    const { data } = await supabase
      .from('inventory_materials')
      .select('*, inventory_material_images(url, public_id, sort_order)')
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false });
    if (data && !destroyed) {
      callback((data as Record<string, unknown>[]).map(assembleMaterialImages));
    }
  };
  fetchAndCallback();
  const channel = supabase
    .channel(`inventory_materials-${businessId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_materials', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_material_images' }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
}

export async function fetchMaterialById(businessId: string, materialId: string) {
  const { data } = await supabase
    .from('inventory_materials')
    .select('*, inventory_material_images(url, public_id, sort_order)')
    .eq('id', materialId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (!data) return null;
  return assembleMaterialImages(data as Record<string, unknown>);
}

export async function createMaterial(
  businessId: string,
  payload: Omit<InventoryMaterial, "id" | "createdAt" | "updatedAt">
) {
  const { images, ...rest } = payload as typeof payload & { images?: Array<{ url: string; publicId: string }> };
  const { data, error } = await supabase
    .from('inventory_materials')
    .insert(transformKeysToSnake({ ...rest, businessId } as unknown as Record<string, unknown>))
    .select('id')
    .single();
  if (error || !data) throw error || new Error("Failed to create material");

  if (images && images.length > 0) {
    await supabase.from('inventory_material_images').insert(
      images.map((img, i) => ({ material_id: data.id, url: img.url, public_id: img.publicId, sort_order: i }))
    );
  }
  return data.id;
}

export async function deleteMaterial(businessId: string, materialId: string) {
  await supabase.from('inventory_materials').delete().eq('id', materialId).eq('business_id', businessId);
}

export async function updateMaterial(
  businessId: string,
  materialId: string,
  payload: Partial<Omit<InventoryMaterial, "id" | "businessId" | "createdAt" | "updatedAt">>
) {
  const { images, ...rest } = payload as typeof payload & { images?: Array<{ url: string; publicId: string }> };
  if (Object.keys(rest).length > 0) {
    await supabase
      .from('inventory_materials')
      .update(transformKeysToSnake(rest as unknown as Record<string, unknown>))
      .eq('id', materialId)
      .eq('business_id', businessId);
  }
  if (images !== undefined) {
    await supabase.from('inventory_material_images').delete().eq('material_id', materialId);
    if (images.length > 0) {
      await supabase.from('inventory_material_images').insert(
        images.map((img, i) => ({ material_id: materialId, url: img.url, public_id: img.publicId, sort_order: i }))
      );
    }
  }
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
  const { data: materialData } = await supabase
    .from('inventory_materials')
    .select('quantity')
    .eq('id', payload.materialId)
    .single();
  const currentQty = Number((materialData as any)?.quantity ?? 0);
  const newQty = currentQty + payload.adjustment;

  await supabase
    .from('inventory_materials')
    .update({ quantity: newQty })
    .eq('id', payload.materialId)
    .eq('business_id', businessId);

  const { error: adjMovErr } = await supabase
    .from('stock_movements')
    .insert(transformKeysToSnake({
      businessId,
      movementType: "adjustment",
      materialId: payload.materialId,
      materialName: payload.materialName,
      quantityChange: payload.adjustment,
      unit: payload.unit,
      reason: payload.reason,
      createdByUid: payload.actorUid,
      createdByName: payload.actorName,
    } as unknown as Record<string, unknown>));
  if (adjMovErr) console.error("Failed to insert adjustment movement:", adjMovErr);
}

// â”€â”€â”€ SUPPLIERS â”€â”€â”€

export async function createSupplier(
  businessId: string,
  payload: Omit<Supplier, "id" | "createdAt">
) {
  const { data, error } = await supabase
    .from('suppliers')
    .insert(transformKeysToSnake({ ...payload, businessId } as unknown as Record<string, unknown>))
    .select('id')
    .single();
  if (error || !data) throw error || new Error("Failed to create supplier");
  return data.id;
}

export async function updateSupplier(
  businessId: string,
  supplierId: string,
  payload: Partial<Omit<Supplier, "id" | "businessId" | "createdAt">>
) {
  await supabase
    .from('suppliers')
    .update(transformKeysToSnake(payload as unknown as Record<string, unknown>))
    .eq('id', supplierId)
    .eq('business_id', businessId);
}

export async function deleteSupplier(businessId: string, supplierId: string) {
  await supabase.from('suppliers').delete().eq('id', supplierId).eq('business_id', businessId);
}

export function listenSuppliers(businessId: string, callback: (rows: Supplier[]) => void) {
  return listenToTable<Supplier>('suppliers', businessId, callback, { orderBy: 'name', orderDir: 'asc' });
}

export async function fetchSupplierById(businessId: string, supplierId: string): Promise<Supplier | null> {
  const { data } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .eq('business_id', businessId)
    .maybeSingle();
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
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert(transformKeysToSnake({ ...payload, businessId } as unknown as Record<string, unknown>))
    .select('id')
    .single();
  if (error || !data) throw error || new Error("Failed to create purchase order");
  return data.id;
}

export async function fetchPurchaseOrderById(businessId: string, poId: string) {
  const { data } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', poId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (!data) return null;
  return transformKeysToCamel<PurchaseOrder>(data as Record<string, unknown>);
}

export async function updatePurchaseOrder(
  businessId: string,
  poId: string,
  payload: Partial<Omit<PurchaseOrder, "id" | "businessId" | "createdAt">>
) {
  await supabase
    .from('purchase_orders')
    .update(transformKeysToSnake(payload as unknown as Record<string, unknown>))
    .eq('id', poId)
    .eq('business_id', businessId);
}

export async function deletePurchaseOrder(businessId: string, poId: string) {
  await supabase.from('purchase_orders').delete().eq('id', poId).eq('business_id', businessId);
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
  // Queue the payment row. Balance fields on orders/customers will reconcile
  // once the user reconnects and the sync engine replays.
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const localId = generateId();
    const now = new Date().toISOString();
    const record = {
      id: localId, businessId,
      customerId: payload.customerId, customerName: payload.customerName,
      orderId: payload.orderId, orderNumber: payload.orderNumber,
      amount: payload.amount, method: payload.method,
      mpesaCode: payload.mpesaCode ?? null,
      description: payload.description ?? "",
      recordedByUid: payload.actorUid, recordedByName: payload.actorName,
      recordedAt: now, _localOnly: true,
    };
    await cacheLocalRecord('payments', localId, businessId, record).catch(() => {});
    await enqueueSyncOperation(businessId, 'payments', 'create', record, localId, 'high').catch(() => {});
    return;
  }

  const { data: orderData } = await supabase
    .from('orders')
    .select('amount_paid, subtotal_amount')
    .eq('id', payload.orderId)
    .single();
  if (!orderData) {
    throw new Error("Order not found.");
  }

  const currentPaid = Number((orderData as any).amount_paid ?? 0);
  const subtotal = Number((orderData as any).subtotal_amount ?? 0);
  const nextPaid = currentPaid + payload.amount;
  const nextBalance = Math.max(0, subtotal - nextPaid);
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
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const localId = generateId();
    const now = new Date().toISOString();
    const record = {
      id: localId, businessId,
      category: payload.category, amount: payload.amount,
      description: payload.description, notes: payload.notes ?? "",
      receiptUrl: payload.receiptUrl ?? "",
      supplierId: payload.supplierId ?? null, supplierName: payload.supplierName ?? "",
      expenseDate: payload.expenseDate.toISOString(),
      createdByUid: payload.actorUid, createdByName: payload.actorName,
      createdAt: now, updatedAt: now, _localOnly: true,
    };
    await cacheLocalRecord('expenses', localId, businessId, record).catch(() => {});
    await enqueueSyncOperation(businessId, 'expenses', 'create', record, localId, 'normal').catch(() => {});
    return localId;
  }

  const { data: expenseData, error: expenseError } = await supabase
    .from('expenses')
    .insert(transformKeysToSnake({
      businessId,
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
  if (expenseError || !expenseData) throw expenseError || new Error("Failed to create expense");

  await supabase
    .from('transactions')
    .insert(transformKeysToSnake({
      businessId,
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
  const snakePayload = transformKeysToSnake({
    ...payload,
    expenseDate,
  } as unknown as Record<string, unknown>);

  await supabase
    .from('expenses')
    .update(snakePayload as any)
    .eq('id', expenseId)
    .eq('business_id', businessId);

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
}

export async function deleteExpense(businessId: string, expenseId: string) {
  await supabase.from('expenses').delete().eq('id', expenseId).eq('business_id', businessId);
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
}

export async function fetchExpenseById(businessId: string, expenseId: string): Promise<Expense | null> {
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (!data) return null;
  return transformKeysToCamel<Expense>(data as Record<string, unknown>);
}

export function listenExpenses(businessId: string, callback: (rows: Expense[]) => void) {
  return listenToTable<Expense>('expenses', businessId, callback, { orderBy: 'expense_date', orderDir: 'desc' });
}

export function listenExpensesByCategory(businessId: string, category: ExpenseCategory, callback: (rows: Expense[]) => void) {
  let destroyed = false;
  const fetchAndCallback = async () => {
    if (destroyed) return;
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('business_id', businessId)
      .eq('category', category)
      .order('expense_date', { ascending: false });
    if (data && !destroyed) callback(transformArrayToCamel<Expense>(data as Record<string, unknown>[]));
  };
  fetchAndCallback();
  const channel = supabase
    .channel(`expenses-cat-${businessId}-${category}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
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
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const localId = generateId();
    const now = new Date().toISOString();
    const record = {
      id: localId, businessId,
      amount: payload.amount, reason: payload.reason, category: payload.category,
      withdrawnByUid: payload.actorUid, withdrawnByName: payload.actorName,
      withdrawalDate: payload.withdrawalDate.toISOString(),
      notes: payload.notes ?? "", createdAt: now, _localOnly: true,
    };
    await cacheLocalRecord('withdrawals', localId, businessId, record).catch(() => {});
    await enqueueSyncOperation(businessId, 'withdrawals', 'create', record, localId, 'normal').catch(() => {});
    return localId;
  }

  const { data: withdrawalData, error: withdrawalError } = await supabase
    .from('withdrawals')
    .insert(transformKeysToSnake({
      businessId,
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
  if (withdrawalError || !withdrawalData) throw withdrawalError || new Error("Failed to create withdrawal");

  await supabase
    .from('transactions')
    .insert(transformKeysToSnake({
      businessId,
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
  await supabase
    .from('withdrawals')
    .update(transformKeysToSnake({
      ...payload,
      withdrawalDate,
    } as unknown as Record<string, unknown>))
    .eq('id', withdrawalId)
    .eq('business_id', businessId);

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
}

export async function deleteWithdrawal(businessId: string, withdrawalId: string) {
  await supabase.from('withdrawals').delete().eq('id', withdrawalId).eq('business_id', businessId);
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
}

export async function fetchWithdrawalById(businessId: string, withdrawalId: string): Promise<Withdrawal | null> {
  const { data } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('id', withdrawalId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (!data) return null;
  return transformKeysToCamel<Withdrawal>(data as Record<string, unknown>);
}

export function listenWithdrawals(businessId: string, callback: (rows: Withdrawal[]) => void) {
  return listenToTable<Withdrawal>('withdrawals', businessId, callback, { orderBy: 'withdrawal_date', orderDir: 'desc' });
}

export function listenWithdrawalsByCategory(businessId: string, category: WithdrawalCategory, callback: (rows: Withdrawal[]) => void) {
  let destroyed = false;
  const fetchAndCallback = async () => {
    if (destroyed) return;
    const { data } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('business_id', businessId)
      .eq('category', category)
      .order('withdrawal_date', { ascending: false });
    if (data && !destroyed) callback(transformArrayToCamel<Withdrawal>(data as Record<string, unknown>[]));
  };
  fetchAndCallback();
  const channel = supabase
    .channel(`withdrawals-cat-${businessId}-${category}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
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
  const { data, error } = await supabase
    .from('investments')
    .insert(transformKeysToSnake({
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
    } as unknown as Record<string, unknown>))
    .select('id')
    .single();
  if (error || !data) throw error || new Error("Failed to create investment");
  return data.id;
}

export async function updateInvestment(
  businessId: string,
  investmentId: string,
  payload: Partial<Omit<Investment, "id" | "businessId" | "createdAt" | "createdByUid" | "createdByName">>
) {
  await supabase
    .from('investments')
    .update(transformKeysToSnake(payload as unknown as Record<string, unknown>))
    .eq('id', investmentId)
    .eq('business_id', businessId);
}

export async function deleteInvestment(businessId: string, investmentId: string) {
  await supabase.from('investments').delete().eq('id', investmentId).eq('business_id', businessId);
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
  const { data, error } = await supabase
    .from('savings_goals')
    .insert(transformKeysToSnake({
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
    } as unknown as Record<string, unknown>))
    .select('id')
    .single();
  if (error || !data) throw error || new Error("Failed to create savings goal");
  return data.id;
}

export async function updateSavingsGoal(
  businessId: string,
  goalId: string,
  payload: Partial<Omit<SavingsGoal, "id" | "businessId" | "createdAt" | "createdByUid" | "createdByName">>
) {
  await supabase
    .from('savings_goals')
    .update(transformKeysToSnake({ ...payload, updatedAt: new Date().toISOString() } as unknown as Record<string, unknown>))
    .eq('id', goalId)
    .eq('business_id', businessId);
}

export async function deleteSavingsGoal(businessId: string, goalId: string) {
  await supabase.from('savings_goals').delete().eq('id', goalId).eq('business_id', businessId);
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
  const { data, error } = await supabase
    .from('savings_deposits')
    .insert(transformKeysToSnake({
      businessId,
      goalId: payload.goalId,
      amount: payload.amount,
      notes: payload.notes ?? "",
      depositDate: payload.depositDate.toISOString(),
      createdByUid: payload.actorUid,
      createdByName: payload.actorName,
    } as unknown as Record<string, unknown>))
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

  return data.id;
}

export async function deleteSavingsDeposit(businessId: string, depositId: string, goalId: string, amount: number) {
  await supabase.from('savings_deposits').delete().eq('id', depositId).eq('business_id', businessId);
  const { data: goal } = await supabase.from('savings_goals').select('current_amount').eq('id', goalId).single();
  if (goal) {
    const newAmount = Math.max(0, Number((goal as any).current_amount ?? 0) - amount);
    await supabase.from('savings_goals').update({ current_amount: newAmount, status: 'active', updated_at: new Date().toISOString() } as any).eq('id', goalId);
  }
}

export function listenSavingsDeposits(businessId: string, goalId: string, callback: (rows: SavingsDeposit[]) => void) {
  let destroyed = false;
  const fetchAndCallback = async () => {
    if (destroyed) return;
    const { data } = await supabase
      .from('savings_deposits')
      .select('*')
      .eq('business_id', businessId)
      .eq('goal_id', goalId)
      .order('deposit_date', { ascending: false });
    if (data && !destroyed) callback(transformArrayToCamel<SavingsDeposit>(data as Record<string, unknown>[]));
  };
  fetchAndCallback();
  const channel = supabase
    .channel(`savings-deposits-${businessId}-${goalId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_deposits', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
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
  const { data, error } = await supabase
    .from('transactions')
    .insert(transformKeysToSnake({
      businessId,
      ...payload,
    } as unknown as Record<string, unknown>))
    .select('id')
    .single();
  if (error || !data) throw error || new Error("Failed to record transaction");
  return data.id;
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
  const { data, error } = await supabase
    .from('notifications')
    .insert(transformKeysToSnake({
      businessId: input.businessId,
      recipientUid: input.recipientUid,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? "",
      read: false,
      archived: false,
      metadata: input.metadata ?? {},
    } as unknown as Record<string, unknown>))
    .select('id')
    .single();
  if (error || !data) throw error || new Error("Failed to create notification");
  return data.id;
}

export async function createNotificationForAllMembers(
  businessId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  excludeUid?: string
) {
  const members = await fetchMembers(businessId);
  for (const member of members) {
    if (member.uid === excludeUid) continue;
    if (!member.active) continue;
    await supabase
      .from('notifications')
      .insert(transformKeysToSnake({
        businessId,
        recipientUid: member.uid,
        type,
        title,
        message,
        link: link ?? "",
        read: false,
        archived: false,
        metadata: {},
      } as unknown as Record<string, unknown>));
  }
}

export function listenNotifications(
  businessId: string,
  recipientUid: string,
  callback: (notifications: Notification[]) => void
) {
  let destroyed = false;
  const fetchAndCallback = async () => {
    if (destroyed) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('business_id', businessId)
      .eq('recipient_uid', recipientUid)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(50);
    if (destroyed || !data) return;

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

    callback(transformArrayToCamel<Notification>(valid));
  };
  fetchAndCallback();
  const channel = supabase
    .channel(`notifications-${businessId}-${recipientUid}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
}

export function listenUnreadCount(
  businessId: string,
  recipientUid: string,
  callback: (count: number) => void
) {
  let destroyed = false;
  const fetchAndCallback = async () => {
    if (destroyed) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('recipient_uid', recipientUid)
      .eq('read', false)
      .eq('archived', false);
    if (!destroyed) callback(count ?? 0);
  };
  fetchAndCallback();
  const channel = supabase
    .channel(`unread-count-${businessId}-${recipientUid}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
}

export async function markNotificationRead(businessId: string, notificationId: string) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('business_id', businessId);
}

export async function markAllNotificationsRead(businessId: string, recipientUid: string) {
  const { data: unread } = await supabase
    .from('notifications')
    .select('id')
    .eq('business_id', businessId)
    .eq('recipient_uid', recipientUid)
    .eq('read', false)
    .eq('archived', false);

  if (unread) {
    for (const n of unread) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', (n as any).id);
    }
  }
}

export async function archiveNotification(businessId: string, notificationId: string) {
  await supabase
    .from('notifications')
    .update({ archived: true })
    .eq('id', notificationId)
    .eq('business_id', businessId);
}

export async function deleteNotification(businessId: string, notificationId: string) {
  await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('business_id', businessId);
}

export async function bulkArchiveNotifications(businessId: string, recipientUid: string) {
  const { data: toArchive } = await supabase
    .from('notifications')
    .select('id')
    .eq('business_id', businessId)
    .eq('recipient_uid', recipientUid)
    .eq('archived', false);

  if (toArchive) {
    for (const n of toArchive) {
      await supabase
        .from('notifications')
        .update({ archived: true })
        .eq('id', (n as any).id);
    }
  }
}

export async function cleanupOldNotifications() {
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
  const { data, error } = await supabase
    .from('conversations')
    .insert(transformKeysToSnake({
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
    } as unknown as Record<string, unknown>))
    .select('id')
    .single();
  if (error || !data) throw error || new Error("Failed to create conversation");
  return data.id;
}

export function listenConversations(
  businessId: string,
  uid: string,
  callback: (conversations: Conversation[]) => void
) {
  let destroyed = false;
  const fetchAndCallback = async () => {
    if (destroyed) return;
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('business_id', businessId)
      .contains('participants', [uid])
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(50);
    if (data && !destroyed) {
      callback(transformArrayToCamel<Conversation>(data as Record<string, unknown>[]));
    }
  };
  fetchAndCallback();
  const channel = supabase
    .channel(`conversations-${businessId}-${uid}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
}

export function listenUnreadMessageCount(
  businessId: string,
  uid: string,
  callback: (count: number) => void
) {
  let destroyed = false;
  const fetchAndCallback = async () => {
    if (destroyed) return;
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('business_id', businessId)
      .contains('participants', [uid])
      .order('updated_at', { ascending: false });
    if (destroyed || !data) return;

    let total = 0;
    for (const conv of data) {
      const convData = transformKeysToCamel<Conversation>(conv as Record<string, unknown>);
      if (convData.lastMessage && convData.lastMessage.senderUid !== uid) {
        total += 1;
      }
    }
    if (!destroyed) callback(total);
  };
  fetchAndCallback();
  const channel = supabase
    .channel(`unread-msg-${businessId}-${uid}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `business_id=eq.${businessId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
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
  const { data: messageData, error } = await supabase
    .from('messages')
    .insert(transformKeysToSnake({
      conversationId: input.conversationId,
      businessId: input.businessId,
      senderUid: input.senderUid,
      senderName: input.senderName ?? "User",
      text: input.text,
      attachments: input.attachments ?? [],
      readBy: [input.senderUid],
    } as unknown as Record<string, unknown>))
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

  return messageData.id;
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
  const fetchAndCallback = async () => {
    if (destroyed) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data && !destroyed) {
      callback(transformArrayToCamel<Message>(data as Record<string, unknown>[]));
    }
  };
  fetchAndCallback();
  const channel = supabase
    .channel(`messages-${conversationId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, fetchAndCallback)
    .subscribe();
  return () => { destroyed = true; supabase.removeChannel(channel); };
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
  await supabase
    .from('notifications')
    .insert(transformKeysToSnake({
      businessId,
      recipientUid: actorUid,
      type: "system",
      title: `Weekly Financial Report - ${report.weekStart}`,
      message: `Week ending ${report.weekEnd}: Revenue ${report.revenue.toFixed(0)} KES, ${profitLabel} of ${Math.abs(report.netProfit).toFixed(0)} KES. Margin: ${report.profitMargin.toFixed(1)}%.`,
      link: "/finance/reports",
      read: false,
      archived: false,
      metadata: {
        reportType: "weekly",
        weekStart: report.weekStart,
        weekEnd: report.weekEnd,
        revenue: report.revenue.toString(),
        netProfit: report.netProfit.toString(),
      },
    } as unknown as Record<string, unknown>));
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

  const snakePayload = transformKeysToSnake(updateData);
  await supabase.from('profiles').update(snakePayload as any).eq('id', input.uid);
  await supabase.from('business_members').update(snakePayload as any).eq('profile_id', input.uid).eq('business_id', input.businessId);
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
    const fetchAndCallback = async () => {
      if (destroyed) return;
      try {
        let query = supabase.from(table).select('*').eq('business_id', businessId);
        if (orderByCol) {
          query = query.order(orderByCol, { ascending: orderDir !== 'desc' });
        }
        const result = await query;
        if (result.data && !destroyed) {
          (data as any)[key] = transformArrayToCamel<T>(result.data as Record<string, unknown>[]);
          checkReady();
        }
      } catch (err) {
        onError?.(err as Error);
      }
    };
    fetchAndCallback();
    const channel = supabase
      .channel(`finance-${table}-${businessId}-${crypto.randomUUID()}-${key}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `business_id=eq.${businessId}` }, fetchAndCallback)
      .subscribe();
    return () => { destroyed = true; supabase.removeChannel(channel); };
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

