"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { Loader2, Save, RotateCcw, Tag, MessageSquare, CheckCircle2 } from "lucide-react";
import { cn, formatKes } from "@/lib/utils";
import type { PlanConfig } from "@/types/billing";

type StandardSlug = "sindano" | "fundi" | "dhahabu";

interface LimitValues {
  maxUsers: number;
  maxCustomers: number;
  maxOrdersPerMonth: number;
  maxInventoryItems: number;
  smsPerMonth: number;
  maxBranches: number;
  aiCreditsPerMonth: number;
  storageGb: number;
  globalSellListings: number;
}

interface PlanForm {
  monthlyPrice: number;
  introPrice: number;
  annualPrice: number;
  limits: LimitValues;
}

interface LoadedData {
  defaults: { plans: Record<StandardSlug, PlanConfig>; smsSenderIdPrice: number };
  effective: { plans: Record<StandardSlug, PlanConfig>; smsSenderIdPrice: number };
  overrides: Record<StandardSlug, Partial<PlanForm> | null>;
}

const SLUGS: StandardSlug[] = ["sindano", "fundi", "dhahabu"];

const LIMIT_FIELDS: { key: keyof LimitValues; label: string }[] = [
  { key: "maxUsers", label: "Max users" },
  { key: "maxCustomers", label: "Max customers" },
  { key: "maxOrdersPerMonth", label: "Orders / month" },
  { key: "maxInventoryItems", label: "Inventory items" },
  { key: "smsPerMonth", label: "SMS / month" },
  { key: "maxBranches", label: "Max branches" },
  { key: "aiCreditsPerMonth", label: "AI credits / month" },
  { key: "storageGb", label: "Storage (GB)" },
  { key: "globalSellListings", label: "Marketplace listings" },
];

function fromPlan(plan: PlanConfig): PlanForm {
  return {
    monthlyPrice: plan.monthlyPrice,
    introPrice: plan.introPrice,
    annualPrice: plan.annualPrice,
    limits: {
      maxUsers: plan.limits.maxUsers ?? 0,
      maxCustomers: plan.limits.maxCustomers ?? 0,
      maxOrdersPerMonth: plan.limits.maxOrdersPerMonth ?? 0,
      maxInventoryItems: plan.limits.maxInventoryItems ?? 0,
      smsPerMonth: plan.limits.smsPerMonth ?? 0,
      maxBranches: plan.limits.maxBranches ?? 1,
      aiCreditsPerMonth: plan.limits.aiCreditsPerMonth ?? 0,
      storageGb: plan.limits.storageGb ?? 0,
      globalSellListings: plan.limits.globalSellListings ?? 0,
    },
  };
}

function limitsMatch(a: LimitValues, b: LimitValues): boolean {
  return (Object.keys(LIMIT_FIELDS) as (keyof LimitValues)[]).every(
    (k) => a[k] === b[k]
  );
}

function planDiffersFromDefault(form: PlanForm, def: PlanConfig): boolean {
  return (
    form.monthlyPrice !== def.monthlyPrice ||
    form.introPrice !== def.introPrice ||
    form.annualPrice !== def.annualPrice ||
    !limitsMatch(form.limits, {
      maxUsers: def.limits.maxUsers ?? 0,
      maxCustomers: def.limits.maxCustomers ?? 0,
      maxOrdersPerMonth: def.limits.maxOrdersPerMonth ?? 0,
      maxInventoryItems: def.limits.maxInventoryItems ?? 0,
      smsPerMonth: def.limits.smsPerMonth ?? 0,
      maxBranches: def.limits.maxBranches ?? 1,
      aiCreditsPerMonth: def.limits.aiCreditsPerMonth ?? 0,
      storageGb: def.limits.storageGb ?? 0,
      globalSellListings: def.limits.globalSellListings ?? 0,
    })
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="mt-1 flex items-center gap-1">
        <input
          type="number"
          min={0}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-200 outline-none transition-colors focus:border-violet-500"
        />
        {suffix && <span className="text-xs text-slate-500">{suffix}</span>}
      </div>
    </label>
  );
}

