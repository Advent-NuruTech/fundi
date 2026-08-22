"use client";

import { useMemo, useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { cn, formatKes } from "@/lib/utils";
import { shopUrl } from "@/lib/storefront-url";
import type { CartItem, EcommerceProduct, EcommerceProductVariant } from "@/types/ecommerce";

export function ProductPurchasePanel({ product }: { product: EcommerceProduct }) {
  const [selectedVariant, setSelectedVariant] = useState<EcommerceProductVariant | null>(() =>
    product.variants?.find((variant) =>
      variant.isAvailable &&
      (!product.trackInventory || product.allowBackorder || variant.stockQuantity > 0)
    ) ?? product.variants?.find((variant) => variant.isAvailable) ?? product.variants?.[0] ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const router = useRouter();

  const optionGroups = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const variant of product.variants ?? []) {
      for (const [key, value] of Object.entries(variant.options)) {
        groups[key] ??= [];
        if (!groups[key].includes(value)) groups[key].push(value);
      }
    }
    return groups;
  }, [product.variants]);

  const variantWholesaleMinimum = selectedVariant?.wholesaleMinQty ?? product.wholesaleMinQty ?? 1;
  const productWholesaleMinimum = product.wholesaleMinQty ?? 1;
  const displayPrice = selectedVariant?.wholesalePrice !== undefined &&
    selectedVariant.wholesalePrice !== null && quantity >= variantWholesaleMinimum
    ? selectedVariant.wholesalePrice
    : product.wholesalePrice !== undefined &&
        product.wholesalePrice !== null && quantity >= productWholesaleMinimum
      ? product.wholesalePrice
      : selectedVariant?.priceOverride ?? product.discountPrice ?? product.basePrice;
  const inStock =
    !product.trackInventory ||
    product.allowBackorder ||
    (selectedVariant
      ? selectedVariant.isAvailable && selectedVariant.stockQuantity > 0
      : product.totalStock > 0);
  const inventoryLimit = product.trackInventory && !product.allowBackorder
    ? selectedVariant?.stockQuantity ?? product.totalStock
    : undefined;
  const maxQuantity = Math.max(1, Math.min(1000, inventoryLimit ?? 1000));

  function selectOption(key: string, value: string) {
    const match = product.variants?.find((variant) =>
      variant.options[key] === value &&
      (!selectedVariant || Object.entries(selectedVariant.options).every(([otherKey, otherValue]) =>
        otherKey === key || variant.options[otherKey] === otherValue
      ))
    );
    if (match) {
      setSelectedVariant(match);
      if (product.trackInventory && !product.allowBackorder) {
        setQuantity((current) => Math.max(1, Math.min(current, match.stockQuantity)));
      }
    }
  }

  function cartItem(): CartItem {
    const primaryImage = selectedVariant?.imageUrl ?? product.images?.find((image) => image.isPrimary)?.url ?? product.images?.[0]?.url;
    return {
      id: crypto.randomUUID(),
      productId: product.id,
      variantId: selectedVariant?.id,
      sellerBusinessId: product.businessId,
      sellerStoreSlug: product.store?.publicHandle ?? product.store?.slug ?? "",
      storeName: product.store?.storeName ?? "Store",
      productName: product.name,
      variantName: selectedVariant?.name,
      imageUrl: primaryImage,
      quantity,
      unitPrice: displayPrice,
      maxStock: inventoryLimit,
    };
  }

  function addToCart(goToCheckout = false) {
    if (!inStock) return;
    addItem(cartItem());
    if (goToCheckout) {
      router.push(shopUrl("checkout"));
      return;
    }
    setAdded(true);
    toast.success("Added to cart");
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-bold text-slate-900">{formatKes(displayPrice)}</span>
        {displayPrice < product.basePrice && (
          <><span className="text-lg text-slate-400 line-through">{formatKes(product.basePrice)}</span><Badge variant="danger">Sale</Badge></>
        )}
      </div>

      {Object.entries(optionGroups).map(([key, values]) => (
        <fieldset key={key}>
          <legend className="mb-2 text-sm font-medium text-slate-700">{key}</legend>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => selectOption(key, value)}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm font-medium transition",
                  selectedVariant?.options[key] === value
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-700 hover:border-slate-300"
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span className={cn("h-2 w-2 rounded-full", inStock ? "bg-emerald-500" : "bg-slate-300")} />
        {inStock ? "In stock" : "Out of stock"}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center rounded-xl border border-slate-200 bg-white">
          <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-11 w-10" aria-label="Decrease quantity">−</button>
          <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
          <button type="button" onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))} disabled={quantity >= maxQuantity} className="h-11 w-10 disabled:cursor-not-allowed disabled:text-slate-300" aria-label="Increase quantity">+</button>
        </div>
        <Button type="button" size="lg" disabled={!inStock} onClick={() => addToCart(false)} className="min-w-40 flex-1 gap-2">
          {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          {added ? "Added" : "Add to cart"}
        </Button>
        <Button type="button" size="lg" variant="outline" disabled={!inStock} onClick={() => addToCart(true)} className="min-w-32 flex-1 border-emerald-600 text-emerald-700">
          Buy now
        </Button>
      </div>
    </div>
  );
}
