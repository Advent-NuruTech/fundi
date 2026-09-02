"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { InventoryMaterial, Order, Payment, PurchaseOrder, UserProfile } from "@/types/domain";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { useBusinessType } from "@/hooks/useBusinessType";
import { useAuth } from "@/features/auth/components/auth-context";
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

// Font Awesome imports
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faMoneyBillWave,
  faExclamationTriangle,
  faClock,
  faUsers,
  faUserTie,
  faWarehouse,
  faGaugeHigh,
  faBell,
  faPersonRunning,
  faCheckCircle,
  faTruck,
  faScissors,
  faPenRuler,
} from "@fortawesome/free-solid-svg-icons";

export function DashboardModulePage() {
  const { businessId, ready, user } = useBusinessContext();
  const { business } = useAuth();
  const biz = useBusinessType();
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
      <div className="space-y-6 pb-8">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FontAwesomeIcon icon={faScissors} className="text-emerald-600" />
          Tailor Dashboard
        </h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric 
            label="Assigned orders" 
            value={myOrders.length.toString()} 
          />
          <Metric 
            label="Overdue" 
            value={myOverdue.length.toString()} 
            tone="danger" 
          />
          <Metric 
            label="Due today" 
            value={myOrders.filter((o) => o.dueDate <= todayYmd()).length.toString()} 
            tone="warning" 
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faPersonRunning} className="text-emerald-600" />
              Your production queue
              <Badge variant="default" className="ml-auto">{myOrders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myOrders.map((order, index) => (
              <QueueRow key={order.id} order={order} showDelay index={index} />
            ))}
            {myOrders.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No orders assigned</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (roles.includes("inventory_manager") && !permissions.canManageWorkshop) {
    return (
      <div className="space-y-6 pb-8">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FontAwesomeIcon icon={faWarehouse} className="text-amber-600" />
          {biz.terms.inventory} Dashboard
        </h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric 
            label="Low stock alerts" 
            value={lowStock.length.toString()} 
            tone="warning" 
          />
          <Metric 
            label="Pending purchases" 
            value={pendingPurchases.length.toString()} 
          />
          <Metric 
            label={`${biz.terms.materials} tracked`} 
            value={materials.length.toString()} 
          />
        </div>
        {lowStock.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                Low Stock Items
                
                <Badge variant="danger" className="ml-auto">{lowStock.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lowStock.slice(0, 5).map((material) => (
                <div key={material.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                  <span className="font-medium">{material.name}</span>
                  <span className="text-amber-700">Stock: {material.quantity}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (roles.includes("cashier") && !permissions.canManageWorkshop) {
    return (
      <div className="space-y-6 pb-8">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FontAwesomeIcon icon={faMoneyBillWave} className="text-emerald-600" />
          Cashier Dashboard
        </h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Metric 
            label="Pending balances" 
            value={formatKes(pendingBalances)} 
            tone="danger" 
          />
          <Metric 
            label="Today" 
            value={formatKes(revenueFromPayments(paymentsToday))} 
            tone="success" 
          />
          <Metric 
            label="This week" 
            value={formatKes(revenueFromPayments(paymentsWeek))} 
            tone="success" 
          />
          <Metric 
            label="This month" 
            value={formatKes(revenueFromPayments(paymentsMonth))} 
            tone="success" 
          />
          <Metric 
            label="This year" 
            value={formatKes(revenueFromPayments(paymentsYear))} 
            tone="success" 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <span className="mr-1">{biz.emoji}</span>
          {business?.name ? `${business.name} Dashboard` : "Business Dashboard"}
          <FontAwesomeIcon icon={faGaugeHigh} className="text-slate-400 text-lg ml-2" />
        </h1>
        <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
          <FontAwesomeIcon icon={faBell} className="text-slate-400" />
          Live view of your {biz.terms.orders.toLowerCase()}, payments and {biz.terms.inventory.toLowerCase()} health.
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric 
          label="Needs attention today" 
          value={overdue.length.toString()} 
          tone="warning" 
          href="/orders"
        />
        <Metric 
          label="Low stock" 
          value={lowStock.length.toString()} 
          tone="warning" 
          href="/inventory?section=smart-reorder"
        />
        <Metric 
          label="Revenue" 
          value={formatKes(revenue)} 
          tone="success" 
          href="/finance"
        />
        <Metric 
          label="Pending balances" 
          value={formatKes(pendingBalances)} 
          tone="danger" 
          href="/payments?tab=outstanding"
        />
      </div>

      {permissions.canReadFinance && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
              <FontAwesomeIcon icon={faMoneyBillWave} className="text-emerald-600" />
              Financial Summary
            </h3>
            <Link href="/finance">
              <Button variant="ghost" size="sm" className="text-emerald-700">
                View Finance
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="min-w-0 rounded-xl bg-white px-3 py-2 text-center text-sm shadow-sm">
              <p className="text-xs text-slate-500">Today</p>
              <p className="break-words font-semibold leading-tight text-emerald-600 tabular-nums">{formatKes(revenueFromPayments(paymentsToday))}</p>
            </div>
            <div className="min-w-0 rounded-xl bg-white px-3 py-2 text-center text-sm shadow-sm">
              <p className="text-xs text-slate-500">This Week</p>
              <p className="break-words font-semibold leading-tight text-emerald-600 tabular-nums">{formatKes(revenueFromPayments(paymentsWeek))}</p>
            </div>
            <div className="min-w-0 rounded-xl bg-white px-3 py-2 text-center text-sm shadow-sm">
              <p className="text-xs text-slate-500">This Month</p>
              <p className="break-words font-semibold leading-tight text-emerald-600 tabular-nums">{formatKes(revenueFromPayments(paymentsMonth))}</p>
            </div>
            <div className="min-w-0 rounded-xl bg-white px-3 py-2 text-center text-sm shadow-sm">
              <p className="text-xs text-slate-500">Outstanding</p>
              <p className="break-words font-semibold leading-tight text-rose-600 tabular-nums">{formatKes(pendingBalances)}</p>
            </div>
          </div>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBell} className="text-rose-600" />
            Overdue Responsibility Alerts
            {overdue.length > 0 && (
              <Badge variant="danger" className="ml-auto">{overdue.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
          {overdue.map((order, index) => (
            <div 
              key={order.id} 
              className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
            >
              <span className="font-bold text-rose-600 min-w-[1.5rem] text-center">{index + 1}.</span>
              <span className="flex-1">
                <strong>{order.assignedTailorName || "Unassigned"}</strong> has not delivered{' '}
                <span className="font-medium">{order.orderNumber}</span> for{' '}
                <span className="font-medium">{order.customerName}</span>.{' '}
                <span className="inline-flex items-center gap-1 text-rose-600">
                  {delayLabel(order.dueDate)}.
                </span>
              </span>
            </div>
          ))}
          {!overdue.length && (
            <div className="text-center py-6">
              <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 text-2xl mb-2" />
              <p className="text-sm text-slate-500">No overdue alerts right now. Everything is on track!</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faClipboardList} className="text-emerald-600" />
              Active {biz.terms.orders}
              <Badge variant="default" className="ml-auto">{orders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {orders.slice(0, 10).map((order, index) => (
              <motion.div 
                key={order.id} 
                initial={{ opacity: 0, y: 6 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <QueueRow order={order} index={index} />
              </motion.div>
            ))}
            {orders.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No active orders</p>
            )}
            {orders.length > 10 && (
              <Link href="/orders" className="block text-center text-sm text-emerald-600 hover:underline mt-2">
                View all {orders.length} orders
              </Link>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faUsers} className="text-emerald-600" />
              Workers
              
              <Badge variant="default" className="ml-auto">{workers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {workers.map((worker) => (
              <Link 
                key={worker.uid} 
                href={`/employees/${worker.uid}`} 
                className="block rounded-xl border border-slate-200 px-3 py-2 text-sm transition hover:border-emerald-200 hover:bg-emerald-50 group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold text-xs">
                    {worker.displayName?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate flex items-center gap-1">
                      {worker.displayName}
                      {worker.role && (
                       
                        <Badge variant="default" className="text-[10px] px-1 py-0">
  {worker.role}
</Badge>
                      )}
                    </p>
                    {worker.employeeNumber && (
                      <p className="text-xs text-slate-400 truncate">
                        <FontAwesomeIcon icon={faUserTie} className="mr-1 text-slate-300" />
                        {worker.employeeNumber}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {workers.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No workers found</p>
            )}
            {workers.length > 0 && (
              <Link href="/employees" className="block text-center text-sm text-emerald-600 hover:underline mt-2">
                Manage workers
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QueueRow({ order, showDelay = false, index }: { order: Order; showDelay?: boolean; index: number }) {
  const stageIcon = {
    'pending': faClock,
    'in_progress': faPersonRunning,
    'cutting': faScissors,
    'stitching': faPenRuler,  // Changed from 'sewing' to 'stitching'
    'sewing': faPenRuler,     // Keep for backward compatibility
    'fitting': faCheckCircle,
    'finishing': faCheckCircle,  // Add this
    'quality_check': faCheckCircle,
    'ready_for_pickup': faTruck, // Add this
    'delivered': faTruck,
  }[order.stage] || faClipboardList;

  return (
    <Link 
      href={`/orders/${order.id}`} 
      className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm transition hover:border-emerald-200 hover:bg-emerald-50 group"
    >
      <span className="text-xs text-slate-400 font-mono w-8 text-center group-hover:text-emerald-600 transition-colors">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate flex items-center gap-2">
          <span className="truncate">{order.customerName}</span>
          <span className="text-xs text-slate-400 font-normal">#{order.orderNumber}</span>
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Due {order.dueDate}</span>
          {showDelay && order.dueDate < todayYmd() && order.stage !== "delivered" && (
            <span className="text-rose-600 flex items-center gap-1">
              {delayLabel(order.dueDate)}
            </span>
          )}
        </div>
      </div>
      <Badge className="ml-2 shrink-0 flex items-center gap-1">
        <FontAwesomeIcon icon={stageIcon} className="text-xs" />
        {order.stage.replaceAll("_", " ")}
      </Badge>
    </Link>
  );
}

function Metric({ 
  label, 
  value, 
  tone, 
  href
}: { 
  label: string; 
  value: string; 
  tone?: "warning" | "success" | "danger"; 
  href?: string;
}) {
  const content = (
    <Card className="h-full min-w-0 transition hover:shadow-md">
      <CardContent className="p-4 text-center sm:pt-5">
        <p className="text-xs leading-tight text-slate-500">{label}</p>
        <p className={`
          mt-1 break-words text-base font-semibold leading-tight tabular-nums sm:text-2xl
          ${tone === "success" ? "text-emerald-700" : 
            tone === "danger" ? "text-rose-700" : 
            tone === "warning" ? "text-amber-700" : 
            "text-slate-700"}
        `}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
  
  if (href) {
    return <Link href={href} className="block h-full min-w-0">{content}</Link>;
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
