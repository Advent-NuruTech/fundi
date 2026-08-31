"use client";

import { create } from "zustand";

interface MarketplaceFilterState {
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: (open: boolean) => void;
}

/** Shared by the mobile storefront header and marketplace results drawer. */
export const useMarketplaceFilterStore = create<MarketplaceFilterState>((set) => ({
  mobileFiltersOpen: false,
  setMobileFiltersOpen: (mobileFiltersOpen) => set({ mobileFiltersOpen }),
}));
