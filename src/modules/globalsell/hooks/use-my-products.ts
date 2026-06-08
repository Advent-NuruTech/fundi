"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchMyProducts,
  deleteProduct,
  updateProductStatus,
  ensureStore,
  fetchStoreByBusinessId,
} from "@/services/ecommerce.service";
import type { EcommerceProduct, EcommerceStore } from "@/types/ecommerce";

export function useMyProducts(businessId: string, businessName: string) {
  const [products, setProducts] = useState<EcommerceProduct[]>([]);
  const [store, setStore] = useState<EcommerceStore | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [prods, st] = await Promise.all([
        fetchMyProducts(businessId),
        fetchStoreByBusinessId(businessId),
      ]);
      setProducts(prods);
      setStore(st);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const archiveProduct = useCallback(
    async (productId: string) => {
      await updateProductStatus(productId, businessId, "archived");
      await refresh();
    },
    [businessId, refresh]
  );

  const publishProduct = useCallback(
    async (productId: string) => {
      await updateProductStatus(productId, businessId, "published");
      await refresh();
    },
    [businessId, refresh]
  );

  const removeProduct = useCallback(
    async (productId: string) => {
      await deleteProduct(productId, businessId);
      await refresh();
    },
    [businessId, refresh]
  );

  const getOrCreateStore = useCallback(async () => {
    const s = await ensureStore(businessId, businessName);
    setStore(s);
    return s;
  }, [businessId, businessName]);

  return {
    products,
    store,
    loading,
    refresh,
    archiveProduct,
    publishProduct,
    removeProduct,
    getOrCreateStore,
  };
}
