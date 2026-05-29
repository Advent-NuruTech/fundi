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

export type NotificationType =
  | "order_assigned"
  | "order_updated"
  | "payment_received"
  | "invitation_accepted"
  | "message_received"
  | "announcement"
  | "low_stock"
  | "member_joined"
  | "system"
  | "material_added"
  | "stock_received"
  | "stock_adjusted"
  | "purchase_order_created"
  | "purchase_order_received"
  | "new_order_created"
  | "order_stage_changed"
  | "order_completed"
  | "materials_consumed";

export type ConversationType = "direct" | "announcement";
export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";

export interface DbUnit {
  id: string;
  businessId: string;
  name: string;
  createdAt: Timestamp;
}

export interface DbCategory {
  id: string;
  businessId: string;
  name: string;
  createdAt: Timestamp;
}

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
  currency: string;
  country: string;
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
  metersRequired: number;
}

export interface FittingRecord {
  date: Timestamp;
  notes: string;
  adjustmentSummary?: string;
  byUid: string;
  byName: string;
}

export interface MaterialUsageRecord {
  materialId: string;
  materialName: string;
  quantityUsed: number;
  unit: string;
  recordedByUid: string;
  recordedByName: string;
  recordedAt: Timestamp;
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
  materialUsage: MaterialUsageRecord[];
  imageIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FabricMeta {
  color?: string;
  gsm?: number;
  rollLength?: number;
  pattern?: string;
  composition?: string;
  customFields?: Array<{
    key: string;
    value: string | number;
  }>;
}

export interface InventoryMaterial {
  id: string;
  businessId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unitId: string;
  unitName: string;
  quantity: number;
  reorderLevel: number;
  averageUnitCost: number;
  supplierId?: string;
  imageUrl?: string;
  imagePublicId?: string;
  fabricMeta?: FabricMeta;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

export interface StockMovement {
  id: string;
  businessId: string;
  movementType: string;
  materialId?: string;
  materialName: string;
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
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  status: "pending" | "partial" | "received";
  quantityReceived: number;
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

// Finance category types (backward-compatible string aliases)
export type ExpenseCategory = string;
export type WithdrawalCategory = string;

export interface ConsumptionReport {
  id: string;
  businessId: string;
  orderId: string;
  orderNumber: string;
  items: MaterialUsageRecord[];
  totalItems: number;
  createdAt: Timestamp;
}

// ─── FINANCE MODULE TYPES ───

export interface Expense {
  id: string;
  businessId: string;
  category: string;
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

export interface Withdrawal {
  id: string;
  businessId: string;
  amount: number;
  reason: string;
  category: string;
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
