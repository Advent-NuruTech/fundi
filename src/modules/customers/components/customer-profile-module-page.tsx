"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { Customer, Order, Payment } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateLabel, formatKes } from "@/lib/utils";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { listenCustomer, listenOrders, listenPayments } from "@/services/firestore.service";


export function CustomerProfileModulePage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const { businessId, ready } = useBusinessContext();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!ready || !customerId) {
      return;
    }
    const unsubCustomer = listenCustomer(businessId, customerId, setCustomer);
    const unsubOrders = listenOrders(businessId, (rows) => setOrders(rows.filter((row) => row.customerId === customerId)));
    const unsubPayments = listenPayments(businessId, (rows) => setPayments(rows.filter((row) => row.customerId === customerId)));
    return () => {
      unsubCustomer();
      unsubOrders();
      unsubPayments();
    };
  }, [businessId, customerId, ready]);

  const latestOrder = useMemo(() => orders[0], [orders]);

  if (!customer) {
    return <div className="text-sm text-slate-500">Customer not found.</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{customer.fullName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{customer.phone}</Badge>
            <Badge variant={customer.outstandingBalance > 0 ? "warning" : "success"}>
              Balance: {formatKes(customer.outstandingBalance || 0)}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Measurements</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-4">
              {Object.entries(customer.measurements || {}).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-slate-200 px-2 py-1">
                  {key}: {String(value)}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Order timeline</p>
            <div className="mt-2 space-y-2">
              {orders.map((order) => (
                <div key={order.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {order.orderNumber} - {order.stage} - due {order.dueDate}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {payments.map((payment) => (
            <div key={payment.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <p className="font-medium">{formatKes(payment.amount)}</p>
              <p className="text-slate-500">{payment.method.toUpperCase()} {payment.mpesaCode ? `- ${payment.mpesaCode}` : ""}</p>
            </div>
          ))}
          {latestOrder && (
            <p className="pt-2 text-xs text-slate-500">Latest order due: {formatDateLabel(latestOrder.dueDate)}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
