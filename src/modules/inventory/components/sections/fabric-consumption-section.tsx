"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StockMovement } from "@/types/domain";

export function FabricConsumptionSection({
  consumption,
  movements,
}: {
  consumption: Record<string, number>;
  movements: StockMovement[];
}) {
  const sorted = Object.entries(consumption).sort(([, a], [, b]) => b - a);
  const totalConsumed = sorted.reduce((sum, [, v]) => sum + v, 0);

  const consumptionMovements = movements.filter(
    (m) => m.movementType === "used in order"
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Total Material Used</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totalConsumed.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Materials Tracked</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{sorted.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Usage Records</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{consumptionMovements.length}</p>
          </CardContent>
        </Card>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Material Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">No usage data yet. Usage is tracked when orders are completed and materials are recorded.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Usage by Material</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sorted.map(([name, total]) => {
                const percentage = totalConsumed > 0 ? (total / totalConsumed) * 100 : 0;
                return (
                  <div key={name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-900">{name}</span>
                      <span className="text-slate-600">{total.toFixed(1)} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {consumptionMovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Usage Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {consumptionMovements.slice(0, 10).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{m.materialName}</p>
                    <p className="text-xs text-slate-500">
                      {m.reason}
                      {m.orderId && <> &middot; Order ref: {m.orderId.slice(0, 8)}</>}
                    </p>
                  </div>
                  <p className="font-semibold text-amber-600">-{Math.abs(m.quantityChange)}{m.unit ? ` ${m.unit}` : ""}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
