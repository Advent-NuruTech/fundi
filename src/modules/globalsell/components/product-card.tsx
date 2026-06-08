"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Star, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKes } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import type { EcommerceProduct } from "@/types/ecommerce";
import { toast } from "sonner";

interface ProductCardProps {
  product: EcommerceProduct;
  showStore?: boolean;
}

export function ProductCard({ product, showStore = true }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  const primaryImage = product.images?.find((i) => i.isPrimary) ?? product.images?.[0];
  const displayPrice = product.discountPrice ?? product.basePrice;
  const hasDiscount = product.discountPrice && product.discountPrice < product.basePrice;
  const inStock = product.totalStock > 0 || !product.trackInventory;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (!inStock) return;
    addItem({
      id: crypto.randomUUID(),
      productId: product.id,
      sellerBusinessId: product.businessId,
      sellerStoreSlug: product.store?.slug ?? "",
      storeName: product.store?.storeName ?? "Unknown Store",
      productName: product.name,
      imageUrl: primaryImage?.url,
      quantity: 1,
      unitPrice: displayPrice,
      maxStock: product.totalStock,
    });
    toast.success(`${product.name} added to cart`);
  }

  return (
    <Link
      href={`/globalsell/product/${product.id}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-slate-100">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.altText ?? product.name}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-12 w-12 text-slate-300" />
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {hasDiscount && (
            <Badge variant="danger" className="text-xs">
              -{Math.round(((product.basePrice - displayPrice) / product.basePrice) * 100)}%
            </Badge>
          )}
          {!inStock && (
            <Badge variant="default" className="text-xs bg-slate-700 text-white">
              Out of Stock
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3">
        {showStore && product.store && (
          <p className="mb-1 truncate text-xs text-emerald-600 font-medium">
            {product.store.storeName}
          </p>
        )}

        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 leading-tight">
          {product.name}
        </h3>

        {product.brand && (
          <p className="mt-0.5 text-xs text-slate-500">{product.brand}</p>
        )}

        {/* Rating placeholder */}
        <div className="mt-1.5 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                "h-3 w-3",
                star <= Math.round(product.ratingAvg)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-slate-200 text-slate-200"
              )}
            />
          ))}
          {product.ratingCount > 0 && (
            <span className="text-xs text-slate-400">({product.ratingCount})</span>
          )}
        </div>

        {/* Price */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-bold text-slate-900">
            {formatKes(displayPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-slate-400 line-through">
              {formatKes(product.basePrice)}
            </span>
          )}
        </div>

        {/* Variants hint */}
        {(product.variants?.length ?? 0) > 0 && (
          <p className="mt-1 text-xs text-slate-400">
            {product.variants!.length} variant{product.variants!.length !== 1 ? "s" : ""} available
          </p>
        )}

        {/* Add to cart */}
        <Button
          size="sm"
          variant={inStock ? "default" : "outline"}
          disabled={!inStock}
          onClick={handleAddToCart}
          className="mt-3 w-full gap-2"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          {inStock ? "Add to Cart" : "Out of Stock"}
        </Button>
      </div>
    </Link>
  );
}
