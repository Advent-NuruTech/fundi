import type { ReactNode } from "react";
import { GlobalSellHeader } from "@/app/globalsell/_components/global-sell-header";
import { GlobalSellFooter } from "@/app/globalsell/_components/global-sell-footer";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-slate-50">
      <GlobalSellHeader />
      {children}
      <GlobalSellFooter />
    </div>
  );
}

