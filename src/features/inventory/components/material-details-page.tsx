"use client";

import Image from "next/image";
import { inventoryMaterials } from "../data/inventory.mock";
import { FabricRollTrackingTable } from "./fabric-roll-tracking-table";

export function MaterialDetailsPage() {
  const material = inventoryMaterials[0];

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="relative h-[500px] overflow-hidden rounded-3xl border">
          <Image
            src={material.image}
            alt={material.name}
            fill
            className="object-cover"
          />
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold">
                {material.name}
              </h1>

              <span className="rounded-full bg-gray-100 px-4 py-1 text-sm">
                {material.category}
              </span>
            </div>

            <p className="mt-2 text-gray-500">
              Material ID: {material.id}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-2xl border bg-white p-5">
            <InfoItem
              label="Width"
              value={material.width}
            />

            <InfoItem
              label="GSM"
              value={`${material.gsm}`}
            />

            <InfoItem
              label="Supplier"
              value={material.supplier}
            />

            <InfoItem
              label="Stock"
              value={`${material.availableStock}m`}
            />

            <InfoItem
              label="Reserved"
              value={`${material.reservedStock}m`}
            />

            <InfoItem
              label="Warehouse"
              value={material.location}
            />
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 text-xl font-semibold">
              Color Variants
            </h2>

            <div className="flex flex-wrap gap-4">
              {material.colors.map((color: any) => (
                <div
                  key={color.name}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <div
                    className="h-8 w-8 rounded-full border"
                    style={{
                      backgroundColor: color.hex,
                    }}
                  />

                  <div>
                    <p className="font-medium">
                      {color.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      {color.stock}m available
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 text-xl font-semibold">
              Tailoring Sizes Supported
            </h2>

            <div className="flex flex-wrap gap-3">
              {material.sizes.map((size: string) => (
                <div
                  key={size}
                  className="rounded-xl bg-black px-4 py-2 text-white"
                >
                  {size}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-gray-500">
                Cost Price
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                KES {material.costPrice}/m
              </h2>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-gray-500">
                Selling Price
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                KES {material.sellingPrice}/m
              </h2>
            </div>
          </div>
        </div>
      </div>

      <FabricRollTrackingTable />
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold">
        {value}
      </p>
    </div>
  );
}