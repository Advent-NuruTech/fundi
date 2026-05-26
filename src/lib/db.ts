import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  type Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Business,
  Employee,
  Customer,
  Order,
} from "@/types";

const businessesCol = (businessId: string) =>
  collection(db, "businesses");

const employeesCol = (businessId: string) =>
  collection(db, "businesses", businessId, "employees");

const customersCol = (businessId: string) =>
  collection(db, "businesses", businessId, "customers");

const ordersCol = (businessId: string) =>
  collection(db, "businesses", businessId, "orders");

// ── Business ──────────────────────────────────────────

export async function createBusiness(
  data: Omit<Business, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "businesses"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getBusiness(
  businessId: string
): Promise<Business | null> {
  const snap = await getDoc(doc(db, "businesses", businessId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Business;
}

// ── Employees ─────────────────────────────────────────

export async function getEmployees(
  businessId: string
): Promise<Employee[]> {
  const q = query(employeesCol(businessId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Employee));
}

export async function getEmployee(
  businessId: string,
  employeeId: string
): Promise<Employee | null> {
  const snap = await getDoc(doc(db, "businesses", businessId, "employees", employeeId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Employee;
}

export async function createEmployee(
  businessId: string,
  data: Omit<Employee, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(employeesCol(businessId), {
    ...data,
    createdAt: new Date().toISOString().split("T")[0],
  });
  return ref.id;
}

export async function updateEmployee(
  businessId: string,
  employeeId: string,
  data: Partial<Employee>
): Promise<void> {
  await updateDoc(
    doc(db, "businesses", businessId, "employees", employeeId),
    data
  );
}

// ── Customers ─────────────────────────────────────────

export async function getCustomers(
  businessId: string
): Promise<Customer[]> {
  const q = query(customersCol(businessId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer));
}

export async function getCustomer(
  businessId: string,
  customerId: string
): Promise<Customer | null> {
  const snap = await getDoc(
    doc(db, "businesses", businessId, "customers", customerId)
  );
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Customer;
}

export async function createCustomer(
  businessId: string,
  data: Omit<Customer, "id" | "createdAt" | "totalOrders" | "activeOrders" | "lastVisit" | "balance">
): Promise<string> {
  const ref = await addDoc(customersCol(businessId), {
    ...data,
    totalOrders: 0,
    activeOrders: 0,
    lastVisit: new Date().toISOString().split("T")[0],
    balance: 0,
    createdAt: new Date().toISOString().split("T")[0],
  });
  return ref.id;
}

// ── Orders ────────────────────────────────────────────

export async function getOrders(businessId: string): Promise<Order[]> {
  const q = query(ordersCol(businessId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

export async function getOrder(
  businessId: string,
  orderId: string
): Promise<Order | null> {
  const snap = await getDoc(
    doc(db, "businesses", businessId, "orders", orderId)
  );
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Order;
}

export async function createOrder(
  businessId: string,
  data: Omit<Order, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(ordersCol(businessId), {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateOrder(
  businessId: string,
  orderId: string,
  data: Partial<Order>
): Promise<void> {
  await updateDoc(doc(db, "businesses", businessId, "orders", orderId), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

// ── Role helpers ──────────────────────────────────────

export const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  business_admin: 80,
  manager: 60,
  tailor: 40,
  ironman: 30,
  cutter: 30,
  fitter: 30,
  receptionist: 30,
  employee: 20,
};

export function canManageEmployees(currentRole: string): boolean {
  const level = ROLE_HIERARCHY[currentRole] || 0;
  return level >= 60;
}

export function canAccessSettings(currentRole: string): boolean {
  const level = ROLE_HIERARCHY[currentRole] || 0;
  return level >= 80;
}
