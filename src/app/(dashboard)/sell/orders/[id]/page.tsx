"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Printer,
} from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { fetchOrderById, updateOrderStatus } from "@/services/ecommerce.service";
import { OrderTimeline } from "@/modules/globalsell/components/order-timeline";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/modules/globalsell/components/order-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatKes } from "@/lib/utils";
import { toast } from "sonner";
import type { EcommerceOrder, EcommerceOrderStatus } from "@/types/ecommerce";

const NEXT_STATUSES: Partial<Record<EcommerceOrderStatus, EcommerceOrderStatus>> = {
  pending: "confirmed",
  confirmed: "processing",
  processing: "packed",
  packed: "shipped",
  shipped: "delivered",
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const businessId = user?.businessId ?? "";
  const [order, setOrder] = useState<EcommerceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  async function refresh() {
    const o = await fetchOrderById(id);
    setOrder(o);
  }

  useEffect(() => {
    fetchOrderById(id)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(status: EcommerceOrderStatus, reason?: string) {
    if (!order) return;
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, businessId, status, reason);
      await refresh();
      toast.success(`Order marked as ${status}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  async function handleReject() {
    const reason = prompt("Reason for rejection:");
    if (reason === null) return;
    await handleStatusChange("rejected", reason);
  }

  async function handleCancel() {
    const reason = prompt("Reason for cancellation:");
    if (reason === null) return;
    await handleStatusChange("cancelled", reason);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center text-slate-500">Order not found.</div>
    );
  }

  const nextStatus = NEXT_STATUSES[order.status];
  const canAct =
    order.status !== "delivered" &&
    order.status !== "cancelled" &&
    order.status !== "rejected";

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link
          href="/sell/orders"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-emerald-600 transition"
        >
          <ChevronLeft className="h-4 w-4" />
          Orders
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Order #{order.orderNumber}
          </h1>
          <p className="text-sm text-slate-500">
            {new Date(order.createdAt).toLocaleString("en-KE")}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 text-right">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Buyer Info */}
        <Card>
          <CardHeader><CardTitle>Customer Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-semibold text-slate-900 text-base">{order.buyerName}</p>
            <a
              href={`tel:${order.buyerPhone}`}
              className="flex items-center gap-2 text-emerald-600 hover:underline"
            >
              <Phone className="h-4 w-4" />
              {order.buyerPhone}
            </a>
            {order.buyerEmail && (
              <a
                href={`mailto:${order.buyerEmail}`}
                className="flex items-center gap-2 text-emerald-600 hover:underline"
              >
                <Mail className="h-4 w-4" />
                {order.buyerEmail}
              </a>
            )}
            {order.deliveryLocation && (
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
                {order.deliveryLocation}
              </div>
            )}
            {order.notes && (
              <div className="flex items-start gap-2 text-slate-600">
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
                <em className="not-italic">{order.notes}</em>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card>
          <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Method</span>
              <span className="font-medium capitalize text-slate-900">
                {order.paymentMethod.replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium">{formatKes(order.subtotal)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold">
              <span>Total</span>
              <span className="text-base">{formatKes(order.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader><CardTitle>Order Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          {order.items?.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-5 py-3 border-b border-slate-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{item.productName}</p>
                {item.variantName && (
                  <p className="text-xs text-slate-500">{item.variantName}</p>
                )}
                <p className="text-xs text-slate-400">
                  {formatKes(item.unitPrice)} × {item.quantity}
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {formatKes(item.totalPrice)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader><CardTitle>Order Progress</CardTitle></CardHeader>
        <CardContent>
          <OrderTimeline order={order} />
        </CardContent>
      </Card>

      {/* Actions */}
      {canAct && (
        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {nextStatus && (
              <Button
                onClick={() => handleStatusChange(nextStatus)}
                disabled={updating}
                className="gap-2"
              >
                {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
              </Button>
            )}
            {order.status === "pending" && (
              <Button variant="danger" onClick={handleReject} disabled={updating}>
                Reject Order
              </Button>
            )}
            {(order.status === "confirmed" || order.status === "processing") && (
              <Button variant="danger" onClick={handleCancel} disabled={updating}>
                Cancel Order
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
