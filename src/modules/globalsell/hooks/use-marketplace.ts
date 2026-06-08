"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchMarketplaceProducts, fetchEcommerceCategories } from "@/services/ecommerce.service";
import type { EcommerceCategory, EcommerceProduct, MarketplaceFilters } from "@/types/ecommerce";

export function useMarketplace(initialFilters: MarketplaceFilters = {}) {
  const [products, setProducts] = useState<EcommerceProduct[]>([]);
  const [categories, setCategories] = useState<EcommerceCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MarketplaceFilters>({
    page: 1,
    pageSize: 24,
    sortBy: "latest",
    ...initialFilters,
  });

  const load = useCallback(async (f: MarketplaceFilters) => {
    setLoading(true);
    try {
      const result = await fetchMarketplaceProducts(f);
      setProducts(result.products);
      setTotal(result.total);
    } catch {
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEcommerceCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  const updateFilters = useCallback((patch: Partial<MarketplaceFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const totalPages = Math.ceil(total / (filters.pageSize ?? 24));

  return {
    products,
    categories,
    total,
    totalPages,
    loading,
    filters,
    updateFilters,
    goToPage,
  };
}
