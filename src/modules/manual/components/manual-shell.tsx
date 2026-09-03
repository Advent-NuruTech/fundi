"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronRight, ClipboardList, Home, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const guideLinks = [
  { label: "Manual home", href: "/manual", icon: Home },
  { label: "Customers", href: "/manual/customers", icon: Users },
  { label: "Orders", href: "/manual/orders", icon: ClipboardList },
] as const;

export function ManualShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="xl:sticky xl:top-4 xl:self-start">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-950 px-4 py-4 text-white">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500">
                <BookOpen className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold">FundiFlow Manual</p>
                <p className="text-[11px] text-slate-400">Customers and orders</p>
              </div>
            </div>
          </div>

          <nav aria-label="Manual sections" className="grid gap-1 p-2 sm:grid-cols-3 xl:grid-cols-1">
            {guideLinks.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-emerald-600 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                  <ChevronRight className="ml-auto hidden h-3.5 w-3.5 xl:block" />
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="min-w-0">{children}</main>
    </div>
  );
}
