"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Boxes,
  Building2,
  ChevronDown,
  ClipboardList,
  Home,
  Landmark,
  ListTree,
  Store,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const guideLinks = [
  { label: "Manual home", href: "/manual", icon: Home },
  { label: "Finance", href: "/manual/finance", icon: Landmark },
  { label: "Customers", href: "/manual/customers", icon: Users },
  { label: "Orders", href: "/manual/orders", icon: ClipboardList },
  { label: "Inventory", href: "/manual/inventory", icon: Boxes },
  { label: "Employees", href: "/manual/employees", icon: Building2 },
  { label: "Global Sell", href: "/manual/global-sell", icon: Store },
] as const;

const pageSections: Record<string, Array<{ id: string; label: string }>> = {
  "/manual": [
    { id: "available-guides", label: "Available guides" },
    { id: "app-map", label: "FundiFlow app map" },
  ],
  "/manual/finance": [
    { id: "finance-map", label: "Finance tabs and money flow" },
    { id: "overview", label: "Dashboard and time views" },
    { id: "expenses", label: "Record an expense" },
    { id: "withdrawals", label: "Record a withdrawal" },
    { id: "investments", label: "Track investments" },
    { id: "savings", label: "Savings goals and deposits" },
    { id: "transactions", label: "Transaction ledger" },
    { id: "reports", label: "Reports, CSV, and print" },
    { id: "permissions", label: "Finance access" },
    { id: "finance-routine", label: "Weekly finance routine" },
  ],
  "/manual/customers": [
    { id: "choose-type", label: "Choose customer type" },
    { id: "individual", label: "Individual customers" },
    { id: "group", label: "Groups and organisations" },
    { id: "members", label: "Group members" },
    { id: "customer-list", label: "Customer list" },
    { id: "customer-next", label: "Next steps" },
  ],
  "/manual/orders": [
    { id: "before", label: "Before a new order" },
    { id: "order-details", label: "Order details" },
    { id: "item-types", label: "Item types" },
    { id: "item-fields", label: "Item fields" },
    { id: "packages", label: "Packages and sets" },
    { id: "group-orders", label: "Group orders" },
    { id: "delivery-payment", label: "Delivery and payment" },
    { id: "create-confirm", label: "Create and confirm" },
    { id: "after-save", label: "After saving" },
    { id: "orders-page", label: "Orders page" },
    { id: "order-next", label: "Next steps" },
  ],
  "/manual/inventory": [
    { id: "inventory-tabs", label: "Inventory tabs" },
    { id: "materials", label: "Materials and ready-made stock" },
    { id: "adjustments", label: "Stock adjustments" },
    { id: "suppliers", label: "Suppliers" },
    { id: "purchase-orders", label: "Purchase orders" },
    { id: "low-stock", label: "Low stock and reordering" },
    { id: "stock-audit", label: "Movements and consumption" },
    { id: "inventory-summary", label: "Workflow summary" },
  ],
  "/manual/employees": [
    { id: "invite", label: "Invite an employee" },
    { id: "team-page", label: "Read the Team page" },
    { id: "incomplete-invite", label: "Incomplete invitations" },
    { id: "access", label: "Pause, restore, or delete" },
    { id: "reinvite", label: "Re-invite an employee" },
    { id: "owner-check", label: "Final owner check" },
  ],
  "/manual/global-sell": [
    { id: "store-settings", label: "Store settings" },
    { id: "products", label: "Products and services" },
    { id: "share-store", label: "Share the store" },
    { id: "online-orders", label: "Online orders" },
  ],
};

function closeMenu(event: React.MouseEvent<HTMLAnchorElement>) {
  event.currentTarget.closest("details")?.removeAttribute("open");
}

export function ManualShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentGuide = guideLinks.find((guide) => guide.href === pathname) ?? guideLinks[0];
  const sections = pageSections[pathname] ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <aside className="sticky top-0 z-30 mb-5" aria-label="Manual navigation">
        <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-lg shadow-slate-900/5 backdrop-blur">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 py-2.5 marker:content-none sm:px-4 [&::-webkit-details-marker]:hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <BookOpen className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                FundiFlow Manual
              </span>
              <span className="block break-words text-sm font-bold leading-5 text-slate-950">
                {currentGuide.label} · Open quick navigation
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-2 text-xs font-bold text-slate-700">
              <span className="hidden sm:inline">Navigate</span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </span>
          </summary>

          <div className="max-h-[min(70dvh,34rem)] overflow-y-auto overscroll-contain border-t border-slate-200 p-3 sm:p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Choose a guide</p>
                <nav className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1" aria-label="Manual guides">
                  {guideLinks.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenu}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                          active
                            ? "bg-emerald-600 text-white"
                            : "text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="break-words">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {sections.length > 0 ? (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <ListTree className="h-3.5 w-3.5" />
                    Jump to a section
                  </p>
                  <nav className="grid gap-1 sm:grid-cols-2" aria-label={`Sections in ${currentGuide.label}`}>
                    {sections.map((section, index) => (
                      <Link
                        key={section.id}
                        href={`${pathname}#${section.id}`}
                        onClick={closeMenu}
                        className="flex min-h-10 items-start gap-2 rounded-xl px-3 py-2 text-sm font-medium leading-5 text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        <span className="mt-0.5 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 px-1 text-[10px] font-bold text-slate-500">
                          {index + 1}
                        </span>
                        <span className="break-words">{section.label}</span>
                      </Link>
                    ))}
                  </nav>
                </div>
              ) : null}
            </div>
          </div>
        </details>
      </aside>

      <main className="min-w-0">{children}</main>
    </div>
  );
}
