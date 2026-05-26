"use client";

import { useParams } from "next/navigation";
import { orders } from "../data/orders.mock";

export function OrderDetailPage() {
  const { id } = useParams();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return <div className="p-6">Order not found</div>;
  }

  const isProduction =
    order.status === "In Progress" ||
    order.status === "Cutting" ||
    order.status === "Sewing" ||
    order.status === "Finishing";

  const isDelivery =
    order.status === "Ready for Pickup" ||
    order.status === "Waiting for Customer Pickup" ||
    order.status === "Completed & Picked";

  return (
    <div className="space-y-8 p-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold">{order.id}</h1>
        <p className="text-gray-500">
          Smart tailoring workflow system
        </p>
      </div>

      {/* CORE GRID */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* CUSTOMER */}
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="font-bold">Customer</h2>

          <p className="mt-3 text-lg font-semibold">
            {order.customerName}
          </p>

          <p className="text-sm text-gray-500">
            {order.customerPhone}
          </p>
        </div>

        {/* STATUS (SINGLE SOURCE) */}
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="font-bold">Order Status</h2>

          <div className="mt-4">
            <StatusBadge status={order.status} />
          </div>

          <p className="mt-3 text-sm text-gray-500">
            Tailor:{" "}
            <span className="font-semibold text-black">
              {order.employee}
            </span>
          </p>
        </div>

        {/* PAYMENTS */}
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="font-bold">Payments</h2>

          <div className="mt-4 space-y-2">
            <Info label="Total" value={`KES ${order.total}`} />
            <Info label="Paid" value={`KES ${order.paid}`} />
            <Info label="Balance" value={`KES ${order.balanceDue}`} />
          </div>
        </div>
      </div>

      {/* 👗 MEASUREMENTS */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="font-bold">Customer Measurements</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Object.entries(order.customerMeasurements).map(
            ([key, value]) => (
              <div key={key} className="rounded-xl border p-3">
                <p className="text-sm text-gray-500 capitalize">
                  {key}
                </p>
                <p className="font-semibold">{value}</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* ✂️ ORDER SIZES */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="font-bold">Order Sizes (Tailor Adjustments)</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Object.entries(order.orderSizes).map(([key, value]) => (
            <div key={key} className="rounded-xl border p-3">
              <p className="text-sm text-gray-500 capitalize">
                {key}
              </p>
              <p className="font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 🧠 INTELLIGENT FLOW (ONLY ONE ACTIVE SECTION) */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="font-bold">Workflow</h2>

        <div className="mt-4 space-y-6">

          {/* PRODUCTION VIEW */}
          {isProduction && (
            <div>
              <p className="text-sm text-gray-500 mb-2">
                Production Stage
              </p>

              <p className="text-xl font-semibold">
                {order.stage}
              </p>

              <div className="mt-3 flex gap-2">
                <Step active={order.stage === "Cutting"} label="Cutting" />
                <Step active={order.stage === "Sewing"} label="Sewing" />
                <Step active={order.stage === "Finishing"} label="Finishing" />
              </div>
            </div>
          )}

          {/* DELIVERY VIEW */}
          {isDelivery && (
            <div>
              <p className="text-sm text-gray-500 mb-2">
                Delivery Status
              </p>

              <DeliveryFlow status={order.status} />
            </div>
          )}

        </div>
      </div>

      {/* IMAGES */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="font-bold">Order Images</h2>

        <div className="mt-4 flex gap-3">
          {order.images.map((img: string) => (
            <img
              key={img}
              src={img}
              className="h-24 w-24 rounded-xl object-cover"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function Info({ label, value }: any) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-block rounded-full bg-black px-3 py-1 text-sm text-white">
      {status}
    </span>
  );
}

function Step({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      className={`px-3 py-1 rounded-full text-xs border ${
        active
          ? "bg-black text-white"
          : "text-gray-500"
      }`}
    >
      {label}
    </div>
  );
}

function DeliveryFlow({ status }: { status: string }) {
  const steps = [
    "Ready for Pickup",
    "Waiting for Customer Pickup",
    "Completed & Picked",
  ];

  return (
    <div className="space-y-2">
      {steps.map((step) => {
        const active = step === status;

        return (
          <div key={step} className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                active ? "bg-green-500" : "bg-gray-300"
              }`}
            />
            <p
              className={
                active ? "font-semibold" : "text-gray-500"
              }
            >
              {step}
            </p>
          </div>
        );
      })}
    </div>
  );
}