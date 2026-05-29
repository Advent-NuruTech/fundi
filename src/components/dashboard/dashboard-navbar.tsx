"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Search,
  User,
  Package,
  Warehouse,
  Truck,
  BarChart3,
  ScanLine,
  FileText,
  ArrowRightLeft,
} from "lucide-react";

const searchSuggestions = [
  {
    title: "Italian Wool",
    category: "Materials",
    icon: Package,
  },
  {
    title: "Materials",
    category: "Inventory",
    icon: Warehouse,
  },
  {
    title: "Low Stock Items",
    category: "Alerts",
    icon: BarChart3,
  },
  {
    title: "Suppliers",
    category: "Management",
    icon: Truck,
  },
  {
    title: "Purchase Orders",
    category: "Orders",
    icon: FileText,
  },
  {
    title: "Barcode Scanner",
    category: "Tools",
    icon: ScanLine,
  },
  {
    title: "Stock Movements",
    category: "Tracking",
    icon: ArrowRightLeft,
  },
];

export function DashboardNavbar() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const filteredResults = useMemo(() => {
    if (!query.trim()) return searchSuggestions;

    return searchSuggestions.filter((item) =>
      item.title.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  return (
    <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b bg-white px-4 md:px-6">
      {/* LEFT */}
      <div
        className={`flex items-center transition-all duration-300 ${
          focused
            ? "pointer-events-none w-0 overflow-hidden opacity-0"
            : "w-auto opacity-100"
        }`}
      >
        <h1 className="hidden text-xl font-bold lg:block">
          Inventory Dashboard
        </h1>
      </div>

      {/* CENTER SEARCH */}
      <div
        className={`relative flex transition-all duration-300 ${
          focused ? "w-full justify-center" : "flex-1 justify-center"
        }`}
      >
        <div
          className={`relative transition-all duration-300 ${
            focused
              ? "w-full max-w-3xl"
              : "w-full max-w-md lg:max-w-xl"
          }`}
        >
          <Search className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setTimeout(() => {
                setFocused(false);
              }, 200);
            }}
            placeholder="Search materials, stock, suppliers, orders..."
            className="h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-12 pr-4 text-sm shadow-sm outline-none transition-all duration-300 focus:border-black focus:bg-white focus:ring-4 focus:ring-gray-100"
          />

          {/* SEARCH DROPDOWN */}
          {focused && (
            <div className="absolute top-16 w-full overflow-hidden rounded-3xl border bg-white shadow-2xl">
              <div className="border-b px-5 py-4">
                <p className="text-sm font-semibold text-gray-900">
                  Quick Search
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Try searching inventory items, suppliers, stock movements,
                  analytics, or barcode tools.
                </p>
              </div>

              <div className="max-h-[400px] overflow-y-auto py-2">
                {filteredResults.length > 0 ? (
                  filteredResults.map((item, index) => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={index}
                        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-gray-50"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
                          <Icon className="h-5 w-5 text-gray-700" />
                        </div>

                        <div>
                          <p className="font-medium text-gray-900">
                            {item.title}
                          </p>

                          <p className="text-sm text-gray-500">
                            {item.category}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-5 py-10 text-center">
                    <p className="font-medium text-gray-700">
                      No results found
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Try another search keyword.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div
        className={`flex items-center gap-4 transition-all duration-300 ${
          focused
            ? "pointer-events-none w-0 overflow-hidden opacity-0"
            : "opacity-100"
        }`}
      >
        <button className="relative rounded-2xl border bg-white p-3 shadow-sm transition hover:bg-gray-50">
          <Bell className="h-5 w-5" />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-2 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
            <User className="h-5 w-5" />
          </div>

          <div className="hidden md:block">
            <p className="font-semibold">Admin User</p>

            <p className="text-sm text-gray-500">
              Inventory Manager
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}