export type UserRole =
  | "owner"
  | "admin_manager"
  | "tailor"
  | "receptionist"
  | "inventory_manager"
  | "cashier"
  | "customer";

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
  createdAt: string;
}

export interface DbCategory {
  id: string;
  businessId: string;
  name: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  employeeNumber?: string;
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
  payRate?: number;
  payPeriod?: "daily" | "weekly" | "monthly";
  nextPayDate?: string;
  createdAt: string;
  lastActiveAt?: string;
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
  createdAt: string;
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
    messageId?: string;
    text: string;
    senderUid: string;
    senderName: string;
    createdAt: string;
  };
  lastMessageAt?: string;
  lastMessageText?: string;
  type: ConversationType;
  title?: string;
  priority?: AnnouncementPriority;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
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
  editedAt?: string;
  deletedAt?: string;
  deletedByUid?: string;
  isDeleted?: boolean;
  createdAt: string;
}

// Per-manager granular permission set (keyed by manager uid in FinanceAccessSettings)
export interface ManagerPermissions {
  canSeeWeekEarnings: boolean;
  canSeeMonthEarnings: boolean;
  canSeeYearEarnings: boolean;
  canSeeTotalRevenue: boolean;
  canSeeInvestments: boolean;
  canSeeSavings: boolean;
  canSeeFinancialReports: boolean;
  canSeeMonthlyRevenueAnalytics: boolean;
  canSeeInventoryValue: boolean;
  canSeeProfitMargins: boolean;
  canManageFinance: boolean;
  hasFullDashboardAccess: boolean;
}

export const DEFAULT_MANAGER_PERMISSIONS: ManagerPermissions = {
  canSeeWeekEarnings: false,
  canSeeMonthEarnings: false,
  canSeeYearEarnings: false,
  canSeeTotalRevenue: false,
  canSeeInvestments: false,
  canSeeSavings: false,
  canSeeFinancialReports: false,
  canSeeMonthlyRevenueAnalytics: false,
  canSeeInventoryValue: false,
  canSeeProfitMargins: false,
  canManageFinance: false,
  hasFullDashboardAccess: false,
};

// Controls which financial sections are visible to non-owner roles
export interface FinanceAccessSettings {
  // Co-owners share the same full-access view as the primary owner
  coOwnerUids: string[];
  // Legacy global toggles for admin_manager role (kept for backwards compat)
  managerCanSeeWeekHistory: boolean;
  managerCanSeeMonthHistory: boolean;
  managerCanSeeYearHistory: boolean;
  managerCanSeeOwnerKpis: boolean;
  // Per-manager individual permission sets (keyed by uid, overrides global toggles)
  managerPermissions: Record<string, ManagerPermissions>;
}

export const DEFAULT_FINANCE_ACCESS: FinanceAccessSettings = {
  coOwnerUids: [],
  managerCanSeeWeekHistory: false,
  managerCanSeeMonthHistory: false,
  managerCanSeeYearHistory: false,
  managerCanSeeOwnerKpis: false,
  managerPermissions: {},
};

export interface Business {
  id: string;
  name: string;
  phone: string;
  location: string;
  currency: string;
  country: string;
  /** Industry preset driving terminology/navigation/dashboard. See @/lib/business-types. */
  businessType?: import("@/lib/business-types").BusinessType;
  ownerUid: string;
  orderCounter?: number;
  employeeCounter?: number;
  smsSenderId?: string;
  createdAt: string;
  financeAccess?: FinanceAccessSettings;
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
  lastOrderAt?: string;
  createdAt: string;
  updatedAt: string;
  measurements: MeasurementSet;
  portalUserId?: string;
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
  date: string;
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
  recordedAt: string;
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
  createdAt: string;
  updatedAt: string;
  readyPickupSmsSent?: boolean;
  readyPickupSmsSentAt?: string;
  expectedReadyDate?: string | null;
  delayNotificationSentAt?: string | null;
  delayReason?: string | null;
  imageUrls?: string[];
  trackingToken?: string;
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

export interface MaterialImage {
  url: string;
  publicId: string;
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
  images?: MaterialImage[];
  fabricMeta?: FabricMeta;
  updatedAt: string;
  createdAt: string;
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
  createdAt: string;
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  contactPerson?: string;
  notes?: string;
  createdAt: string;
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
  imageUrl?: string;
  imagePublicId?: string;
  createdAt: string;
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
  description?: string;
  recordedAt: string;
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
  uploadedAt: string;
}

export interface EmployeeInvitation {
  id: string;
  businessId: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  token: string;
  invitedUid: string;
  temporaryPassword: string;
  invitedByUid: string;
  invitedByName: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface TenantScoped {
  businessId: string;
}

/**
 * One business a user can access, derived from `business_members`. A single
 * login (email) can belong to many businesses, each with its own role — the
 * active one drives the whole app's scope.
 */
/**
 * A branch (outlet) within a business. Branches fully isolate transactional
 * data — orders, stock, customers, payments and finance are separate per
 * branch. Every business has exactly one default branch ("Main Branch").
 */
export interface Branch {
  id: string;
  businessId: string;
  name: string;
  location?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface BusinessMembership {
  businessId: string;
  businessName: string;
  businessType?: import("@/lib/business-types").BusinessType;
  role: UserRole;
  roles: UserRole[];
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
  createdAt: string;
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
  expenseDate: string;
  createdByUid: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Withdrawal {
  id: string;
  businessId: string;
  amount: number;
  reason: string;
  category: string;
  withdrawnByUid: string;
  withdrawnByName: string;
  withdrawalDate: string;
  notes?: string;
  createdAt: string;
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
  createdAt: string;
  updatedAt: string;
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

export interface SmsLog {
  id: string;
  businessId: string;
  orderId: string;
  recipient: string;
  message: string;
  type: "ready_for_pickup" | "delay_notification";
  status: "success" | "failed";
  response: unknown;
  createdAt: string;
}

export interface FinanceAlert {
  type: "warning" | "danger" | "info" | "success";
  title: string;
  message: string;
  metric?: string;
  value?: number;
}

export type InvestmentStatus = "active" | "completed" | "cancelled";

export interface Investment {
  id: string;
  businessId: string;
  type: string;
  amount: number;
  description: string;
  notes?: string;
  investmentDate: string;
  returnExpected?: number;
  returnActual?: number;
  status: InvestmentStatus;
  createdByUid: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  businessId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  description?: string;
  color: string;
  status: "active" | "completed" | "cancelled";
  createdByUid: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsDeposit {
  id: string;
  businessId: string;
  goalId?: string;
  amount: number;
  notes?: string;
  depositDate: string;
  createdByUid: string;
  createdByName: string;
  createdAt: string;
}
