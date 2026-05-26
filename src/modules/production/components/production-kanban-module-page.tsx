"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Order, ProductionStage } from "@/types/domain";
import { listenOrders, updateOrderStage } from "@/services/firestore.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatKes } from "@/lib/utils";

const columns: { key: ProductionStage; label: string }[] = [
  { key: "cutting", label: "Cutting" },
  { key: "stitching", label: "Stitching" },
  { key: "fitting", label: "Fitting" },
  { key: "finishing", label: "Finishing" },
  { key: "ready_for_pickup", label: "Ready for Pickup" },
  { key: "delivered", label: "Delivered" },
];

export function ProductionKanbanModulePage() {
  const { businessId, ready } = useBusinessContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [dragOrderId, setDragOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    return listenOrders(businessId, setOrders);
  }, [businessId, ready]);

  const grouped = useMemo(
    () =>
      columns.reduce<Record<ProductionStage, Order[]>>((acc, column) => {
        acc[column.key] = orders.filter((order) => order.stage === column.key);
        return acc;
      }, {} as Record<ProductionStage, Order[]>),
    [orders]
  );

  const onDrop = async (stage: ProductionStage) => {
    if (!dragOrderId) {
      return;
    }
    await updateOrderStage(businessId, dragOrderId, stage);
    toast.success("Production stage updated");
    setDragOrderId(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Production Board</h1>
        <p className="text-sm text-slate-500">Drag orders between stages in realtime.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-6">
        {columns.map((column) => (
          <Card key={column.key} onDragOver={(event) => event.preventDefault()} onDrop={() => onDrop(column.key)}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{column.label}</span>
                <Badge>{grouped[column.key]?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(grouped[column.key] || []).map((order) => (
                <Link
                  href={`/orders/${order.id}`}
                  key={order.id}
                  draggable
                  onDragStart={() => setDragOrderId(order.id)}
                  className={`block rounded-xl border bg-white p-3 ${order.dueDate < new Date().toISOString().slice(0, 10) && order.stage !== "delivered" ? "border-rose-300 bg-rose-50" : "border-slate-200"}`}
                >
                  <p className="text-sm font-medium text-slate-900">{order.orderNumber}</p>
                  <p className="text-xs text-slate-500">{order.customerName}</p>
                  <p className="text-xs text-slate-500">Tailor: {order.assignedTailorName || "Unassigned"}</p>
                  <p className="text-xs text-slate-500">Due {order.dueDate}</p>
                  <p className="mt-2 text-xs font-medium text-rose-600">Balance {formatKes(order.balanceAmount)}</p>
                  {order.dueDate < new Date().toISOString().slice(0, 10) && order.stage !== "delivered" && (
                    <p className="mt-1 text-xs font-medium text-rose-700">Overdue</p>
                  )}
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
