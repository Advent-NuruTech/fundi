import {
  addDoc,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  increment,
  runTransaction,
  arrayUnion,
  Timestamp,
  startAfter,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
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
} from "@/types/domain";
import {
  businessesCollection,
  customersCollection,
  materialsCollection,
  membersCollection,
  invitationsCollection,
  ordersCollection,
  paymentsCollection,
  purchaseOrdersCollection,
  stockMovementsCollection,
  suppliersCollection,
  usersCollection,
  unitsCollection,
  categoriesCollection,
  consumptionReportsCollection,
  smsLogsCollection,
} from "@/services/collections";

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

// ─── BUSINESS ───

export async function bootstrapBusiness(input: {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  businessName: string;
  location: string;
}) {
  const businessRef = await addDoc(businessesCollection(), {
    name: input.businessName,
    phone: input.phone,
    location: input.location,
    currency: "KES",
    country: "Kenya",
    ownerUid: input.uid,
    orderCounter: 0,
    employeeCounter: 0,
    createdAt: serverTimestamp(),
  });

  const userPayload = {
    uid: input.uid,
    email: input.email,
    displayName: input.displayName,
    role: "owner" as const,
    roles: ["owner"] as UserRole[],
    businessId: businessRef.id,
    active: true,
    mustChangePassword: false,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(usersCollection(), input.uid), userPayload);
  await setDoc(doc(membersCollection(businessRef.id), input.uid), userPayload);

  const batch = writeBatch(db);
  const defaultUnits = ["Pieces", "Meters", "Cones", "Kilograms", "Liters"];
  const defaultCategories = ["Fabrics", "Threads", "Buttons", "Zips", "Elastic", "Lining", "Accessories"];

  for (const unit of defaultUnits) {
    batch.set(doc(unitsCollection(businessRef.id)), { businessId: businessRef.id, name: unit, createdAt: serverTimestamp() });
  }
  for (const cat of defaultCategories) {
    batch.set(doc(categoriesCollection(businessRef.id)), { businessId: businessRef.id, name: cat, createdAt: serverTimestamp() });
  }
  await batch.commit();

  return businessRef.id;
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(usersCollection(), uid));
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data();
}

export async function fetchBusinessProfile(businessId: string): Promise<Business | null> {
  const snapshot = await getDoc(doc(businessesCollection(), businessId));
  if (!snapshot.exists()) {
    return null;
  }
  return { ...(snapshot.data() as Omit<Business, "id">), id: snapshot.id };
}

export async function updateBusinessProfile(businessId: string, data: Partial<Pick<Business, "name" | "phone" | "location">>) {
  await updateDoc(doc(businessesCollection(), businessId), {
    ...data,
  });
}

// ─── CUSTOMERS ───

export async function createCustomer(businessId: string, payload: Omit<Customer, "id" | "createdAt" | "updatedAt" | "outstandingBalance" | "lastOrderAt">) {
  const phoneQuery = await getDocs(query(customersCollection(businessId), where("phone", "==", payload.phone)));
  if (!phoneQuery.empty) {
    throw new Error("A customer with this phone number already exists.");
  }
  if (payload.email) {
    const emailQuery = await getDocs(query(customersCollection(businessId), where("email", "==", payload.email)));
    if (!emailQuery.empty) {
      throw new Error("A customer with this email already exists.");
    }
  }

  const ref = await addDoc(customersCollection(businessId), {
    ...payload,
    outstandingBalance: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export function listenCustomers(businessId: string, callback: (rows: Customer[]) => void) {
  const q = query(customersCollection(businessId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docItem) => ({ ...docItem.data(), id: docItem.id })));
  });
}

export function listenCustomer(businessId: string, customerId: string, callback: (row: Customer | null) => void) {
  return onSnapshot(doc(customersCollection(businessId), customerId), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({ ...snapshot.data(), id: snapshot.id });
  });
}

// ─── MEMBERS ───

