"use client";

const mappings = [
  {
    style: "Men Suit",
    chest: "40",
    waist: "34",
    shoulder: "18",
    fabric: "3.2m",
  },

  {
    style: "African Dress",
    chest: "44",
    waist: "38",
    shoulder: "20",
    fabric: "4.5m",
  },
];

export function MeasurementMappingPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Tailoring Measurement Mapping
        </h1>

        <p className="text-gray-500">
          Measurement-based fabric estimation
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Metric
          title="Measurement Profiles"
          value="1,284"
        />

        <Metric
          title="Avg Fabric Accuracy"
          value="94%"
        />

        <Metric
          title="Tailoring Styles"
          value="82"
        />

        <Metric
          title="Auto Calculations"
          value="12K"
        />
      </div>

      <div className="rounded-3xl border bg-white p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-4">Style</th>
              <th className="pb-4">Chest</th>
              <th className="pb-4">Waist</th>
              <th className="pb-4">Shoulder</th>
              <th className="pb-4">Estimated Fabric</th>
            </tr>
          </thead>

          <tbody>
            {mappings.map((map) => (
              <tr
                key={map.style}
                className="border-b"
              >
                <td className="py-4 font-medium">
                  {map.style}
                </td>

                <td className="py-4">
                  {map.chest}
                  "
                </td>

                <td className="py-4">
                  {map.waist}
                  "
                </td>

                <td className="py-4">
                  {map.shoulder}
                  "
                </td>

                <td className="py-4 font-semibold">
                  {map.fabric}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({
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