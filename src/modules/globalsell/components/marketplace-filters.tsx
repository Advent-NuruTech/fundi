"use client";

import { Search, SlidersHorizontal, X, Globe, Tag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EcommerceCategory, MarketplaceFilters } from "@/types/ecommerce";

interface MarketplaceFiltersProps {
  filters: MarketplaceFilters;
  categories: EcommerceCategory[];
  onUpdate: (patch: Partial<MarketplaceFilters>) => void;
  hideChannelTabs?: boolean;
}

const CHANNEL_TABS = [
  { value: "all" as const, label: "All", icon: Globe },
  { value: "retail" as const, label: "Retail", icon: Tag },
  { value: "wholesale" as const, label: "Wholesale", icon: Users },
] as const;

export function MarketplaceFilters({
  filters,
  categories,
  onUpdate,
  hideChannelTabs = false,
}: MarketplaceFiltersProps) {
  const activeChannel = filters.channel ?? "all";

  return (
    <div className="space-y-4">
      {/* Channel tabs */}
      {!hideChannelTabs && (
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit">
          {CHANNEL_TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onUpdate({ channel: value === "all" ? undefined : value })}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition",
                activeChannel === value || (value === "all" && !filters.channel)
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search products, stores, brands…"
          value={filters.search ?? ""}
          onChange={(e) => onUpdate({ search: e.target.value || undefined })}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sort */}
        <select
          value={filters.sortBy ?? "latest"}
          onChange={(e) =>
            onUpdate({ sortBy: e.target.value as MarketplaceFilters["sortBy"] })
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
        >
          <option value="latest">Latest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="popular">Most Popular</option>
        </select>

        {/* Price range */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            placeholder="Min"
            min={0}
            value={filters.minPrice ?? ""}
            onChange={(e) =>
              onUpdate({ minPrice: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <span className="text-slate-400 text-sm">–</span>
          <input
            type="number"
            placeholder="Max"
            min={0}
            value={filters.maxPrice ?? ""}
            onChange={(e) =>
              onUpdate({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        {/* In stock toggle */}
        <button
          onClick={() => onUpdate({ inStockOnly: !filters.inStockOnly })}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition",
            filters.inStockOnly
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          In Stock Only
        </button>

        {/* Clear filters */}
        {(filters.search ||
          filters.categorySlug ||
          filters.minPrice !== undefined ||
          filters.maxPrice !== undefined ||
          filters.inStockOnly) && (
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
            className="gap-1 text-slate-500"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onUpdate({ categorySlug: undefined })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              !filters.categorySlug
                ? "border-emerald-500 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                onUpdate({
                  categorySlug:
                    filters.categorySlug === cat.slug ? undefined : cat.slug,
                })
              }
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                filters.categorySlug === cat.slug
                  ? "border-emerald-500 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
   