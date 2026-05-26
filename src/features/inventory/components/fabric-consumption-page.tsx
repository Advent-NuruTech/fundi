"use client";

const consumptionData = [
  {
    style: "Men Suit",
    size: "M",
    fabric: "Italian Wool",
    required: "3.2m",
    wastage: "0.2m",
    estimatedCost: "KES 5,760",
  },

  {
    style: "African Dress",
    size: "XL",
    fabric: "Premium Cotton",
    required: "4.5m",
    wastage: "0.4m",
    estimatedCost: "KES 2,475",
  },
];

export function FabricConsumptionPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Fabric Consumption Engine
        </h1>

        <p className="text-gray-500">
          Tailoring fabric intelligence
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Stat title="Avg Consumption" value="3.8m" />
        <Stat title="Monthly Waste" value="82m" />
        <Stat title="Efficiency" value="91%" />
        <Stat title="Predicted Usage" value="2,480m" />
      </div>

      <div className="rounded-3xl border bg-white p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-4">Style</th>
              <th className="pb-4">Size</th>
              <th className="pb-4">Fabric</th>
              <th className="pb-4">Required</th>
              <th className="pb-4">Wastage</th>
              <th className="pb-4">Estimated Cost</th>
            </tr>
          </thead>

          <tbody>
            {consumptionData.map((item) => (
              <tr
                key={item.style}
                className="border-b"
              >
                <td className="py-4 font-medium">
                  {item.style}
                </td>

                <td className="py-4">
                  {item.size}
                </td>

                <td className="py-4">
                  {item.fabric}
                </td>

                <td className="py-4">
                  {item.required}
                </td>

                <td className="py-4">
                  {item.wastage}
                </td>

                <td className="py-4 font-semibold">
                  {item.estimatedCost}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  title,
  value,
}: any) {
  return (
    <div className="rounded-3xl border bg-white p-5">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <h2 className="mt-3 text-3xl font-bold">
        {value}
      </h2>
    </div>
  );
}