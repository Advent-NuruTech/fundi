// ─── Billing & Subscription Types ──────────────────────────────────────────

export type PlanSlug = "sindano" | "fundi" | "dhahabu" | "custom";

export type SubscriptionStatus =
  | "pending_payment"
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "suspended";

export type BillingPaymentStatus =
  | "pending"
  | "processing"
  | "success"
  | "failed"
  | "abandoned"
  | "refunded";

export type BillingPaymentType =
  | "monthly_subscription"
  | "sms_sender_id"
  | "upgrade"
  | "renewal"
  | "topup";

// ─── Usage metering & top-ups ───────────────────────────────────────────────

/** Every measurable capacity a business can consume. */
export type UsageResource = "sms" | "ai_credits" | "storage";

export type UsageLedgerSource =
  | "usage" // consumed units (negative)
  | "topup" // purchased units (positive)
  | "adjustment" // platform adjustments
  | "measurement"; // storage measured usage

export interface UsageMeter {
  id: string;
  workspaceId: string;
  resource: UsageResource;
  /** Plan allowance for the current cycle (bytes for storage). */
  planQuota: number;
  /** Consumed from the plan allowance (storage = measured bytes in use). */
  planUsed: number;
  /** Purchased units that never expire / roll over between cycles. */
  topUpCredits: number;
  resetsCycle: boolean;
  cycleStart: string | null;
  cycleEnd: string | null;
}

export interface UsageLedgerEntry {
  id: string;
  workspaceId: string;
  resource: UsageResource;
  /** Positive = credit (bought), negative = consumed. */
  units: number;
  source: UsageLedgerSource;
  reference: string | null;
  balanceAfter: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface UsageTopup {
  id: string;
  workspaceId: string;
  userId: string | null;
  resource: UsageResource;
  units: number;
  amountKes: number;
  paystackFee: number | null;
  status: "pending" | "success" | "failed";
  paystackReference: string;
  paystackTransactionId: string | null;
  completedAt: string | null;
  createdAt: string;
}

/** Live balance for one measurable resource (units; bytes for storage). */
export interface UsageSummary {
  resource: UsageResource;
  quota: number;
  used: number;
  topUpCredits: number;
  available: number;
  unlimited: boolean;
  resetsCycle: boolean;
  cycleStart: string | null;
  cycleEnd: string | null;
}

export type SenderIdStatus =
  | "none"
  | "pending_payment"
  | "pending_approval"
  | "approved"
  | "rejected";

export interface PlanFeatures {
  analytics: boolean;
  financeFullDashboard: boolean;
  teamManagement: boolean;
  whatsappNotifications: boolean;
  multiLocation: boolean;
  apiAccess: boolean;
  aiAssistant: "none" | "limited" | "full";
  customSmsSenderId: boolean;
}

export interface PlanLimits {
  maxUsers: number | null;       // null = unlimited
  maxCustomers: number | null;
  maxOrdersPerMonth: number | null;
  maxInventoryItems: number | null;
  smsPerMonth: number | null;    // null = unlimited
  /**
   * Maximum number of branches (outlets) the business may run, INCLUDING the
   * auto-created main branch. 1 = main only (no extra outlets). null =
   * unlimited (custom / enterprise). Enforced both in the UI and by the DB
   * trigger in migration 00030.
   */
  maxBranches: number | null;
  /** AI Assistant credits included per month. null = none/untracked. */
  aiCreditsPerMonth: number | null;
  /** File storage included, in GB. null = untracked. */
  storageGb: number | null;
  /** Active Global Sell marketplace listings included. null = untracked. */
  globalSellListings: number | null;
}

export interface PlanConfig {
  slug: PlanSlug;
  name: string;
  swahiliName: string;
  monthlyPrice: number;    // KES
  /** Introductory launch price for the first 2 months (KES/month). */
  introPrice: number;      // KES
  /** Annual price = 10 months of the standard monthly rate. */
  annualPrice: number;     // KES
  limits: PlanLimits;
  features: PlanFeatures;
  color: string;
  accentColor: string;
}

export interface Subscription {
  id: string;
  userId: string;
  workspaceId: string;
  planSlug: PlanSlug;
  status: SubscriptionStatus;
  nextBillingDate: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  smsSenderIdEnabled: boolean;
  smsSenderIdPaid: boolean;
  smsSenderIdPaidAt: string | null;
  smsSenderIdName: string | null;
  smsSenderIdStatus: SenderIdStatus;
  cancelAtPeriodEnd: boolean;
  pendingPlanSlug: PlanSlug | null;
  pendingChangeAt: string | null;
  paystackCustomerCode: string | null;
  paystackSubscriptionCode: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BillingPayment {
  id: string;
  userId: string;
  workspaceId: string;
  subscriptionId: string | null;
  paystackReference: string;
  paystackTransactionId: string | null;
  amount: number; // KES
  currency: string;
  paymentStatus: BillingPaymentStatus;
  paymentType: BillingPaymentType;
  includesSmsSenderId: boolean;
  smsSenderIdAmount: number | null;
  paystackFee: number | null;
  metadata: Record<string, unknown>;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAttempt {
  id: string;
  reference: string;
  userId: string | null;
  workspaceId: string | null;
  amount: number;
  status: string;
  failureReason: string | null;
  paystackData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingAuditLog {
  id: string;
  workspaceId: string;
  userId: string | null;
  action: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  performedByRole: string | null;
  createdAt: string;
}

// ─── Checkout flow ──────────────────────────────────────────────────────────

export interface CheckoutTotals {
  firstPayment: number;
  smsSenderIdAmount: number;
  subtotal: number;
  paystackFee: number;
  total: number;
}

export interface CreateCheckoutSessionRequest {
  planSlug: PlanSlug;
  addSmsSenderId: boolean;
}

export interface CreateCheckoutSessionResponse {
  authorizationUrl: string;
  reference: string;
  totals: CheckoutTotals;
}

// ─── Paystack API ───────────────────────────────────────────────────────────

export interface PaystackTransactionMetadata {
  plan_slug: string;
  user_id: string;
  workspace_id: string;
  payment_type: BillingPaymentType;
  includes_sms_sender_id: boolean;
  sms_sender_id_amount: number;
  monthly_price: number;
  // upgrade-specific
  from_plan_slug?: string;
  to_plan_slug?: string;
  // sender-id specific
  sender_id_name?: string;
}

export interface PaystackVerifiedTransaction {
  id: number;
  status: "success" | "failed" | "abandoned";
  reference: string;
  amount: number; // kobo (multiply x100 for KES)
  currency: string;
  paid_at: string;
  created_at: string;
  channel: string;
  fees: number;
  customer: {
    email: string;
    customer_code: string;
  };
  metadata: PaystackTransactionMetadata;
}

// ─── Billing portal ─────────────────────────────────────────────────────────

export interface BillingPortalData {
  subscription: Subscription;
  payments: BillingPayment[];
  plan: PlanConfig;
  auditLogs: BillingAuditLog[];
}
