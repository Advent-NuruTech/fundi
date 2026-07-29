"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

import type { Order, Payment } from "@/types/domain";
import { paymentSchema, type PaymentInput, type PaymentValues } from "@/schemas/payment.schema";

import {
  listenOrders,
  listenPayments,
  recordPayment,
} from "@/services/firestore.service";

import { useBusinessContext } from "@/modules/shared/use-business-context";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { formatKes } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMoneyBillWave,
  faHandHoldingUsd,
  faCalendarDay,
  faCalendarWeek,
  faCalendarAlt,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";

type DateRange = "today" | "week" | "month" | "year" | "all";

function filterByDateRange(orders: Order[], range: DateRange): Order[] {
  if (range === "all") return orders;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let cutoff: Date;
  switch (range) {
    case "today":
      cutoff = startOfDay;
      break;
    case "week":
      cutoff = new Date(startOfDay.getTime() - 6 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      cutoff = new Date(startOfDay.getTime() - 29 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      cutoff = new Date(startOfDay.getTime() - 364 * 24 * 60 * 60 * 1000);
      break;
    default:
      return orders;
  }

  return orders.filter((order) => {
    const created = new Date(order.createdAt);
    return created >= cutoff;
  });
}

export function PaymentsModulePage() {
  const { businessId, user, ready } = useBusinessContext();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"payments" | "outstanding">(
    tabParam === "outstanding" ? "outstanding" : "payments"
  );
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentInput, undefined, PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      orderId: "",
      amount: 0,
      method: "cash",
      mpesaCode: "",
    },
  });

  useEffect(() => {
    if (!ready || !businessId) {
      return;
    }

    const unsubOrders = listenOrders(businessId, setOrders);
    const unsubPayments = listenPayments(businessId, setPayments);

    return () => {
      unsubOrders();
      unsubPayments();
    };
  }, [businessId, ready]);

  useEffect(() => {
    if (tabParam === "outstanding" && activeTab !== "outstanding") {
      setActiveTab("outstanding");
    } else if (tabParam !== "outstanding" && activeTab !== "payments") {
      setActiveTab("payments");
    }
  }, [tabParam, activeTab]);

  const outstandingOrders = useMemo(() => {
    return orders.filter((order) => order.balanceAmount > 0);
  }, [orders]);

  const filteredOutstanding = useMemo(() => {
    return filterByDateRange(outstandingOrders, dateRange);
  }, [outstandingOrders, dateRange]);

  const paymentMethod = watch("method");

  const onSubmit: SubmitHandler<PaymentValues> = async (values) => {
    if (!user) {
      toast.error("You must be signed in");
      return;
    }

    const selectedOrder = orders.find(
      (order) => order.id === values.orderId,
    );

    if (!selectedOrder) {
      toast.error("Order not found");
      return;
    }

    const now = new Date();
    const description = `${selectedOrder.customerName} paid - reduced the outstanding balance by adding ${formatKes(values.amount)} on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;

    try {
      await recordPayment(businessId, {
        orderId: selectedOrder.id,
        orderNumber: selectedOrder.orderNumber,
        customerId: selectedOrder.customerId,
        customerName: selectedOrder.customerName,

        amount: values.amount,
        method: values.method,
        mpesaCode: values.mpesaCode || "",
        description,

        actorUid: user.uid,
        actorName: user.displayName,
      });

      toast.success("Payment recorded successfully");

      reset({
        orderId: "",
        amount: 0,
        method: "cash",
        mpesaCode: "",
      });
    } catch (error) {
      console.error(error);

      toast.error("Failed to record payment");
    }
  };

  function switchTab(tab: "payments" | "outstanding") {
    setActiveTab(tab);
    setDateRange("all");
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "outstanding") {
      params.set("tab", "outstanding");
    } else {
      params.delete("tab");
    }
    router.replace(`/payments?${params.toString()}`, { scroll: false });
  }

  const rangeOptions: { label: string; value: DateRange; icon: typeof faCalendarDay }[] = [
    { label: "Today", value: "today", icon: faCalendarDay },
    { label: "This Week", value: "week", icon: faCalendarWeek },
    { label: "This Month", value: "month", icon: faCalendarAlt },
    { label: "This Year", value: "year", icon: faCalendarAlt },
    { label: "All Time", value: "all", icon: faFilter },
  ];

  return (
    <div className="space-y-6">
      {/* TABS */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        <button
          onClick={() => switchTab("payments")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "payments"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <FontAwesomeIcon icon={faMoneyBillWave} className="text-emerald-600" />
          Payments
        </button>
        <button
          onClick={() => switchTab("outstanding")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "outstanding"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <FontAwesomeIcon icon={faHandHoldingUsd} className="text-rose-600" />
          Outstanding
          {outstandingOrders.length > 0 && (
            <Badge variant="danger" className="ml-1 text-[10px] px-1.5 py-0">
              {outstandingOrders.length}
            </Badge>
          )}
        </button>
      </div>

      {activeTab === "payments" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Record Payment</CardTitle>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Order
                  </label>

                  <select
                    {...register("orderId")}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-offset-white transition focus:border-slate-400"
                  >
                    <option value="">
                      Select order
                    </option>

                    {outstandingOrders.map((order) => (
                      <option
                        key={order.id}
                        value={order.id}
                      >
                        {order.orderNumber} -{" "}
                        {order.customerName} (
                        {formatKes(order.balanceAmount)} due)
                      </option>
                    ))}
                  </select>

                  {errors.orderId && (
                    <p className="text-xs text-red-500">
                      {errors.orderId.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Amount
                  </label>

                  <Input
                    type="number"
                    placeholder="Enter amount"
                    {...register("amount")}
                  />

                  {errors.amount && (
                    <p className="text-xs text-red-500">
                      {errors.amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Payment Method
                  </label>

                  <select
                    {...register("method")}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-offset-white transition focus:border-slate-400"
                  >
                    <option value="cash">
                      Cash
                    </option>

                    <option value="mpesa">
                      M-Pesa
                    </option>
                  </select>
                </div>

                {paymentMethod === "mpesa" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      M-Pesa Code
                    </label>

                    <Input
                      placeholder="e.g. QWE123XYZ"
                      {...register("mpesaCode")}
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Saving payment..."
                    : "Save Payment"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-slate-200">
            <CardHeader>
              <CardTitle>
                Recent Payments
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {payments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  No payments recorded yet.
                </div>
              ) : (
                payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">
                          {payment.customerName}
                        </p>

                        <p className="text-xs text-slate-500">
                          {payment.orderNumber} -{" "}
                          {payment.method.toUpperCase()}
                          {payment.mpesaCode
                            ? ` (${payment.mpesaCode})`
                            : ""}
                        </p>

                        {payment.description && (
                          <p className="text-xs text-slate-400 italic leading-relaxed pt-0.5">
                            {payment.description}
                          </p>
                        )}
                      </div>

                      <Badge variant="success">
                        {formatKes(payment.amount)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* DATE FILTER */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600 mr-1">
              <FontAwesomeIcon icon={faFilter} className="mr-1.5 text-slate-400" />
              Filter:
            </span>
            {rangeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  dateRange === opt.value
                    ? "bg-rose-100 text-rose-700 ring-1 ring-rose-300"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <FontAwesomeIcon icon={opt.icon} className="text-[10px]" />
                {opt.label}
              </button>
            ))}
          </div>

          {/* OUTSTANDING LIST */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={faHandHoldingUsd} className="text-rose-600" />
                Outstanding Balances
                <Badge variant="danger" className="ml-auto">
                  {formatKes(filteredOutstanding.reduce((sum, o) => sum + o.balanceAmount, 0))}
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {filteredOutstanding.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  <FontAwesomeIcon icon={faHandHoldingUsd} className="text-emerald-400 text-xl mb-2" />
                  <p>No outstanding balances for this period.</p>
                </div>
              ) : (
                filteredOutstanding.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition hover:border-rose-200 hover:bg-rose-50 group"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900 group-hover:text-rose-700 transition-colors">
                          {order.customerName}
                        </p>
                        <p className="text-xs text-slate-500">
                          #{order.orderNumber} &middot; Due {order.dueDate}
                        </p>
                        {order.assignedTailorName && (
                          <p className="text-xs text-slate-400">
                            Tailor: {order.assignedTailorName}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="danger" className="text-sm px-3 py-1">
                          {formatKes(order.balanceAmount)}
                        </Badge>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* POS module always visible */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>
                POS Counter
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-sm leading-relaxed text-slate-600">
                Use the Payments module to capture deposits,
                balances, and M-Pesa transactions in real
                time. The payment architecture is already
                structured for future M-Pesa STK Push and
                automated reconciliation integration.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function PosModulePage() {
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle>
          POS Counter
        </CardTitle>
      </CardHeader>

      <CardContent>
        <p className="text-sm leading-relaxed text-slate-600">
          Use the Payments module to capture deposits,
          balances, and M-Pesa transactions in real
          time. The payment architecture is already
          structured for future M-Pesa STK Push and
          automated reconciliation integration.
        </p>
      </CardContent>
    </Card>
  );
}
