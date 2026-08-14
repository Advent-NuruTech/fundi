"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Globe, LayoutDashboard } from "lucide-react";
import { AuthGuard, useAuth } from "@/features/auth/components/auth-context";
import { sellNavigation } from "@/constants/globalsell-navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/profile/user-avatar";

function GlobalSellNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-5">
      {sellNavigation.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isExternal = "external" in item && item.external;
              const active =
                !isExternal &&
                (pathname === item.href ||
                  (item.href !== "/sell" && pathname.startsWith(`${item.href}/`)));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-emerald-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                  {isExternal && (
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-400">
                      ↗
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function SellLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const hasBusiness = Boolean(user?.businessId);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const brand = (
    <Link href="/sell" className="flex items-center gap-2">
      <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <Image
          src="/images/logo.jpeg"
          alt="Global Sell"
          fill
          className="object-cover"
        />
      </div>
      <div className="leading-tight">
        <span className="block text-base font-bold text-slate-900">Global Sell</span>
        <span className="text-[10px] text-slate-400">by FundiFlow</span>
      </div>
    </Link>
  );

  const myBusinessLink = hasBusiness && (
    <Link
      href="/dashboard"
      onClick={() => setOpen(false)}
      className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
    >
      <LayoutDashboard className="h-4 w-4 shrink-0" />
      My Business
    </Link>
  );

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 py-4">{brand}</div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <GlobalSellNav onNavigate={() => setOpen(false)} />
        <div className="mt-2 space-y-1 border-t border-slate-100 pt-3">
          {myBusinessLink}
          <Link
            href="/globalsell"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <Globe className="h-4 w-4 shrink-0" />
            Browse Marketplace
            <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-400">
              ↗
            </span>
          </Link>
        </div>
      </nav>

      <div className="border-t border-slate-200 p-4">
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-slate-50"
        >
          <UserAvatar
            profile={{ displayName: user?.displayName ?? "User", photoURL: user?.photoURL }}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{user?.displayName}</p>
            <p className="truncate text-xs capitalize text-slate-500">
              {user?.role?.replace("_", " ")}
            </p>
          </div>
        </Link>
        <Button className="mt-3 w-full" variant="outline" size="sm" onClick={logout}>
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <div className="h-screen overflow-hidden bg-slate-50">
        {/* Mobile header — own Global Sell menu, independent of the dashboard sidebar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-slate-300 p-2"
              onClick={() => setOpen((prev) => !prev)}
              aria-label={open ? "Close Global Sell menu" : "Open Global Sell menu"}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="text-base font-semibold text-emerald-700">Global Sell</span>
          </div>
          {hasBusiness && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              My Business
            </Link>
          )}
        </header>

        <div className="mx-auto flex h-full max-w-[1500px]">
          {/* Desktop sidebar */}
          <aside className="hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
            {sidebarContent}
          </aside>

          {/* Mobile drawer — Global Sell only, no dashboard nav */}
          {open && (
            <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white lg:hidden">
              {sidebarContent}
            </aside>
          )}
          {open && (
            <button
              className="fixed inset-0 z-40 bg-black/20 lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            />
          )}

          {/* Main content */}
          <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
