"use client";

import { useMemo, useState } from "react";
import { Package, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/modules/globalsell/components/product-card";
import type { EcommerceProduct } from "@/types/ecommerce";

interface StorefrontCatalogProps {
  products: EcommerceProduct[];
  storeName: string;
}

function searchableText(product: EcommerceProduct): string {
  return [
    product.name,
    product.description,
    product.richDescription,
    product.brand,
    product.category?.name,
    ...(product.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

export function StorefrontCatalog({ products, storeName }: StorefrontCatalogProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingProducts = useMemo(
    () => normalizedQuery
      ? products.filter((product) => searchableText(product).includes(normalizedQuery))
      : products,
    [normalizedQuery, products]
  );

  return (
    <section aria-labelledby="store-products">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="store-products" className="text-lg font-bold text-slate-900">Products &amp; services</h2>
          <p className="mt-1 text-sm text-slate-500">
            {normalizedQuery
              ? `${matchingProducts.length} result${matchingProducts.length === 1 ? "" : "s"} in ${storeName}`
              : `${products.length} listing${products.length === 1 ? "" : "s"} from ${storeName}`}
          </p>
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${storeName}`}
            aria-label={`Search products and services from ${storeName}`}
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          {query && (
            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full" onClick={() => setQuery("")} aria-label="Clear search">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyCatalog title="No products or services listed yet" description="Check back soon for new listings." />
      ) : matchingProducts.length === 0 ? (
        <EmptyCatalog title="No matching listings" description={`Try another search in ${storeName}'s catalogue.`} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {matchingProducts.map((product) => <ProductCard key={product.id} product={product} showStore={false} />)}
        </div>
      )}
    </section>
  );
}

function EmptyCatalog({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
      <Package className="mb-3 h-12 w-12 text-slate-200" />
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}
