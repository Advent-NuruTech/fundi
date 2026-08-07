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

/** How an order reaches the customer. */
export type DeliveryMethod = "delivery" | "pickup";

/**
 * Order-level delivery workflow, tracked independently of the production
 * pipeline. Production reaches completion → the order enters the delivery
 * workflow → it ends in a terminal state ("delivered" or "picked_by_customer").
 */
export type DeliveryStage =
  /** Still in production — delivery not started yet. */
  | "pending"
  /** Production complete, packed, waiting for courier assignment. */
  | "ready_for_dispatch"
  /** A delivery partner has been assigned to the order. */
  | "courier_assigned"
  /** The courier collected the order from the business. */
  | "picked_up"
  /** The courier is delivering the order. */
  | "in_transit"
  /** Delivery could not be completed (customer unavailable, wrong address…). */
  | "delivery_attempted"
  /** Terminal — order delivered by courier/own rider. */
  | "delivered"
  /** Production complete, awaiting customer collection at the shop. */
  | "pickup_ready"
  /** Terminal — customer collected the order from the shop. */
  | "picked_by_customer";

/** One event on an order's delivery timeline (full traceability). */
export interface DeliveryTimelineEntry {
  stage: DeliveryStage;
  label: string;
  at: string;
  by?: string;
  note?: string;
}

/** A rider / courier company a business can assign to orders. */
export interface DeliveryPartner {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  company?: string;
  vehicleType?: string;
  registrationNumber?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Per-business delivery policy. Stored as jsonb on businesses.delivery_config. */
export interface BusinessDeliveryConfig {
  /** Master switch — when off, orders default to customer pickup. */
  enabled: boolean;
  /** Default fulfilment method for new orders. */
  defaultMethod: DeliveryMethod;
  /** Default delivery fee for new orders (KES). */
  defaultDeliveryFee: number;
  /** Orders whose goods total is above this get free delivery (optional). */
  freeDeliveryAbove?: number | null;
  /** Ready-made, no-alteration orders are marked delivered automatically. */
  autoDeliverReadyMade: boolean;
  /** Per-milestone customer SMS toggles for the delivery workflow. */
  sms: {
    dispatch: boolean;
    assign: boolean;
    pickup: boolean;
    transit: boolean;
    attempt: boolean;
    delivered: boolean;
  };
}

export const DEFAULT_DELIVERY_CONFIG: BusinessDeliveryConfig = {
  enabled: true,
  defaultMethod: "delivery",
  defaultDeliveryFee: 0,
  freeDeliveryAbove: null,
  autoDeliverReadyMade: true,
  sms: {
    dispatch: false,
    assign: true,
    pickup: true,
    transit: true,
    attempt: true,
    delivered: true,
  },
};

/** Progress of a single returns / alterations cycle on a delivered order. */
export type ReturnStatus =
  | "returned"
  | "inspection"
  | "alteration"
  | "quality_check"
  | "ready_for_pickup"
  | "completed";

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  returned: "Returned",
  inspection: "Inspection",
  alteration: "Alteration / Remake",
  quality_check: "Quality Check",
  ready_for_pickup: "Ready for Pickup / Dispatch",
  completed: "Delivered",
};

/** A structured return record. Preserves the original production history. */
export interface OrderReturn {
  id: string;
  businessId: string;
  orderId: string;
  orderNumber?: string;
  /** Reason key — either a built-in default or "other". */
  reason: string;
  /** Human label of the reason (denormalized for display). */
  reasonLabel: string;
  notes?: string;
  returnedAt: string;
  handledByUid?: string;
  handledByName?: string;
  /** Extra charge for the alteration / remake, if any. */
  additionalCharge: number;
  expectedCompletionDate?: string | null;
  imageUrls?: string[];
  status: ReturnStatus;
  createdAt: string;
  updatedAt: string;
}

/** Who requested the cancellation. */
export type CancellationBy = "customer" | "business" | "system";
/** Refund handling for a cancelled order. */
export type RefundStatus = "none" | "pending" | "refunded";

/** Structured cancellation record — orders are never hard-deleted. */
export interface OrderCancellation {
  id: string;
  businessId: string;
  orderId: string;
  orderNumber?: string;
  reason: string;
  reasonLabel: string;
  notes?: string;
  cancelledBy: CancellationBy;
  cancelledByUid?: string;
  cancelledByName?: string;
  cancelledAt: string;
  refundStatus: RefundStatus;
  refundAmount: number;
  createdAt: string;
}

/**
 * Marks what a production stage means in the broader lifecycle. Kept small and
 * semantic so the legacy compatibility stage can be derived from ANY custom
 * pipeline: `ready_for_pickup` and `delivered` are the two milestones that
 * matter for delivery status, the "delivered" filter and customer messaging.
 */
