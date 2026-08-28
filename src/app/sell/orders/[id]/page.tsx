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
  Banknote,
} from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import {
  fetchOrderById,
  updateOrderStatus,
  recordEcommercePayment,
  fetchEcommerceOrderPayments,
} from "@/services/ecommerce.service";
import { OrderTimeline } from "@/modules/globalsell/components/order-timeline";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/modules/globalsell/components/order-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatKes } from "@/lib/utils";
import { toast } from "sonner";
import type {
  EcommerceOrder,
  EcommerceOrderStatus,
  EcommerceOrderPayment,
  EcommercePaymentMethod,
} from "@/types/ecommerce";

const NEXT_STATUSES: Partial<Record<EcommerceOrderStatus, EcommerceOrderStatus>> = {
  pending: "confirmed",
  confirmed: "processing",
  processing: "packed",
  packed: "shipped",
  shipped: "delivered",
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, business } = useAuth();
  const businessId = user?.businessId ?? "";
  const [order, setOrder] = useState<EcommerceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [payments, setPayments] = useState<EcommerceOrderPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [recordOpen, setRecordOpen] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<EcommercePaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [note, setNote] = useState("");

  async function refresh() {
    const o = await fetchOrderById(id);
    setOrder(o);
  }

  async function refreshPayments() {
    const p = await fetchEcommerceOrderPayments(id);
    setPayments(p);
    setPaymentsLoading(false);
  }

  useEffect(() => {
    fetchOrderById(id)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
    fetchEcommerceOrderPayments(id)
      .then(setPayments)
      .catch(() => {})
      .finally(() => setPaymentsLoading(false));
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

  async function handleRecordPayment() {
    if (!order) return;
    if (!amount || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    setSavingPayment(true);
    try {
      await recordEcommercePayment(businessId, order.id, {
        amount,
        method,
        paymentReference: paymentReference.trim() || undefined,
        note: note.trim() || undefined,
        actorUid: user?.uid,
        actorName: user?.displayName,
      });
      toast.success("Payment recorded");
      setRecordOpen(false);
      setPaymentReference("");
      setNote("");
      await Promise.all([refresh(), refreshPayments()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
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

  const paidTotal = payments.reduce((n, p) => n + Number(p.amount), 0);
  const balance = Math.max(0, Number(order.total) - paidTotal);
  const canRecordPayment =
    order.status !== "cancelled" && order.status !== "rejected";

  return (
    <div className="space-y-5 max-w-3xl">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #globalsell-order-receipt, #globalsell-order-receipt * { visibility: visible !important; }
          #globalsell-order-receipt {
            display: block !important;
            position: absolute !important;
            inset: 0 auto auto 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          @page { margin: 12mm; }
        }
      `}</style>

      <section
        id="globalsell-order-receipt"
        className="hidden bg-white text-sm text-slate-900 print:block"
        aria-label="Printable Global Sell order receipt"
      >
        <div className="mx-auto max-w-[520px] border border-slate-300 p-7">
          <div className="text-center">
            <p className="text-xl font-extrabold uppercase">{business?.name ?? "Global Sell Seller"}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
              {paidTotal > 0 ? "Payment receipt" : "Order summary"}
            </p>
            <p className="mt-3 font-bold">Order #{order.orderNumber}</p>
            <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString("en-KE")}</p>
          </div>

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-y border-slate-200 py-4">
            <dt className="font-semibold">Customer</dt><dd className="text-right">{order.buyerName}</dd>
            <dt className="font-semibold">Phone</dt><dd className="text-right">{order.buyerPhone}</dd>
            {order.deliveryLocation && <><dt className="font-semibold">Delivery</dt><dd className="text-right">{order.deliveryLocation}</dd></>}
            {business?.phone && <><dt className="font-semibold">Seller phone</dt><dd className="text-right">{business.phone}</dd></>}
          </dl>

          <table className="mt-5 w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-slate-800 text-left">
                <th className="py-2">Item</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="py-2 pr-2">{item.productName}{item.variantName ? ` · ${item.variantName}` : ""}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">{formatKes(item.unitPrice)}</td>
                  <td className="py-2 text-right">{formatKes(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="ml-auto mt-5 w-64 space-y-1">
            <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatKes(order.total)}</dd></div>
            <div className="flex justify-between text-emerald-700"><dt>Paid</dt><dd>{formatKes(paidTotal)}</dd></div>
            <div className="flex justify-between border-t border-slate-300 pt-1 font-bold"><dt>Balance</dt><dd>{formatKes(balance)}</dd></div>
          </dl>

          {payments.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-3 text-xs">
              <p className="mb-2 font-bold uppercase tracking-wide">Payments</p>
              {payments.map((payment) => (
                <div key={payment.id} className="flex justify-between py-0.5">
                  <span>{new Date(payment.createdAt).toLocaleDateString("en-KE")} · {payment.method.replace("_", " ")}{payment.paymentReference ? ` · ${payment.paymentReference}` : ""}</span>
                  <span className="font-semibold">{formatKes(payment.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-7 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">Thank you · Powered by FundiFlow Global Sell</p>
        </div>
      </section>

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
          {paidTotal > 0 ? "Print receipt" : "Print order"}
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Payment</CardTitle>
            {canRecordPayment && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setAmount(balance > 0 ? balance : Number(order.total));
                  setRecordOpen(true);
                }}
              >
                <Banknote className="h-4 w-4" />
                Record Payment
              </Button>
            )}
          </CardHeader>
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
            <div className="flex justify-between">
              <span className="text-slate-600">Paid</span>
              <span className="font-medium text-emerald-600">
                {formatKes(paidTotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Balance</span>
              <span className="font-medium text-slate-900">
                {formatKes(balance)}
              </span>
            </div>

            {/* Payment history */}
            <div className="border-t border-slate-100 pt-2">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                Payment History
              </p>
              {paymentsLoading ? (
                <p className="text-xs text-slate-400">Loading…</p>
              ) : payments.length === 0 ? (
                <p className="text-xs text-slate-400">No payments recorded yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {payments.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-600">
                        <span className="font-medium capitalize text-slate-900">
                          {formatKes(p.amount)}
                        </span>{" "}
                        · {p.method.replace("_", " ")}
                        {p.paymentReference && (
                          <span className="text-slate-400"> · {p.paymentReference}</span>
                        )}
                      </span>
                      <span className="text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString("en-KE")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
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

      {/* Record Payment Dialog */}
      <Dialog
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        title={`Record Payment — Order #${order.orderNumber}`}
      >
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-600">Amount due</span>
            <span className="font-bold text-slate-900">{formatKes(balance)}</span>
          </div>

          <div>
            <Label htmlFor="payment-amount">Amount (KES)</Label>
            <Input
              id="payment-amount"
              type="number"
              min={1}
              step="0.01"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select
              id="payment-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as EcommercePaymentMethod)}
            >
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="manual">Manual</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="payment-reference">
              Reference (e.g. M-Pesa code){" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Input
              id="payment-reference"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g. ABC1234XYZ"
            />
          </div>

          <div>
            <Label htmlFor="payment-note">
              Note <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Input
              id="payment-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any extra details"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setRecordOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={savingPayment}
              className="gap-2"
            >
              {savingPayment && <Loader2 className="h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
