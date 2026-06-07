"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, TrendingUp, BarChart2, Users, Package } from "lucide-react";
import type { Customer, Order, Payment, StockMovement } from "@/types/domain";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { useFinancePermissions } from "@/modules/shared/use-finance-permissions";
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

function LockedMetric({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-slate-500">{title}</p>
        <div className="mt-2 flex items-center gap-2 text-slate-400">
          <Lock className="h-4 w-4" />
          <span className="text-sm">Owner only</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsModulePage() {
  const { businessId, ready } = useBusinessContext();
  const finPerms = useFinancePermissions();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const canSeeRevenue = finPerms.hasOwnerAccess || finPerms.canSeeMonthlyRevenueAnalytics;

  useEffect(() => {
    if (!ready) return;
    const a = listenOrders(businessId, setOrders);
    const b = listenCustomers(businessId, setCustomers);
    const d = listenStockMovements(businessId, setMovements);
    // Only fetch payments if the user is allowed to see revenue analytics
    if (canSeeRevenue) {
      const c = listenPayments(businessId, setPayments);
      return () => { a(); b(); c(); d(); };
    }
    return () => { a(); b(); d(); };
  }, [businessId, ready, canSeeRevenue]);

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
    () => movements.filter((m) => m.movementType === "wastage").reduce((sum, m) => sum + Math.abs(m.quantityChange), 0),
    [movements]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">Business performance metrics and trends</p>
      </div>

      {/* Access notice for non-owners */}
      {!finPerms.hasOwnerAccess && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <p>
            Revenue and financial analytics are visible to the business owner only.
            {!canSeeRevenue && " Your owner can grant you access in Settings → Role Permissions."}
          </p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {canSeeRevenue ? (
          <Metric
            title="Monthly Revenue"
            value={formatKes(monthlyRevenue)}
            icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          />
        ) : (
          <LockedMetric title="Monthly Revenue" />
        )}
        <Metric
          title="Order Completion"
          value={`${completionRate}%`}
          icon={<BarChart2 className="h-5 w-5 text-blue-600" />}
        />
        <Metric
          title="Fabric Wastage"
          value={`${wastage.toFixed(2)} units`}
          icon={<Package className="h-5 w-5 text-amber-600" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-600" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topCustomers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{customer.fullName}</span>
                <span className="text-slate-500">Balance {formatKes(customer.outstandingBalance || 0)}</span>
              </div>
            ))}
            {topCustomers.length === 0 && <p className="text-sm text-slate-400">No customer data yet.</p>}
          </CardContent>
        </Card>

        {/* Employee Productivity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-600" />
              Employee Productivity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {productivity.map((entry) => (
              <div key={entry.name} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <p className="font-medium text-slate-800">{entry.name}</p>
                <p className="text-slate-500">Delivered: {entry.delivered} | Active: {entry.active}</p>
              </div>
            ))}
            {productivity.length === 0 && <p className="text-sm text-slate-400">No productivity data yet.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Analytics — owner/permitted only */}
      {canSeeRevenue && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Revenue Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                <p className="text-xs text-emerald-600 font-medium">Monthly Revenue</p>
                <p className="mt-1 text-xl font-bold text-emerald-700">{formatKes(monthlyRevenue)}</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
                <p className="text-xs text-blue-600 font-medium">Total Payments</p>
                <p className="mt-1 text-xl font-bold text-blue-700">{payments.length}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                <p className="text-xs text-slate-600 font-medium">Avg. Payment Value</p>
                <p className="mt-1 text-xl font-bold text-slate-700">
                  {formatKes(payments.length > 0 ? payments.reduce((s, p) => s + p.amount, 0) / payments.length : 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-500">{title}</p>
          {icon}
        </div>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}
