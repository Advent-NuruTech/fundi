export function InventoryStats() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="rounded-2xl border bg-white p-5">
        <p className="text-sm text-gray-500">
          Total Materials
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          248
        </h2>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <p className="text-sm text-gray-500">
          Low Stock
        </p>

        <h2 className="mt-2 text-3xl font-bold text-red-500">
          18
        </h2>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <p className="text-sm text-gray-500">
          Suppliers
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          42
        </h2>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <p className="text-sm text-gray-500">
          Fabric Rolls
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          682
        </h2>
      </div>
    </div>
  );
}