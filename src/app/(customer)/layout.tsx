"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, CreditCard, MessageCircle, User, Store, LogOut } from "lucide-react";
import { CustomerPortalProvider, useCustomerPortal } from "@/features/customer-portal/customer-portal-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/portal", label: "Home", icon: Home, exact: true },
  { href: "/portal/orders", label: "Orders", icon: ShoppingBag },
  { href: "/portal/payments", label: "Payments", icon: CreditCard },
  { href: "/portal/marketplace", label: "Market", icon: Store },
  { href: "/portal/support", label: "Support", icon: MessageCircle },
  { href: "/portal/profile", label: "Profile", icon: User },
];

function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { primaryCustomer, logout, isLoaded } = useCustomerPortal();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <span className="text-base font-semibold text-slate-800">
            {primaryCustomer?.fullName?.split(" ")[0] ?? "My Portal"}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-rose-600 transition-colors"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5 pb-24">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-emerald-600" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerPortalProvider>
      <PortalShell>{children}</PortalShell>
    </CustomerPortalProvider>
  );
}
