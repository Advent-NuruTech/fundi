"use client";

const cuts = [
  {
    id: "CUT-001",
    tailor: "Peter Otieno",
    material: "Italian Wool",
    used: "3.2m",
    waste: "0.2m",
    style: "Men Suit",
    date: "2026-05-25",
  },

  {
    id: "CUT-002",
    tailor: "Sarah Atieno",
    material: "Premium Cotton",
    used: "4.5m",
    waste: "0.4m",
    style: "African Dress",
    date: "2026-05-24",
  },
];

export function CuttingTrackerPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Production Cutting Tracker
        </h1>

        <p className="text-gray-500">
          Tailoring production tracking
        </p>
      </div>

      <div className="rounded-3xl border bg-white p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-4">Cut ID</th>
              <th className="pb-4">Tailor</th>
              <th className="pb-4">Material</th>
              <th className="pb-4">Used</th>
              <th className="pb-4">Waste</th>
              <th className="pb-4">Style</th>
              <th className="pb-4">Date</th>
            </tr>
          </thead>

          <tbody>
            {cuts.map((cut) => (
              <tr
                key={cut.id}
                className="border-b"
              >
                <td className="py-4 font-medium">
                  {cut.id}
                </td>

                <td className="py-4">
                  {cut.tailor}
                </td>

                <td className="py-4">
                  {cut.material}
                </td>

                <td className="py-4">
                  {cut.used}
                </td>

                <td className="py-4 text-red-600">
                  {cut.waste}
                </td>

                <td className="py-4">
                  {cut.style}
                </td>

                <td className="py-4">
                  {cut.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}