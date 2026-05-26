"use client";

import { useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  ShoppingBag,
} from "lucide-react";
import { orders } from "@/features/orders/data/orders.mock";
import { customers as initialCustomers } from "@/features/customers/data/customers.mock";
import { employees } from "@/features/employees/data/employees.mock";

export function AnalyticsPage() {
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalPaid = orders.reduce((sum, o) => sum + o.paid, 0);
  const totalOutstanding = orders.reduce((sum, o) => sum + o.balanceDue, 0);

  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  const employeePerformance = useMemo(() => {
    return employees
      .filter((e) => e.role === "tailor" || e.role === "cutter" || e.role === "ironman")
      .map((emp) => {
        const empOrders = orders.filter((o) => o.employee === emp.name);
        const revenue = empOrders.reduce((sum, o) => sum + o.total, 0);
        return {
          name: emp.name,
          role: emp.role,
          orderCount: empOrders.length,
          revenue,
          avgValue: empOrders.length > 0 ? revenue / empOrders.length : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, []);

  const activeOrders = orders.filter(
    (o) =>
      o.status !== "Delivered" &&
      o.status !== "Completed & Picked" &&
      o.status !== "Cancelled"
  ).length;

  const totalCustomers = initialCustomers.length;
  const repeatCustomers = initialCustomers.filter(
    (c) => c.totalOrders > 1
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-gray-500">
          Business insights and performance metrics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-3xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                KES {totalRevenue.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-green-200" />
          </div>
        </div>
        <div className="rounded-3xl border bg-white p-5">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="mt-2 text-2xl font-bold text-red-600">
            KES {totalOutstanding.toLocaleString()}
          </p>
        </div>
        <div className="rounded-3xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Orders</p>
              <p className="mt-2 text-2xl font-bold">{activeOrders}</p>
            </div>
            <ShoppingBag className="h-10 w-10 text-blue-200" />
          </div>
        </div>
        <div className="rounded-3xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Customers</p>
              <p className="mt-2 text-2xl font-bold">{totalCustomers}</p>
            </div>
            <Users className="h-10 w-10 text-purple-200" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="font-bold">Order Summary</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Orders</span>
              <span className="font-bold">{orders.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Average Order Value</span>
              <span className="font-bold">
                KES {avgOrderValue.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Collection Rate</span>
              <span className="font-bold">
                {totalRevenue > 0
                  ? Math.round((totalPaid / totalRevenue) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Repeat Customers</span>
              <span className="font-bold">
                {repeatCustomers} / {totalCustomers}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6">
          <h2 className="font-bold">Employee Performance</h2>
          <div className="mt-4 space-y-3">
            {employeePerformance.map((emp) => (
              <div
                key={emp.name}
                className="flex items-center justify-between rounded-2xl bg-neutral-50 p-4"
              >
                <div>
                  <p className="font-semibold">{emp.name}</p>
                  <p className="text-xs capitalize text-gray-500">
                    {emp.role} · {emp.orderCount} orders
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">
                    KES {emp.revenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Avg: KES {emp.avgValue.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-6">
        <h2 className="font-bold">Orders by Status</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {[
            { label: "Cutting", statuses: ["New", "Cutting"], color: "bg-orange-500" },
            { label: "In Progress", statuses: ["In Progress", "Sewing"], color: "bg-blue-500" },
            { label: "Fitting/Finishing", statuses: ["Fitting", "Finishing"], color: "bg-purple-500" },
            { label: "Ready/Delivered", statuses: ["Ready for Pickup", "Waiting for Customer Pickup", "Completed & Picked", "Delivered"], color: "bg-green-500" },
          ].map((group) => {
            const count = orders.filter((o) =>
              group.statuses.includes(o.status)
            ).length;
            const pct = orders.length > 0 ? (count / orders.length) * 100 : 0;
            return (
              <div key={group.label} className="rounded-2xl border p-4">
                <div className={`mb-2 h-2 rounded-full ${group.color}`} />
                <p className="text-sm text-gray-500">{group.label}</p>
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-gray-400">{Math.round(pct)}% of all</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
