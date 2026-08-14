import type { ReactNode } from "react";
import { GlobalSellHeader } from "./_components/global-sell-header";
import { GlobalSellFooter } from "./_components/global-sell-footer";

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

      <GlobalSellFooter />
    </div>
  );
}
