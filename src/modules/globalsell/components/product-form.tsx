"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, Upload, Tag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { VariantBuilder } from "./variant-builder";
import type {
  EcommerceCategory,
  EcommerceProduct,
  ProductFormInput,
  VariantFormInput,
} from "@/types/ecommerce";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  basePrice: z.coerce.number().min(0, "Price is required"),
  discountPrice: z.coerce.number().optional(),
  wholesalePrice: z.coerce.number().optional(),
  wholesaleMinQty: z.coerce.number().min(1).optional(),
  saleChannel: z.enum(["retail", "wholesale", "both"]),
  status: z.enum(["draft", "published", "archived", "out_of_stock"]),
  trackInventory: z.boolean(),
  allowBackorder: z.boolean(),
  totalStock: z.coerce.number().min(0),
  tags: z.string().optional(),
  shippingWeight: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ProductFormProps {
  initial?: EcommerceProduct;
  categories: EcommerceCategory[];
  onSubmit: (input: ProductFormInput) => Promise<void>;
  submitLabel?: string;
}

const CHANNEL_OPTIONS = [
  {
    value: "retail" as const,
    label: "Retail",
    desc: "Sell to individual customers",
    icon: Tag,
    color: "border-emerald-500 bg-emerald-50 text-emerald-700",
  },
  {
    value: "wholesale" as const,
    label: "Wholesale",
    desc: "Sell in bulk to businesses",
    icon: Users,
    color: "border-blue-500 bg-blue-50 text-blue-700",
  },
  {
    value: "both" as const,
    label: "Both",
    desc: "Available on both channels",
    icon: Tag,
    color: "border-purple-500 bg-purple-50 text-purple-700",
  },
];