export default function AdminPricingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<LoadedData | null>(null);
  const [forms, setForms] = useState<Record<StandardSlug, PlanForm> | null>(null);
  const [smsSenderIdPrice, setSmsSenderIdPrice] = useState("");
  const [overridden, setOverridden] = useState<Record<StandardSlug, boolean>>({
    sindano: false,
    fundi: false,
    dhahabu: false,
  });

  useEffect(() => {
    fetch("/api/ffmanage/pricing")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.defaults || !d?.effective) throw new Error("Bad payload");
        const loaded = d as LoadedData;
        setData(loaded);
        setForms({
          sindano: fromPlan(loaded.effective.plans.sindano),
          fundi: fromPlan(loaded.effective.plans.fundi),
          dhahabu: fromPlan(loaded.effective.plans.dhahabu),
        });
        setSmsSenderIdPrice(String(loaded.effective.smsSenderIdPrice));
        setOverridden({
          sindano: Boolean(loaded.overrides?.sindano),
          fundi: Boolean(loaded.overrides?.fundi),
          dhahabu: Boolean(loaded.overrides?.dhahabu),
        });
      })
      .catch(() => toast.error("Could not load pricing configuration"))
      .finally(() => setLoading(false));
  }, []);

  const changedCount = useMemo(() => {
    if (!data || !forms) return 0;
    const smsChanged =
      Number(smsSenderIdPrice) !== data.defaults.smsSenderIdPrice;
    const planChanges = SLUGS.filter((s) =>
      planDiffersFromDefault(forms[s], data.defaults.plans[s])
    ).length;
    return (smsChanged ? 1 : 0) + planChanges;
  }, [data, forms, smsSenderIdPrice]);

  async function handleSave() {
    if (!data || !forms) return;
    setSaving(true);
    try {
      const plansPayload: Record<
        string,
        { config: PlanForm | null }
      > = {};
      for (const s of SLUGS) {
        const form = forms[s];
        const differs = planDiffersFromDefault(form, data.defaults.plans[s]);
        plansPayload[s] = { config: differs ? form : null };
      }

      const smsNumber = Number(smsSenderIdPrice);
      const smsPayload =
        Number.isFinite(smsNumber) && smsNumber !== data.defaults.smsSenderIdPrice
          ? smsNumber
          : null;

      const res = await fetch("/api/ffmanage/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans: plansPayload, smsSenderIdPrice: smsPayload }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not save pricing");

      const effective = json.effective as {
        plans: Record<StandardSlug, PlanConfig>;
        smsSenderIdPrice: number;
      };
      setData({ ...data, effective });
      setForms({
        sindano: fromPlan(effective.plans.sindano),
        fundi: fromPlan(effective.plans.fundi),
        dhahabu: fromPlan(effective.plans.dhahabu),
      });
      setSmsSenderIdPrice(String(effective.smsSenderIdPrice));
      setOverridden({
        sindano: planDiffersFromDefault(
          fromPlan(effective.plans.sindano),
          data.defaults.plans.sindano
        ),
        fundi: planDiffersFromDefault(
          fromPlan(effective.plans.fundi),
          data.defaults.plans.fundi
        ),
        dhahabu: planDiffersFromDefault(
          fromPlan(effective.plans.dhahabu),
          data.defaults.plans.dhahabu
        ),
      });
      toast.success("Pricing updated. Changes are live across the platform.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleResetPlan(slug: StandardSlug) {
    if (!data) return;
    setForms((prev) => ({ ...prev!, [slug]: fromPlan(data.defaults.plans[slug]) }));
  }

  function handleResetSms() {
    if (!data) return;
    setSmsSenderIdPrice(String(data.defaults.smsSenderIdPrice));
  }

  if (loading || !forms || !data) {
    return (
      <AdminShell>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Pricing & Capacity</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Edit plan prices and included capacity live. Changes apply instantly across
              checkout, renewals, upgrades, the pricing page and branch limits.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {changedCount > 0 && (
              <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-300">
                {changedCount} unsaved change{changedCount === 1 ? "" : "s"}
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || changedCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* SMS Sender ID price */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-100">Custom SMS Sender ID fee</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                One-time platform-wide fee (KES) for a custom SMS Sender ID. Charged at
                checkout and in the billing portal&apos;s Sender ID purchase flow.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <NumberField
                  label="Fee (KES)"
                  value={Number(smsSenderIdPrice) || 0}
                  onChange={(v) => setSmsSenderIdPrice(String(v))}
                  suffix="/ once"
                />
                <button
                  type="button"
                  onClick={handleResetSms}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset to default ({formatKes(data.defaults.smsSenderIdPrice)})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Plan editors */}
        <div className="grid gap-4 lg:grid-cols-3">
          {SLUGS.map((slug) => {
            const plan = data.defaults.plans[slug];
            const form = forms[slug];
            const active = overridden[slug];
            const differs = planDiffersFromDefault(form, plan);
            return (
              <div
                key={slug}
                className={cn(
                  "rounded-xl border bg-slate-900 p-5",
                  active ? "border-violet-500/60" : "border-slate-800"
                )}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                      <Tag className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-100">{plan.name}</p>
                      <p className="text-[11px] text-slate-500">{plan.swahiliName}</p>
                    </div>
                  </div>
                  {active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-medium text-violet-300">
                      <CheckCircle2 className="h-3 w-3" /> Overridden
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                      Defaults
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <NumberField
                    label="Monthly"
                    value={form.monthlyPrice}
                    onChange={(v) =>
                      setForms({ ...forms, [slug]: { ...form, monthlyPrice: v } })
                    }
                  />
                  <NumberField
                    label="Intro (2 mo)"
                    value={form.introPrice}
                    onChange={(v) =>
                      setForms({ ...forms, [slug]: { ...form, introPrice: v } })
                    }
                  />
                  <NumberField
                    label="Annual"
                    value={form.annualPrice}
                    onChange={(v) =>
                      setForms({ ...forms, [slug]: { ...form, annualPrice: v } })
                    }
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-800 pt-4">
                  {LIMIT_FIELDS.map(({ key, label }) => (
                    <NumberField
                      key={key}
                      label={label}
                      value={form.limits[key]}
                      onChange={(v) =>
                        setForms({
                          ...forms,
                          [slug]: {
                            ...form,
                            limits: { ...form.limits, [key]: v },
                          },
                        })
                      }
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleResetPlan(slug)}
                  disabled={!differs}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset plan to defaults
                </button>
              </div>
            );
          })}
        </div>

        {/* Floating save button — stays visible while the page scrolls */}
        {changedCount > 0 && (
          <div className="fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/60 ring-1 ring-violet-400/50 transition-all hover:bg-violet-500 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving
                ? "Saving…"
                : `Save changes (${changedCount})`}
            </button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
