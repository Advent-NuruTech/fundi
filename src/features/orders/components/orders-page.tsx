"use client";

import Link from "next/link";
import { orders } from "../data/orders.mock";

export function OrdersPage() {
  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-gray-500">
          Active production and delivery tracking
        </p>
      </div>

      {/* GRID */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="rounded-3xl border bg-white p-5 hover:shadow transition"
          >
            {/* TOP */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-lg">
                  {order.customerName}
                </h2>
                <p className="text-sm text-gray-500">
                  {order.id}
                </p>
              </div>

              <StatusBadge status={order.status} />
            </div>

            {/* SERVING (TAILOR) */}
            <div className="mt-3">
              <p className="text-xs text-gray-400">
                Serving Tailor
              </p>
              <p className="font-semibold">
                {order.employee}
              </p>
            </div>

            {/* IMAGE (ONLY ONE) */}
            <div className="mt-4">
              <img
                src={order.images?.[0]}
                alt="order"
                className="h-32 w-full rounded-xl object-cover"
              />
            </div>

            {/* FOOTER INFO */}
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                📅 {order.collectionDate}
              </span>

              <span className="font-semibold text-red-600">
                KES {order.balanceDue} due
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ================= UI HELPERS ================= */

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "Completed"
      ? "bg-green-600"
      : status === "Ready for Pickup"
      ? "bg-blue-600"
      : status === "Waiting for Customer Pickup"
      ? "bg-purple-600"
      : "bg-black";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs text-white ${color}`}
    >
      {status}
    </span>
  );
}