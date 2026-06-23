"use client";

import Link from "next/link";
import { useMemo } from "react";
import { TrendingUp, Zap, PackageCheck, AlertTriangle, ArrowDownCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKes } from "@/lib/utils";
import { useBusinessType } from "@/hooks/useBusinessType";
import {
  coverLabel,
  reorderPoHref,
  type InventoryInsight,
  type StockHealth,
} from "@/lib/inventory-intelligence";

const STATUS_STYLES: Record<StockHealth, { label: string; badge: "danger" | "warning" | "success" | "default"; row: string }> = {
  out: { label: "Out of stock", badge: "danger", row: "border-rose-200 bg-rose-50" },
  critical: { label: "Runs out soon", badge: "danger", row: "border-rose-200 bg-rose-50/60" },
  low: { label: "Below reorder", badge: "warning", row: "border-amber-200 bg-amber-50" },
  healthy: { label: "Healthy", badge: "success", row: "border-slate-200 bg-white" },
  overstocked: { label: "Over-stocked", badge: "default", row: "border-slate-200 bg-slate-50" },
};

export function SmartReorderSection({
  insights,
  reorderList,
}: {
  insights: InventoryInsight[];
  reorderList: InventoryInsight[];
}) {
  const biz = useBusinessType();

  const fastMovers = useMemo(
    () => insights.filter((i) => i.isFastMover).slice(0, 6),
    [insights]
  );
  const totalReorderCost = useMemo(
    () => reorderList.reduce((sum, i) => sum + i.suggestedReorderCost, 0),
    [reorderList]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Reorder now</p>
            <p className="mt-2 text-3xl font-bold text-rose-600">{reorderList.length}</p>
            <p className="mt-1 text-xs text-slate-500">
              {biz.terms.materials} predicted to run out
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estimated restock cost</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{formatKes(totalReorderCost)}</p>
            <p className="mt-1 text-xs text-slate-500">To cover suggested quantities</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fast movers</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{fastMovers.length}</p>
            <p className="mt-1 text-xs text-slate-500">Top sellers over the last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-xl font-semibold">Smart reorder suggestions</CardTitle>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Based on how fast each item has been moving in the last 30 days — not just a fixed reorder level.
          </p>
        </CardHeader>
        <CardContent>
          {reorderList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
              <PackageCheck className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-2 text-base font-medium text-emerald-700">Nothing to reorder right now</p>
              <p className="mt-1 text-sm text-slate-500">
                Every item has enough cover for the weeks ahead.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reorderList.map((insight) => {
                const style = STATUS_STYLES[insight.status];
                return (
                  <div
                    key={insight.material.id}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${style.row}`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">{insight.material.name}</h3>
                        <Badge variant={style.badge} className="rounded-full">
                          {insight.status === "out" || insight.status === "critical" ? (
                            <AlertTriangle className="mr-1 h-3 w-3" />
                          ) : (
                            <ArrowDownCircle className="mr-1 h-3 w-3" />
                          )}
                          {style.label}
                        </Badge>
                        {insight.isFastMover && (
                          <Badge variant="success" className="rounded-full">
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Fast mover
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {insight.material.quantity} {insight.material.unitName} in stock ·{" "}
                        <span className="font-medium">{coverLabel(insight.daysOfCover)}</span>
                        {insight.avgDailyUsage > 0 && (
                          <> · ~{insight.avgDailyUsage.toFixed(1)} {insight.material.unitName}/day</>
                        )}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Suggested order</p>
                        <p className="text-lg font-bold text-slate-900">
                          {insight.suggestedReorderQty} {insight.material.unitName}
                        </p>
                        {insight.suggestedReorderCost > 0 && (
                          <p className="text-xs text-slate-500">≈ {formatKes(insight.suggestedReorderCost)}</p>
                        )}
                      </div>
                      <Link href={reorderPoHref(insight)}>
                        <Button size="sm">Order now</Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {fastMovers.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-xl font-semibold">Fast movers</CardTitle>
            </div>
            <p className="mt-1 text-sm text-slate-500">Your best sellers — keep these well stocked.</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fastMovers.map((insight) => (
                <div key={insight.material.id} className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <p className="font-semibold text-slate-900">{insight.material.name}</p>
                  <p className="mt-1 text-sm text-emerald-700">
                    ~{insight.avgDailyUsage.toFixed(1)} {insight.material.unitName}/day
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{coverLabel(insight.daysOfCover)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
