"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { sellNavigation } from "@/constants/globalsell-navigation";

export default function SellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full gap-6">
      {/* Sub-sidebar */}
      <aside className="hidden w-52 shrink-0 lg:block">
        <nav className="space-y-5">
          {sellNavigation.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    !("external" in item) &&
                    (pathname === item.href ||
                      (item.href !== "/sell" &&
                        pathname.startsWith(`${item.href}/`)));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      target={"external" in item && item.external ? "_blank" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition",
                        active
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
