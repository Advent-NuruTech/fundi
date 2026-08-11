"use client";

import { Search } from "lucide-react";
import { useMarketplaceSearchStore } from "@/store/marketplace-search-store";

export function MarketplaceSearchBar() {
  const search = useMarketplaceSearchStore((s) => s.search);
  const setSearch = useMarketplaceSearchStore((s) => s.setSearch);

  return (
    <div className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search the best fabric, clothes, suits & more…"
        className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
      />
    </div>
  );
}
