import Link from "next/link";
import {
  BadgeCheck,
  Cookie,
  FileText,
  Globe,
  PackageCheck,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { shopUrl } from "@/lib/storefront-url";

const SHOP_LINKS = [
  { href: shopUrl(), label: "All Products" },
  { href: shopUrl("retail"), label: "Retail" },
  { href: shopUrl("wholesale"), label: "Wholesale" },
  { href: shopUrl("both"), label: "Wholesale & Retail" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy", icon: ShieldCheck },
  { href: "/terms", label: "Terms of Service", icon: FileText },
  { href: "/cookies", label: "Cookie Policy", icon: Cookie },
];

const TRUST_POINTS = [
  { icon: BadgeCheck, label: "Verified Kenyan sellers" },
  { icon: Truck, label: "Nationwide delivery" },
  { icon: Store, label: "Retail & wholesale pricing" },
];

export function GlobalSellFooter() {
  return (
    <footer className="mt-16 bg-slate-950 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href={shopUrl()} className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-lg shadow-emerald-600/25">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="block text-base font-bold text-white">
                  Global Sell
                </span>
                <span className="block text-[10px] text-slate-400">
                  by FundiFlow
                </span>
              </div>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed">
              Kenya&apos;s premium tailoring marketplace — discover quality
              products from verified Kenyan businesses, powered by FundiFlow.
            </p>
            <ul className="space-y-2 text-xs">
              {TRUST_POINTS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Shop */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Shop
            </h3>
            <ul className="space-y-2.5 text-sm">
              {SHOP_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="transition-colors hover:text-emerald-400"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={shopUrl("track")}
                  className="flex items-center gap-2 transition-colors hover:text-emerald-400"
                >
                  <PackageCheck className="h-4 w-4" />
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Legal
            </h3>
            <ul className="space-y-2.5 text-sm">
              {LEGAL_LINKS.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-2 transition-colors hover:text-emerald-400"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sell with us */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Sell With Us
            </h3>
            <p className="mb-4 text-sm leading-relaxed">
              Turn your tailoring business into a global storefront and reach
              buyers across Kenya and beyond.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-colors hover:bg-emerald-500"
            >
              <Store className="h-4 w-4" />
              Start Selling
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-6 text-sm sm:flex-row">
          <p>
            © {new Date().getFullYear()} FundiFlow by Advent Nurutech. All
            rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {LEGAL_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="transition-colors hover:text-emerald-400"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
