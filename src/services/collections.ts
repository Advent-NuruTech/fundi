import { collection, type CollectionReference } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  Customer,
  EmployeeInvitation,
  FabricRoll,
  ImageMeta,
  InventoryMaterial,
  Order,
  Payment,
  PurchaseOrder,
  StockMovement,
  Supplier,
  UserProfile,
} from "@/types/domain";

export const usersCollection = () => collection(db, "users") as CollectionReference<UserProfile>;
export const businessesCollection = () => collection(db, "businesses");

export const membersCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "members") as CollectionReference<UserProfile>;

export const invitationsCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "invitations") as CollectionReference<EmployeeInvitation>;

export const customersCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "customers") as CollectionReference<Customer>;

export const ordersCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "orders") as CollectionReference<Order>;

export const materialsCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "inventory_materials") as CollectionReference<InventoryMaterial>;

export const fabricRollsCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "fabric_rolls") as CollectionReference<FabricRoll>;

export const stockMovementsCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "stock_movements") as CollectionReference<StockMovement>;

export const suppliersCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "suppliers") as CollectionReference<Supplier>;

export const purchaseOrdersCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "purchase_orders") as CollectionReference<PurchaseOrder>;

export const paymentsCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "payments") as CollectionReference<Payment>;

export const imagesCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "images") as CollectionReference<ImageMeta>;
