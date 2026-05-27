import { collection, type CollectionReference, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  Conversation,
  Customer,
  EmployeeInvitation,
  FabricRoll,
  ImageMeta,
  InventoryMaterial,
  Message,
  Notification,
  Order,
  Payment,
  PurchaseOrder,
  StockMovement,
  Supplier,
  UserProfile,
} from "@/types/domain";

type DbRecord<T extends { id: string }> = Omit<T, "id"> & DocumentData;

export const usersCollection = () => collection(db, "users") as CollectionReference<UserProfile>;
export const businessesCollection = () => collection(db, "businesses");

export const membersCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "members") as CollectionReference<UserProfile>;

export const invitationsCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "invitations") as CollectionReference<DbRecord<EmployeeInvitation>>;

export const customersCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "customers") as CollectionReference<DbRecord<Customer>>;

export const ordersCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "orders") as CollectionReference<DbRecord<Order>>;

export const materialsCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "inventory_materials") as CollectionReference<DbRecord<InventoryMaterial>>;

export const fabricRollsCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "fabric_rolls") as CollectionReference<DbRecord<FabricRoll>>;

export const stockMovementsCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "stock_movements") as CollectionReference<DbRecord<StockMovement>>;

export const suppliersCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "suppliers") as CollectionReference<DbRecord<Supplier>>;

export const purchaseOrdersCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "purchase_orders") as CollectionReference<DbRecord<PurchaseOrder>>;

export const paymentsCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "payments") as CollectionReference<DbRecord<Payment>>;

export const imagesCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "images") as CollectionReference<DbRecord<ImageMeta>>;

export const notificationsCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "notifications") as CollectionReference<DbRecord<Notification>>;

export const conversationsCollection = (businessId: string) =>
  collection(db, "businesses", businessId, "conversations") as CollectionReference<DbRecord<Conversation>>;

export const messagesCollection = (businessId: string, conversationId: string) =>
  collection(db, "businesses", businessId, "conversations", conversationId, "messages") as CollectionReference<DbRecord<Message>>;
