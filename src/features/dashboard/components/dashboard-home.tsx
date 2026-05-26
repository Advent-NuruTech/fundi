"use client";

import Link from "next/link";
import { Package, BarChart3, Clock } from "lucide-react";

export function DashboardHome() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to FundiFlow - Tailoring ERP System
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Materials</p>
              <p className="mt-2 text-3xl font-bold">1,240</p>
            </div>
            <Package className="h-12 w-12 text-gray-400" />
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="mt-2 text-3xl font-bold">12</p>
            </div>
            <BarChart3 className="h-12 w-12 text-orange-400" />
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Orders</p>
              <p className="mt-2 text-3xl font-bold">5</p>
            </div>
            <Clock className="h-12 w-12 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Main Navigation Card */}
      <div className="rounded-2xl border-2 border-dashed bg-gradient-to-br from-black/5 to-black/2 p-8">
        <div className="flex flex-col items-center text-center">
          <Package className="h-16 w-16 text-black" />
          <h2 className="mt-4 text-2xl font-bold">Inventory Management</h2>
          <p className="mt-2 text-gray-600">
            Manage materials, fabric rolls, suppliers, and track inventory movements
          </p>
          <Link
            href="/inventory"
            className="mt-6 inline-block rounded-xl bg-black px-8 py-3 font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            Go to Inventory
          </Link>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="rounded-2xl border bg-white p-6">
        <h3 className="text-lg font-semibold">Available Modules</h3>
        <ul className="mt-4 space-y-3">
          <li className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-gray-700">Inventory Management</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-gray-300" />
            <span className="text-gray-500">Production Planning (Coming Soon)</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-gray-300" />
            <span className="text-gray-500">Sales & Orders (Coming Soon)</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-gray-300" />
            <span className="text-gray-500">Reporting (Coming Soon)</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
