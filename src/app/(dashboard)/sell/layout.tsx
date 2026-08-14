"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { sellNavigation } from "@/constants/globalsell-navigation";

function NavLinks() {
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
              const active =
                !("external" in item) &&
                (pathname === item.href ||
                  (item.href !== "/sell" && pathname.startsWith(`${item.href}/`)));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={"external" in item && item.external ? "_blank" : undefined}
                  rel={"external" in item && item.external ? "noopener noreferrer" : undefined}
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
  );
}

export default function SellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Flat list used by the mobile quick-nav strip.
  const flatItems = sellNavigation.flatMap((section) => section.items);

  return (
    <div className="flex h-full flex-col gap-4 lg:h-full lg:flex-row lg:gap-6">
      {/* Sub-sidebar (desktop) */}
      <aside className="hidden w-52 shrink-0 lg:block">
        <NavLinks />
      </aside>

      {/* Mobile quick-nav strip */}
      <div className="lg:hidden">
        <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none]">
          {flatItems.map((item) => {
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
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "border-emerald-500 bg-emerald-600 text-white"
                    : "border-slate-200 bg-white text-slate-600"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
