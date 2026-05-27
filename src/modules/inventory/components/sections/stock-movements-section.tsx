"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StockMovement } from "@/types/domain";

const movementColor: Record<StockMovement["movementType"], "success" | "warning" | "default" | "danger"> = {
  stock_in: "success",
  consumption: "warning",
  wastage: "danger",
  adjustment: "default",
};

const movementLabel: Record<StockMovement["movementType"], string> = {
  stock_in: "Stock In",
  consumption: "Consumption",
  wastage: "Wastage",
  adjustment: "Adjustment",
};

export function StockMovementsSection({
  movements,
}: {
  movements: StockMovement[];
}) {
  if (movements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Movements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No stock movements recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Movements</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {movements.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900">{m.materialName}</p>
                  <Badge variant={movementColor[m.movementType]}>
                    {movementLabel[m.movementType]}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {m.reason}
                  {m.orderId && <> &middot; Order: {m.orderId.slice(0, 8)}</>}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${m.quantityChange > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {m.quantityChange > 0 ? "+" : ""}{m.quantityChange} {m.unit}
                </p>
                <p className="text-xs text-slate-400">{m.createdByName}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
