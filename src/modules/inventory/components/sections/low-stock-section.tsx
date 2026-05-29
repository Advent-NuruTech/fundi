"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { InventoryMaterial } from "@/types/domain";

export function LowStockSection({
  lowStock,
  materials,
}: {
  lowStock: InventoryMaterial[];
  materials: InventoryMaterial[];
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const healthyStock = useMemo(() => {
    return materials.filter(
      (material) =>
        material.quantity > material.reorderLevel
    );
  }, [materials]);

  const outOfStock = useMemo(() => {
    return materials.filter(
      (material) => material.quantity <= 0
    );
  }, [materials]);

  const filteredLowStock = useMemo(() => {
    const query = searchQuery
      .toLowerCase()
      .trim();

    if (!query) return lowStock;

    return lowStock.filter((material) => {
      return (
        material.name
          ?.toLowerCase()
          .includes(query) ||
        material.categoryName
          ?.toLowerCase()
          .includes(query) ||
        material.unitName
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [lowStock, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Low Stock Items
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-600">
              {lowStock.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Materials below reorder level
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Out Of Stock
            </p>

            <p className="mt-2 text-3xl font-bold text-rose-600">
              {outOfStock.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Materials completely finished
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Healthy Stock
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {healthyStock.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Materials stocked correctly
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total Materials
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {materials.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              All tracked inventory materials
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">
                Low Stock Report
              </CardTitle>

              <p className="mt-1 text-sm text-slate-500">
                Materials that need urgent restocking
              </p>
            </div>

            <Input
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              className="w-full lg:w-[260px]"
            />
          </div>
        </CardHeader>

        <CardContent>
          {filteredLowStock.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
              <p className="text-base font-medium text-emerald-700">
                Inventory Status Healthy
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {searchQuery
                  ? "No matching low stock materials found."
                  : "All materials are sufficiently stocked."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredLowStock.map((material) => {
                const deficit =
                  material.reorderLevel -
                  material.quantity;

                const isOut =
                  material.quantity <= 0;

                return (
                  <div
                    key={material.id}
                    className={`rounded-2xl border p-4 shadow-sm transition-all ${
                      isOut
                        ? "border-rose-200 bg-rose-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex h-full flex-col justify-between gap-4">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3
                              className={`text-base font-semibold ${
                                isOut
                                  ? "text-rose-900"
                                  : "text-amber-900"
                              }`}
                            >
                              {material.name}
                            </h3>

                            <p
                              className={`mt-1 text-sm ${
                                isOut
                                  ? "text-rose-700"
                                  : "text-amber-700"
                              }`}
                            >
                              {material.categoryName ||
                                "Uncategorized Material"}
                            </p>
                          </div>

                          <Badge
                            variant={
                              isOut
                                ? "destructive"
                                : "warning"
                            }
                            className="rounded-full"
                          >
                            {isOut
                              ? "Out Of Stock"
                              : "Low Stock"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-white/70 p-3">
                            <p className="text-xs text-slate-500">
                              Current Stock
                            </p>

                            <p
                              className={`mt-1 text-sm font-semibold ${
                                isOut
                                  ? "text-rose-700"
                                  : "text-amber-700"
                              }`}
                            >
                              {material.quantity}{" "}
                              {material.unitName}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white/70 p-3">
                            <p className="text-xs text-slate-500">
                              Reorder Level
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {material.reorderLevel}{" "}
                              {material.unitName}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl bg-white/70 p-3">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-slate-500">
                              Stock Shortage
                            </span>

                            <span
                              className={`text-sm font-semibold ${
                                isOut
                                  ? "text-rose-700"
                                  : "text-amber-700"
                              }`}
                            >
                              {deficit}{" "}
                              {material.unitName} needed
                            </span>
                          </div>
                        </div>

                        <div
                          className={`rounded-xl px-3 py-2 text-sm ${
                            isOut
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isOut
                            ? "Immediate purchase required to avoid production delays."
                            : "Restocking recommended soon to maintain healthy inventory levels."}
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <Link
                          href={`/inventory/materials/${material.id}`}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            View Material
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}