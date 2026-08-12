"use client";

import { useEffect, useRef, useState } from "react";
import { Package, ChevronLeft, ChevronRight, Loader2, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/modules/globalsell/components/product-card";
import { MarketplaceFilters } from "@/modules/globalsell/components/marketplace-filters";
import { useMarketplace } from "@/modules/globalsell/hooks/use-marketplace";
import { useMarketplaceSearchStore } from "@/store/marketplace-search-store";
import { DiscoverMarquee } from "./discover-marquee";
import { Button } from "@/components/ui/button";
import type { EcommerceSaleChannel } from "@/types/ecommerce";

interface BrowsePageProps {
  channel?: EcommerceSaleChannel;
  heroTitle: string;
  heroSubtitle: string;
  heroBadges?: string[];
}

export function BrowsePage({
  channel,
  heroTitle,
  heroSubtitle,
}: BrowsePageProps) {
  const { products, categories, total, totalPages, loading, filters, updateFilters, goToPage } =
    useMarketplace(channel ? { channel } : {});

  const search = useMarketplaceSearchStore((s) => s.search);
  const setSearch = useMarketplaceSearchStore((s) => s.setSearch);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    updateFilters({ search: search || undefined });
  }, [search, updateFilters]);

  function handlePageChange(page: number) {
    goToPage(page);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleUpdate(patch: Parameters<typeof updateFilters>[0]) {
    updateFilters(patch);
  }

  return (
    <>
      {/* Scrolling announcement — just below the header */}
      <DiscoverMarquee />

      <div ref={topRef} className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {/* Page title */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{heroTitle}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{heroSubtitle}</p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Sidebar — desktop */}
          <aside className="hidden w-64 shrink-0 lg:block lg:self-stretch">
            <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto pr-1">
              <MarketplaceFilters
                filters={filters}
                categories={categories}
                onUpdate={handleUpdate}
              />
            </div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Results summary + mobile filters toggle */}
            <div className="mb-4 flex items-center justify-between gap-3">
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
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </Button>
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
                  onClick={() => {
                    updateFilters({
                      search: undefined,
                      categorySlug: undefined,
                      minPrice: undefined,
                      maxPrice: undefined,
                      inStockOnly: false,
                    });
                    setSearch("");
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
        </div>
      </div>

      {/* Mobile filters drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-white p-5 shadow-xl animate-slide-in-left">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Filters</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                aria-label="Close filters"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <MarketplaceFilters
              filters={filters}
              categories={categories}
              onUpdate={handleUpdate}
            />
          </div>
        </div>
      )}
    </>
  );
}
