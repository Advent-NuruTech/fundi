"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Home,
  LogOut,
  MessageCircle,
  ShoppingBag,
  Store,
  User,
} from "lucide-react";
import {
  CustomerPortalProvider,
  useCustomerPortal,
} from "@/features/customer-portal/customer-portal-context";
import { useCustomerSupportUnread } from "@/hooks/useCustomerSupportUnread";
import { shopUrl } from "@/lib/storefront-url";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/portal", label: "Overview", mobileLabel: "Home", icon: Home, exact: true },
  { href: "/portal/orders", label: "My orders", mobileLabel: "Orders", icon: ShoppingBag },
  { href: "/portal/payments", label: "Payments", mobileLabel: "Payments", icon: CreditCard },
  { href: "/portal/support", label: "Support", mobileLabel: "Support", icon: MessageCircle },
  { href: "/portal/profile", label: "My account", mobileLabel: "Account", icon: User },
];

function PortalNav({ mobile = false, supportUnread }: { mobile?: boolean; supportUnread: number }) {
  const pathname = usePathname();

  return (
    <nav className={mobile ? "flex items-center justify-around" : "space-y-1"} aria-label="Customer portal">
      {NAV.map(({ href, label, mobileLabel, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative transition-colors",
              mobile
                ? "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium"
                : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
              active
                ? mobile
                  ? "text-emerald-700"
                  : "bg-emerald-50 text-emerald-800"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", active && "stroke-[2.5]")} />
            <span>{mobile ? mobileLabel : label}</span>
            {href === "/portal/support" && supportUnread > 0 && (
              <span
                className={cn(
                  "flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white",
                  mobile ? "absolute right-[22%] top-0.5" : "ml-auto"
                )}
              >
                {supportUnread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const { userId, primaryCustomer, userName, businesses, logout, isLoaded } = useCustomerPortal();
  const supportUnread = useCustomerSupportUnread(userId);
  const displayName = primaryCustomer?.fullName || userName || "Customer";

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Opening your customer portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/portal" className="flex min-w-0 items-center gap-2.5">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-slate-200">
              <Image src="/images/logo.jpeg" alt="FundiFlow" fill sizes="36px" className="object-cover" priority />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold text-slate-900 sm:text-base">Customer Portal</p>
              <p className="text-[10px] text-slate-400">FundiFlow</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={shopUrl()}
              className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 sm:flex"
            >
              <Store className="h-4 w-4" />
              Shop Global Sell
            </Link>
            <div className="hidden text-right lg:block">
              <p className="max-w-44 truncate text-xs font-semibold text-slate-800">{displayName}</p>
              <p className="text-[10px] text-slate-400">
                {businesses.length
                  ? `${businesses.length} connected business${businesses.length === 1 ? "" : "es"}`
                  : "Global Sell customer"}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2 sm:text-xs sm:font-medium"
              aria-label="Sign out of customer portal"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-5 pb-24 sm:px-6 md:grid-cols-[210px_minmax(0,1fr)] md:py-8 md:pb-8">
        <aside className="hidden md:block">
          <div className="sticky top-24 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="truncate text-sm font-bold text-slate-900">{displayName}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                One customer account for orders from every connected business.
              </p>
            </div>
            <PortalNav supportUnread={supportUnread} />
            <Link
              href={shopUrl()}
              className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              <Store className="h-5 w-5" />
              Shop Global Sell
            </Link>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white md:hidden">
        <div className="mx-auto max-w-lg pb-[env(safe-area-inset-bottom)]">
          <PortalNav mobile supportUnread={supportUnread} />
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
