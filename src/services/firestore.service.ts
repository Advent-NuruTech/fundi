import {
  addDoc,
  collectionGroup,
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
  arrayUnion,
  and,
  runTransaction,
  startAfter,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  Customer,
  EmployeeInvitation,
  Business,
  FabricRoll,
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
} from "@/types/domain";
import {
  businessesCollection,
  customersCollection,
  fabricRollsCollection,
  materialsCollection,
  membersCollection,
  invitationsCollection,
  ordersCollection,
  paymentsCollection,
  purchaseOrdersCollection,
  stockMovementsCollection,
  suppliersCollection,
  usersCollection,
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

function nowIso() {
  return new Date().toISOString();
}

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

export async function createInvitationRecord(
  businessId: string,
  payload: Omit<EmployeeInvitation, "id" | "createdAt" | "status">
) {
  const ref = await addDoc(invitationsCollection(businessId), {
    ...payload,
    status: "pending",
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
}) {
  const roles = normalizedRoles(input.roles);
  const payload = {
    uid: input.uid,
    email: input.email,
    displayName: input.displayName,
    roles,
    role: roleFromRoles(roles),
    businessId: input.businessId,
    active: true,
    mustChangePassword: true,
    invitedByUid: input.invitedByUid,
    invitedByName: input.invitedByName,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  };

  await setDoc(doc(usersCollection(), input.uid), payload, { merge: true });
  await setDoc(doc(membersCollection(input.businessId), input.uid), payload, { merge: true });
}

export function listenInvitations(businessId: string, callback: (rows: EmployeeInvitation[]) => void) {
  const q = query(invitationsCollection(businessId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((row) => ({ ...row.data(), id: row.id })));
  });
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
  await updateDoc(doc(invitationsCollection(businessId), invite.id), {
    status: "accepted",
    acceptedAt: serverTimestamp(),
  });
  await updateDoc(doc(usersCollection(), uid), {
    mustChangePassword: true,
  });
  await updateDoc(doc(membersCollection(businessId), uid), {
    mustChangePassword: true,
  });
  return businessId;
}

function buildOrderNumber() {
  const stamp = Date.now().toString().slice(-6);
  return `FF-${stamp}`;
}

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
    | "imageIds"
    | "deliveryStatus"
    | "stage"
  >,
  depositAmount: number,
  actor: { uid: string; name: string }
) {
  const orderNumber = buildOrderNumber();
  const orderRef = await addDoc(ordersCollection(businessId), {
    ...payload,
    orderNumber,
    stage: "cutting",
    deliveryStatus: "pending",
    paymentStatus: depositAmount > 0 ? "partial" : "unpaid",
    amountPaid: depositAmount,
    balanceAmount: Math.max(0, payload.subtotalAmount - depositAmount),
    fittingRecords: [],
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

  for (const selection of payload.fabricSelections) {
    if (!selection.materialId) {
      continue;
    }
    const materialRef = doc(materialsCollection(businessId), selection.materialId);
    batch.update(materialRef, {
      quantity: increment(-Math.abs(selection.metersRequired)),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(stockMovementsCollection(businessId)), {
      businessId,
      movementType: "consumption",
      materialId: selection.materialId,
      materialName: selection.materialName,
      orderId: orderRef.id,
      quantityChange: -Math.abs(selection.metersRequired),
      unit: "meters",
      reason: "Order fabric reservation",
      createdByUid: actor.uid,
      createdByName: actor.name,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return orderRef.id;
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

export function listenFabricRolls(businessId: string, callback: (rows: FabricRoll[]) => void) {
  const q = query(fabricRollsCollection(businessId), orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((row) => ({ ...row.data(), id: row.id })));
  });
}

export function listenStockMovements(businessId: string, callback: (rows: StockMovement[]) => void) {
  const q = query(stockMovementsCollection(businessId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((row) => ({ ...row.data(), id: row.id })));
  });
}

export function listenSuppliers(businessId: string, callback: (rows: Supplier[]) => void) {
  const q = query(suppliersCollection(businessId), orderBy("name", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((row) => ({ ...row.data(), id: row.id })));
  });
}

export function listenPurchaseOrders(businessId: string, callback: (rows: PurchaseOrder[]) => void) {
  const q = query(purchaseOrdersCollection(businessId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((row) => ({ ...row.data(), id: row.id })));
  });
}

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

export async function createMaterial(
  businessId: string,
  payload: Omit<InventoryMaterial, "id" | "createdAt" | "updatedAt">
) {
  if (!payload.supplierId) {
    throw new Error("Select a supplier before creating a material.");
  }
  await addDoc(materialsCollection(businessId), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createFabricRoll(
  businessId: string,
  payload: Omit<FabricRoll, "id" | "createdAt" | "updatedAt">
) {
  await addDoc(fabricRollsCollection(businessId), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createSupplier(
  businessId: string,
  payload: Omit<Supplier, "id" | "createdAt">
) {
  await addDoc(suppliersCollection(businessId), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

export async function createPurchaseOrder(
  businessId: string,
  payload: Omit<PurchaseOrder, "id" | "createdAt">
) {
  await addDoc(purchaseOrdersCollection(businessId), {
    ...payload,
    createdAt: serverTimestamp(),
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

export async function receiveStockFromPurchaseOrder(
  businessId: string,
  payload: {
    purchaseOrderId: string;
    materialId: string;
    materialName: string;
    quantity: number;
    unit: string;
    actorUid: string;
    actorName: string;
  }
) {
  const poRef = doc(purchaseOrdersCollection(businessId), payload.purchaseOrderId);
  const materialRef = doc(materialsCollection(businessId), payload.materialId);
  const batch = writeBatch(poRef.firestore);

  batch.update(poRef, { status: "received" });
  batch.update(materialRef, {
    quantity: increment(payload.quantity),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(stockMovementsCollection(businessId)), {
    businessId,
    movementType: "stock_in",
    materialId: payload.materialId,
    materialName: payload.materialName,
    quantityChange: payload.quantity,
    unit: payload.unit,
    reason: "Supplier delivery",
    createdByUid: payload.actorUid,
    createdByName: payload.actorName,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function consumeFabricForOrder(
  businessId: string,
  payload: {
    orderId: string;
    rollId: string;
    materialName: string;
    metersUsed: number;
    actorUid: string;
    actorName: string;
  }
) {
  const rollRef = doc(fabricRollsCollection(businessId), payload.rollId);
  const orderRef = doc(ordersCollection(businessId), payload.orderId);

  const batch = writeBatch(rollRef.firestore);
  batch.update(rollRef, {
    metersRemaining: increment(-payload.metersUsed),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(stockMovementsCollection(businessId)), {
    businessId,
    movementType: "consumption",
    materialName: payload.materialName,
    rollId: payload.rollId,
    orderId: payload.orderId,
    quantityChange: -payload.metersUsed,
    unit: "meters",
    reason: "Order fabric consumption",
    createdByUid: payload.actorUid,
    createdByName: payload.actorName,
    createdAt: serverTimestamp(),
  });
  batch.update(orderRef, {
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

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

export function fabricConsumptionFromMovements(movements: StockMovement[]) {
  return movements
    .filter((movement) => movement.movementType === "consumption")
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
