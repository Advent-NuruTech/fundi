"use client";

import { createContext, useContext, useState } from "react";
import type { EcommerceProduct, EcommerceProductVariant } from "@/types/ecommerce";

type VariantSelectionContextValue = {
  selectedVariant: EcommerceProductVariant | null;
  setSelectedVariant: (variant: EcommerceProductVariant | null) => void;
};

const VariantSelectionContext = createContext<VariantSelectionContextValue | null>(null);

function firstAvailableVariant(product: EcommerceProduct) {
  return product.variants?.find((variant) =>
    variant.isAvailable &&
    (!product.trackInventory || product.allowBackorder || variant.stockQuantity > 0)
  ) ?? product.variants?.find((variant) => variant.isAvailable) ?? product.variants?.[0] ?? null;
}

export function ProductVariantProvider({ product, children }: { product: EcommerceProduct; children: React.ReactNode }) {
  const [selectedVariant, setSelectedVariant] = useState<EcommerceProductVariant | null>(() => firstAvailableVariant(product));
  return <VariantSelectionContext.Provider value={{ selectedVariant, setSelectedVariant }}>{children}</VariantSelectionContext.Provider>;
}

export function useProductVariantSelection() {
  const context = useContext(VariantSelectionContext);
  if (!context) throw new Error("ProductVariantProvider is required for product option selection.");
  return context;
}
