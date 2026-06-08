// ── Admin / Super-admin types for /ffmanage ──────────────────────────────────

export interface AdminSession {
  id: string;
  userId: string;
  tokenHash: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: Record<string, unknown>;
  isActive: boolean;
  lastActiveAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminUid: string | null;
  adminEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  resourceName: string | null;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  severity: "info" | "warning" | "critical";
  createdAt: string;
}

export interface AdminInviteLink {
  id: string;
  token: string;
  createdBy: string;
  label: string | null;
  email: string | null;
  roleToAssign: string;
  maxUses: number | null;
  useCount: number;
  expiresAt: string;
  revoked: boolean;
  revokedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  businessId: string | null;
  userId: string | null;
  userEmail: string | null;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  assignedTo: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Joined
  businessName?: string;
  messageCount?: number;
  lastMessageAt?: string;
}

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  senderUid: string | null;
  senderName: string;
  senderRole: "customer" | "admin";
  content: string;
  attachments: unknown[];
  createdAt: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  workspaceId: string;
  billingPaymentId: string | null;
  businessName: string;
  planName: string;
  amountPaid: number;
  paystackFee: number;
  taxAmount: number;
  netAmount: number;
  transactionId: string | null;
  paymentReference: string | null;
  subscriptionPeriod: string | null;
  paidAt: string;
  pdfUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ── Platform stats ────────────────────────────────────────────────────────────

export interface PlatformStats {
  totalBusinesses: number;
  activeSubscriptions: number;
  totalEmployees: number;
  totalCustomers: number;
  totalSmsSent: number;
  totalRevenue: number;
  pendingPayments: number;
  failedPayments: number;
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  annualRevenue: number;
  openSupportTickets: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  payments: number;
}

// ── Business summary for admin list view ─────────────────────────────────────

export interface AdminBusinessSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  location: string | null;
  ownerUid: string;
  ownerEmail?: string;
  ownerName?: string;
  isActive: boolean;
  createdAt: string;
  plan: string;
  subscriptionStatus: string | null;
  subscriptionId: string | null;
  employeeCount: number;
  customerCount: number;
  orderCount: number;
  totalRevenue: number;
  smsSentCount: number;
  lastPaymentAt: string | null;
  nextBillingDate: string | null;
}

// ── Business detail for admin profile view ───────────────────────────────────

export interface AdminBusinessDetail extends AdminBusinessSummary {
  address: string | null;
  currency: string;
  country: string;
  smsSettings: {
    senderId: string | null;
    senderIdEnabled: boolean;
    senderIdStatus: string;
  };
  subscription: {
    id: string;
    planSlug: string;
    status: string;
    installationFeePaid: boolean;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    nextBillingDate: string | null;
    cancelAtPeriodEnd: boolean;
    cancelledAt: string | null;
    paystackCustomerCode: string | null;
    paystackSubscriptionCode: string | null;
    createdAt: string;
  } | null;
  recentPayments: AdminPaymentRecord[];
  recentSmsLogs: AdminSmsLog[];
  auditLogs: BillingAuditEntry[];
  members: AdminMemberRecord[];
}

export interface AdminPaymentRecord {
  id: string;
  reference: string;
  amount: number;
  status: string;
  type: string;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminSmsLog {
  id: string;
  recipientPhone: string;
  messageType: string;
  status: string;
  createdAt: string;
}

export interface BillingAuditEntry {
  id: string;
  action: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  performedByRole: string | null;
  createdAt: string;
}

export interface AdminMemberRecord {
  id: string;
  profileId: string;
  displayName: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

// ── SMS analytics ─────────────────────────────────────────────────────────────

export interface SmsAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  byBusiness: SmsBusinessStat[];
  trend: SmsDataPoint[];
}

export interface SmsBusinessStat {
  businessId: string;
  businessName: string;
  sent: number;
  delivered: number;
  failed: number;
}

export interface SmsDataPoint {
  date: string;
  sent: number;
}

// ── System health ─────────────────────────────────────────────────────────────

export interface SystemHealth {
  status: "healthy" | "degraded" | "down";
  database: { status: "ok" | "degraded" | "down"; latencyMs: number };
  storage: { status: "ok" | "degraded" | "down" };
  checkedAt: string;
}

// ── Session payload stored in cookie ─────────────────────────────────────────

export interface AdminTokenPayload {
  sessionId: string;
  uid: string;
  iat: number;
  exp: number;
}