export async function fetchMembers(businessId: string) {
  const rows = await getDocs(query(membersCollection(businessId), where("active", "==", true)));
  return rows.docs.map((row) => row.data());
}

export function listenMembers(businessId: string, callback: (rows: UserProfile[]) => void) {
  const q = query(membersCollection(businessId), orderBy("displayName", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((row) => row.data()));
  });
}

export async function deactivateMember(businessId: string, memberUid: string, active: boolean) {
  await updateDoc(doc(membersCollection(businessId), memberUid), {
    active,
    lastActiveAt: serverTimestamp(),
  });
  await updateDoc(doc(usersCollection(), memberUid), {
    active,
    lastActiveAt: serverTimestamp(),
  });
}

export async function updateMemberRoles(businessId: string, memberUid: string, roles: UserRole[]) {
  const cleanRoles = normalizedRoles(roles);
  await updateDoc(doc(membersCollection(businessId), memberUid), {
    roles: cleanRoles,
    role: roleFromRoles(cleanRoles),
  });
  await updateDoc(doc(usersCollection(), memberUid), {
    roles: cleanRoles,
    role: roleFromRoles(cleanRoles),
  });
}

// ─── INVITATIONS ───

export async function createInvitationRecord(
  businessId: string,
  payload: Omit<EmployeeInvitation, "id" | "createdAt" | "status" | "expiresAt">
) {
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000));
  const ref = await addDoc(invitationsCollection(businessId), {
    ...payload,
    status: "pending",
    expiresAt,
    createdAt: serverTimestamp(),
  });
  return ref.id;
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
  const payload = {
    uid: input.uid,
    email: input.email,
    displayName: input.displayName,
    employeeNumber,
    roles,
    role: roleFromRoles(roles),
    businessId: input.businessId,
    active: false,
    mustChangePassword: true,
    invitedByUid: input.invitedByUid,
    invitedByName: input.invitedByName,
    payRate: input.payRate ?? 0,
    payPeriod: input.payPeriod ?? "monthly",
    nextPayDate: input.nextPayDate ?? "",
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  };

  await setDoc(doc(usersCollection(), input.uid), payload, { merge: true });
  await setDoc(doc(membersCollection(input.businessId), input.uid), payload, { merge: true });
}

export function listenInvitations(businessId: string, callback: (rows: EmployeeInvitation[]) => void) {
  const q = query(invitationsCollection(businessId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const now = Date.now();
    const invitations = snapshot.docs.map((row) => ({ ...row.data(), id: row.id }));
    const expiredPending = invitations.filter((invite) => {
      const expiresAt = invite.expiresAt?.toDate?.();
      return invite.status === "pending" && expiresAt && expiresAt.getTime() <= now;
    });
    void Promise.all(expiredPending.map((invite) => deleteDoc(doc(invitationsCollection(businessId), invite.id))));
    callback(
      invitations.filter((invite) => {
        const expiresAt = invite.expiresAt?.toDate?.();
        return invite.status !== "pending" || !expiresAt || expiresAt.getTime() > now;
      })
    );
  });
}

export async function deleteInvitation(businessId: string, invitationId: string) {
  await deleteDoc(doc(invitationsCollection(businessId), invitationId));
}

export async function completeFirstPasswordChange(uid: string) {
  const profile = await fetchUserProfile(uid);
  if (!profile) {
    return;
  }
  await updateDoc(doc(usersCollection(), uid), { mustChangePassword: false, lastActiveAt: serverTimestamp() });
  await updateDoc(doc(membersCollection(profile.businessId), uid), { mustChangePassword: false, lastActiveAt: serverTimestamp() });
}

