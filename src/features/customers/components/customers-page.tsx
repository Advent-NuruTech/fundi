"use client";

import { useMemo, useState } from "react";
import { customers as initialCustomers } from "../data/customers.mock";

export function CustomersPage() {
  const [search, setSearch] = useState("");

  const customers = initialCustomers;

  const filtered = useMemo(() => {
    return customers.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, customers]);

  const totalCustomers = customers.length;

  const activeClients = customers.filter((c) =>
    c.orders?.some((o: any) => o.status === "In Progress")
  ).length;

  return (
    <div className="space-y-6 p-6">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="text-gray-500">
          Tailoring CRM — orders, payments & measurements
        </p>
      </div>

      {/* STATS */}
      <div className="grid gap-6 md:grid-cols-3">
        <Stat label="Total Customers" value={totalCustomers} />
        <Stat label="Active Clients" value={activeClients} />
        <Stat label="Total Orders" value={customers.reduce((a, c) => a + (c.orders?.length || 0), 0)} />
      </div>

      {/* SEARCH */}
      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer by name..."
          className="w-full rounded-2xl border px-4 py-3"
        />
      </div>

      {/* LIST */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((customer) => {
          const activeOrder = customer.orders?.[0];

          return (
            <div
              key={customer.id}
              className="rounded-3xl border bg-white p-5 space-y-4"
            >

              {/* ORDER IMAGE */}
              <div className="h-40 rounded-2xl overflow-hidden bg-gray-100">
                <img
                  src={activeOrder?.images?.[0] || "/placeholder.jpg"}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* CUSTOMER INFO */}
              <div>
                <h2 className="text-xl font-bold">
                  {customer.name}
                </h2>

                <p className="text-sm text-gray-500">
                  {customer.phone}
                </p>
              </div>

              {/* QUICK SNAPSHOT */}
              {activeOrder && (
                <div className="space-y-2 text-sm">

                  <Info label="Order" value={activeOrder.type} />
                  <Info label="Employee" value={activeOrder.employee} />
                  <Info label="Progress" value={`${activeOrder.progress}%`} />
                  <Info label="Balance" value={`KES ${activeOrder.balance}`} />

                  {/* PROGRESS BAR */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-black"
                      style={{ width: `${activeOrder.progress}%` }}
                    />
                  </div>

                </div>
              )}

              {/* BUTTON */}
              <a
                href={`/customers/${customer.id}`}
                className="block text-center bg-black text-white rounded-xl py-2"
              >
                View Profile
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* REUSABLE COMPONENTS */

function Stat({ label, value }: any) {
  return (
    <div className="rounded-3xl border bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function Info({ label, value }: any) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}