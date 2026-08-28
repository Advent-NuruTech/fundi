"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, Trash2, X, ChevronDown, ChevronUp, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantFormInput, VariantImage } from "@/types/ecommerce";

interface VariantBuilderProps {
  variants: VariantFormInput[];
  basePrice: number;
  productName?: string;
  onChange: (variants: VariantFormInput[]) => void;
}

const PRESET_OPTION_KEYS = ["Size", "Color", "Material", "Style", "Weight", "Unit"];

function slugPart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 10);
}

// Deterministic SKU: sorted option keys so same combo always → same SKU
function generateSku(productName: string, options: Record<string, string>): string {
  const base = slugPart(productName || "product").toUpperCase();
  const optionPart = Object.keys(options)
    .sort()
    .map((k) => slugPart(options[k]).toUpperCase())
    .join("-");
  return `${base}-${optionPart}`;
}

function deriveVariantName(options: Record<string, string>): string {
  return Object.values(options).join(" / ");
}

// Cartesian product of all option combinations
function cartesian(optionMap: Record<string, string[]>): Record<string, string>[] {
  const keys = Object.keys(optionMap);
  if (keys.length === 0) return [];
  return keys.reduce<Record<string, string>[]>((acc, key) => {
    const vals = optionMap[key];
    if (acc.length === 0) return vals.map((v) => ({ [key]: v }));
    return acc.flatMap((combo) => vals.map((v) => ({ ...combo, [key]: v })));
  }, []);
}

