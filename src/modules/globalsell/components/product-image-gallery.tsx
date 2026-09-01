"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProductVariantSelection } from "./product-variant-context";

export interface ProductGalleryImage {
  id: string;
  url: string;
  altText?: string;
  isPrimary?: boolean;
  variantId?: string;
}

export function ProductImageGallery({
  images,
  productName,
}: {
  images: ProductGalleryImage[];
  productName: string;
}) {
  const { selectedVariant } = useProductVariantSelection();
  const firstImage = images.find((image) => image.isPrimary) ?? images[0];
  const [selectedImage, setSelectedImage] = useState(firstImage);

  useEffect(() => {
    if (!selectedVariant) return;
    const variantImage = images.find((image) => image.variantId === selectedVariant.id && image.isPrimary)
      ?? images.find((image) => image.variantId === selectedVariant.id);
    if (variantImage) setSelectedImage(variantImage);
  }, [images, selectedVariant]);

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-2xl bg-slate-100">
        {selectedImage ? (
          <Image
            src={selectedImage.url}
            alt={selectedImage.altText ?? productName}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-16 w-16 text-slate-300" />
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1" aria-label="Product images">
          {images.map((image) => {
            const active = image.id === selectedImage?.id;
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedImage(image)}
                className={cn(
                  "relative aspect-square w-20 shrink-0 snap-start overflow-hidden rounded-xl border-2 bg-slate-100 sm:w-24",
                  active ? "border-emerald-600" : "border-transparent"
                )}
                aria-label={`View ${image.altText ?? productName}`}
                aria-pressed={active}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
