import { fabricRolls } from "../data/fabric-rolls.mock";

export function FabricRollTrackingTable() {
  return (
    <div className="rounded-3xl border bg-white p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">
          Fabric Roll Tracking
        </h2>

        <p className="text-gray-500">
          Individual roll intelligence
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-4">Roll ID</th>
              <th className="pb-4">Color</th>
              <th className="pb-4">Batch</th>
              <th className="pb-4">Total</th>
              <th className="pb-4">Remaining</th>
              <th className="pb-4">Reserved</th>
              <th className="pb-4">Warehouse</th>
              <th className="pb-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {fabricRolls.map((roll) => (
              <tr
                key={roll.rollId}
                className="border-b"
              >
                <td className="py-4 font-medium">
                  {roll.rollId}
                </td>

                <td className="py-4">
                  {roll.color}
                </td>

                <td className="py-4">
                  {roll.batch}
                </td>

                <td className="py-4">
                  {roll.totalLength}m
                </td>

                <td className="py-4">
                  {roll.remainingLength}m
                </td>

                <td className="py-4">
                  {roll.reservedLength}m
                </td>

                <td className="py-4">
                  {roll.warehouse}
                </td>

                <td className="py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-sm ${
                      roll.status === "Low Stock"
                        ? "bg-red-100 text-red-600"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {roll.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}