export type StageMilestone = "none" | "ready_for_pickup" | "delivered";

/**
 * One configurable step in a business's production pipeline. Businesses build
 * their own ordered list (up to 20 stages) and choose which stages notify the
 * customer. `is_seeded` marks the six defaults that mirror the legacy enum.
 */
export interface ProductionStageConfig {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  displayOrder: number;
  color?: string;
  icon?: string;
  isActive: boolean;
  notifyCustomer: boolean;
  milestone: StageMilestone;
  isSeeded?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

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
  | "materials_consumed"
  | "delivery_stage_changed";

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

export type TaxMode = "inclusive" | "exclusive";

export interface Business {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  location: string;
  currency: string;
  country: string;
  /** Industry preset driving terminology/navigation/dashboard. See @/lib/business-types. */
  businessType?: import("@/lib/business-types").BusinessType;
  ownerUid: string;
  orderCounter?: number;
  employeeCounter?: number;
  smsSenderId?: string;
  /** Receipt branding — shown at the top of printed receipts when set. */
  logoUrl?: string;
  /** Optional custom line printed in the receipt footer (e.g. return policy). */
  receiptFooter?: string;
  /** Whether VAT/tax appears on receipts at all. OFF → no tax trace anywhere. */
  taxEnabled?: boolean;
  /** Tax percentage (e.g. 16 for 16% VAT). */
  taxRate?: number;
  /** Inclusive: agreed price already contains VAT. Exclusive: VAT added on top. */
  taxMode?: TaxMode;
  /** Label shown for the tax line (e.g. "VAT"). */
  taxLabel?: string;
  createdAt: string;
  financeAccess?: FinanceAccessSettings;
  /** Delivery policy (method default, fee, ready-made auto-deliver, SMS toggles). */
  deliveryConfig?: BusinessDeliveryConfig;
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
  [key: string]: number | string | null | undefined;
}

export type CustomerType = "individual" | "group";

export interface Customer {
  id: string;
  businessId: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: 'male' | 'female';
  preferences?: string;
  notes?: string;
  outstandingBalance: number;
  lastOrderAt?: string;
  createdAt: string;
  updatedAt: string;
  measurements: MeasurementSet;
  portalUserId?: string;
  /** Login id assigned for the customer portal (email or normalized phone). */
  portalLoginId?: string;
  /** Whether the portal account still needs to be provisioned. */
  portalProvisionNeeded?: boolean;
  /** Whether the portal-onboarding SMS block has been sent to this customer. */
  portalOnboardingSent?: boolean;
  /**
   * "individual" or "group". A group customer is a billing account for an
   * organization (company, school, church, hotel, family…) whose members are
   * ordinary customers linked via `parentCustomerId`.
   */
  customerType?: CustomerType;
  /** Set on member customers → points at the group account that bills for them. */
  parentCustomerId?: string;
  /** Display name of the organization (used instead of fullName for groups). */
  organizationName?: string;
  /** The person responsible for ordering/paying (John Kamau). */
  contactPerson?: string;
  /** Custom title of the contact person (HR Manager, School Principal…). */
  contactRole?: string;
  taxId?: string;
  paymentTerms?: string;
  address?: string;
  /** Member-level field, e.g. "Security", "Production". */
  department?: string;
  /** Number of members under this group (populated in list queries). */
  memberCount?: number;
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

export interface OrderMemberGarment {
  id: string;
  name: string;
  quantity: number;
  agreedPrice: number;
  styleNotes?: string;
  fabricUsed?: number;
  notes?: string;
  sortOrder?: number;
}

export interface OrderMember {
  id: string;
  orderId: string;
  memberCustomerId: string;
  memberName: string;
  gender?: string;
  department?: string;
  measurementsSnapshot?: MeasurementSet;
  stage: ProductionStage;
  deliveryStatus: DeliveryStatus;
  notes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  garments?: OrderMemberGarment[];
}

/**
 * What a single inventory record is. Everything that can be stocked belongs to
 * inventory; the item type decides how it is displayed and consumed.
 */
export type InventoryItemType =
  | "fabric"
  | "ready_made"
  | "material"
  | "accessory"
  | "consumable"
  | "other";

/**
 * The workflow a single line item on an order follows. Each order item picks its
 * own type so one customer order can mix tailoring, ready-made sales,
 * alterations, material sales and services.
 */
export type OrderItemType =
  | "tailored"
  | "ready_made"
  | "alteration"
  | "material"
  | "service";

/** The overall order flavour, derived from its line items. */
export type OrderType =
  | "tailoring"
  | "ready_made_sale"
  | "ready_made_alteration"
  | "material_sale"
  | "mixed";

export interface OrderItemMaterialUsage {
  id: string;
  orderItemId: string;
  materialId?: string;
  materialName: string;
  quantityUsed: number;
  unit: string;
  recordedByUid?: string;
  recordedByName?: string;
  recordedAt: string;
}

/**
 * One line on an order. Stores price/cost snapshots taken at sale time so
 * profit stays accurate even if the inventory item's prices change later.
 */
export interface OrderItem {
  id: string;
  orderId: string;
  itemType: OrderItemType;
  /** The shared inventory record — the single source of truth. */
  inventoryItemId?: string;
  inventoryItemName?: string;
  sku?: string;
  categoryName?: string;
  size?: string;
  color?: string;
  brand?: string;
  /** Group-order recipient. Empty for a normal individual order item. */
  memberCustomerId?: string;
  memberName?: string;
  /** Optional design/reference image for this specific line item. */
  referenceImageUrl?: string | null;
  quantity: number;
  unit?: string;
  /** Actual selling price charged at the time of the transaction. */
  unitPrice: number;
  /** Cost price snapshot at the time of the transaction. */
  costPrice?: number;
  discount?: number;
  totalAmount: number;
  measurements?: MeasurementSet;
  styleNotes?: string;
  assignedTailorId?: string;
  assignedTailorName?: string;
  stage?: ProductionStage;
  deliveryStatus: DeliveryStatus;
  status?: string;
  readyDate?: string;
  notes?: string;
  sortOrder?: number;
  materialUsage?: OrderItemMaterialUsage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  businessId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  /** Overall order flavour (tailoring / ready-made sale / … / mixed). */
  orderType?: OrderType;
  assignedTailorId?: string;
  assignedTailorName?: string;
  garments: OrderGarmentItem[];
  /** Unified line items — each with its own type, stage and lifecycle. */
  items?: OrderItem[];
  measurementsSnapshot: MeasurementSet;
  designNotes?: string;
  fabricSelections: FabricSelection[];
  stage: ProductionStage;
  deliveryStatus: DeliveryStatus;
  paymentStatus: PaymentStatus;
  /** Custom production stage this order currently sits on (from production_stages). */
  currentStageId?: string | null;
  /** Denormalized label of the current stage — safe for the public customer portal. */
  currentStageName?: string | null;
  /** Ids of every stage reached so far (prefix of the business pipeline). */
  completedStageIds?: string[];
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
  /** True when the order is a group order (customer is a group account). */
  isGroupOrder?: boolean;
  /** Per-person lines on a group order, each with its own production stage. */
  members?: OrderMember[];
  memberCount?: number;
  representativeCustomerId?: string;
  representativeName?: string;
  representativePhone?: string;
  representativeEmail?: string;
  payerCustomerId?: string;
  payerName?: string;
  payerPhone?: string;
  // ── Delivery management ────────────────────────────────────────────────────
  /** How the order reaches the customer (delivery courier / shop pickup). */
  deliveryMethod?: DeliveryMethod;
  /** Billable delivery fee — shown on the receipt ONLY for delivery orders. */
  deliveryFee?: number;
  deliveryAddress?: string;
  deliveryPartnerId?: string | null;
  /** Denormalized partner name for display (survives partner deletion). */
  deliveryPartnerName?: string | null;
  /** Current delivery workflow stage. */
  deliveryStage?: DeliveryStage;
  deliveryNotes?: string;
  /** Ordered timeline of delivery events (traceability). */
  deliveryTimeline?: DeliveryTimelineEntry[];
  deliveredAt?: string | null;
  // ── Cancellation ───────────────────────────────────────────────────────────
  isCancelled?: boolean;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancellationNotes?: string | null;
  cancellationBy?: CancellationBy | null;
  refundStatus?: RefundStatus | null;
  /** True while an open (non-terminal) return cycle exists. */
  hasActiveReturn?: boolean;
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
  /** Unified item type — fabric | ready_made | material | accessory | … */
  itemType?: InventoryItemType;
  /** Auto-generated from the name, editable by the business. */
  sku?: string;
  size?: string;
  color?: string;
  brand?: string;
  sellingPrice?: number;
  wholesalePrice?: number;
  minimumSellingPrice?: number;
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

export interface CustomerChangeEntry {
  id: string;
  customerId: string;
  businessId: string;
  changedByUid: string;
  changedByName: string;
  changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  createdAt: string;
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
  sizeBytes?: number;
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
  type: "ready_for_pickup" | "delay_notification" | "stage_notification";
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
