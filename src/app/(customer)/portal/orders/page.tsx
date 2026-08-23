"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag, Search, Store, Scissors } from "lucide-react";
import { useCustomerPortal } from "@/features/customer-portal/customer-portal-context";
import { getMyPortalOrders } from "@/services/customer-portal.service";
import type { PortalOrder } from "@/services/customer-portal.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatKes } from "@/lib/utils";
import { portalStatusColor, portalStatusLabel, portalPaymentColor, portalPaymentLabel } from "../_shared";

export default function PortalOrdersPage() {
  const { customerIds, userId, isLoaded, businesses } = useCustomerPortal();
  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [search, setSearch] = useState("");
  const [businessId, setBusinessId] = useState("all");
  const [source, setSource] = useState<"all" | PortalOrder["source"]>("all");
  const [loading, setLoading] = useState(true);

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

  const filtered = orders.filter((o) => {
    if (businessId !== "all" && o.businessId !== businessId) return false;
    if (source !== "all" && o.source !== source) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.items.some((g) => g.name.toLowerCase().includes(q)) ||
      o.businessName.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My orders</h1>
        <p className="mt-1 text-sm text-slate-500">Marketplace purchases and workshop orders in one place.</p>
      </div>

      {orders.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by order, item, or business…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as typeof source)}
              className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500"
              aria-label="Filter by order type"
            >
              <option value="all">All order types</option>
              <option value="globalsell">Global Sell purchases</option>
              <option value="tailoring">Workshop orders</option>
            </select>
            <select
              value={businessId}
              onChange={(event) => setBusinessId(event.target.value)}
              className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500"
              aria-label="Filter by business"
            >
              <option value="all">All businesses</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>{business.name}</option>
              ))}
              {orders
                .filter((order) => !businesses.some((business) => business.id === order.businessId))
                .filter((order, index, list) => list.findIndex((item) => item.businessId === order.businessId) === index)
                .map((order) => (
                  <option key={order.businessId} value={order.businessId}>{order.businessName}</option>
                ))}
            </select>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-700">
              {search ? "No orders match your search" : "No orders yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => (
            <Link key={order.id} href={`/portal/orders/${order.id}`}>
              <Card className="hover:border-emerald-300 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{order.orderNumber}</p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {order.source === "globalsell" ? <Store className="h-3 w-3" /> : <Scissors className="h-3 w-3" />}
                        {order.source === "globalsell" ? "Global Sell purchase" : "Workshop order"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {order.items.map((g) => `${g.name} ×${g.quantity}`).join(", ") || "—"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {order.businessName}
                        {order.dueDate
                          ? ` · Due ${new Date(order.dueDate).toLocaleDateString()}`
                          : ` · ${new Date(order.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
