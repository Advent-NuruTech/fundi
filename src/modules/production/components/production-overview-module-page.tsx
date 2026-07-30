"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Order } from "@/types/domain";
import { listenOrders, dueTodayOrders } from "@/services/firestore.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ProductionOverviewModulePage() {
  const { businessId, ready } = useBusinessContext();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!ready) return;
    return listenOrders(businessId, setOrders);
  }, [businessId, ready]);

  const active = useMemo(() => orders.filter((order) => order.stage !== "delivered"), [orders]);
  const overdue = useMemo(() => dueTodayOrders(orders), [orders]);
  const delivered = useMemo(() => orders.filter((order) => order.stage === "delivered"), [orders]);

  return (
    <div className="space-y-6">
      {/* Summary Cards - 2 columns on mobile, 4 on larger screens */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card>
          <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-center">
              Active in Production
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <p className="text-2xl sm:text-3xl font-semibold text-center">{active.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-center">
              Overdue Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <p className="text-2xl sm:text-3xl font-semibold text-center text-rose-600">{overdue.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-center">
              Delivered
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <p className="text-2xl sm:text-3xl font-semibold text-center text-emerald-600">{delivered.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
            <CardTitle className="text-[11px] sm:text-base font-semibold text-center text-emerald-800">
              📋 Board
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0 flex items-center justify-center">
            <Link 
              href="/production/kanban" 
              className="text-xs sm:text-base font-medium text-emerald-700 hover:text-emerald-900 transition-colors text-center w-full"
            >
              Open board →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Current Queue - Full width with bottom padding for mobile */}
      <Card className="mb-4 sm:mb-0">
        <CardHeader>
          <CardTitle>Current Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-16 sm:pb-4">
          {active.slice(0, 10).map((order) => (
            <div 
              key={order.id} 
              className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
            >
              <div>
                <p className="font-medium">{order.customerName}</p>
                <p className="text-xs text-slate-500">{order.orderNumber}</p>
              </div>
              <Badge variant="default">{order.stage.replaceAll("_", " ")}</Badge>
            </div>
          ))}
          {active.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No active orders in queue</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}