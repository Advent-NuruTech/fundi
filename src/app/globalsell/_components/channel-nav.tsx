"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Globe, Tag, Users } from "lucide-react";

const TABS = [
  { label: "All Products", href: "/globalsell", icon: Globe, exact: true },
  { label: "Retail", href: "/globalsell/retail", icon: Tag, exact: false },
  { label: "Wholesale", href: "/globalsell/wholesale", icon: Users, exact: false },
] as const;

export function GlobalSellChannelNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-hide">
      {TABS.map(({ label, href, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition whitespace-nowrap",
              active
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
