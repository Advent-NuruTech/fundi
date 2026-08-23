"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag, CreditCard, Clock, AlertCircle, ChevronRight, PackageCheck, Store } from "lucide-react";
import { useCustomerPortal } from "@/features/customer-portal/customer-portal-context";
import { getMyPortalOrders } from "@/services/customer-portal.service";
import type { PortalOrder } from "@/services/customer-portal.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatKes } from "@/lib/utils";
import { portalStatusColor, portalStatusLabel, portalPaymentColor, portalPaymentLabel } from "@/app/(customer)/portal/_shared";
import { OrderDetailsDialog, OutstandingBalancesDialog } from "@/app/(customer)/portal/_modals";

type TabKey = "active" | "delivered" | "outstanding";

const TABS: { key: TabKey; label: string; icon: typeof Clock }[] = [
  { key: "active", label: "Active", icon: Clock },
  { key: "delivered", label: "Delivered", icon: PackageCheck },
  { key: "outstanding", label: "Outstanding Balance", icon: CreditCard },
];

export default function PortalHomePage() {
  const { customerIds, primaryCustomer, userName, businesses, userId, isLoaded } = useCustomerPortal();
  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [selectedOrder, setSelectedOrder] = useState<PortalOrder | null>(null);
  const [showBalances, setShowBalances] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      setLoading(false);
      return;
    }
    getMyPortalOrders(customerIds, userId).then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, [isLoaded, customerIds, userId]);

  const active = orders.filter((o) => o.isActive);
  const delivered = orders.filter((o) => o.isDelivered);
  const outstanding = orders.filter((o) => o.balanceAmount > 0);
  const balance = orders.reduce((s, o) => s + o.balanceAmount, 0);
  const today = new Date().toISOString().slice(0, 10);
  const urgent = active.filter((o) => o.dueDate && o.dueDate <= today);

  const listFor: Record<TabKey, PortalOrder[]> = { active, delivered, outstanding };
  const visible = listFor[activeTab];

  const handleTabClick = (key: TabKey) => {
    setActiveTab(key);
    if (key === "outstanding") setShowBalances(true);
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Hi,{" "}
          {(() => {
            const first = (primaryCustomer?.fullName || userName).trim().split(" ")[0] ?? "";
            return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : "There";
          })()}{" "}
          👋
        </h1>
        <p className="text-sm text-slate-500">Everything you buy from FundiFlow businesses, together.</p>
      </div>

      <Card className="border-emerald-100 bg-emerald-50/60">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <Store className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              {businesses.length
                ? `${businesses.length} connected business${businesses.length === 1 ? "" : "es"}`
                : "Your standalone customer account"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {businesses.length
                ? "Orders stay separated by business while sharing this one login."
                : "Global Sell orders appear here even before a workshop connects to you."}
            </p>
          </div>
          <Link href="/portal/profile" className="shrink-0 text-xs font-semibold text-emerald-700 hover:underline">
            View
          </Link>
        </CardContent>
      </Card>

      {/* Tab cards — three columns on all screen sizes */}
      <div className="grid grid-cols-3 gap-2">
        {TABS.map(({ key, label, icon: Icon }) => {
          const selected = activeTab === key;
          const value = key === "outstanding" ? formatKes(balance) : listFor[key].length;
          return (
            <button
              key={key}
              onClick={() => handleTabClick(key)}
              className={cn(
                "rounded-xl border p-3 text-center transition-all cursor-pointer",
                selected
                  ? "border-emerald-300 bg-emerald-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-emerald-200"
              )}
              aria-pressed={selected}
            >
              <Icon
                className={cn(
                  "mx-auto h-4 w-4 mb-1.5",
                  key === "outstanding" ? (selected ? "text-amber-600" : "text-amber-500") : selected ? "text-emerald-600" : "text-slate-400"
                )}
              />
              <p className="text-[10px] font-semibold leading-tight text-slate-600">{label}</p>
              <p
                className={cn(
                  "mt-1 text-lg font-bold leading-none",
                  key === "outstanding" ? (selected ? "text-amber-700" : "text-amber-600") : selected ? "text-emerald-800" : "text-slate-700"
                )}
              >
                {value}
              </p>
            </button>
          );
        })}
      </div>

      {urgent.length > 0 && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-rose-800">
                {urgent.length} order{urgent.length > 1 ? "s" : ""} due today or overdue
              </p>
              <p className="text-xs text-rose-600 mt-0.5">Check your orders for details</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtered order list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">
            {TABS.find((t) => t.key === activeTab)?.label}
            {activeTab === "outstanding" && visible.length > 0 && (
              <span className="ml-1 text-xs font-normal text-slate-400">
                · {formatKes(balance)} total
              </span>
            )}
          </h2>
          <Link href="/portal/orders" className="text-xs font-medium text-emerald-700 hover:underline flex items-center gap-0.5">
            See all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {visible.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              {activeTab === "delivered" ? (
                <PackageCheck className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              ) : (
                <ShoppingBag className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              )}
              <p className="text-sm text-slate-500">
                {activeTab === "active" && "No active orders right now"}
                {activeTab === "delivered" && "No delivered orders yet"}
                {activeTab === "outstanding" && "No outstanding balance — all settled 🎉"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {visible.map((order) => (
              <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Link href="/portal/support">
          <Card className="hover:border-emerald-300 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <Clock className="mx-auto h-5 w-5 text-emerald-600 mb-1.5" />
              <p className="text-xs font-medium text-slate-700">Contact support</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/portal/payments">
          <Card className="hover:border-emerald-300 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <CreditCard className="mx-auto h-5 w-5 text-emerald-600 mb-1.5" />
              <p className="text-xs font-medium text-slate-700">Payment history</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Modals */}
      <OrderDetailsDialog order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <OutstandingBalancesDialog
        open={showBalances}
        orders={outstanding}
        totalBalance={balance}
        onClose={() => setShowBalances(false)}
        onViewOrder={(order) => {
          setShowBalances(false);
          setSelectedOrder(order);
        }}
      />
    </div>
  );
}

function OrderCard({
  order,
  onClick,
}: {
  order: PortalOrder;
  onClick: () => void;
}) {
  const orderName = order.items.map((g) => g.name).join(", ");
  return (
    <button onClick={onClick} className="w-full text-left cursor-pointer">
      <Card className="hover:border-emerald-300 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">{order.orderNumber}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {order.source === "globalsell" ? "Global Sell purchase" : "Workshop order"}
              </p>
              {order.items.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {order.items.map((g, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                    >
                      {g.name} ×{g.quantity}
                    </span>
                  ))}
                </div>
              ) : (
                orderName && (
                  <p className="text-xs text-slate-500 mt-1">{orderName}</p>
                )
              )}
              <p className="text-xs text-slate-400 mt-1">
                {order.businessName}
                {order.dueDate
                  ? ` · Due ${new Date(order.dueDate).toLocaleDateString()}`
                  : ` · ${new Date(order.createdAt).toLocaleDateString()}`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge className={portalStatusColor(order)}>
                {portalStatusLabel(order)}
              </Badge>
              <Badge className={portalPaymentColor(order)}>
                {portalPaymentLabel(order)}
              </Badge>
              {order.balanceAmount > 0 && (
                <p className="text-xs font-semibold text-rose-600">
                  {formatKes(order.balanceAmount)} due
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
