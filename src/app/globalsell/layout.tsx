import type { ReactNode } from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { CartNavButton } from "./_components/cart-nav-button";
import { GlobalSellChannelNav } from "./_components/channel-nav";

export const metadata = {
  title: "Global Sell — FundiFlow Marketplace",
  description:
    "Browse and buy from Kenyan tailoring businesses on the Global Sell marketplace.",
};

export default function GlobalSellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Marketplace Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/globalsell" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600">
              <Globe className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900">Global Sell</span>
              <span className="ml-1.5 text-xs text-slate-400 hidden sm:inline">by FundiFlow</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/globalsell/track"
              className="hidden sm:block text-sm text-slate-600 hover:text-emerald-600 transition"
            >
              Track Order
            </Link>
            <Link
              href="/dashboard"
              className="hidden sm:block text-sm text-slate-600 hover:text-emerald-600 transition"
            >
              Sell with Us
            </Link>
            <CartNavButton />
          </div>
        </div>

        {/* Channel sub-nav */}
        <div className="border-t border-slate-100 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <GlobalSellChannelNav />
          </div>
        </div>
      </header>

      {children}

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-sm font-semibold text-slate-800">Global Sell</p>
              <p className="text-xs text-slate-500">Powered by FundiFlow — Kenya&apos;s Tailoring OS</p>
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <Link href="/globalsell" className="hover:text-emerald-600">All Products</Link>
              <Link href="/globalsell/retail" className="hover:text-emerald-600">Retail</Link>
              <Link href="/globalsell/wholesale" className="hover:text-emerald-600">Wholesale</Link>
              <Link href="/globalsell/track" className="hover:text-emerald-600">Track Order</Link>
              <Link href="/dashboard" className="hover:text-emerald-600">Sell Here</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