export async function acceptInvitationByToken(token: string, uid: string) {
  const rows = await getDocs(query(collectionGroup(db, "invitations"), where("token", "==", token)));
  if (rows.empty) {
    return null;
  }
  const invite = rows.docs[0];
  const data = invite.data();
  const businessId = data.businessId;
  const expiresAt = data.expiresAt?.toDate?.();
  if (data.status !== "pending" || data.invitedUid !== uid || (expiresAt && expiresAt.getTime() <= Date.now())) {
    throw new Error("This invitation has expired or is no longer valid.");
  }
  await updateDoc(doc(invitationsCollection(businessId), invite.id), {
    status: "accepted",
    acceptedAt: serverTimestamp(),
  });
  await updateDoc(doc(usersCollection(), uid), {
    active: true,
    mustChangePassword: true,
  });
  await updateDoc(doc(membersCollection(businessId), uid), {
    active: true,
    mustChangePassword: true,
  });
  return businessId;
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
  await updateDoc(doc(membersCollection(businessId), memberUid), payload);
  await updateDoc(doc(usersCollection(), memberUid), payload);
}

// ─── DYNAMIC UNITS & CATEGORIES ───

export async function createUnit(businessId: string, name: string): Promise<string> {
  const ref = await addDoc(unitsCollection(businessId), {
    businessId,
    name,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createCategory(businessId: string, name: string): Promise<string> {
  const ref = await addDoc(categoriesCollection(businessId), {
    businessId,
    name,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function listenUnits(businessId: string, callback: (rows: DbUnit[]) => void) {
  const q = query(unitsCollection(businessId), orderBy("name", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })));
  });
}

export function listenCategories(businessId: string, callback: (rows: DbCategory[]) => void) {
  const q = query(categoriesCollection(businessId), orderBy("name", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })));
  });
}

export async function fetchUnits(businessId: string): Promise<DbUnit[]> {
  const q = query(unitsCollection(businessId), orderBy("name", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function fetchCategories(businessId: string): Promise<DbCategory[]> {
  const q = query(categoriesCollection(businessId), orderBy("name", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function updateCategory(businessId: string, categoryId: string, name: string) {
  await updateDoc(doc(categoriesCollection(businessId), categoryId), { name });
}

export async function deleteCategory(businessId: string, categoryId: string) {
  await deleteDoc(doc(categoriesCollection(businessId), categoryId));
}

// ─── COUNTER HELPERS ───

async function getNextCounter(businessId: string, counterField: "orderCounter" | "employeeCounter", prefix: string, pad: number): Promise<string> {
  const businessRef = doc(businessesCollection(), businessId);
  const result = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(businessRef);
    const current = snap.data()?.[counterField] ?? 0;
    const next = current + 1;
    transaction.update(businessRef, { [counterField]: next });
    return `${prefix}${String(next).padStart(pad, "0")}`;
  });
  return result;
}

export async function getNextOrderNumber(businessId: string): Promise<string> {
  return getNextCounter(businessId, "orderCounter", "ON", 3);
}

export async function getNextEmployeeNumber(businessId: string): Promise<string> {
  return getNextCounter(businessId, "employeeCounter", "ES", 3);
}

// ─── ORDERS ───

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
  const orderRef = await addDoc(ordersCollection(businessId), {
    ...payload,
    orderNumber,
    stage: "cutting",
    deliveryStatus: "pending",
    paymentStatus: depositAmount > 0 ? "partial" : "unpaid",
    amountPaid: depositAmount,
    balanceAmount: Math.max(0, payload.subtotalAmount - depositAmount),
    fittingRecords: [],
    materialUsage: [],
    imageIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const customerRef = doc(customersCollection(businessId), payload.customerId);
  const batch = writeBatch(orderRef.firestore);
  batch.update(customerRef, {
    updatedAt: serverTimestamp(),
    lastOrderAt: serverTimestamp(),
    outstandingBalance: increment(Math.max(0, payload.subtotalAmount - depositAmount)),
  });

  if (depositAmount > 0) {
    const paymentRef = doc(paymentsCollection(businessId));
    batch.set(paymentRef, {
      businessId,
      customerId: payload.customerId,
      customerName: payload.customerName,
      orderId: orderRef.id,
      orderNumber,
      amount: depositAmount,
      method: "cash",
      recordedAt: serverTimestamp(),
      recordedByUid: actor.uid,
      recordedByName: actor.name,
    });
  }

  await batch.commit();
  return { id: orderRef.id, orderNumber };
}

export function listenOrders(businessId: string, callback: (rows: Order[]) => void) {
  const q = query(ordersCollection(businessId), orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const rows = snapshot.docs
      .map((docItem) => ({ ...docItem.data(), id: docItem.id }))
      .sort((a, b) => orderStageSort[a.stage] - orderStageSort[b.stage]);
    callback(rows);
  });
}

export function listenOrdersAssignedToUser(businessId: string, uid: string, callback: (rows: Order[]) => void) {
  const q = query(ordersCollection(businessId), where("assignedTailorId", "==", uid), orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docItem) => ({ ...docItem.data(), id: docItem.id })));
  });
}

