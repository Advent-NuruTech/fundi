"use client";

import { stockMovements } from "../data/stock-movements.mock";

export function StockMovementsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Stock Movements
        </h1>

        <p className="text-gray-500">
          Complete inventory audit trail
        </p>
      </div>

      <div className="rounded-3xl border bg-white p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-4">Movement ID</th>
              <th className="pb-4">Material</th>
              <th className="pb-4">Type</th>
              <th className="pb-4">Quantity</th>
              <th className="pb-4">Warehouse</th>
              <th className="pb-4">Date</th>
              <th className="pb-4">Operator</th>
            </tr>
          </thead>

          <tbody>
            {stockMovements.map((movement) => (
              <tr
                key={movement.id}
                className="border-b"
              >
                <td className="py-4 font-medium">
                  {movement.id}
                </td>

                <td className="py-4">
                  {movement.material}
                </td>

                <td className="py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-sm ${
                      movement.type === "OUT"
                        ? "bg-red-100 text-red-600"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {movement.type}
                  </span>
                </td>

                <td className="py-4">
                  {movement.quantity}
                </td>

                <td className="py-4">
                  {movement.warehouse}
                </td>

                <td className="py-4">
                  {movement.date}
                </td>

                <td className="py-4">
                  {movement.operator}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}