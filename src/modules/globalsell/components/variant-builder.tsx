"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantFormInput } from "@/types/ecommerce";

interface VariantBuilderProps {
  variants: VariantFormInput[];
  basePrice: number;
  onChange: (variants: VariantFormInput[]) => void;
}

const PRESET_OPTION_KEYS = ["Size", "Color", "Material", "Style", "Weight", "Unit"];

export function VariantBuilder({ variants, basePrice, onChange }: VariantBuilderProps) {
  const [optionKey, setOptionKey] = useState("Size");
  const [customKey, setCustomKey] = useState("");
  const [optionValues, setOptionValues] = useState("");

  function addVariantsFromOptions() {
    const key = optionKey === "Custom" ? customKey.trim() : optionKey;
    const values = optionValues
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    if (!key || values.length === 0) return;

    const newVariants: VariantFormInput[] = values.map((val) => ({
      name: `${key}: ${val}`,
      options: { [key]: val },
      stockQuantity: 0,
      isAvailable: true,
    }));

    onChange([...variants, ...newVariants]);
    setOptionValues("");
  }

  function updateVariant(index: number, patch: Partial<VariantFormInput>) {
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function removeVariant(index: number) {
    onChange(variants.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {/* Add options */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-medium text-slate-700">Add Variant Options</p>
        <div className="flex gap-2 flex-wrap">
          {PRESET_OPTION_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setOptionKey(k)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                optionKey === k
                  ? "border-emerald-500 bg-emerald-600 text-white"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
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
                ? "border-emerald-500 bg-emerald-600 text-white"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            Custom
          </button>
        </div>

        {optionKey === "Custom" && (
          <input
            type="text"
            placeholder="Custom option name (e.g. Packaging)"
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Values, comma separated (e.g. S, M, L, XL)"
            value={optionValues}
            onChange={(e) => setOptionValues(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <Button type="button" size="sm" onClick={addVariantsFromOptions}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Variants table */}
      {variants.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {variants.length} Variant{variants.length !== 1 ? "s" : ""}
          </p>
          {variants.map((variant, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{variant.name}</p>
              </div>
              <input
                type="text"
                placeholder="SKU"
                value={variant.sku ?? ""}
                onChange={(e) => updateVariant(i, { sku: e.target.value || undefined })}
                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500"
              />
              <input
                type="number"
                placeholder={`Price (${basePrice})`}
                value={variant.priceOverride ?? ""}
                onChange={(e) =>
                  updateVariant(i, {
                    priceOverride: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500"
              />
              <input
                type="number"
                placeholder="Stock"
                value={variant.stockQuantity}
                min={0}
                onChange={(e) =>
                  updateVariant(i, { stockQuantity: Number(e.target.value) })
                }
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => removeVariant(i)}
                className="text-slate-400 hover:text-rose-500 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
