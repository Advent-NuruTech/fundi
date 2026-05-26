"use client";

import { useState } from "react";
import Link from "next/link";
import { orders } from "@/features/orders/data/orders.mock";
import type { WorkflowStage, OrderStatus } from "@/types";

interface KanbanColumn {
  id: WorkflowStage;
  title: string;
  statuses: OrderStatus[];
  color: string;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: "cutting",
    title: "Cutting",
    statuses: ["New", "Cutting"],
    color: "bg-orange-500",
  },
  {
    id: "stitching",
    title: "Stitching",
    statuses: ["In Progress", "Sewing"],
    color: "bg-blue-500",
  },
  {
    id: "fitting",
    title: "Fitting",
    statuses: ["Fitting"],
    color: "bg-purple-500",
  },
  {
    id: "finishing",
    title: "Finishing",
    statuses: ["Finishing"],
    color: "bg-pink-500",
  },
  {
    id: "finished",
    title: "Finished",
    statuses: ["Ready for Pickup", "Waiting for Customer Pickup"],
    color: "bg-green-500",
  },
  {
    id: "delivered",
    title: "Delivered",
    statuses: ["Completed & Picked", "Delivered"],
    color: "bg-neutral-400",
  },
];

export function KanbanBoard() {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const getOrdersForColumn = (column: KanbanColumn) => {
    return orders.filter((o) => column.statuses.includes(o.status));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Production Board</h1>
        <p className="text-gray-500">
          Drag and drop to update workflow stages
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6">
        {COLUMNS.map((column) => {
          const columnOrders = getOrdersForColumn(column);
          return (
            <div
              key={column.id}
              className="min-w-[280px] flex-shrink-0"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${column.color}`} />
                <h3 className="font-semibold">{column.title}</h3>
                <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium">
                  {columnOrders.length}
                </span>
              </div>

              <div className="space-y-3">
                {columnOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="block rounded-2xl border bg-white p-4 transition hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-bold text-sm">{order.id}</p>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">
                        {order.stage}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium">
                      {order.customerName}
                    </p>
                    <p className="text-xs text-gray-500">
                      Tailor: {order.employee}
                    </p>

                    {order.images?.[0] && (
                      <img
                        src={order.images[0]}
                        alt=""
                        className="mt-3 h-20 w-full rounded-xl object-cover"
                      />
                    )}

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        KES {order.total}
                      </span>
                      <span
                        className={`font-medium ${
                          order.balanceDue > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {order.balanceDue > 0
                          ? `KES ${order.balanceDue} due`
                          : "Paid"}
                      </span>
                    </div>
                  </Link>
                ))}

                {columnOrders.length === 0 && (
                  <div className="flex items-center justify-center rounded-2xl border-2 border-dashed p-8 text-sm text-gray-400">
                    No orders
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