export function ProductForm({
  initial,
  categories,
  onSubmit,
  submitLabel = "Save Product",
}: ProductFormProps) {
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<
    { url: string; altText?: string; isPrimary: boolean }[]
  >(
    initial?.images?.map((img, i) => ({
      url: img.url,
      altText: img.altText,
      isPrimary: img.isPrimary || i === 0,
    })) ?? []
  );
  const [variants, setVariants] = useState<VariantFormInput[]>(
    initial?.variants?.map((v) => ({
      id: crypto.randomUUID(),
      name: v.name,
      options: v.options,
      sku: v.sku,
      priceOverride: v.priceOverride,
      wholesalePrice: v.wholesalePrice,
      wholesaleMinQty: v.wholesaleMinQty,
      stockQuantity: v.stockQuantity,
      images: v.variantImages ?? (v.imageUrl ? [{ url: v.imageUrl, altText: "", isPrimary: true }] : []),
      isAvailable: v.isAvailable,
    })) ?? []
  );
  const [imageUrl, setImageUrl] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      categoryId: initial?.categoryId ?? "",
      brand: initial?.brand ?? "",
      sku: initial?.sku ?? "",
      basePrice: initial?.basePrice ?? 0,
      discountPrice: initial?.discountPrice ?? undefined,
      wholesalePrice: initial?.wholesalePrice ?? undefined,
      wholesaleMinQty: initial?.wholesaleMinQty ?? undefined,
      saleChannel: initial?.saleChannel ?? "retail",
      status: initial?.status ?? "draft",
      trackInventory: initial?.trackInventory ?? true,
      allowBackorder: initial?.allowBackorder ?? false,
      totalStock: initial?.totalStock ?? 0,
      tags: initial?.tags?.join(", ") ?? "",
      shippingWeight: initial?.shippingWeight ?? undefined,
    },
  });

  const basePrice = watch("basePrice");
  const saleChannel = watch("saleChannel");
  const productName = watch("name");
  const showWholesale = saleChannel === "wholesale" || saleChannel === "both";

  function addImage() {
    const url = imageUrl.trim();
    if (!url) return;
    setImages((prev) => [
      ...prev,
      { url, altText: "", isPrimary: prev.length === 0 },
    ]);
    setImageUrl("");
  }

  async function handleFormSubmit(values: FormValues) {
    setSaving(true);
    try {
      const input: ProductFormInput = {
        ...values,
        description: values.description || undefined,
        categoryId: values.categoryId || undefined,
        brand: values.brand || undefined,
        sku: values.sku || undefined,
        discountPrice: values.discountPrice || undefined,
        wholesalePrice: values.wholesalePrice || undefined,
        wholesaleMinQty: values.wholesaleMinQty || undefined,
        shippingWeight: values.shippingWeight || undefined,
        richDescription: undefined,
        tags: values.tags
          ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        images,
        variants,
      };
      await onSubmit(input);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* ── Basic Info ── */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Product Name *
            </label>
            <input
              {...register("name")}
              placeholder="e.g. Men's Slim-Fit Shirt"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Describe your product…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                {...register("categoryId")}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Brand
              </label>
              <input
                {...register("brand")}
                placeholder="Brand name"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                SKU
              </label>
              <input
                {...register("sku")}
                placeholder="Unique product code"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Tags
              </label>
              <input
                {...register("tags")}
                placeholder="shirt, men, formal"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Sale Channel ── */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Channel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {CHANNEL_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = saleChannel === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue("saleChannel", opt.value)}
                  className={cn(
                    "flex flex-col items-start rounded-xl border-2 p-3.5 text-left transition",
                    selected
                      ? opt.color
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <Icon className={cn("h-4 w-4 mb-1.5", selected ? "" : "text-slate-400")} />
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className={cn("text-xs mt-0.5", selected ? "opacity-80" : "text-slate-400")}>
                    {opt.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Pricing ── */}
      <Card>
        <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Base Price (KES) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register("basePrice")}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
              />
              {errors.basePrice && (
                <p className="mt-1 text-xs text-rose-500">{errors.basePrice.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Discount Price (KES)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register("discountPrice")}
                placeholder="Optional sale price"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>
          </div>

          {showWholesale && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Wholesale Pricing
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Wholesale Price (KES)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("wholesalePrice")}
                    placeholder="Bulk unit price"
                    className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Minimum Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    {...register("wholesaleMinQty")}
                    placeholder="e.g. 10"
                    className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400"
                  />
                </div>
              </div>
              <p className="text-xs text-blue-500">
                Variant-level wholesale prices override these defaults.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Inventory ── */}
      <Card>
        <CardHeader><CardTitle>Inventory</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="trackInventory"
              {...register("trackInventory")}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
            <label htmlFor="trackInventory" className="text-sm text-slate-700">
              Track inventory for this product
            </label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="allowBackorder"
              {...register("allowBackorder")}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
            <label htmlFor="allowBackorder" className="text-sm text-slate-700">
              Allow orders when out of stock
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {variants.length > 0 ? "Base Stock (overridden by variants)" : "Stock Quantity"}
              </label>
              <input
                type="number"
                min="0"
                {...register("totalStock")}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Shipping Weight (kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register("shippingWeight")}
                placeholder="0.5"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>
          </div>
          {variants.length > 0 && (
            <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Variant stock totals{" "}
              <span className="font-semibold text-amber-700">
                {variants.reduce((n, v) => n + v.stockQuantity, 0)} units
              </span>{" "}
              — these override the base stock above.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Images ── */}
      <Card>
        <CardHeader><CardTitle>Product Images</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Paste image URL (Cloudinary, etc.)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImage())}
            />
            <Button type="button" size="sm" variant="outline" onClick={addImage}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.altText ?? `Image ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setImages((prev) =>
                          prev.map((im, idx) => ({ ...im, isPrimary: idx === i }))
                        )
                      }
                      className="rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-emerald-700"
                    >
                      {img.isPrimary ? "Primary" : "Set Primary"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="rounded-lg bg-white/90 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    </button>
                  </div>
                  {img.isPrimary && (
                    <span className="absolute bottom-1 left-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs text-white">
                      Main
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Upload className="h-3 w-3" />
            Upload images to Cloudinary first, then paste the URL above
          </p>
        </CardContent>
      </Card>

      {/* ── Variants ── */}
      <Card>
        <CardHeader>
          <CardTitle>Product Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <VariantBuilder
            variants={variants}
            basePrice={basePrice ?? 0}
            productName={productName}
            onChange={setVariants}
          />
        </CardContent>
      </Card>

      {/* ── Publishing ── */}
      <Card>
        <CardHeader><CardTitle>Publishing</CardTitle></CardHeader>
        <CardContent>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
            <select
              {...register("status")}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            >
              <option value="draft">Draft (not visible)</option>
              <option value="published">Published (live on marketplace)</option>
              <option value="archived">Archived</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={saving} className="min-w-[140px] gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
