"use client";

import { use, useEffect, useState } from "react";
import { Loader2, Package } from "lucide-react";
import { fetchStoreBySlug, fetchStoreProducts } from "@/services/ecommerce.service";
import { StoreHeader } from "@/modules/globalsell/components/store-header";
import { ProductCard } from "@/modules/globalsell/components/product-card";
import type { EcommerceProduct, EcommerceStore } from "@/types/ecommerce";

export default function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [store, setStore] = useState<EcommerceStore | null>(null);
  const [products, setProducts] = useState<EcommerceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [st, prods] = await Promise.all([
          fetchStoreBySlug(slug),
          fetchStoreProducts(slug),
        ]);
        if (!st) {
          setNotFound(true);
          return;
        }
        setStore(st);
        setProducts(prods);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (notFound || !store) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <Package className="mx-auto h-16 w-16 text-slate-200 mb-4" />
        <h1 className="text-xl font-semibold text-slate-700">Store not found</h1>
        <p className="mt-1 text-sm text-slate-400">
          This store doesn&apos;t exist or has been deactivated.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      <StoreHeader store={store} />

      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          All Products ({products.length})
        </h2>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-slate-200">
            <Package className="h-12 w-12 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">
              No products listed yet
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Check back soon for new products
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} showStore={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
