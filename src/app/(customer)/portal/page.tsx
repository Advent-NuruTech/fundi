"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag, CreditCard, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { useCustomerPortal } from "@/features/customer-portal/customer-portal-context";
import { getMyOrders } from "@/services/customer-portal.service";
import type { CustomerSafeOrder } from "@/services/customer-portal.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatKes } from "@/lib/utils";
import { STAGE_LABEL, STAGE_COLOR, PAYMENT_COLOR, PAYMENT_LABEL } from "@/app/(customer)/portal/_shared";

export default function PortalHomePage() {
  const { customerIds, primaryCustomer, isLoaded } = useCustomerPortal();
  const [orders, setOrders] = useState<CustomerSafeOrder[]>([]);
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

  const active = orders.filter((o) => o.stage !== "delivered");
  const balance = orders.reduce((s, o) => s + o.balanceAmount, 0);
  const today = new Date().toISOString().slice(0, 10);
  const urgent = active.filter((o) => o.dueDate <= today);
  const recent = orders.slice(0, 4);

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
          Hi, {primaryCustomer?.fullName?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="text-sm text-slate-500">Here's what's happening with your orders</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-emerald-100 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-700 mb-1">
              <ShoppingBag className="h-4 w-4" />
              <span className="text-xs font-medium">Active orders</span>
            </div>
            <p className="text-2xl font-bold text-emerald-900">{active.length}</p>
          </CardContent>
        </Card>
        <Card className={balance > 0 ? "border-amber-100 bg-amber-50" : "border-slate-100"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <CreditCard className="h-4 w-4" />
              <span className="text-xs font-medium">Outstanding</span>
            </div>
            <p className={`text-2xl font-bold ${balance > 0 ? "text-amber-700" : "text-slate-700"}`}>
              {formatKes(balance)}
            </p>
          </CardContent>
        </Card>
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

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Recent orders</h2>
          <Link href="/portal/orders" className="text-xs font-medium text-emerald-700 hover:underline flex items-center gap-0.5">
            See all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <ShoppingBag className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No orders yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recent.map((order) => (
              <Link key={order.id} href={`/portal/orders/${order.id}`}>
                <Card className="hover:border-emerald-300 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{order.orderNumber}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {order.garments.map((g) => g.name).join(", ") || order.businessName}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                      <Badge className={STAGE_COLOR[order.stage]}>{STAGE_LABEL[order.stage]}</Badge>
                      <Badge className={PAYMENT_COLOR[order.paymentStatus]}>
                        {PAYMENT_LABEL[order.paymentStatus]}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
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
    </div>
  );
}
