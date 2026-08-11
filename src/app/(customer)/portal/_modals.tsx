"use client";

import Link from "next/link";
import { Calendar, ChevronRight, ShoppingBag } from "lucide-react";
import type { PortalOrder } from "@/services/customer-portal.service";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatKes } from "@/lib/utils";
import { portalStatusColor, portalStatusLabel, portalPaymentColor, portalPaymentLabel } from "./_shared";

export function OrderDetailsDialog({
  order,
  onClose,
}: {
  order: PortalOrder | null;
  onClose: () => void;
}) {
  if (!order) return null;

  const isTailoring = order.source === "tailoring";
  const date = order.dueDate ? new Date(order.dueDate) : new Date(order.createdAt);
  const dateLabel = isNaN(date.getTime())
    ? "Not set"
    : date.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return (
    <Dialog open={!!order} onClose={onClose} title={`Order ${order.orderNumber}`}>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs text-slate-500">{order.businessName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={portalStatusColor(order)}>{portalStatusLabel(order)}</Badge>
            <Badge className={portalPaymentColor(order)}>{portalPaymentLabel(order)}</Badge>
          </div>
        </div>

        {/* Items */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Order items</p>
          {order.items.length === 0 ? (
            <p className="text-sm text-slate-500">No items on this order</p>
          ) : (
            <div className="space-y-2">
              {order.items.map((g, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{g.name}</p>
                    <span className="text-xs text-slate-400 shrink-0">×{g.quantity}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">
                      {formatKes(g.unitPrice)} each
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {formatKes(g.unitPrice * g.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment summary */}
        <div className="rounded-xl bg-slate-50 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Total</span>
            <span className="font-semibold text-slate-800">{formatKes(order.totalAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Paid</span>
            <span className="font-semibold text-emerald-700">{formatKes(order.amountPaid)}</span>
          </div>
          {order.balanceAmount > 0 && (
            <div className="flex items-center justify-between text-sm border-t border-slate-200 pt-1.5">
              <span className="text-slate-700 font-medium">Balance due</span>
              <span className="font-bold text-rose-600">{formatKes(order.balanceAmount)}</span>
            </div>
          )}
        </div>

        {/* Pickup / delivery date */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border p-3",
            isTailoring && order.statusKey === "ready_for_pickup"
              ? "border-emerald-200 bg-emerald-50"
              : "border-slate-200 bg-white"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <Calendar className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{isTailoring ? "Date to be picked up" : "Order date"}</p>
            <p className="text-sm font-semibold text-slate-900">{dateLabel}</p>
          </div>
        </div>

        <Link href={`/portal/orders/${order.id}`}>
          <Button variant="outline" className="w-full gap-1">
            View full details <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Dialog>
  );
}

export function OutstandingBalancesDialog({
  open,
  orders,
  totalBalance,
  onClose,
  onViewOrder,
}: {
  open: boolean;
  orders: PortalOrder[];
  totalBalance: number;
  onClose: () => void;
  onViewOrder?: (order: PortalOrder) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Outstanding Balances">
      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
          <p className="text-xs font-medium text-amber-700 mb-1">Total outstanding</p>
          <p className="text-2xl font-bold text-amber-800">{formatKes(totalBalance)}</p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No outstanding balances — all settled 🎉</p>
            <Button variant="outline" onClick={onClose} className="w-full mt-5">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => onViewOrder?.(order)}
                className={cn(
                  "w-full rounded-xl border border-slate-200 p-3 text-left transition-colors",
                  onViewOrder ? "hover:border-amber-300 cursor-pointer" : "cursor-default"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{order.orderNumber}</p>
                  <p className="text-sm font-bold text-rose-600 shrink-0">{formatKes(order.balanceAmount)}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {order.items.map((g) => `${g.name} ×${g.quantity}`).join(", ") || "Order"}
                </p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {order.dueDate
                    ? `Pickup ${new Date(order.dueDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`
                    : `Placed ${new Date(order.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`}
                </p>
              </button>
            ))}
            <Button variant="outline" onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
