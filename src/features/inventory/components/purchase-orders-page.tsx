"use client";

import { purchaseOrders } from "../data/purchase-orders.mock";

export function PurchaseOrdersPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Purchase Orders
          </h1>

          <p className="text-gray-500">
            Supplier procurement management
          </p>
        </div>

        <button className="rounded-2xl bg-black px-5 py-3 text-white">
          New Purchase Order
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {purchaseOrders.map((po) => (
          <div
            key={po.id}
            className="rounded-3xl border bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {po.id}
              </h2>

              <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-700">
                {po.status}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <Info
                label="Supplier"
                value={po.supplier}
              />

              <Info
                label="Material"
                value={po.material}
              />

              <Info
                label="Quantity"
                value={po.quantity}
              />

              <Info
                label="Expected Date"
                value={po.expectedDate}
              />
            </div>

            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm text-gray-500">
                Total Cost
              </h3>

              <p className="text-2xl font-bold">
                KES {po.total}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: any) {
  return (
    <div>
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="font-semibold">
        {value}
      </p>
    </div>
  );
}