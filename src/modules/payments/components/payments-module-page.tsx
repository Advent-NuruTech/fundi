"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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

export function PaymentsModulePage() {
  const { businessId, user, ready } = useBusinessContext();

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

  const outstandingOrders = useMemo(() => {
    return orders.filter((order) => order.balanceAmount > 0);
  }, [orders]);

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

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* PAYMENT FORM */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Record Payment</CardTitle>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {/* ORDER SELECT */}
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

            {/* AMOUNT */}
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

            {/* METHOD */}
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

            {/* MPESA CODE */}
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

            {/* SUBMIT */}
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

      {/* PAYMENTS LIST */}
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
