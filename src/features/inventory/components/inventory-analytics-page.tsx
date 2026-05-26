"use client";

export function InventoryAnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Inventory Analytics
        </h1>

        <p className="text-gray-500">
          Tailoring inventory intelligence
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Stat
          title="Monthly Consumption"
          value="2,430m"
        />

        <Stat
          title="Low Stock Items"
          value="18"
        />

        <Stat
          title="Warehouse Utilization"
          value="82%"
        />

        <Stat
          title="Inventory Value"
          value="KES 12.4M"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="mb-4 text-xl font-bold">
            Most Used Fabrics
          </h2>

          <div className="space-y-4">
            <Bar
              label="Premium Cotton"
              value={90}
            />

            <Bar
              label="Italian Wool"
              value={70}
            />

            <Bar
              label="Silk Fabric"
              value={55}
            />
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6">
          <h2 className="mb-4 text-xl font-bold">
            Stock Health
          </h2>

          <div className="space-y-4">
            <Bar
              label="Healthy"
              value={85}
            />

            <Bar
              label="Low Stock"
              value={20}
            />

            <Bar
              label="Critical"
              value={8}
            />
          </div>
        </div>
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

function Bar({
  label,
  value,
}: any) {
  return (
    <div>
      <div className="mb-2 flex justify-between">
        <span>{label}</span>

        <span>{value}%</span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-black"
          style={{
            width: `${value}%`,
          }}
        />
      </div>
    </div>
  );
}