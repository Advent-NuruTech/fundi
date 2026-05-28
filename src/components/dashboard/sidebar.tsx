"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  ShoppingBag,
  Scissors,
  Package,
  CreditCard,
  BarChart3,
  MessageSquare,
  UserCircle,
  Landmark,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/components/auth-context";
import { hasCapability } from "@/lib/permissions";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { MessageBell } from "@/components/messaging/message-bell";
import { UserAvatar } from "@/components/profile/user-avatar";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Finance", href: "/finance", icon: Landmark },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Orders", href: "/orders", icon: ShoppingBag },
  { label: "Production", href: "/production", icon: Scissors },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Payments", href: "/payments", icon: CreditCard },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Employees", href: "/employees", icon: Users },
  { label: "Messages", href: "/messages", icon: MessageSquare },
];

export function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, business, logout } = useAuth();

  const visibleNavigation = navigation.filter((item) => {
    if (item.href.startsWith("/inventory")) return hasCapability(user, "inventory.read");
    if (item.href.startsWith("/payments")) return hasCapability(user, "payments.read");
    if (item.href.startsWith("/analytics")) return hasCapability(user, "analytics.read");
    if (item.href.startsWith("/finance")) return hasCapability(user, "finance.read");
    if (item.href.startsWith("/employees")) return hasCapability(user, "team.manage");
    if (item.href.startsWith("/orders")) return hasCapability(user, "orders.read");
    if (item.href.startsWith("/customers")) return hasCapability(user, "customers.read");
    if (item.href.startsWith("/production")) return hasCapability(user, "production.read");
    return true;
  });

  const navItem = (item: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }) => {
    const Icon = item.icon;
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
          active ? "bg-emerald-600 text-white" : "text-slate-700 hover:bg-slate-100"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </Link>
    );
  };

  const Drawer = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-emerald-700">{business?.name || "FundiFlow"}</div>
            <p className="text-xs text-slate-500">Kenyan Tailoring OS</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNavigation.map(navItem)}
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <UserCircle className="h-4 w-4 shrink-0" />
          Profile
        </Link>
      </nav>

      <div className="border-t border-slate-200 p-4">
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-slate-50"
        >
          <UserAvatar profile={{ displayName: user?.displayName ?? "User", photoURL: user?.photoURL }} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{user?.displayName}</p>
            <p className="truncate text-xs capitalize text-slate-500">{user?.role?.replace("_", " ")}</p>
          </div>
        </Link>
        <Button className="mt-3 w-full" variant="outline" size="sm" onClick={logout}>
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header with notification/message bells */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-300 p-2"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="text-base font-semibold text-emerald-700">{business?.name || "FundiFlow"}</div>
        </div>
        <div className="flex items-center gap-2">
          <MessageBell />
          <NotificationBell />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px]">
        {/* Desktop sidebar - no notification icons here */}
        <aside className="hidden h-screen w-64 border-r border-slate-200 bg-white lg:block">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-lg font-bold text-emerald-700">{business?.name || "FundiFlow"}</div>
              <p className="text-xs text-slate-500">Kenyan Tailoring OS</p>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {visibleNavigation.map(navItem)}
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                  pathname === "/profile" ? "bg-emerald-600 text-white" : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <UserCircle className="h-4 w-4 shrink-0" />
                Profile
              </Link>
            </nav>

            <div className="border-t border-slate-200 p-4">
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-slate-50"
              >
                <UserAvatar profile={{ displayName: user?.displayName ?? "User", photoURL: user?.photoURL }} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{user?.displayName}</p>
                  <p className="truncate text-xs capitalize text-slate-500">{user?.role?.replace("_", " ")}</p>
                </div>
              </Link>
              <Button className="mt-3 w-full" variant="outline" size="sm" onClick={logout}>
                Log out
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {open && <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white lg:hidden">{Drawer}</aside>}
        {open && <button className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu" />}

        {/* Main content area with desktop notification/message bar */}
        <main className="flex min-h-screen flex-1 flex-col">
          {/* Desktop notification/message bar - only visible on lg+ */}
          <div className="hidden border-b border-slate-200 bg-white lg:flex items-center justify-end gap-2 px-6 py-2">
            <span className="text-xs text-slate-400 mr-auto">
              {business?.name || "FundiFlow"}
            </span>
            <MessageBell />
            <NotificationBell />
          </div>
          <div className="flex-1 p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
