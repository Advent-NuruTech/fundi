"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKes } from "@/lib/utils";
import type { InventoryMaterial, Supplier, StockMovement, PurchaseOrder } from "@/types/domain";

interface OverviewSectionProps {
  materials: InventoryMaterial[];
  movements: StockMovement[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  lowStock: InventoryMaterial[];
  stockValue: number;
  loading: boolean;
}

export function OverviewSection({
  materials,
  movements,
  suppliers,
  purchaseOrders,
  lowStock,
  stockValue,
  loading,
}: OverviewSectionProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const consumptionMap = movements
    .filter((m) => m.movementType === "used in order")
    .reduce<Record<string, number>>((acc, m) => {
      const key = m.materialName;
      acc[key] = (acc[key] ?? 0) + Math.abs(m.quantityChange);
      return acc;
    }, {});

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Total Materials</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{materials.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Stock Value</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatKes(stockValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Suppliers</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{suppliers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Categories</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{new Set(materials.map((m) => m.categoryId)).size}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <p className="mb-3 text-sm font-semibold text-slate-900">Low Stock Alerts</p>
            {lowStock.length === 0 ? (
              <p className="text-sm text-slate-500">All materials are well stocked.</p>
            ) : (
              <div className="space-y-2">
                {lowStock.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                    <span className="font-medium text-amber-900">{m.name}</span>
                    <Badge variant="warning">
                      {m.quantity} {m.unitName}
                    </Badge>
                  </div>
                ))}
                {lowStock.length > 5 && (
                  <p className="text-xs text-slate-500">+{lowStock.length - 5} more low stock items</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="mb-3 text-sm font-semibold text-slate-900">Recent Movements</p>
            {movements.length === 0 ? (
              <p className="text-sm text-slate-500">No stock movements yet.</p>
            ) : (
              <div className="space-y-2">
                {movements.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{m.materialName}</p>
                      <p className="text-xs text-slate-500">{m.reason}</p>
                    </div>
                    <Badge variant={m.movementType === "stock in" ? "success" : m.movementType === "used in order" ? "warning" : "default"}>
                      {m.movementType === "stock in" ? "+" : ""}{m.quantityChange} {m.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <p className="mb-3 text-sm font-semibold text-slate-900">Pending Purchase Orders</p>
            {purchaseOrders.filter((po) => po.status === "pending").length === 0 ? (
              <p className="text-sm text-slate-500">No pending purchase orders.</p>
            ) : (
              <div className="space-y-2">
                {purchaseOrders
                  .filter((po) => po.status === "pending")
                  .slice(0, 5)
                  .map((po) => (
                    <div key={po.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{po.materialName}</p>
                        <p className="text-xs text-slate-500">{po.supplierName}</p>
                      </div>
                      <p className="text-slate-700">
                        {po.quantity} {po.unit}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="mb-3 text-sm font-semibold text-slate-900">Material Consumption</p>
            {Object.keys(consumptionMap).length === 0 ? (
              <p className="text-sm text-slate-500">No consumption data yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(consumptionMap)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([name, total]) => (
                    <div key={name} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                      <span className="font-medium">{name}</span>
                      <span className="text-slate-700">{total.toFixed(1)} used</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
