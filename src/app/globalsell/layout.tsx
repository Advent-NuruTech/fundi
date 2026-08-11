import type { ReactNode } from "react";
import Link from "next/link";
import { GlobalSellHeader } from "./_components/global-sell-header";

export const metadata = {
  title: "Global Sell — FundiFlow Marketplace",
  description:
    "Browse and buy from Kenyan tailoring businesses on the Global Sell marketplace.",
};

export default function GlobalSellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-slate-50">
      <GlobalSellHeader />

      {children}

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-sm font-semibold text-slate-800">Global Sell</p>
              <p className="text-xs text-slate-500">Powered by FundiFlow — Kenya&apos;s Tailoring OS</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500">
              <Link href="/globalsell" className="hover:text-emerald-600">All Products</Link>
              <Link href="/globalsell/retail" className="hover:text-emerald-600">Retail</Link>
              <Link href="/globalsell/wholesale" className="hover:text-emerald-600">Wholesale</Link>
              <Link href="/globalsell/both" className="hover:text-emerald-600">Wholesale & Retail</Link>
              <Link href="/globalsell/track" className="hover:text-emerald-600">Track Order</Link>
              <Link href="/dashboard" className="hover:text-emerald-600">Sell Here</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