export function listenOrder(businessId: string, orderId: string, callback: (row: Order | null) => void) {
  return onSnapshot(doc(ordersCollection(businessId), orderId), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({ ...snapshot.data(), id: snapshot.id });
  });
}

export async function updateOrderStage(businessId: string, orderId: string, stage: ProductionStage) {
  const deliveryStatus = stage === "delivered" ? "picked" : stage === "ready_for_pickup" ? "ready" : "pending";
  await updateDoc(doc(ordersCollection(businessId), orderId), {
    stage,
    deliveryStatus,
    updatedAt: serverTimestamp(),
  });
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
    await addDoc(smsLogsCollection(businessId), {
      ...data,
      businessId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to log SMS entry:", error);
  }
}

export async function updateOrderSmsFields(
  businessId: string,
  orderId: string,
  fields: {
    readyPickupSmsSent?: boolean;
    readyPickupSmsSentAt?: ReturnType<typeof serverTimestamp>;
    expectedReadyDate?: Timestamp | null;
    delayNotificationSentAt?: ReturnType<typeof serverTimestamp>;
  }
) {
  await updateDoc(doc(ordersCollection(businessId), orderId), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export async function addFittingRecord(
  businessId: string,
  orderId: string,
  payload: { notes: string; adjustmentSummary?: string; byUid: string; byName: string }
) {
  const orderRef = doc(ordersCollection(businessId), orderId);
  const orderSnapshot = await getDoc(orderRef);
  if (!orderSnapshot.exists()) {
    return;
  }
  const current = orderSnapshot.data();
  const records = current.fittingRecords ?? [];
  records.push({
    notes: payload.notes,
    adjustmentSummary: payload.adjustmentSummary,
    byUid: payload.byUid,
    byName: payload.byName,
    date: Timestamp.fromDate(new Date()),
  });

  await updateDoc(orderRef, {
    fittingRecords: records,
    stage: "fitting",
    updatedAt: serverTimestamp(),
  });
}

export async function updateOrderProductionNotes(businessId: string, orderId: string, notes: string) {
  await updateDoc(doc(ordersCollection(businessId), orderId), {
    productionNotes: notes,
    updatedAt: serverTimestamp(),
  });
}

export async function appendOrderImageId(businessId: string, orderId: string, imageId: string) {
  await updateDoc(doc(ordersCollection(businessId), orderId), {
    imageIds: arrayUnion(imageId),
    updatedAt: serverTimestamp(),
  });
}

export async function recordMaterialUsage(
  businessId: string,
  orderId: string,
  items: Omit<MaterialUsageRecord, "recordedAt">[],
  actor: { uid: string; name: string }
) {
  const orderRef = doc(ordersCollection(businessId), orderId);
  const orderSnapshot = await getDoc(orderRef);
  if (!orderSnapshot.exists()) {
    throw new Error("Order not found.");
  }
  const orderData = orderSnapshot.data();

  const batch = writeBatch(orderRef.firestore);
  const usageRecords: MaterialUsageRecord[] = items.map((item) => ({
    ...item,
    recordedByUid: actor.uid,
    recordedByName: actor.name,
    recordedAt: Timestamp.fromDate(new Date()),
  }));

  for (const record of usageRecords) {
    const materialRef = doc(materialsCollection(businessId), record.materialId);
    batch.update(materialRef, {
      quantity: increment(-Math.abs(record.quantityUsed)),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(stockMovementsCollection(businessId)), {
      businessId,
      movementType: "used in order",
      materialId: record.materialId,
      materialName: record.materialName,
      orderId,
      quantityChange: -Math.abs(record.quantityUsed),
      unit: record.unit,
      reason: `Used in order ${orderData.orderNumber}`,
      createdByUid: actor.uid,
      createdByName: actor.name,
      createdAt: serverTimestamp(),
    });
  }

  const existingUsage = orderData.materialUsage ?? [];
  batch.update(orderRef, {
    materialUsage: [...existingUsage, ...usageRecords],
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(consumptionReportsCollection(businessId)), {
    businessId,
    orderId,
    orderNumber: orderData.orderNumber,
    items: usageRecords,
    totalItems: usageRecords.length,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  return usageRecords;
}

// ─── MATERIALS ───

export function listenMaterials(businessId: string, callback: (rows: InventoryMaterial[]) => void) {
  const q = query(materialsCollection(businessId), orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((row) => ({ ...row.data(), id: row.id })));
  });
}

export async function fetchMaterialById(businessId: string, materialId: string) {
  const snapshot = await getDoc(doc(materialsCollection(businessId), materialId));
  if (!snapshot.exists()) {
    return null;
  }
  return { ...snapshot.data(), id: snapshot.id } as InventoryMaterial;
}

export async function createMaterial(
  businessId: string,
  payload: Omit<InventoryMaterial, "id" | "createdAt" | "updatedAt">
) {
  const ref = await addDoc(materialsCollection(businessId), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteMaterial(
  businessId: string,
  materialId: string
) {
  await deleteDoc(doc(materialsCollection(businessId), materialId));
}

export async function updateMaterial(
  businessId: string,
  materialId: string,
  payload: Partial<Omit<InventoryMaterial, "id" | "businessId" | "createdAt" | "updatedAt">>
) {
  await updateDoc(doc(materialsCollection(businessId), materialId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
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
  const materialRef = doc(materialsCollection(businessId), payload.materialId);
  const batch = writeBatch(materialRef.firestore);
  batch.update(materialRef, {
    quantity: increment(payload.adjustment),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(stockMovementsCollection(businessId)), {
    businessId,
    movementType: "adjustment",
    materialId: payload.materialId,
    materialName: payload.materialName,
    quantityChange: payload.adjustment,
    unit: payload.unit,
    reason: payload.reason,
    createdByUid: payload.actorUid,
    createdByName: payload.actorName,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

// ─── SUPPLIERS ───

export async function createSupplier(
  businessId: string,
  payload: Omit<Supplier, "id" | "createdAt">
) {
  const ref = await addDoc(suppliersCollection(businessId), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSupplier(
  businessId: string,
  supplierId: string,
  payload: Partial<Omit<Supplier, "id" | "businessId" | "createdAt">>
) {
  await updateDoc(
    doc(suppliersCollection(businessId), supplierId),
    {
      ...payload,
      updatedAt: serverTimestamp(),
    }
  );
}

export async function deleteSupplier(
  businessId: string,
  supplierId: string
) {
  await deleteDoc(
    doc(suppliersCollection(businessId), supplierId)
  );
}



export function listenSuppliers(businessId: string, callback: (rows: Supplier[]) => void) {
  const q = query(suppliersCollection(businessId), orderBy("name", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((row) => ({ ...row.data(), id: row.id })));
  });
}

export async function fetchSupplierById(
  businessId: string,
  supplierId: string
): Promise<Supplier | null> {
  const snapshot = await getDoc(doc(suppliersCollection(businessId), supplierId));
  if (!snapshot.exists()) {
    return null;
  }
  return { ...snapshot.data(), id: snapshot.id } as Supplier;
}

// ─── STOCK MOVEMENTS ───

export function listenStockMovements(businessId: string, callback: (rows: StockMovement[]) => void) {
  const q = query(stockMovementsCollection(businessId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((row) => ({ ...row.data(), id: row.id })));
  });
}

// ─── PURCHASE ORDERS ───

export async function createPurchaseOrder(
  businessId: string,
  payload: Omit<PurchaseOrder, "id" | "createdAt">
) {
  const ref = await addDoc(purchaseOrdersCollection(businessId), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function fetchPurchaseOrderById(businessId: string, poId: string) {
  const snapshot = await getDoc(doc(purchaseOrdersCollection(businessId), poId));
  if (!snapshot.exists()) return null;
  return { ...snapshot.data(), id: snapshot.id } as PurchaseOrder;
}

export async function updatePurchaseOrder(
  businessId: string,
  poId: string,
  payload: Partial<Omit<PurchaseOrder, "id" | "businessId" | "createdAt">>
) {
  await updateDoc(doc(purchaseOrdersCollection(businessId), poId), {
    ...payload,
  });
}

export async function deletePurchaseOrder(
  businessId: string,
  poId: string
) {
  await deleteDoc(doc(purchaseOrdersCollection(businessId), poId));
}

export function listenPurchaseOrders(businessId: string, callback: (rows: PurchaseOrder[]) => void) {
  const q = query(purchaseOrdersCollection(businessId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((row) => ({ ...row.data(), id: row.id })));
  });
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

  const poRef = doc(purchaseOrdersCollection(businessId), payload.purchaseOrderId);
  const poSnapshot = await getDoc(poRef);
  if (!poSnapshot.exists()) {
    throw new Error("Purchase order not found.");
  }
  const poData = poSnapshot.data();

  let materialId = payload.materialId;

  if (!materialId || !(await getDoc(doc(materialsCollection(businessId), materialId))).exists()) {
    const existing = await getDocs(
      query(materialsCollection(businessId), where("name", "==", payload.materialName))
    );
    if (!existing.empty) {
      materialId = existing.docs[0].id;
    } else {
      const catId = payload.categoryId;
      let resolvedCatId = catId;
      const resolvedCatName = payload.categoryName || "Uncategorized";
      if (!resolvedCatId) {
        const cats = await getDocs(query(categoriesCollection(businessId), where("name", "==", resolvedCatName)));
        if (!cats.empty) {
          resolvedCatId = cats.docs[0].id;
        } else {
          const newCatRef = await addDoc(categoriesCollection(businessId), {
            businessId,
            name: resolvedCatName,
            createdAt: serverTimestamp(),
          });
          resolvedCatId = newCatRef.id;
        }
      }
      const newMatRef = await addDoc(materialsCollection(businessId), {
        businessId,
        name: payload.materialName,
        categoryId: resolvedCatId,
        categoryName: resolvedCatName,
        unitId: payload.unitId || "",
        unitName: payload.unitName || payload.unit,
        quantity: 0,
        reorderLevel: 0,
        averageUnitCost: poData.unitCost || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      materialId = newMatRef.id;
    }
  }

  const materialRef = doc(materialsCollection(businessId), materialId);
  const movementRef = doc(stockMovementsCollection(businessId));

  await runTransaction(poRef.firestore, async (transaction) => {
    const freshPoSnapshot = await transaction.get(poRef);
    const materialSnapshot = await transaction.get(materialRef);

    if (!freshPoSnapshot.exists()) {
      throw new Error("Purchase order not found.");
    }
    if (!materialSnapshot.exists()) {
      throw new Error("Material not found.");
    }

    const freshPo = freshPoSnapshot.data();
    const currentReceived = freshPo.quantityReceived ?? 0;
    const remaining = freshPo.quantity - currentReceived;

    if (remaining <= 0) {
      throw new Error("Purchase order is already fully received.");
    }
    if (payload.quantity > remaining) {
      throw new Error(`Cannot receive more than the remaining ${remaining} ${payload.unit}.`);
    }

    const material = materialSnapshot.data();
    const currentQuantity = Number(material.quantity ?? 0);
    const currentAverageCost = Number(material.averageUnitCost ?? 0);
    const newQuantity = currentQuantity + payload.quantity;
    const newAverageCost = newQuantity > 0
      ? ((currentQuantity * currentAverageCost) + (payload.quantity * Number(freshPo.unitCost ?? 0))) / newQuantity
      : currentAverageCost;
    const newReceived = currentReceived + payload.quantity;
    const newStatus = newReceived >= freshPo.quantity ? "received" : "partial";

    transaction.update(poRef, {
      status: newStatus,
      quantityReceived: newReceived,
    });
    transaction.update(materialRef, {
      quantity: newQuantity,
      averageUnitCost: newAverageCost,
      unitName: payload.unit,
      updatedAt: serverTimestamp(),
    });
    transaction.set(movementRef, {
      businessId,
      movementType: "stock in",
      materialId,
      materialName: payload.materialName,
      quantityChange: payload.quantity,
      unit: payload.unit,
      reason: `Purchase order delivery (${newReceived}/${freshPo.quantity} ${payload.unit})`,
      createdByUid: payload.actorUid,
      createdByName: payload.actorName,
      createdAt: serverTimestamp(),
    });
  });

  return materialId;
}

// ─── PAYMENTS ───

export function listenPayments(businessId: string, callback: (rows: Payment[]) => void) {
  const q = query(paymentsCollection(businessId), orderBy("recordedAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((row) => ({ ...row.data(), id: row.id })));
  });
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
    actorUid: string;
    actorName: string;
  }
) {
  const orderRef = doc(ordersCollection(businessId), payload.orderId);
  const customerRef = doc(customersCollection(businessId), payload.customerId);
  const orderSnapshot = await getDoc(orderRef);
  if (!orderSnapshot.exists()) {
    throw new Error("Order not found.");
  }

  const orderData = orderSnapshot.data();
  const nextPaid = (orderData.amountPaid ?? 0) + payload.amount;
  const nextBalance = Math.max(0, (orderData.subtotalAmount ?? 0) - nextPaid);
  const nextStatus = nextBalance === 0 ? "paid" : "partial";

  const batch = writeBatch(orderRef.firestore);
  batch.set(doc(paymentsCollection(businessId)), {
    businessId,
    customerId: payload.customerId,
    customerName: payload.customerName,
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    amount: payload.amount,
    method: payload.method,
    mpesaCode: payload.mpesaCode,
    recordedAt: serverTimestamp(),
    recordedByUid: payload.actorUid,
    recordedByName: payload.actorName,
  });
  batch.update(orderRef, {
    amountPaid: nextPaid,
    balanceAmount: nextBalance,
    paymentStatus: nextStatus,
    updatedAt: serverTimestamp(),
  });
  batch.update(customerRef, {
    outstandingBalance: increment(-payload.amount),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

// ─── HELPERS ───

export async function paginatedQuery<T extends DocumentData>(
  constraints: QueryConstraint[],
  mapper: (row: QueryDocumentSnapshot<DocumentData>) => T,
  after?: QueryDocumentSnapshot<DocumentData>
) {
  const pagedConstraints = after ? [...constraints, startAfter(after)] : constraints;
  const snapshot = await getDocs(query(usersCollection(), ...pagedConstraints));
  return {
    rows: snapshot.docs.map(mapper),
    lastDoc: snapshot.docs[snapshot.docs.length - 1],
  };
}

export function lowStockMaterials(materials: InventoryMaterial[]) {
  return materials.filter((material) => material.quantity <= material.reorderLevel);
}

export function materialConsumptionFromMovements(movements: StockMovement[]) {
  return movements
    .filter((movement) => movement.movementType === "used in order")
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
