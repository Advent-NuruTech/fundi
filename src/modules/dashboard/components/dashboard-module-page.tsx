"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { InventoryMaterial, Order, Payment, PurchaseOrder, UserProfile } from "@/types/domain";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import {
  dueTodayOrders,
  fetchMembers,
  listenMaterials,
  listenOrders,
  listenPayments,
  listenPurchaseOrders,
  lowStockMaterials,
  revenueFromPayments,
} from "@/services/firestore.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKes } from "@/lib/utils";
import { usePermissions } from "@/modules/shared/use-permissions";

export function DashboardModulePage() {
  const { businessId, ready, user } = useBusinessContext();
  const permissions = usePermissions();
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);
  const [workers, setWorkers] = useState<UserProfile[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const unsubOrders = listenOrders(businessId, setOrders);
    const unsubPayments = listenPayments(businessId, setPayments);
    const unsubMaterials = listenMaterials(businessId, setMaterials);
    const unsubPos = listenPurchaseOrders(businessId, setPurchaseOrders);
    fetchMembers(businessId).then((rows) => setWorkers(rows));
    return () => {
      unsubOrders();
      unsubPayments();
      unsubMaterials();
      unsubPos();
    };
  }, [businessId, ready]);

  const myOrders = useMemo(() => orders.filter((order) => order.assignedTailorId === user?.uid), [orders, user?.uid]);
  const overdue = useMemo(() => dueTodayOrders(orders), [orders]);
  const myOverdue = useMemo(() => myOrders.filter((order) => order.dueDate < todayYmd() && order.stage !== "delivered"), [myOrders]);
  const lowStock = useMemo(() => lowStockMaterials(materials), [materials]);
  const revenue = useMemo(() => revenueFromPayments(payments), [payments]);
  const pendingBalances = useMemo(() => orders.reduce((sum, order) => sum + order.balanceAmount, 0), [orders]);
  const pendingPurchases = useMemo(() => purchaseOrders.filter((po) => po.status === "pending"), [purchaseOrders]);

  const paymentsToday = useMemo(() => withinRange(payments, 1), [payments]);
  const paymentsWeek = useMemo(() => withinRange(payments, 7), [payments]);
  const paymentsMonth = useMemo(() => withinRange(payments, 30), [payments]);
  const paymentsYear = useMemo(() => withinRange(payments, 365), [payments]);

  const roles = user?.roles ?? (user?.role ? [user.role] : []);

  if (roles.includes("tailor") && !permissions.canManageWorkshop) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Tailor Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Assigned orders" value={myOrders.length.toString()} />
          <Metric label="Overdue" value={myOverdue.length.toString()} tone="danger" />
          <Metric label="Due today" value={myOrders.filter((o) => o.dueDate <= todayYmd()).length.toString()} tone="warning" />
        </div>
        <Card>
          <CardHeader><CardTitle>Your production queue</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myOrders.map((order) => (
              <QueueRow key={order.id} order={order} showDelay />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (roles.includes("inventory_manager") && !permissions.canManageWorkshop) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Inventory Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Low stock alerts" value={lowStock.length.toString()} tone="warning" />
          <Metric label="Pending purchases" value={pendingPurchases.length.toString()} />
          <Metric label="Materials tracked" value={materials.length.toString()} />
        </div>
      </div>
    );
  }

  if (roles.includes("cashier") && !permissions.canManageWorkshop) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Cashier Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Pending balances" value={formatKes(pendingBalances)} tone="danger" />
          <Metric label="Today" value={formatKes(revenueFromPayments(paymentsToday))} tone="success" />
          <Metric label="This week" value={formatKes(revenueFromPayments(paymentsWeek))} tone="success" />
          <Metric label="This month" value={formatKes(revenueFromPayments(paymentsMonth))} tone="success" />
          <Metric label="This year" value={formatKes(revenueFromPayments(paymentsYear))} tone="success" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Business Dashboard</h1>
        <p className="text-sm text-slate-500">Live view of production, payments, and stock health.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Today urgent" value={overdue.length.toString()} tone="warning" href="/orders" />
        <Metric label="Low stock" value={lowStock.length.toString()} tone="warning" href="/inventory" />
        <Metric label="Revenue" value={formatKes(revenue)} tone="success" href="/finance" />
        <Metric label="Pending balances" value={formatKes(pendingBalances)} tone="danger" href="/payments" />
      </div>

      {permissions.canReadFinance && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-emerald-800">Financial Summary</h3>
            <Link href="/finance">
              <Button variant="ghost" size="sm" className="text-emerald-700">View Finance →</Button>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
              <p className="text-xs text-slate-500">Today</p>
              <p className="font-semibold text-emerald-600">{formatKes(revenueFromPayments(paymentsToday))}</p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
              <p className="text-xs text-slate-500">This Week</p>
              <p className="font-semibold text-emerald-600">{formatKes(revenueFromPayments(paymentsWeek))}</p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
              <p className="text-xs text-slate-500">This Month</p>
              <p className="font-semibold text-emerald-600">{formatKes(revenueFromPayments(paymentsMonth))}</p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
              <p className="text-xs text-slate-500">Outstanding</p>
              <p className="font-semibold text-rose-600">{formatKes(pendingBalances)}</p>
            </div>
          </div>
        </div>
      )}
      <Card>
        <CardHeader><CardTitle>Overdue responsibility alerts</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {overdue.map((order) => (
            <div key={order.id} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {order.assignedTailorName || "Unassigned"} has not delivered {order.orderNumber} for {order.customerName}. {delayLabel(order.dueDate)}.
            </div>
          ))}
          {!overdue.length && <p className="text-sm text-slate-500">No overdue alerts right now.</p>}
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Active Orders</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {orders.slice(0, 8).map((order) => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <QueueRow order={order} />
              </motion.div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Workers</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {workers.map((worker) => (
              <Link key={worker.uid} href={`/employees/${worker.uid}`} className="block rounded-xl border border-slate-200 px-3 py-2 text-sm transition hover:border-emerald-200 hover:bg-emerald-50">
                <p className="font-medium">{worker.displayName}</p>
                {worker.employeeNumber && <p className="text-xs text-slate-400">{worker.employeeNumber}</p>}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QueueRow({ order, showDelay = false }: { order: Order; showDelay?: boolean }) {
  return (
    <Link href={`/orders/${order.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm transition hover:border-emerald-200 hover:bg-emerald-50">
      <div>
        <p className="font-medium">{order.customerName}</p>
      <p className="text-xs text-slate-500">
  {order.orderNumber} - due {order.dueDate}
</p> {showDelay && order.dueDate < todayYmd() && order.stage !== "delivered" && (
          <p className="text-xs text-rose-600">{delayLabel(order.dueDate)}</p>
        )}
      </div>
      <Badge>{order.stage.replaceAll("_", " ")}</Badge>
    </Link>
  );
}

function Metric({ label, value, tone, href }: { label: string; value: string; tone?: "warning" | "success" | "danger"; href?: string }) {
  const content = (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-slate-500">{label}</p>
        <p className={tone === "success" ? "text-2xl font-semibold text-emerald-700" : tone === "danger" ? "text-2xl font-semibold text-rose-700" : tone === "warning" ? "text-2xl font-semibold text-amber-700" : "text-2xl font-semibold"}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function withinRange(payments: Payment[], days: number) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return payments.filter((payment) => {
    const date = payment.recordedAt ? new Date(payment.recordedAt) : new Date();
    return date >= cutoff;
  });
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function delayLabel(dueDate: string) {
  const due = new Date(`${dueDate}T00:00:00`);
  const diffMs = Date.now() - due.getTime();
  if (diffMs <= 0) {
    return "On time";
  }
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffHours / 24);
  if (days >= 1) {
    return `${days} day(s) late`;
  }
  return `${diffHours} hour(s) late`;
}
