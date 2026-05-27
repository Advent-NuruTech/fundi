"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKes } from "@/lib/utils";
import type { InventoryMaterial } from "@/types/domain";

export function LowStockSection({
  lowStock,
  materials,
}: {
  lowStock: InventoryMaterial[];
  materials: InventoryMaterial[];
}) {
  const healthy = materials.filter((m) => m.quantity > m.reorderLevel);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Low Stock Items</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">{lowStock.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Healthy Stock</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">{healthy.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Total Materials</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{materials.length}</p>
          </CardContent>
        </Card>
      </div>

      {lowStock.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-slate-500">All materials are well stocked. No alerts.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Items Below Reorder Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStock.map((m) => {
                const deficit = m.reorderLevel - m.quantity;
                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-amber-900">{m.name}</p>
                      <p className="text-xs text-amber-700 capitalize">{m.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-amber-800">
                        Stock: <span className="font-semibold">{m.quantity} {m.unit}</span>
                      </p>
                      <p className="text-xs text-amber-600">
                        Reorder at: {m.reorderLevel} &middot; Deficit: {deficit}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="warning">Low Stock</Badge>
                      <Link href={`/inventory/materials/${m.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
