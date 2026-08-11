import type { ProductionStage, PaymentStatus } from "@/types/domain";
import type { PortalOrder } from "@/services/customer-portal.service";

export const STAGE_LABEL: Record<ProductionStage, string> = {
  cutting: "Cutting",
  stitching: "Stitching",
  fitting: "Fitting",
  finishing: "Finishing",
  ready_for_pickup: "Ready for Pickup",
  delivered: "Delivered",
};

export const STAGE_COLOR: Record<ProductionStage, string> = {
  cutting: "bg-sky-100 text-sky-700 border-sky-200",
  stitching: "bg-violet-100 text-violet-700 border-violet-200",
  fitting: "bg-amber-100 text-amber-700 border-amber-200",
  finishing: "bg-orange-100 text-orange-700 border-orange-200",
  ready_for_pickup: "bg-emerald-100 text-emerald-700 border-emerald-200",
  delivered: "bg-slate-100 text-slate-700 border-slate-200",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
};

export const PAYMENT_COLOR: Record<PaymentStatus, string> = {
  unpaid: "text-rose-600 border-rose-200",
  partial: "text-amber-600 border-amber-200",
  paid: "text-emerald-600 border-emerald-200",
};

export const STAGE_ORDER: ProductionStage[] = [
  "cutting",
  "stitching",
  "fitting",
  "finishing",
  "ready_for_pickup",
  "delivered",
];

/**
 * Customer-facing stage label. Prefers the business's custom stage name
 * (denormalized onto the order for safe public display) and falls back to the
 * legacy enum label when the custom pipeline isn't in place yet.
 */
export function stageLabel(order: { stage: ProductionStage; currentStageName?: string | null }): string {
  return order.currentStageName || STAGE_LABEL[order.stage];
}

// ── Global Sell (ecommerce) order status maps ───────────────────────────────

export const GLOBAL_SELL_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

export const GLOBAL_SELL_STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  processing: "bg-sky-100 text-sky-700 border-sky-200",
  packed: "bg-violet-100 text-violet-700 border-violet-200",
  shipped: "bg-emerald-100 text-emerald-700 border-emerald-200",
  delivered: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
};

export const GLOBAL_SELL_PAYMENT_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  partial: "Partial",
  refunded: "Refunded",
};

export const GLOBAL_SELL_PAYMENT_COLOR: Record<string, string> = {
  unpaid: "text-rose-600 border-rose-200",
  paid: "text-emerald-600 border-emerald-200",
  partial: "text-amber-600 border-amber-200",
  refunded: "text-slate-500 border-slate-200",
};

/**
 * Status badge label for a unified portal order. Tailoring orders map through
 * `stageLabel`, Global Sell orders through the ecommerce status map.
 */
export function portalStatusLabel(order: PortalOrder): string {
  return order.source === "globalsell"
    ? GLOBAL_SELL_STATUS_LABEL[order.statusKey] ?? order.statusKey
    : order.tailoring
      ? stageLabel(order.tailoring)
      : order.statusKey;
}

/**
 * Status badge colour classes for a unified portal order.
 */
export function portalStatusColor(order: PortalOrder): string {
  return order.source === "globalsell"
    ? GLOBAL_SELL_STATUS_COLOR[order.statusKey] ?? "bg-slate-100 text-slate-700 border-slate-200"
    : STAGE_COLOR[order.statusKey as ProductionStage] ?? "bg-slate-100 text-slate-700 border-slate-200";
}

export function portalPaymentLabel(order: PortalOrder): string {
  return order.source === "globalsell"
    ? GLOBAL_SELL_PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus
    : PAYMENT_LABEL[order.paymentStatus as PaymentStatus] ?? order.paymentStatus;
}

export function portalPaymentColor(order: PortalOrder): string {
  return order.source === "globalsell"
    ? GLOBAL_SELL_PAYMENT_COLOR[order.paymentStatus] ?? "text-slate-500 border-slate-200"
    : PAYMENT_COLOR[order.paymentStatus as PaymentStatus] ?? "text-slate-500 border-slate-200";
}
