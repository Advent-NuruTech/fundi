"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import type { Order } from "@/types/domain";
import { listenOrders, dueTodayOrders } from "@/services/firestore.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { DataTable } from "@/modules/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatKes } from "@/lib/utils";
import { usePermissions } from "@/modules/shared/use-permissions";

export function OrdersModulePage() {
  const { businessId, ready, user } = useBusinessContext();
  const permissions = usePermissions();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    return listenOrders(businessId, setOrders);
  }, [businessId, ready]);

  const visibleOrders = useMemo(
    () =>
      permissions.assignedOnlyOrders && user
        ? orders.filter((order) => order.assignedTailorId === user.uid)
        : orders,
    [orders, permissions.assignedOnlyOrders, user]
  );

  const urgent = useMemo(() => dueTodayOrders(visibleOrders), [visibleOrders]);

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        header: "Order",
        cell: ({ row }) => <Link className="font-medium text-emerald-700" href={`/orders/${row.original.id}`}>{row.original.orderNumber}</Link>,
      },
      { header: "Customer", cell: ({ row }) => row.original.customerName },
      { header: "Stage", cell: ({ row }) => <Badge>{row.original.stage.replaceAll("_", " ")}</Badge> },
      { header: "Due", cell: ({ row }) => row.original.dueDate },
      { header: "Balance", cell: ({ row }) => formatKes(row.original.balanceAmount) },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-5"><p className="text-xs text-slate-500">Active orders</p><p className="text-2xl font-semibold">{visibleOrders.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-slate-500">Urgent deliveries</p><p className="text-2xl font-semibold text-amber-600">{urgent.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5">{permissions.canWriteOrders ? <Link href="/orders/new" className="text-sm font-medium text-emerald-700">+ New order</Link> : <p className="text-sm text-slate-500">Read only</p>}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Orders Workflow</CardTitle></CardHeader>
        <CardContent><DataTable columns={columns} data={visibleOrders} /></CardContent>
      </Card>
    </div>
  );
}
