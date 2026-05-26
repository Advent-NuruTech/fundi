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

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>Active in Production</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-semibold">{active.length}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Overdue Deliveries</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-semibold text-rose-600">{overdue.length}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Board</CardTitle></CardHeader>
        <CardContent>
          <Link href="/production/kanban" className="text-sm font-medium text-emerald-700">Open kanban board</Link>
        </CardContent>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader><CardTitle>Current Queue</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {active.slice(0, 10).map((order) => (
            <div key={order.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{order.customerName}</p>
                <p className="text-xs text-slate-500">{order.orderNumber}</p>
              </div>
              <Badge>{order.stage.replaceAll("_", " ")}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
