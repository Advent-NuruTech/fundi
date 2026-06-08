"use client";

import { Badge } from "@/components/ui/badge";
import type { EcommerceOrderStatus, EcommercePaymentStatus } from "@/types/ecommerce";

const orderStatusConfig: Record<
  EcommerceOrderStatus,
  { label: string; variant: "default" | "success" | "warning" | "danger" }
> = {
  pending:    { label: "Pending",    variant: "warning" },
  confirmed:  { label: "Confirmed",  variant: "success" },
  processing: { label: "Processing", variant: "default" },
  packed:     { label: "Packed",     variant: "default" },
  shipped:    { label: "Shipped",    variant: "success" },
  delivered:  { label: "Delivered",  variant: "success" },
  cancelled:  { label: "Cancelled",  variant: "danger" },
  rejected:   { label: "Rejected",   variant: "danger" },
};

const paymentStatusConfig: Record<
  EcommercePaymentStatus,
  { label: string; variant: "default" | "success" | "warning" | "danger" }
> = {
  unpaid:   { label: "Unpaid",   variant: "danger" },
  paid:     { label: "Paid",     variant: "success" },
  partial:  { label: "Partial",  variant: "warning" },
  refunded: { label: "Refunded", variant: "default" },
};

export function OrderStatusBadge({ status }: { status: EcommerceOrderStatus }) {
  const config = orderStatusConfig[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: EcommercePaymentStatus }) {
  const config = paymentStatusConfig[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
