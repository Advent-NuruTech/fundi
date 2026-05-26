"use client";

import { suppliers } from "../data/suppliers.mock";

export function SuppliersPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Suppliers
        </h1>

        <p className="text-gray-500">
          Textile and tailoring suppliers
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {suppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="rounded-3xl border bg-white p-5"
          >
            <h2 className="text-2xl font-bold">
              {supplier.name}
            </h2>

            <div className="mt-5 space-y-3">
              <Info
                label="Phone"
                value={supplier.phone}
              />

              <Info
                label="Email"
                value={supplier.email}
              />

              <Info
                label="Location"
                value={supplier.location}
              />

              <Info
                label="Materials"
                value={supplier.materials}
              />
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