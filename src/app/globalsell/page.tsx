"use client";

import { useEffect, useRef } from "react";
import { Package, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ProductCard } from "@/modules/globalsell/components/product-card";
import { MarketplaceFilters } from "@/modules/globalsell/components/marketplace-filters";
import { useMarketplace } from "@/modules/globalsell/hooks/use-marketplace";
import { Button } from "@/components/ui/button";

export default function GlobalSellMarketplacePage() {
  const { products, categories, total, totalPages, loading, filters, updateFilters, goToPage } =
    useMarketplace();

  const topRef = useRef<HTMLDivElement>(null);

  function handlePageChange(page: number) {
    goToPage(page);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 sm:p-10 text-white">
        <h1 className="text-2xl font-bold sm:text-4xl">Global Sell Marketplace</h1>
        <p className="mt-2 text-emerald-100 sm:text-lg">
          Discover quality products from Kenyan tailoring businesses
        </p>
        <div className="mt-4 flex gap-3 text-sm font-medium">
          <span className="rounded-full bg-white/20 px-3 py-1">🇰🇪 Kenyan Businesses</span>
          <span className="rounded-full bg-white/20 px-3 py-1">✓ Verified Sellers</span>
          <span className="rounded-full bg-white/20 px-3 py-1">📦 Nationwide Delivery</span>
        </div>
      </div>

      <div ref={topRef} />

      {/* Filters */}
      <div className="mb-6">
        <MarketplaceFilters
          filters={filters}
          categories={categories}
          onUpdate={updateFilters}
        />
      </div>

      {/* Results summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {loading ? (
            "Loading…"
          ) : (
            <>
              <span className="font-semibold text-slate-900">{total}</span> product
              {total !== 1 ? "s" : ""} found
            </>
          )}
        </p>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Package className="h-16 w-16 text-slate-200 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No products found</h3>
          <p className="text-sm text-slate-400 mt-1">
            Try adjusting your search or filters
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() =>
              updateFilters({
                search: undefined,
                categorySlug: undefined,
                minPrice: undefined,
                maxPrice: undefined,
                inStockOnly: false,
              })
            }
          >
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} showStore />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page === 1}
            onClick={() => handlePageChange((filters.page ?? 1) - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const page = i + 1;
            return (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`h-9 w-9 rounded-xl text-sm font-medium transition ${
                  filters.page === page
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            disabled={filters.page === totalPages}
            onClick={() => handlePageChange((filters.page ?? 1) + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
