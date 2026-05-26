"use client";

import Image from "next/image";
import { fabricRolls } from "../data/fabric-rolls.mock";

export function FabricRollDetailsPage() {
  const roll = fabricRolls[0];

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="relative h-[500px] overflow-hidden rounded-3xl border">
          <Image
            src={roll.image}
            alt={roll.material}
            fill
            className="object-cover"
          />
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold">
                {roll.material}
              </h1>

              <span
                className={`rounded-full px-4 py-1 text-sm ${
                  roll.status === "Low Stock"
                    ? "bg-red-100 text-red-600"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {roll.status}
              </span>
            </div>

            <p className="mt-2 text-gray-500">
              Roll ID: {roll.rollId}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-2xl border bg-white p-5">
            <Info
              label="Supplier"
              value={roll.supplier}
            />

            <Info
              label="Color"
              value={roll.color}
            />

            <Info
              label="Width"
              value={roll.width}
            />

            <Info
              label="GSM"
              value={`${roll.gsm}`}
            />

            <Info
              label="Warehouse"
              value={roll.warehouse}
            />

            <Info
              label="Batch"
              value={roll.batch}
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

          <div className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 text-xl font-semibold">
              Roll Consumption
            </h2>

            <div className="mb-3 flex justify-between">
              <span>Remaining Fabric</span>

              <span className="font-semibold">
                {Math.round(
                  (roll.remainingLength /
                    roll.totalLength) *
                    100
                )}
                %
              </span>
            </div>

            <div className="h-4 overflow-hidden rounded-full bg-gray-200">
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

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-gray-500">
                Reserved
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                {roll.reservedLength}m
              </h2>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-gray-500">
                Used
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                {roll.totalLength -
                  roll.remainingLength}
                m
              </h2>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-gray-500">
                Waste
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                2m
              </h2>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-6">
        <h2 className="mb-6 text-2xl font-bold">
          Roll Movement History
        </h2>

        <div className="space-y-4">
          <Movement
            title="Tailoring Order Reserved"
            desc="12m reserved for Suit Production"
            date="2026-05-20"
          />

          <Movement
            title="Fabric Cut"
            desc="8m used for customer tailoring"
            date="2026-05-18"
          />

          <Movement
            title="Warehouse Transfer"
            desc="Moved to Rack A-2"
            date="2026-05-10"
          />
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
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold">
        {value}
      </p>
    </div>
  );
}

function Movement({
  title,
  desc,
  date,
}: any) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">
            {title}
          </h3>

          <p className="text-sm text-gray-500">
            {desc}
          </p>
        </div>

        <span className="text-sm text-gray-400">
          {date}
        </span>
      </div>
    </div>
  );
}