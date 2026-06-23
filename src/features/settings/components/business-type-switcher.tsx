"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { useBusinessType } from "@/hooks/useBusinessType";
import {
  BUSINESS_TYPES,
  getBusinessTypeConfig,
  type BusinessType,
} from "@/lib/business-types";
import { updateBusinessType, seedInventoryTaxonomy } from "@/services/firestore.service";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Owner-only card that lets an existing business change its industry preset.
 * Switching updates terminology, navigation and dashboards across the app and
 * tops up the inventory taxonomy with the new industry's defaults. Existing
 * data is never removed, so the change is safe to undo by switching back.
 */
export function BusinessTypeSwitcher() {
  const { business, refreshProfile } = useAuth();
  const current = useBusinessType();
  const [selected, setSelected] = useState<BusinessType>(current.id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const businessId = business?.id;
  const changed = selected !== current.id;
  const nextConfig = getBusinessTypeConfig(selected);

  const apply = async () => {
    if (!businessId || !changed) return;
    setSaving(true);
    try {
      await updateBusinessType(businessId, selected);
      await seedInventoryTaxonomy(
        businessId,
        nextConfig.inventoryCategories,
        nextConfig.inventoryUnits,
      );
      await refreshProfile();
      toast.success(`Switched to ${nextConfig.label}. Your dashboard has been updated.`);
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not switch business type.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border bg-white p-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-emerald-600" />
        <div>
          <h2 className="font-bold">Business Type</h2>
          <p className="text-sm text-gray-500">
            Tailors the words, menu and dashboards to your industry. Currently{" "}
            <span className="font-medium text-slate-700">
              {current.emoji} {current.label}
            </span>
            .
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BUSINESS_TYPES.map((type) => {
          const active = selected === type.id;
          const isCurrent = current.id === type.id;
          return (
            <button
              type="button"
              key={type.id}
              onClick={() => setSelected(type.id)}
              disabled={saving}
              className={cn(
                "flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition",
                active
                  ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                  : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xl leading-none">{type.emoji}</span>
                {isCurrent && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    Current
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-slate-800">{type.label}</span>
              <span className="text-[11px] leading-tight text-slate-500">{type.painSolved}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex justify-end">
        <Button disabled={!changed || saving} onClick={() => setConfirmOpen(true)}>
          {changed ? `Switch to ${nextConfig.label}` : "No changes"}
        </Button>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => !saving && setConfirmOpen(false)}
        title="Switch business type?"
      >
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-slate-600">
            Your workspace will switch from{" "}
            <span className="font-medium">{current.emoji} {current.label}</span> to{" "}
            <span className="font-medium">{nextConfig.emoji} {nextConfig.label}</span>.
          </p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Menu and labels update (e.g. {nextConfig.terms.orders}, {nextConfig.terms.inventory}).
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Default {nextConfig.label} stock categories &amp; units are added.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Your existing materials, orders, customers and money stay exactly as they are.
            </li>
          </ul>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={apply} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Switch now
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
