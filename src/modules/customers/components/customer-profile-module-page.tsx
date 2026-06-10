"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Ruler,
} from "lucide-react";

import type { Customer, Order, Payment } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { formatKes } from "@/lib/utils";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import {
  listenCustomer,
  listenOrders,
  listenPayments,
} from "@/services/firestore.service";

const MEASUREMENT_LABELS: Record<string, string> = {
  bust: "Bust",
  waist: "Waist",
  hips: "Hips",
  height: "Height",
  shoulder: "Shoulder",
  sleeve: "Sleeve",
  inseam: "Inseam",
  length: "Length",
  neck: "Neck",
  thigh: "Thigh",
};

const STAGE_COLORS: Record<string, string> = {
  cutting: "bg-blue-100 text-blue-700",
  stitching: "bg-indigo-100 text-indigo-700",
  fitting: "bg-purple-100 text-purple-700",
  finishing: "bg-amber-100 text-amber-700",
  ready_for_pickup: "bg-emerald-100 text-emerald-700",
  delivered: "bg-slate-100 text-slate-600",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  unpaid: "bg-rose-100 text-rose-600",
};

export function CustomerProfileModulePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const customerId = params.id;
  const { businessId, ready } = useBusinessContext();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !customerId) return;

    const unsubCustomer = listenCustomer(businessId, customerId, (c) => {
      setCustomer(c);
      setLoading(false);
    });
    const unsubOrders = listenOrders(businessId, (rows) =>
      setOrders(rows.filter((row) => row.customerId === customerId))
    );
    const unsubPayments = listenPayments(businessId, (rows) =>
      setPayments(rows.filter((row) => row.customerId === customerId))
    );

    return () => {
      unsubCustomer();
      unsubOrders();
      unsubPayments();
    };
  }, [businessId, customerId, ready]);

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders]
  );

  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [payments]
  );

  const totalSpent = useMemo(
    () => payments.reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );

  const activeOrders = orders.filter((o) => o.stage !== "delivered").length;

  if (!ready || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-sm text-slate-500 py-8 text-center">
        Customer not found.
      </div>
    );
  }

  const balance = customer.outstandingBalance ?? 0;
  const measurementEntries = Object.entries(customer.measurements ?? {}).filter(
    ([key, v]) => v !== null && v !== undefined && key !== "notes" && String(v) !== ""
  );
  const measurementNotes = (customer.measurements as Record<string, unknown>)?.notes as string | undefined;

  // Badge reflects balance + whether any orders exist
  const badgeVariant =
    balance > 0 ? "warning" : orders.length === 0 ? "default" : "success";
  const badgeText =
    balance > 0 ? "Balance due" : orders.length === 0 ? "No orders yet" : "Cleared";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Customer Profile</h1>
          <p className="text-xs text-slate-500">Order history &amp; measurements</p>
        </div>
      </div>

      {/* Profile card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4">
        {/* Identity */}
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-xl font-bold text-emerald-700">
            {customer.fullName.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-slate-900 text-lg leading-tight truncate">
                {customer.fullName}
              </p>
              <Badge variant={badgeVariant} className="shrink-0 text-[11px]">
                {badgeText}
              </Badge>
            </div>

            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                {customer.phone}
              </div>
              {customer.email && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {customer.email}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                Customer since{" "}
                {new Date(customer.createdAt).toLocaleDateString("en-KE", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-center">
            <p className="text-sm font-bold text-emerald-700 truncate">
              {formatKes(totalSpent)}
            </p>
            <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wide mt-0.5">
              Total paid
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 p-2.5 text-center">
            <p className="text-lg font-bold text-blue-700">{orders.length}</p>
            <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide mt-0.5">
              Orders
            </p>
          </div>
          <div
            className={`rounded-xl p-2.5 text-center ${
              balance > 0 ? "bg-rose-50" : "bg-slate-50"
            }`}
          >
            <p
              className={`text-sm font-bold truncate ${
                balance > 0 ? "text-rose-600" : "text-slate-500"
              }`}
            >
              {formatKes(balance)}
            </p>
            <p
              className={`text-[10px] font-medium uppercase tracking-wide mt-0.5 ${
                balance > 0 ? "text-rose-400" : "text-slate-400"
              }`}
            >
              Balance
            </p>
          </div>
        </div>

        {/* Preferences & Notes */}
        {(customer.preferences || customer.notes) && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
            {customer.preferences && (
              <div className="flex gap-2 text-xs">
                <ClipboardList className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-700">Preferences: </span>
                  <span className="text-slate-600">{customer.preferences}</span>
                </div>
              </div>
            )}
            {customer.notes && (
              <div className="flex gap-2 text-xs">
                <MessageSquare className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-700">Notes: </span>
                  <span className="text-slate-600">{customer.notes}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Measurements */}
      {measurementEntries.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Ruler className="h-4 w-4 text-slate-500" />
            <h3 className="font-bold text-slate-900">Body Measurements</h3>
            <span className="text-xs text-slate-400">(cm)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {measurementEntries.map(([key, value]) => (
              <div
                key={key}
                className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center"
              >
                <p className="text-sm font-bold text-slate-900">{String(value)}</p>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mt-0.5">
                  {MEASUREMENT_LABELS[key] ?? key}
                </p>
              </div>
            ))}
          </div>
          {measurementNotes && (
            <p className="mt-3 text-xs text-slate-500">
              <span className="font-semibold">Measurement notes:</span> {measurementNotes}
            </p>
          )}
        </div>
      )}

      {/* Order history */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">Order History</h3>
          {activeOrders > 0 && (
            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              {activeOrders} active
            </span>
          )}
        </div>

        {sortedOrders.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {sortedOrders.map((order) => {
              const orderBalance = order.balanceAmount ?? (order.subtotalAmount - order.amountPaid);
              const isSettled = orderBalance <= 0;

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  {/* Top row: order number + stage + payment status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-sm font-semibold text-emerald-700 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Due {order.dueDate}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          STAGE_COLORS[order.stage] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {order.stage.replaceAll("_", " ")}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${
                          PAYMENT_STATUS_COLORS[order.paymentStatus] ?? "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Bottom row: total / paid / balance */}
                  <div className="mt-2 flex items-center gap-3 text-xs border-t border-slate-200 pt-2">
                    <div className="flex items-center gap-1 text-slate-500">
                      <span className="text-slate-400">Total</span>
                      <span className="font-semibold text-slate-700">
                        {formatKes(order.subtotalAmount)}
                      </span>
                    </div>
                    <span className="text-slate-300">·</span>
                    <div className="flex items-center gap-1 text-slate-500">
                      <span className="text-slate-400">Paid</span>
                      <span className="font-semibold text-emerald-700">
                        {formatKes(order.amountPaid)}
                      </span>
                    </div>
                    <span className="text-slate-300">·</span>
                    {isSettled ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                        Cleared
                      </span>
                    ) : (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                        {formatKes(orderBalance)} due
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment history */}
      {sortedPayments.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h3 className="font-bold text-slate-900 mb-4">Payment History</h3>
          <div className="space-y-2">
            {sortedPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatKes(payment.amount)}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center flex-wrap gap-1">
                    <span>{payment.method.toUpperCase()}</span>
                    {payment.mpesaCode && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>{payment.mpesaCode}</span>
                      </>
                    )}
                    <span className="text-slate-300">·</span>
                    <Link
                      href={`/orders/${payment.orderId}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {payment.orderNumber}
                    </Link>
                  </p>
                </div>
                <p className="text-xs text-slate-400 shrink-0 ml-3">
                  {new Date(payment.recordedAt).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
