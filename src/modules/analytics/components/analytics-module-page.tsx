"use client";

import { useEffect, useMemo, useState } from "react";
import type { Customer, Order, Payment, StockMovement } from "@/types/domain";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import {
  listenCustomers,
  listenOrders,
  listenPayments,
  listenStockMovements,
  orderCompletionRate,
  workerProductivity,
  revenueFromPayments,
} from "@/services/firestore.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKes } from "@/lib/utils";

export function AnalyticsModulePage() {
  const { businessId, ready } = useBusinessContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
    if (!ready) return;
    const a = listenOrders(businessId, setOrders);
    const b = listenCustomers(businessId, setCustomers);
    const c = listenPayments(businessId, setPayments);
    const d = listenStockMovements(businessId, setMovements);
    return () => {
      a();
      b();
      c();
      d();
    };
  }, [businessId, ready]);

  const monthlyRevenue = useMemo(() => revenueFromPayments(payments), [payments]);
  const completionRate = useMemo(() => orderCompletionRate(orders), [orders]);
  const productivity = useMemo(() => workerProductivity(orders), [orders]);
  const topCustomers = useMemo(
    () =>
      [...customers]
        .sort((a, b) => (a.outstandingBalance ?? 0) - (b.outstandingBalance ?? 0))
        .slice(0, 5),
    [customers]
  );
  const wastage = useMemo(
    () => movements.filter((movement) => movement.movementType === "wastage").reduce((sum, movement) => sum + Math.abs(movement.quantityChange), 0),
    [movements]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric title="Monthly Revenue" value={formatKes(monthlyRevenue)} />
        <Metric title="Order Completion" value={`${completionRate}%`} />
        <Metric title="Fabric Wastage" value={`${wastage.toFixed(2)} units`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top Customers</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topCustomers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <span>{customer.fullName}</span>
                <span className="text-slate-500">Balance {formatKes(customer.outstandingBalance || 0)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Employee Productivity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {productivity.map((entry) => (
              <div key={entry.name} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <p className="font-medium">{entry.name}</p>
                <p className="text-slate-500">Delivered: {entry.delivered} | Active: {entry.active}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-slate-500">{title}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