export function VariantBuilder({
  variants,
  basePrice,
  productName = "product",
  onChange,
}: VariantBuilderProps) {
  const [optionKey, setOptionKey] = useState("Size");
  const [customKey, setCustomKey] = useState("");
  const [optionValues, setOptionValues] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reconstruct the option map from existing variants
  const optionMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    variants.forEach((v) => {
      Object.entries(v.options).forEach(([k, val]) => {
        if (!map[k]) map[k] = new Set();
        map[k].add(val);
      });
    });
    return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Array.from(v)]));
  }, [variants]);

  function addOptions() {
    const key = optionKey === "Custom" ? customKey.trim() : optionKey;
    if (!key || !optionValues.trim()) return;
    const values = optionValues.split(",").map((v) => v.trim()).filter(Boolean);
    const updatedMap = { ...optionMap, [key]: [...new Set([...(optionMap[key] ?? []), ...values])] };
    rebuildVariants(updatedMap);
    setOptionValues("");
  }

  function removeOptionKey(key: string) {
    const updatedMap = Object.fromEntries(Object.entries(optionMap).filter(([k]) => k !== key));
    rebuildVariants(updatedMap);
  }

  function rebuildVariants(updatedMap: Record<string, string[]>) {
    const combos = cartesian(updatedMap);
    if (combos.length === 0) { onChange([]); return; }

    // Preserve existing variant data by matching options
    const existingByOptions = new Map(
      variants.map((v) => [JSON.stringify(v.options), v])
    );

    const newVariants: VariantFormInput[] = combos.map((options) => {
      const key = JSON.stringify(options);
      const existing = existingByOptions.get(key);
      return existing
        ? { ...existing, options, sku: existing.sku || generateSku(productName, options) }
        : {
            id: crypto.randomUUID(),
            name: deriveVariantName(options),
            options,
            sku: generateSku(productName, options),
            stockQuantity: 0,
            priceOverride: undefined,
            wholesalePrice: undefined,
            wholesaleMinQty: undefined,
            images: [],
            isAvailable: true,
          };
    });

    onChange(newVariants);
  }

  const updateVariant = useCallback(
    (id: string, patch: Partial<VariantFormInput>) => {
      onChange(variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    },
    [variants, onChange]
  );

  function removeVariant(id: string) {
    onChange(variants.filter((v) => v.id !== id));
  }

  function addVariantImage(id: string, url: string) {
    const v = variants.find((x) => x.id === id);
    if (!v || !url.trim()) return;
    const img: VariantImage = { url: url.trim(), altText: "", isPrimary: v.images.length === 0 };
    updateVariant(id, { images: [...v.images, img] });
  }

  function removeVariantImage(variantId: string, imgIdx: number) {
    const v = variants.find((x) => x.id === variantId);
    if (!v) return;
    const next = v.images.filter((_, i) => i !== imgIdx);
    if (next.length > 0 && !next.some((i) => i.isPrimary)) next[0] = { ...next[0], isPrimary: true };
    updateVariant(variantId, { images: next });
  }

  function setPrimaryImage(variantId: string, imgIdx: number) {
    const v = variants.find((x) => x.id === variantId);
    if (!v) return;
    updateVariant(variantId, { images: v.images.map((img, i) => ({ ...img, isPrimary: i === imgIdx })) });
  }

  const usedKeys = Object.keys(optionMap);

  return (
    <div className="space-y-5">
      {/* ── Active option axes ────────────────────────────────────── */}
      {usedKeys.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {usedKeys.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700"
            >
              {k}: {optionMap[k].join(", ")}
              <button
                type="button"
                onClick={() => removeOptionKey(k)}
                aria-label={`Remove ${k} option`}
                className="ml-0.5 rounded-full hover:bg-emerald-100 p-0.5 transition"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Option builder ────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Add Option Axis
        </p>

        <div className="flex flex-wrap gap-1.5">
          {PRESET_OPTION_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setOptionKey(k)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                optionKey === k
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-emerald-400"
              )}
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOptionKey("Custom")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              optionKey === "Custom"
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-emerald-400"
            )}
          >
            + Custom
          </button>
        </div>

        {optionKey === "Custom" && (
          <input
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            placeholder="Option name (e.g. Fabric)"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        )}

        <div className="flex gap-2">
          <input
            value={optionValues}
            onChange={(e) => setOptionValues(e.target.value)}
            placeholder={optionKey === "Custom" ? "Values: Red, Blue, Green" : `${optionKey} values: S, M, L, XL`}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOptions())}
          />
          <Button type="button" size="sm" onClick={addOptions} className="shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Add</span>
          </Button>
        </div>
      </div>

      {/* ── Variant matrix ────────────────────────────────────────── */}
      {variants.length > 0 && (
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[720px] space-y-1.5">
          <div className="grid grid-cols-[1fr_80px_72px_72px_72px_32px] gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span>Variant</span>
            <span>SKU</span>
            <span>Retail KES</span>
            <span>Wholesale</span>
            <span>Stock</span>
            <span />
          </div>

          {variants.map((v) => {
            const isExpanded = expandedId === v.id;
            const primaryImg = v.images.find((i) => i.isPrimary) ?? v.images[0];

            return (
              <div
                key={v.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden"
              >
                {/* ── Summary row ── */}
                <div className="grid grid-cols-[1fr_80px_72px_72px_72px_32px] items-center gap-2 px-3 py-2.5">
                  {/* Label + image thumb */}
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : v.id)}
                      aria-label={`${isExpanded ? "Collapse" : "Expand"} ${v.name} variant`}
                      className="shrink-0 text-slate-400 hover:text-emerald-600"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    {primaryImg ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={primaryImg.url}
                        alt={primaryImg.altText || v.name}
                        className="h-8 w-8 shrink-0 rounded-lg object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="h-8 w-8 shrink-0 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                        <ImageIcon className="h-3.5 w-3.5 text-slate-300" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{v.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{v.sku}</p>
                    </div>
                  </div>

                  {/* SKU (editable) */}
                  <input
                    type="text"
                    value={v.sku ?? ""}
                    onChange={(e) => updateVariant(v.id, { sku: e.target.value || undefined })}
                    placeholder="Auto"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-emerald-400 focus:bg-white"
                  />

                  {/* Retail price override */}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={String(basePrice)}
                    value={v.priceOverride ?? ""}
                    onChange={(e) =>
                      updateVariant(v.id, { priceOverride: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-emerald-400 focus:bg-white"
                  />

                  {/* Wholesale price */}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="—"
                    value={v.wholesalePrice ?? ""}
                    onChange={(e) =>
                      updateVariant(v.id, { wholesalePrice: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-emerald-400 focus:bg-white"
                  />

                  {/* Stock */}
                  <input
                    type="number"
                    min="0"
                    value={v.stockQuantity}
                    onChange={(e) => updateVariant(v.id, { stockQuantity: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-emerald-400 focus:bg-white"
                  />

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeVariant(v.id)}
                    aria-label={`Remove ${v.name} variant`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* ── Expanded detail ── */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-3">
                    {/* Wholesale min qty */}
                    <div className="flex items-center gap-3">
                      <label className="w-40 text-xs text-slate-500 shrink-0">Wholesale min. qty</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={v.wholesaleMinQty ?? ""}
                        onChange={(e) =>
                          updateVariant(v.id, { wholesaleMinQty: e.target.value ? Number(e.target.value) : undefined })
                        }
                        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-emerald-400"
                      />
                    </div>

                    {/* Available toggle */}
                    <div className="flex items-center gap-3">
                      <label className="w-40 text-xs text-slate-500 shrink-0">Available for sale</label>
                      <button
                        type="button"
                        onClick={() => updateVariant(v.id, { isAvailable: !v.isAvailable })}
                        aria-label={`${v.isAvailable ? "Disable" : "Enable"} ${v.name} for sale`}
                        aria-pressed={v.isAvailable}
                        className={cn(
                          "relative h-5 w-9 rounded-full transition",
                          v.isAvailable ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                            v.isAvailable ? "translate-x-4" : "translate-x-0.5"
                          )}
                        />
                      </button>
                    </div>

                    {/* Variant images */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-600">Variant Images</p>
                      <VariantImageInput
                        variantId={v.id}
                        images={v.images}
                        onAdd={addVariantImage}
                        onRemove={removeVariantImage}
                        onSetPrimary={setPrimaryImage}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Summary bar */}
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
            <span>
              {variants.length} variant{variants.length !== 1 ? "s" : ""}
              {" · "}
              {variants.reduce((n, v) => n + v.stockQuantity, 0)} total units
            </span>
            <span className="text-emerald-600 font-medium">
              From KES {Math.min(...variants.map((v) => v.priceOverride ?? basePrice)).toLocaleString()}
            </span>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Variant image sub-component ───────────────────────────────────────────────

function VariantImageInput({
  variantId,
  images,
  onAdd,
  onRemove,
  onSetPrimary,
}: {
  variantId: string;
  images: VariantImage[];
  onAdd: (variantId: string, url: string) => void;
  onRemove: (variantId: string, idx: number) => void;
  onSetPrimary: (variantId: string, idx: number) => void;
}) {
  const [url, setUrl] = useState("");

  function handleAdd() {
    if (!url.trim()) return;
    onAdd(variantId, url);
    setUrl("");
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="Paste Cloudinary URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-emerald-400"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-emerald-600 hover:bg-emerald-50 transition"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="group relative h-14 w-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.altText || `Image ${i + 1}`}
                className={cn(
                  "h-full w-full rounded-lg object-cover border-2 transition",
                  img.isPrimary ? "border-emerald-500" : "border-slate-200"
                )}
              />
              <div className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1">
                {!img.isPrimary && (
                  <button
                    type="button"
                    onClick={() => onSetPrimary(variantId, i)}
                    className="text-[9px] font-bold text-white bg-emerald-500 rounded px-1 py-0.5 leading-none"
                  >
                    Main
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(variantId, i)}
                  className="text-white hover:text-rose-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {img.isPrimary && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
