"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronDown, LayoutGrid, Tag, Users, Store, PackageSearch, Briefcase, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const CHANNELS = [
  { label: "All Products", href: "/globalsell", icon: LayoutGrid, exact: true },
  { label: "Retail", href: "/globalsell/retail", icon: Tag, exact: false },
  { label: "Wholesale", href: "/globalsell/wholesale", icon: Users, exact: false },
  { label: "Wholesale & Retail", href: "/globalsell/both", icon: Store, exact: false },
] as const;

const MORE = [
  { label: "Track Order", href: "/globalsell/track", icon: PackageSearch },
  { label: "Sell Here", href: "/dashboard", icon: Briefcase },
] as const;

export function GlobalSellChannelDropdown() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Marketplace menu"
        aria-expanded={open}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-slate-700 transition hover:bg-slate-50",
          open && "border-emerald-500 bg-emerald-50 text-emerald-700"
        )}
      >
        <Menu className="h-4.5 w-4.5" />
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-slide-down">
          <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Shop By Channel
          </div>
          {CHANNELS.map(({ label, href, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition",
                  active ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-emerald-600" : "text-slate-400")} />
                <span className="flex-1">{label}</span>
                {active && <Check className="h-3.5 w-3.5 text-emerald-600" />}
              </Link>
            );
          })}

          <div className="my-1 border-t border-slate-100" />

          {MORE.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Icon className="h-4 w-4 text-slate-400" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
