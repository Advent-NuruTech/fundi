"use client";

import { create } from "zustand";

interface MarketplaceSearchState {
  search: string;
  setSearch: (search: string) => void;
}

export const useMarketplaceSearchStore = create<MarketplaceSearchState>((set) => ({
  search: "",
  setSearch: (search) => set({ search }),
}));
