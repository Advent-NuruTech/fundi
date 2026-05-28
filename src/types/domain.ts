import type { Timestamp } from "firebase/firestore";

export type UserRole =
  | "owner"
  | "admin_manager"
  | "tailor"
  | "receptionist"
  | "inventory_manager"
  | "cashier";

export type ProductionStage =
  | "cutting"
  | "stitching"
  | "fitting"
  | "finishing"
  | "ready_for_pickup"
  | "delivered";

export type DeliveryStatus = "pending" | "ready" | "picked";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type PaymentMethod = "cash" | "mpesa";
export type MaterialCategory = "buttons" | "zips" | "thread" | "elastic" | "lining" | "accessories";
export type MovementType = "stock_in" | "consumption" | "wastage" | "adjustment";
export type NotificationType =
  | "order_assigned"
  | "order_updated"
  | "payment_received"
  | "invitation_accepted"
  | "message_received"
  | "announcement"
  | "low_stock"
  | "member_joined"
  | "system";
export type ConversationType = "direct" | "announcement";
export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  roles?: UserRole[];
  businessId: string;
  active: boolean;
  mustChangePassword?: boolean;
  photoURL?: string;
  bio?: string;
  phone?: string;
  invitedByUid?: string;
  invitedByName?: string;
  createdAt: Timestamp;
  lastActiveAt?: Timestamp;
}

export interface Notification {
  id: string;
  businessId: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  archived: boolean;
  createdAt: Timestamp;
  metadata?: Record<string, string>;
}

export interface Conversation {
  id: string;
  businessId: string;
  participants: string[];
  participantProfiles: Array<{
    uid: string;
    displayName: string;
    photoURL?: string;
  }>;
  lastMessage?: {
    text: string;
    senderUid: string;
    senderName: string;
    createdAt: Timestamp;
  };
  type: ConversationType;
  title?: string;
  priority?: AnnouncementPriority;
  pinned?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MessageAttachment {
  type: "image" | "file";
  url: string;
  name?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  businessId: string;
  senderUid: string;
  senderName: string;
  text: string;
  attachments?: MessageAttachment[];
  readBy: string[];
  createdAt: Timestamp;
}

export interface Business {
  id: string;
  name: string;
  phone: string;
  location: string;
  currency: "KES";
  country: "Kenya";
  ownerUid: string;
  createdAt: Timestamp;
}

export interface MeasurementSet {
  bust?: number;
  waist?: number;
  hips?: number;
  shoulder?: number;
  sleeve?: number;
  inseam?: number;
  length?: number;
  neck?: number;
  thigh?: number;
  notes?: string;
}

export interface Customer {
  id: string;
  businessId: string;
  fullName: string;
  phone: string;
  email?: string;
  preferences?: string;
  notes?: string;
  outstandingBalance: number;
  lastOrderAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  measurements: MeasurementSet;
}

export interface OrderGarmentItem {
  name: string;
  quantity: number;
  styleNotes?: string;
  agreedPrice: number;
}

export interface FabricSelection {
  materialId?: string;
  materialName: string;
  color?: string;
  rollId?: string;
  metersRequired: number;
}

export interface FittingRecord {
  date: Timestamp;
  notes: string;
  adjustmentSummary?: string;
  byUid: string;
  byName: string;
}

export interface Order {
  id: string;
  businessId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  assignedTailorId?: string;
  assignedTailorName?: string;
  garments: OrderGarmentItem[];
  measurementsSnapshot: MeasurementSet;
  designNotes?: string;
  fabricSelections: FabricSelection[];
  stage: ProductionStage;
  deliveryStatus: DeliveryStatus;
  paymentStatus: PaymentStatus;
  dueDate: string;
  subtotalAmount: number;
  amountPaid: number;
  balanceAmount: number;
  fittingRecords: FittingRecord[];
  productionNotes?: string;
  imageIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface InventoryMaterial {
  id: string;
  businessId: string;
  name: string;
  category: MaterialCategory;
  unit: "pcs" | "meters" | "cones";
  quantity: number;
  reorderLevel: number;
  averageUnitCost: number;
  supplierId?: string;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

export interface FabricRoll {
  id: string;
  businessId: string;
  materialId?: string;
  fabricType: string;
  color: string;
  supplierId?: string;
  metersRemaining: number;
  costPerMeter: number;
  purchasedOn: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StockMovement {
  id: string;
  businessId: string;
  movementType: MovementType;
  materialId?: string;
  materialName: string;
  rollId?: string;
  orderId?: string;
  quantityChange: number;
  unit: string;
  reason: string;
  createdByUid: string;
  createdByName: string;
  createdAt: Timestamp;
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  contactPerson?: string;
  notes?: string;
  createdAt: Timestamp;
}

export interface PurchaseOrder {
  id: string;
  businessId: string;
  supplierId: string;
  supplierName: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  status: "pending" | "received";
  expectedDate: string;
  createdAt: Timestamp;
}

export interface Payment {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  method: PaymentMethod;
  mpesaCode?: string;
  recordedAt: Timestamp;
  recordedByUid: string;
  recordedByName: string;
}

export interface ImageMeta {
  id: string;
  businessId: string;
  orderId?: string;
  customerId?: string;
  url: string;
  publicId: string;
  width: number;
  height: number;
  format?: string;
  uploadedByUid: string;
  uploadedAt: Timestamp;
}

export interface EmployeeInvitation {
  id: string;
  businessId: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  token: string;
  temporaryPassword: string;
  invitedByUid: string;
  invitedByName: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
}

export interface TenantScoped {
  businessId: string;
}

// ─── FINANCE MODULE TYPES ───

export type ExpenseCategory = "rent" | "salaries" | "transport" | "utilities" | "inventory_purchases" | "marketing" | "maintenance" | "miscellaneous";

export interface Expense {
  id: string;
  businessId: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  notes?: string;
  receiptUrl?: string;
  supplierId?: string;
  supplierName?: string;
  expenseDate: Timestamp;
  createdByUid: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type WithdrawalCategory = "owner_drawings" | "salary_advance" | "business_expenses" | "tax" | "other";

export interface Withdrawal {
  id: string;
  businessId: string;
  amount: number;
  reason: string;
  category: WithdrawalCategory;
  withdrawnByUid: string;
  withdrawnByName: string;
  withdrawalDate: Timestamp;
  notes?: string;
  createdAt: Timestamp;
}

export type TransactionType = "payment_received" | "expense" | "withdrawal" | "inventory_purchase" | "refund" | "adjustment";
export type TransactionStatus = "completed" | "pending" | "cancelled";

export interface Transaction {
  id: string;
  businessId: string;
  type: TransactionType;
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
  status: TransactionStatus;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type FinancePeriod = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export interface PeriodSummary {
  revenue: number;
  expenses: number;
  withdrawals: number;
  netProfit: number;
  grossProfit: number;
  expenseRatio: number;
  profitMargin: number;
  orderCount: number;
  transactionCount: number;
}

export interface FinancialReport {
  period: FinancePeriod;
  startDate: string;
  endDate: string;
  summary: PeriodSummary;
  breakdown: {
    byCategory: Record<string, number>;
    byDay: Array<{ date: string; revenue: number; expenses: number; profit: number }>;
  };
}

export interface FinanceAlert {
  type: "warning" | "danger" | "info" | "success";
  title: string;
  message: string;
  metric?: string;
  value?: number;
}
