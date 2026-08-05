"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag, Search } from "lucide-react";
import { useCustomerPortal } from "@/features/customer-portal/customer-portal-context";
import { getMyOrders } from "@/services/customer-portal.service";
import type { CustomerSafeOrder } from "@/services/customer-portal.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatKes } from "@/lib/utils";
import { STAGE_COLOR, PAYMENT_COLOR, PAYMENT_LABEL, stageLabel } from "../_shared";

export default function PortalOrdersPage() {
  const { customerIds, isLoaded } = useCustomerPortal();
  const [orders, setOrders] = useState<CustomerSafeOrder[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !customerIds.length) {
      setLoading(false);
      return;
    }
    getMyOrders(customerIds).then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, [isLoaded, customerIds]);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.garments.some((g) => g.name.toLowerCase().includes(q)) ||
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
      <h1 className="text-lg font-bold text-slate-900">My Orders</h1>

      {orders.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search orders…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {order.garments.map((g) => `${g.name} ×${g.quantity}`).join(", ") || "—"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {order.businessName} · Due {new Date(order.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge className={STAGE_COLOR[order.stage]}>
                        {stageLabel(order)}
                      </Badge>
                      <Badge className={PAYMENT_COLOR[order.paymentStatus]}>
                        {PAYMENT_LABEL[order.paymentStatus]}
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
