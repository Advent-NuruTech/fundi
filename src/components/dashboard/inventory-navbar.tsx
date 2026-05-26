"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Barcode,
  Boxes,
  ClipboardList,
  Factory,
  Layers3,
  Package,
  Scissors,
  ShieldAlert,
  ShoppingCart,
  Ruler,
  Users,
  Menu,
  X,
  Search,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const navigationGroups = [
  {
    title: "Inventory",
    items: [
      { label: "Overview", href: "/inventory", icon: Boxes },
      { label: "Materials", href: "/inventory/materials", icon: Package },
      { label: "Fabric Rolls", href: "/inventory/fabric-rolls", icon: Layers3 },
      {
        label: "Stock Movements",
        href: "/inventory/stock-movements",
        icon: ClipboardList,
      },
      {
        label: "Purchase Orders",
        href: "/inventory/purchase-orders",
        icon: ShoppingCart,
      },
      { label: "Suppliers", href: "/inventory/suppliers", icon: Users },
    ],
  },

  {
    title: "Operations",
    items: [
      {
        label: "Barcode Scanner",
        href: "/inventory/barcode-scanner",
        icon: Barcode,
      },
      {
        label: "Fabric Consumption",
        href: "/inventory/fabric-consumption",
        icon: Factory,
      },
      {
        label: "Fabric Reservations",
        href: "/inventory/fabric-reservations",
        icon: Package,
      },
      {
        label: "Cutting Tracker",
        href: "/inventory/cutting-tracker",
        icon: Scissors,
      },
      {
        label: "Measurement Mapping",
        href: "/inventory/measurement-mapping",
        icon: Ruler,
      },
      {
        label: "Analytics",
        href: "/inventory/analytics",
        icon: BarChart3,
      },
      {
        label: "Low Stock Alerts",
        href: "/inventory/low-stock",
        icon: ShieldAlert,
      },
    ],
  },
];

export function InventoryNavigationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Close sidebar automatically on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const filteredGroups = useMemo(() => {
    return navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLowerCase().includes(search.toLowerCase())
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [search]);

  const isActive = (href: string) => {
    if (href === "/inventory") {
      return pathname === href;
    }

    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* =========================
          MOBILE HEADER
      ========================== */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur lg:hidden">
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-neutral-900">
            Inventory System
          </h1>

          <p className="text-xs text-neutral-500">
            Manage inventory operations
          </p>
        </div>

        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:bg-neutral-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex">
        {/* =========================
            DESKTOP SIDEBAR
        ========================== */}
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-80 lg:flex-col lg:border-r lg:bg-white">
          {/* Header */}
          <div className="border-b px-6 py-6">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
              Inventory
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Centralized management
            </p>

            {/* Search */}
            <div className="relative mt-5">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-neutral-400" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search navigation..."
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm outline-none transition focus:border-black focus:bg-white"
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-8">
              {filteredGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    {group.title}
                  </h3>

                  <div className="space-y-1.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`group flex items-center justify-between rounded-2xl px-4 py-3 transition-all duration-200 ${
                            active
                              ? "bg-black text-white shadow-lg shadow-black/10"
                              : "text-neutral-700 hover:bg-neutral-100"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`rounded-xl p-2 ${
                                active
                                  ? "bg-white/10"
                                  : "bg-neutral-100 group-hover:bg-white"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>

                            <span className="text-sm font-medium">
                              {item.label}
                            </span>
                          </div>

                          <ChevronRight
                            className={`h-4 w-4 transition ${
                              active
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                            }`}
                          />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* =========================
            MOBILE SIDEBAR
        ========================== */}
        <>
          {/* Overlay */}
          <div
            onClick={() => setMobileOpen(false)}
            className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
              mobileOpen
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0"
            }`}
          />

          {/* Drawer */}
          <aside
            className={`fixed left-0 top-0 z-50 flex h-screen w-[88%] max-w-sm flex-col bg-white transition-transform duration-300 lg:hidden ${
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {/* Drawer Header */}
            <div className="border-b px-5 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">
                    Inventory
                  </h2>

                  <p className="mt-1 text-sm text-neutral-500">
                    Navigation center
                  </p>
                </div>

                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search */}
              <div className="relative mt-5">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-neutral-400" />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search pages..."
                  className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm outline-none transition focus:border-black focus:bg-white"
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <div className="space-y-7 pb-10">
                {filteredGroups.map((group) => (
                  <div key={group.title}>
                    <h3 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      {group.title}
                    </h3>

                    <div className="space-y-2">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-2xl px-4 py-4 transition-all ${
                              active
                                ? "bg-black text-white shadow-lg shadow-black/10"
                                : "border border-transparent bg-neutral-50 text-neutral-700 hover:border-neutral-200 hover:bg-white"
                            }`}
                          >
                            <div
                              className={`rounded-xl p-2 ${
                                active ? "bg-white/10" : "bg-white"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="flex flex-1 items-center justify-between">
                              <span className="text-sm font-medium">
                                {item.label}
                              </span>

                              <ChevronRight className="h-4 w-4 opacity-60" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </>

        {/* =========================
            MAIN CONTENT
        ========================== */}
        <main className="min-w-0 flex-1">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}