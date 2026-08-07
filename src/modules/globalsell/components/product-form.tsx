"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2, Plus, Trash2, Upload, Tag, Users,
  RefreshCw, ImageIcon, Link as LinkIcon, X,
} from "lucide-react";
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

// ── SKU helpers ───────────────────────────────────────────────────────────────

function slugify(text: string) {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 12);
}

function randomSuffix(len = 4) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function buildAutoSku(name: string) {
  const base = slugify(name);
  return base ? `${base}-${randomSuffix()}` : "";
}

// ── Cloudinary direct upload (no DB metadata row needed) ──────────────────────

async function uploadToCloudinary(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please select a valid image file.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Image must be 10 MB or smaller.");

  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!preset || !cloud) throw new Error("Cloudinary is not configured.");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", preset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const json = await res.json() as { secure_url: string };
  return json.secure_url;
}

// ── Zod schema ────────────────────────────────────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductImage { url: string; altText?: string; isPrimary: boolean }

interface ProductFormProps {
  initial?: EcommerceProduct;
  categories: EcommerceCategory[];
  onSubmit: (input: ProductFormInput) => Promise<void>;
  submitLabel?: string;
}

const CHANNEL_OPTIONS = [
  { value: "retail" as const,    label: "Retail",    desc: "Sell to individual customers",   icon: Tag,   color: "border-emerald-500 bg-emerald-50 text-emerald-700" },
  { value: "wholesale" as const, label: "Wholesale", desc: "Sell in bulk to businesses",      icon: Users, color: "border-blue-500 bg-blue-50 text-blue-700" },
  { value: "both" as const,      label: "Both",      desc: "Available on both channels",      icon: Tag,   color: "border-purple-500 bg-purple-50 text-purple-700" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductForm({ initial, categories, onSubmit, submitLabel = "Save Product" }: ProductFormProps) {
  // FundiFlow is tailoring & fashion only, so the default channel is retail.
  // Existing products keep their own value.
  const defaultChannel = "retail";
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<ProductImage[]>(
    initial?.images?.map((img, i) => ({ url: img.url, altText: img.altText, isPrimary: img.isPrimary || i === 0 })) ?? []
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

  // Image input state
  const [imageUrl, setImageUrl] = useState("");
  const [imgUploading, setImgUploading] = useState(false);
  const [imgTab, setImgTab] = useState<"url" | "upload">("url");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SKU auto-gen tracking: true = user hasn't manually edited the SKU
  const skuIsAuto = useRef(!initial?.sku);

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
      saleChannel: initial?.saleChannel ?? defaultChannel,
      status: initial?.status ?? "draft",
      trackInventory: initial?.trackInventory ?? true,
      allowBackorder: initial?.allowBackorder ?? false,
      totalStock: initial?.totalStock ?? 0,
      tags: initial?.tags?.join(", ") ?? "",
      shippingWeight: initial?.shippingWeight ?? undefined,
    },
  });

  const nameVal = watch("name");
  const basePrice = watch("basePrice");
  const saleChannel = watch("saleChannel");
  const showWholesale = saleChannel === "wholesale" || saleChannel === "both";

  // Auto-generate SKU when name changes and SKU hasn't been manually edited
  useEffect(() => {
    if (!skuIsAuto.current) return;
    const generated = buildAutoSku(nameVal);
    if (generated) setValue("sku", generated);
  }, [nameVal, setValue]);

  function regenerateSku() {
    const generated = buildAutoSku(nameVal);
    if (generated) {
      skuIsAuto.current = true;
      setValue("sku", generated);
    }
  }

  // ── Image helpers ────────────────────────────────────────────────────────────

  function addImageByUrl() {
    const url = imageUrl.trim();
    if (!url) return;
    setImages((prev) => [...prev, { url, altText: "", isPrimary: prev.length === 0 }]);
    setImageUrl("");
  }

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setImgUploading(true);
    try {
      const urls = await Promise.all(files.map((f) => uploadToCloudinary(f)));
      setImages((prev) => [
        ...prev,
        ...urls.map((url, i) => ({ url, altText: "", isPrimary: prev.length === 0 && i === 0 })),
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setImgUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  function setPrimary(idx: number) {
    setImages((prev) => prev.map((im, i) => ({ ...im, isPrimary: i === idx })));
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length > 0 && !next.some((i) => i.isPrimary)) next[0] = { ...next[0], isPrimary: true };
      return next;
    });
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

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
        tags: values.tags ? values.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        images,
        variants,
      };
      await onSubmit(input);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">

      {/* ── Basic Info ── */}
      <Card>
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Product Name *</label>
            <input
              {...register("name")}
              placeholder="e.g. Men's Slim-Fit Shirt"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Describe your product…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
              <select
                {...register("categoryId")}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Brand</label>
              <input
                {...register("brand")}
                placeholder="Brand name"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>
          </div>

          {/* SKU — auto-generated, manually editable, with Regenerate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                SKU
                <span className="ml-1.5 text-xs font-normal text-slate-400">(auto-generated)</span>
              </label>
              <div className="flex gap-2">
                <input
                  {...register("sku", {
                    onChange: () => { skuIsAuto.current = false; },
                  })}
                  placeholder="SHIRT-AB12"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={regenerateSku}
                  title="Regenerate SKU"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Tags</label>
              <input
                {...register("tags")}
                placeholder="shirt, men, formal"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>
          </div>

        </CardContent>
      </Card>

      {/* ── Sales Channel ── */}
      <Card>
        <CardHeader><CardTitle>Sales Channel</CardTitle></CardHeader>
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
                    selected ? opt.color : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <Icon className={cn("h-4 w-4 mb-1.5", selected ? "" : "text-slate-400")} />
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className={cn("text-xs mt-0.5", selected ? "opacity-80" : "text-slate-400")}>{opt.desc}</p>
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Base Price (KES) *</label>
              <input
                type="number" step="0.01" min="0"
                {...register("basePrice")}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
              />
              {errors.basePrice && <p className="mt-1 text-xs text-rose-500">{errors.basePrice.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Discount Price (KES)</label>
              <input
                type="number" step="0.01" min="0"
                {...register("discountPrice")}
                placeholder="Optional sale price"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>
          </div>

          {showWholesale && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Wholesale Pricing
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">Wholesale Price (KES)</label>
                  <input
                    type="number" step="0.01" min="0"
                    {...register("wholesalePrice")}
                    placeholder="Bulk unit price"
                    className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">Minimum Qty</label>
                  <input
                    type="number" min="1"
                    {...register("wholesaleMinQty")}
                    placeholder="e.g. 10"
                    className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400"
                  />
                </div>
              </div>
              <p className="text-xs text-blue-500">Variant-level wholesale prices override these defaults.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Inventory ── */}
      <Card>
        <CardHeader><CardTitle>Inventory</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="trackInventory" {...register("trackInventory")} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
            <label htmlFor="trackInventory" className="text-sm text-slate-700">Track inventory for this product</label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="allowBackorder" {...register("allowBackorder")} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
            <label htmlFor="allowBackorder" className="text-sm text-slate-700">Allow orders when out of stock</label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {variants.length > 0 ? "Base Stock (overridden by variants)" : "Stock Quantity"}
              </label>
              <input
                type="number" min="0"
                {...register("totalStock")}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Shipping Weight (kg)</label>
              <input
                type="number" step="0.01" min="0"
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

      {/* ── Product Images ── */}
      <Card>
        <CardHeader><CardTitle>Product Images</CardTitle></CardHeader>
        <CardContent className="space-y-3">

          {/* Tab toggle */}
          <div className="flex rounded-xl border border-slate-200 overflow-hidden w-fit text-sm">
            <button
              type="button"
              onClick={() => setImgTab("url")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 transition font-medium",
                imgTab === "url" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Paste URL
            </button>
            <button
              type="button"
              onClick={() => setImgTab("upload")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 transition font-medium",
                imgTab === "upload" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload File
            </button>
          </div>

          {/* URL paste */}
          {imgTab === "url" && (
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste Cloudinary or any image URL…"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImageByUrl())}
              />
              <Button type="button" size="sm" variant="outline" onClick={addImageByUrl}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* File upload */}
          {imgTab === "upload" && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                disabled={imgUploading}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-sm transition",
                  imgUploading
                    ? "border-emerald-300 bg-emerald-50 text-emerald-600 cursor-wait"
                    : "border-slate-200 text-slate-500 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer"
                )}
              >
                {imgUploading ? (
                  <>
                    <Loader2 className="h-7 w-7 animate-spin" />
                    <span>Uploading…</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-7 w-7" />
                    <span className="font-medium">Click to select images</span>
                    <span className="text-xs text-slate-400">JPG, PNG, WEBP · max 10 MB each</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Image grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {images.map((img, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.altText ?? `Image ${i + 1}`} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1 p-1">
                    {!img.isPrimary && (
                      <button
                        type="button"
                        onClick={() => setPrimary(i)}
                        className="rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-emerald-700 w-full text-center"
                      >
                        Set Main
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90"
                    >
                      <X className="h-3.5 w-3.5 text-rose-600" />
                    </button>
                  </div>
                  {img.isPrimary && (
                    <span className="absolute bottom-1 left-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs text-white leading-none">
                      Main
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Variants ── */}
      <Card>
        <CardHeader><CardTitle>Product Variants</CardTitle></CardHeader>
        <CardContent>
          <VariantBuilder
            variants={variants}
            basePrice={basePrice ?? 0}
            productName={nameVal}
            onChange={setVariants}
          />
        </CardContent>
      </Card>

      {/* ── Publishing ── */}
      <Card>
        <CardHeader><CardTitle>Publishing</CardTitle></CardHeader>
        <CardContent>
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
