"use client";

import { SlidersHorizontal, X, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EcommerceCategory, MarketplaceFilters } from "@/types/ecommerce";

interface MarketplaceFiltersProps {
  filters: MarketplaceFilters;
  categories: EcommerceCategory[];
  onUpdate: (patch: Partial<MarketplaceFilters>) => void;
  hideChannelTabs?: boolean;
}

export function MarketplaceFilters({
  filters,
  categories,
  onUpdate,
  hideChannelTabs = false,
}: MarketplaceFiltersProps) {
  void hideChannelTabs;

  const hasActiveFilters =
    filters.search ||
    filters.categorySlug ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.inStockOnly;

  return (
    <div className="space-y-7">
      {/* Categories */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <LayoutGrid className="h-4 w-4 text-emerald-600" />
          Categories
        </h3>
        <div className="space-y-1">
          <button
            onClick={() => onUpdate({ categorySlug: undefined })}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition",
              !filters.categorySlug
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            )}
          >
            All Products
          </button>

          {categories.map((cat) => {
            const active = filters.categorySlug === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() =>
                  onUpdate({
                    categorySlug: active ? undefined : cat.slug,
                  })
                }
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <span className="truncate">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Sort */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
          Sort By
        </h3>
        <select
          value={filters.sortBy ?? "latest"}
          onChange={(e) =>
            onUpdate({ sortBy: e.target.value as MarketplaceFilters["sortBy"] })
          }
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
        >
          <option value="latest">Latest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {/* Price range */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Price Range</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            min={0}
            value={filters.minPrice ?? ""}
            onChange={(e) =>
              onUpdate({ minPrice: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
          />
          <span className="shrink-0 text-slate-400 text-sm">–</span>
          <input
            type="number"
            placeholder="Max"
            min={0}
            value={filters.maxPrice ?? ""}
            onChange={(e) =>
              onUpdate({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
          />
        </div>
      </div>

      {/* In stock toggle */}
      <button
        onClick={() => onUpdate({ inStockOnly: !filters.inStockOnly })}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
          filters.inStockOnly
            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        In Stock Only
      </button>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            onUpdate({
              search: undefined,
              categorySlug: undefined,
              minPrice: undefined,
              maxPrice: undefined,
              inStockOnly: false,
            })
          }
          className="w-full gap-1 text-slate-500"
        >
          <X className="h-3.5 w-3.5" />
          Clear All Filters
        </Button>
      )}
    </div>
  );
}
