"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, Users, ShoppingBag, Scissors, Package, CreditCard, BarChart3 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/components/auth-context";
import { hasCapability } from "@/lib/permissions";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Orders", href: "/orders", icon: ShoppingBag },
  { label: "Production", href: "/production", icon: Scissors },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Payments", href: "/payments", icon: CreditCard },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Employees", href: "/employees", icon: Users },
];

export function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, business, logout } = useAuth();
  const visibleNavigation = navigation.filter((item) => {
    if (item.href.startsWith("/inventory")) return hasCapability(user, "inventory.read");
    if (item.href.startsWith("/payments")) return hasCapability(user, "payments.read");
    if (item.href.startsWith("/analytics")) return hasCapability(user, "analytics.read");
    if (item.href.startsWith("/employees")) return hasCapability(user, "team.manage");
    if (item.href.startsWith("/orders")) return hasCapability(user, "orders.read");
    if (item.href.startsWith("/customers")) return hasCapability(user, "customers.read");
    if (item.href.startsWith("/production")) return hasCapability(user, "production.read");
    return true;
  });

  const Drawer = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="text-lg font-bold text-emerald-700">{business?.name || "FundiFlow"}</div>
        <p className="text-xs text-slate-500">Kenyan Tailoring OS</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleNavigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
                active ? "bg-emerald-600 text-white" : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <p className="text-sm font-medium text-slate-800">{user?.displayName}</p>
        <p className="text-xs capitalize text-slate-500">{user?.role}</p>
        <Button className="mt-3 w-full" variant="outline" onClick={logout}>
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="text-base font-semibold text-emerald-700">{business?.name || "FundiFlow"}</div>
        <button
          type="button"
          className="rounded-lg border border-slate-300 p-2"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      <div className="mx-auto flex max-w-[1500px]">
        <aside className="hidden h-screen w-64 border-r border-slate-200 bg-white lg:block">{Drawer}</aside>
        {open && <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white lg:hidden">{Drawer}</aside>}
        {open && <button className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu" />}
        <main className="min-h-screen flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
