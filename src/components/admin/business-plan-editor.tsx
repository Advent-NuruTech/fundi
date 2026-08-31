"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { usePlanConfigs } from "@/hooks/usePlanConfigs";
import { Button } from "@/components/ui/button";
import type { AdminBusinessDetail } from "@/types/admin";
import type { PlanFeatures, PlanLimits } from "@/types/billing";

type StandardPlanSlug = "sindano" | "fundi" | "dhahabu";
type NumericLimitKey = keyof PlanLimits;

const LIMIT_FIELDS: { key: NumericLimitKey; label: string }[] = [
  { key: "maxUsers", label: "Users" },
  { key: "maxCustomers", label: "Customers" },
  { key: "maxOrdersPerMonth", label: "Orders / month" },
  { key: "maxInventoryItems", label: "Inventory items" },
  { key: "smsPerMonth", label: "SMS / month" },
  { key: "maxBranches", label: "Branches" },
  { key: "aiCreditsPerMonth", label: "AI credits / month" },
  { key: "storageGb", label: "Storage (GB)" },
  { key: "globalSellListings", label: "Global Sell listings" },
];

const BOOLEAN_FEATURES: { key: Exclude<keyof PlanFeatures, "aiAssistant">; label: string }[] = [
  { key: "analytics", label: "Analytics" },
  { key: "financeFullDashboard", label: "Full finance dashboard" },
  { key: "teamManagement", label: "Team management" },
  { key: "whatsappNotifications", label: "WhatsApp notifications" },
  { key: "multiLocation", label: "Multi-location" },
  { key: "apiAccess", label: "API access" },
  { key: "customSmsSenderId", label: "Custom SMS Sender ID" },
];

interface Props {
  business: AdminBusinessDetail;
  onSaved: () => void;
}

export function BusinessPlanEditor({ business, onSaved }: Props) {
  const { data: planConfigs } = usePlanConfigs();
  const initialSlug = normalizeSlug(business.planOverride?.basePlanSlug ?? business.subscription?.planSlug);
  const [planSlug, setPlanSlug] = useState<StandardPlanSlug>(initialSlug);
  const [customName, setCustomName] = useState(business.planOverride?.customName ?? "");
  const [limits, setLimits] = useState<PlanLimits>(() =>
    numericLimits(business.effectivePlan?.limits ?? planConfigs.plans[initialSlug].limits)
  );
  const [features, setFeatures] = useState<PlanFeatures>(() =>
    business.effectivePlan?.features ?? planConfigs.plans[initialSlug].features
  );
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const adjustmentCount = useMemo(
    () =>
      Object.keys(business.planOverride?.limits ?? {}).length +
      Object.keys(business.planOverride?.features ?? {}).length +
      (business.planOverride?.customName ? 1 : 0),
    [business.planOverride]
  );

  useEffect(() => {
    const slug = normalizeSlug(
      business.planOverride?.basePlanSlug ?? business.subscription?.planSlug
    );
    const plan = business.effectivePlan ?? planConfigs.plans[slug];
    setPlanSlug(slug);
    setCustomName(business.planOverride?.customName ?? "");
    setLimits(numericLimits(plan.limits));
    setFeatures(plan.features);
  }, [business, planConfigs.plans]);

  function selectBasePlan(slug: StandardPlanSlug) {
    const plan = planConfigs.plans[slug];
    setPlanSlug(slug);
    setCustomName("");
    setLimits(numericLimits(plan.limits));
    setFeatures(plan.features);
  }

  async function post(body: Record<string, unknown>) {
    const response = await fetch(`/api/ffmanage/businesses/${business.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "Could not update business plan");
  }

  async function save() {
    setSaving(true);
    try {
      await post({
        action: "set_plan_override",
        planSlug,
        customName: customName.trim() || null,
        limits,
        features,
      });
      toast.success("Business plan capabilities updated");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update business plan");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setResetting(true);
    try {
      await post({ action: "reset_plan_override" });
      toast.success("Business returned to its base plan defaults");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset business plan");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 lg:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
            <SlidersHorizontal className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-100">Business plan capabilities</h3>
              {business.planOverride ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-medium text-violet-300">
                  <CheckCircle2 className="h-3 w-3" /> {adjustmentCount} custom adjustment{adjustmentCount === 1 ? "" : "s"}
                </span>
              ) : (
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] text-slate-400">
                  Inherits plan defaults
                </span>
              )}
            </div>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Choose one of the three base plans, then adjust only this business. Unchanged fields continue to inherit live platform defaults.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {business.planOverride && (
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              disabled={saving || resetting}
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Reset
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={saving || resetting || !business.subscription}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {!business.subscription && (
        <p className="mt-4 rounded-lg border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
          Add a subscription first, then customise its capabilities.
        </p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-400">
            Base plan
            <select
              value={planSlug}
              onChange={(event) => selectBasePlan(event.target.value as StandardPlanSlug)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500"
            >
              <option value="sindano">Sindano</option>
              <option value="fundi">Fundi</option>
              <option value="dhahabu">Dhahabu</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-400">
            Custom display name
            <input
              value={customName}
              maxLength={80}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder={`${planConfigs.plans[planSlug].name} for ${business.name}`}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500"
            />
          </label>
          <label className="block text-xs font-medium text-slate-400">
            AI Assistant
            <select
              value={features.aiAssistant}
              onChange={(event) =>
                setFeatures({ ...features, aiAssistant: event.target.value as PlanFeatures["aiAssistant"] })
              }
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500"
            >
              <option value="none">Disabled</option>
              <option value="limited">Limited</option>
              <option value="full">Full</option>
            </select>
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Capacity</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LIMIT_FIELDS.map(({ key, label }) => (
                <label key={key} className="text-[11px] font-medium text-slate-500">
                  {label}
                  <input
                    type="number"
                    min={key === "maxBranches" ? 1 : 0}
                    step={key === "storageGb" ? "any" : 1}
                    value={limits[key] ?? 0}
                    onChange={(event) =>
                      setLimits({ ...limits, [key]: Math.max(key === "maxBranches" ? 1 : 0, Number(event.target.value) || 0) })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 text-sm text-slate-200 outline-none focus:border-violet-500"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Features</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {BOOLEAN_FEATURES.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-xs text-slate-300"
                >
                  {label}
                  <input
                    type="checkbox"
                    checked={features[key]}
                    onChange={(event) => setFeatures({ ...features, [key]: event.target.checked })}
                    className="h-4 w-4 accent-violet-500"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeSlug(value?: string | null): StandardPlanSlug {
  return value === "sindano" || value === "dhahabu" ? value : "fundi";
}

function numericLimits(limits: PlanLimits): PlanLimits {
  return Object.fromEntries(
    Object.entries(limits).map(([key, value]) => [key, value ?? (key === "maxBranches" ? 1 : 0)])
  ) as unknown as PlanLimits;
}

