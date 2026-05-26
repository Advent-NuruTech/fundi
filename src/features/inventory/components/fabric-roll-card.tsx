"use client";

import Image from "next/image";
import Link from "next/link";
export function FabricRollCard({ roll }: any) {
  return (
    <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="relative h-64">
        <Image
          src={roll.image}
          alt={roll.material}
          fill
          className="object-cover"
        />
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {roll.material}
            </h2>

            <p className="text-sm text-gray-500">
              {roll.rollId}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-sm ${
              roll.status === "Low Stock"
                ? "bg-red-100 text-red-600"
                : "bg-green-100 text-green-700"
            }`}
          >
            {roll.status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="h-7 w-7 rounded-full border"
            style={{
              background: roll.color.toLowerCase(),
            }}
          />

          <p className="font-medium">
            {roll.color}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Supplier" value={roll.supplier} />
          <Info label="Width" value={roll.width} />
          <Info label="GSM" value={`${roll.gsm}`} />
          <Info
            label="Warehouse"
            value={roll.warehouse}
          />

          <Info
            label="Total Roll"
            value={`${roll.totalLength}m`}
          />

          <Info
            label="Remaining"
            value={`${roll.remainingLength}m`}
          />
        </div>

        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span>Roll Usage</span>

            <span>
              {Math.round(
                (roll.remainingLength /
                  roll.totalLength) *
                  100
              )}
              %
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-black"
              style={{
                width: `${
                  (roll.remainingLength /
                    roll.totalLength) *
                  100
                }%`,
              }}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Batch
              </p>

              <p className="font-semibold">
                {roll.batch}
              </p>
            </div>

            <Link
              href={`/inventory/fabric-rolls/${roll.rollId}`}
              className="rounded-xl bg-black px-4 py-2 text-white hover:bg-gray-800 transition-colors"
            >
              Track Roll
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-gray-500">
        {label}
      </p>

      <p className="font-semibold">
        {value}
      </p>
    </div>
  );
}