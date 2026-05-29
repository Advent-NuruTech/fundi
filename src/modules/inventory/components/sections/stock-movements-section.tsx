"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import type { StockMovement } from "@/types/domain";

function movementColor(
  type: string
): "success" | "warning" | "default" | "danger" {
  const lower = type.toLowerCase();

  if (
    lower.includes("stock") ||
    lower.includes("received")
  ) {
    return "success";
  }

  if (
    lower.includes("used") ||
    lower.includes("consum")
  ) {
    return "warning";
  }

  if (
    lower.includes("waste") ||
    lower.includes("loss")
  ) {
    return "danger";
  }

  return "default";
}

function movementTitle(type: string): string {
  const lower = type.toLowerCase();

  if (
    lower === "stock in" ||
    lower === "stock_in"
  ) {
    return "Stock Added";
  }

  if (
    lower === "used in order" ||
    lower === "consumption"
  ) {
    return "Material Used";
  }

  if (lower === "adjustment") {
    return "Stock Adjusted";
  }

  if (lower === "wastage") {
    return "Material Wasted";
  }

  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

function movementDescription(
  movement: StockMovement
) {
  if (movement.quantityChange > 0) {
    return `${movement.quantityChange} ${movement.unit} added to stock`;
  }

  return `${Math.abs(
    movement.quantityChange
  )} ${movement.unit} removed from stock`;
}

function formatFirestoreDate(timestamp: any) {
  if (!timestamp) return "--";

  try {
    const date =
      typeof timestamp?.toDate === "function"
        ? timestamp.toDate()
        : new Date(timestamp);

    return date.toLocaleString("en-KE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--";
  }
}

export function StockMovementsSection({
  movements,
}: {
  movements: StockMovement[];
}) {
  const [searchQuery, setSearchQuery] =
    useState("");

  const filteredMovements = useMemo(() => {
    const query = searchQuery
      .toLowerCase()
      .trim();

    if (!query) return movements;

    return movements.filter((movement) => {
      return (
        movement.materialName
          ?.toLowerCase()
          .includes(query) ||
        movement.reason
          ?.toLowerCase()
          .includes(query) ||
        movement.createdByName
          ?.toLowerCase()
          .includes(query) ||
        movementTitle(
          movement.movementType
        )
          .toLowerCase()
          .includes(query)
      );
    });
  }, [movements, searchQuery]);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl font-semibold">
              Stock Movement Report
            </CardTitle>

            <Badge
              variant="secondary"
              className="rounded-full px-3 py-1"
            >
              {movements.length} Activity
              {movements.length !== 1
                ? " Logs"
                : " Log"}
            </Badge>
          </div>

          <Input
            placeholder="Search stock activity..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            className="w-full lg:w-[260px]"
          />
        </div>
      </CardHeader>

      <CardContent>
        {filteredMovements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
            <p className="text-sm text-slate-500">
              {searchQuery
                ? "No stock records found."
                : "No stock activity recorded yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredMovements.map(
              (movement) => {
                const isPositive =
                  movement.quantityChange > 0;

                return (
                  <div
                    key={movement.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300"
                  >
                    <div className="flex h-full flex-col justify-between gap-4">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-slate-900">
                              {
                                movement.materialName
                              }
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              {movementDescription(
                                movement
                              )}
                            </p>
                          </div>

                          <Badge
                            variant={movementColor(
                              movement.movementType
                            )}
                            className="rounded-full"
                          >
                            {movementTitle(
                              movement.movementType
                            )}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-xs text-slate-500">
                              Quantity Changed
                            </p>

                            <p
                              className={`mt-1 text-sm font-semibold ${
                                isPositive
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                              }`}
                            >
                              {isPositive
                                ? "+"
                                : ""}
                              {
                                movement.quantityChange
                              }{" "}
                              {movement.unit}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-xs text-slate-500">
                              Updated By
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {movement.createdByName ||
                                "Unknown User"}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="flex flex-col gap-3 text-sm">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-500">
                                Change Reason
                              </span>

                              <span className="text-right font-medium text-slate-900">
                                {movement.reason ||
                                  "No reason provided"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-500">
                                Date & Time
                              </span>

                              <span className="text-right font-medium text-slate-900">
                                {formatFirestoreDate(
                                  movement.createdAt
                                )}
                              </span>
                            </div>

                            {movement.orderId && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-500">
                                  Related Order
                                </span>

                                <span className="font-medium text-blue-700">
                                  #
                                  {movement.orderId.slice(
                                    0,
                                    8
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}