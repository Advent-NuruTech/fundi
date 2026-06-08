"use client";

import { CheckCircle, Circle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EcommerceOrder, EcommerceOrderStatus } from "@/types/ecommerce";

const TIMELINE_STEPS: { status: EcommerceOrderStatus; label: string }[] = [
  { status: "pending",    label: "Order Placed" },
  { status: "confirmed",  label: "Confirmed" },
  { status: "processing", label: "Processing" },
  { status: "packed",     label: "Packed" },
  { status: "shipped",    label: "Shipped" },
  { status: "delivered",  label: "Delivered" },
];

const STATUS_ORDER: Record<EcommerceOrderStatus, number> = {
  pending: 0, confirmed: 1, processing: 2,
  packed: 3, shipped: 4, delivered: 5,
  cancelled: -1, rejected: -1,
};

export function OrderTimeline({ order }: { order: EcommerceOrder }) {
  const isCancelled = order.status === "cancelled" || order.status === "rejected";
  const currentIndex = STATUS_ORDER[order.status] ?? 0;

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-rose-50 p-4 text-rose-700">
        <XCircle className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium capitalize">{order.status}</p>
          {(order.rejectionReason || order.cancellationReason) && (
            <p className="mt-0.5 text-sm text-rose-600">
              {order.rejectionReason ?? order.cancellationReason}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <ol className="relative border-l border-slate-200">
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={step.status} className="mb-6 ml-6 last:mb-0">
            <span
              className={cn(
                "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white",
                done && "bg-emerald-500",
                active && "bg-emerald-600",
                !done && !active && "bg-slate-200"
              )}
            >
              {done ? (
                <CheckCircle className="h-3.5 w-3.5 text-white" />
              ) : active ? (
                <Clock className="h-3.5 w-3.5 text-white" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-slate-400" />
              )}
            </span>
            <p
              className={cn(
                "text-sm",
                (done || active) ? "font-semibold text-slate-900" : "text-slate-400"
              )}
            >
              {step.label}
            </p>
            {active && (
              <p className="text-xs text-slate-500 mt-0.5">In progress</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
