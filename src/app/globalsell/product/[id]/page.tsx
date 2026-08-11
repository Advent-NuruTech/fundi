"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Package,
  Star,
  ShoppingCart,
  Store,
  ChevronLeft,
  MapPin,
  Check,
} from "lucide-react";
import { fetchProductById, fetchRelatedProducts } from "@/services/ecommerce.service";
import { useCartStore } from "@/store/cart-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/modules/globalsell/components/product-card";
import { formatKes, cn } from "@/lib/utils";
import { toast } from "sonner";
import type { CartItem, EcommerceProduct, EcommerceProductVariant } from "@/types/ecommerce";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<EcommerceProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<EcommerceProduct[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<EcommerceProductVariant | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const cartItems = useCartStore((s) => s.items);
  const router = useRouter();

  useEffect(() => {
    fetchProductById(id)
      .then((p) => {
        setProduct(p);
        if (p?.variants?.length) setSelectedVariant(p.variants[0]);
        if (p) {
          fetchRelatedProducts(p.id, p.categoryId, p.storeId, 8)
            .then(setRelated)
            .catch(() => {})
            .finally(() => setRelatedLoading(false));
        } else {
          setRelatedLoading(false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <Package className="mx-auto h-16 w-16 text-slate-200 mb-4" />
        <h1 className="text-xl font-semibold text-slate-700">Product not found</h1>
      </div>
    );
  }

  const images = product.images ?? [];
  const primaryImage = images[selectedImageIndex] ?? images.find((i) => i.isPrimary) ?? images[0];
  const displayPrice = selectedVariant?.priceOverride
    ? selectedVariant.priceOverride
    : (product.discountPrice ?? product.basePrice);
  const originalPrice = product.basePrice;
  const hasDiscount = displayPrice < originalPrice;
  const inStock =
    (selectedVariant ? selectedVariant.stockQuantity > selectedVariant.reservedQuantity : product.totalStock > product.reservedStock) ||
    !product.trackInventory ||
    product.allowBackorder;

  function buildCartItem(): CartItem {
    return {
      id: crypto.randomUUID(),
      productId: product!.id,
      variantId: selectedVariant?.id,
      sellerBusinessId: product!.businessId,
      sellerStoreSlug: product!.store?.slug ?? "",
      storeName: product!.store?.storeName ?? "Unknown Store",
      productName: product!.name,
      variantName: selectedVariant?.name,
      imageUrl: primaryImage?.url,
      quantity,
      unitPrice: displayPrice,
      maxStock: selectedVariant?.stockQuantity ?? product!.totalStock,
    };
  }

  function handleAddToCart() {
    if (!inStock) return;
    addItem(buildCartItem());
    setAdded(true);
    toast.success("Added to cart!");
    setTimeout(() => setAdded(false), 2000);
  }

  function handleCheckout() {
    if (!product) return;
    if (!inStock) {
      toast.error("This item is out of stock");
      return;
    }
    const existing = cartItems.find(
      (i) =>
        i.productId === product.id &&
        (i.variantId ?? undefined) === (selectedVariant?.id ?? undefined)
    );
    if (existing) {
      updateQuantity(existing.id, quantity);
    } else {
      addItem(buildCartItem());
    }
    router.push("/globalsell/checkout");
  }

  // Group variant options
  const optionGroups: Record<string, string[]> = {};
  for (const variant of product.variants ?? []) {
    for (const [key, val] of Object.entries(variant.options)) {
      if (!optionGroups[key]) optionGroups[key] = [];
      if (!optionGroups[key].includes(val)) optionGroups[key].push(val);
    }
  }

  function selectVariantByOption(key: string, value: string) {
    const match = product!.variants?.find(
      (v) => v.options[key] === value && (selectedVariant ? Object.entries(selectedVariant.options).every(([k, v2]) => k === key || v.options[k] === v2) : true)
    );
    if (match) setSelectedVariant(match);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-8 sm:px-6">
      {/* Back */}
      <Link
        href="/globalsell"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 transition"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl bg-slate-100">
            {primaryImage ? (
              <Image
                src={primaryImage.url}
                alt={primaryImage.altText ?? product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-20 w-20 text-slate-300" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(i)}
                  className={cn(
                    "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition",
                    selectedImageIndex === i
                      ? "border-emerald-500"
                      : "border-transparent hover:border-slate-300"
                  )}
                >
                  <Image src={img.url} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          {/* Store link */}
          {product.store && (
            <Link
              href={`/globalsell/store/${product.store.slug}`}
              className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:underline"
            >
              <Store className="h-4 w-4" />
              {product.store.storeName}
            </Link>
          )}

          <h1 className="text-lg font-bold text-slate-900">{product.name}</h1>

          {product.brand && (
            <p className="text-sm text-slate-500">Brand: {product.brand}</p>
          )}

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-4 w-4",
                    s <= Math.round(product.ratingAvg)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-slate-200 text-slate-200"
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-slate-500">
              {product.ratingCount > 0
                ? `${product.ratingAvg.toFixed(1)} (${product.ratingCount} reviews)`
                : "No reviews yet"}
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-slate-900">
              {formatKes(displayPrice)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-lg text-slate-400 line-through">
                  {formatKes(originalPrice)}
                </span>
                <Badge variant="danger">
                  -{Math.round(((originalPrice - displayPrice) / originalPrice) * 100)}%
                </Badge>
              </>
            )}
          </div>

          {/* Variant selectors */}
          {Object.entries(optionGroups).map(([key, values]) => (
            <div key={key}>
              <p className="mb-2 text-sm font-medium text-slate-700">{key}</p>
              <div className="flex flex-wrap gap-2">
                {values.map((val) => {
                  const isSelected = selectedVariant?.options[key] === val;
                  const hasVariant = product.variants?.some(
                    (v) => v.options[key] === val
                  );
                  return (
                    <button
                      key={val}
                      onClick={() => selectVariantByOption(key, val)}
                      disabled={!hasVariant}
                      className={cn(
                        "rounded-xl border px-4 py-2 text-sm font-medium transition",
                        isSelected
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 text-slate-700 hover:border-slate-300",
                        !hasVariant && "opacity-40 cursor-not-allowed line-through"
                      )}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Stock status */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                inStock ? "bg-emerald-500" : "bg-slate-300"
              )}
            />
            <span className="text-sm text-slate-600">
              {inStock
                ? product.totalStock > 0
                  ? `${product.totalStock} in stock`
                  : "Available"
                : "Out of stock"}
            </span>
          </div>

          {/* Description */}
          {product.description && (
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Description</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="default">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Store location */}
          {product.store?.location && (
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin className="h-4 w-4 text-emerald-500" />
              {product.store.location}
            </div>
          )}
        </div>
      </div>

      {/* You may also like */}
      {!relatedLoading && related.length > 0 && (
        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">You may also like</h2>
            <Link
              href="/globalsell"
              className="text-sm text-emerald-600 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} showStore />
            ))}
          </div>
        </div>
      )}

      {/* Floating quantity + add to cart + checkout bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-1.5">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              aria-label="Decrease quantity"
              className="h-10 w-8 flex items-center justify-center text-slate-600 hover:text-slate-900"
            >
              −
            </button>
            <span className="w-7 text-center text-sm font-semibold">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              aria-label="Increase quantity"
              className="h-10 w-8 flex items-center justify-center text-slate-600 hover:text-slate-900"
            >
              +
            </button>
          </div>

          <Button
            onClick={handleAddToCart}
            disabled={!inStock}
            size="lg"
            className={cn("flex-1 gap-2", added && "bg-emerald-700")}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" />
                Added!
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </>
            )}
          </Button>

          <Button
            onClick={handleCheckout}
            disabled={!inStock}
            size="lg"
            variant="outline"
            className="flex-1 gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          >
            Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
