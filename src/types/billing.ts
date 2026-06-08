// ─── Billing & Subscription Types ──────────────────────────────────────────

export type PlanSlug = "sindano" | "fundi" | "dhahabu" | "custom";

export type SubscriptionStatus =
  | "pending_payment"
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
  | "installation_fee"
  | "monthly_subscription"
  | "sms_sender_id"
  | "upgrade"
  | "renewal";

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
}

export interface PlanConfig {
  slug: PlanSlug;
  name: string;
  swahiliName: string;
  installationFee: number; // KES
  monthlyPrice: number;    // KES
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
  installationFeePaid: boolean;
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
  installationFee: number;
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
  installation_fee_amount: number;
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
