"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  Loader2,
  Save,
  Cpu,
  Coins,
  Percent,
  Sparkles,
  History,
  Tag,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { cn, formatDateLabel } from "@/lib/utils";
import type {
  AIBillingConfig,
  AIProviderConfig,
  AIExchangeRate,
  AICreditPack,
  AIExchangeRateProviderId,
  AICreditRoundingMode,
} from "@/types/ai-billing";
import { DEFAULT_AI_BILLING_CONFIG } from "@/lib/ai-billing";

interface ConfigPageData {
  version: number;
  config: AIBillingConfig;
  history: { id: string; version: number; note: string | null; createdBy: string | null; createdAt: string }[];
  exchangeRate: AIExchangeRate | null;
  creditPacks: AICreditPack[];
}

interface ConfigVersionSummary {
  id: string;
  version: number;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

// ─── Form field helpers ──────────────────────────────────────────────────────

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 0.01,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type="number"
        step={step}
        min={min}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-200 outline-none transition-colors focus:border-violet-500"
      />
      {suffix && <span className="mt-0.5 block text-[11px] text-slate-500">{suffix}</span>}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-200 outline-none transition-colors focus:border-violet-500"
      />
    </label>
  );
}

function Card({ title, subtitle, icon: Icon, children, className }: {
  title: string;
  subtitle?: string;
  icon: typeof Cpu;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-slate-800 bg-slate-900 p-5", className)}>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-100">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function SaveButton({
  saving,
  label,
  onClick,
  disabled,
}: {
  saving: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || saving}
      className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {saving ? "Saving…" : label}
    </button>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const ROUNDING_OPTIONS: { value: AICreditRoundingMode; label: string }[] = [
  { value: "ceil", label: "Ceiling (always round up)" },
  { value: "round", label: "Nearest" },
  { value: "floor", label: "Floor (always round down)" },
];

const RATE_PROVIDERS: { value: AIExchangeRateProviderId; label: string }[] = [
  { value: "manual", label: "Manual (recommended)" },
  { value: "central_bank", label: "Central Bank (future)" },
  { value: "exchange_rate_api", label: "Exchange Rate API (future)" },
];

export default function AdminAIBillingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rateSaving, setRateSaving] = useState(false);
  const [packsSaving, setPacksSaving] = useState(false);

  const [version, setVersion] = useState(1);
  const [config, setConfig] = useState<AIBillingConfig>(DEFAULT_AI_BILLING_CONFIG);
  const [history, setHistory] = useState<ConfigVersionSummary[]>([]);
  const [exchangeRate, setExchangeRate] = useState<AIExchangeRate | null>(null);
  const [rateInput, setRateInput] = useState("");
  const [creditPacks, setCreditPacks] = useState<AICreditPack[]>([]);
  const [note, setNote] = useState("");

  const [newPolicyKey, setNewPolicyKey] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ffmanage/ai-billing");
      const data = (await res.json()) as ConfigPageData;
      if (!res.ok) throw new Error("Failed to load");
      setVersion(data.version);
      setConfig(data.config);
      setHistory(data.history ?? []);
      setExchangeRate(data.exchangeRate ?? null);
      setRateInput(data.exchangeRate ? String(data.exchangeRate.rate) : "");
      setCreditPacks(data.creditPacks ?? []);
    } catch {
      toast.error("Could not load AI billing configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Config mutations ──

  function patchProvider(id: string, patch: Partial<AIProviderConfig>) {
    setConfig((c) => ({
      ...c,
      providers: { ...c.providers, [id]: { ...c.providers[id], ...patch } },
    }));
  }

  function patchProviderPricing(id: string, patch: Partial<AIProviderConfig["pricing"]>) {
    setConfig((c) => ({
      ...c,
      providers: {
        ...c.providers,
        [id]: { ...c.providers[id], pricing: { ...c.providers[id].pricing, ...patch } },
      },
    }));
  }

  function patchCapabilities(id: string, patch: Partial<AIProviderConfig["capabilities"]>) {
    setConfig((c) => ({
      ...c,
      providers: {
        ...c.providers,
        [id]: { ...c.providers[id], capabilities: { ...c.providers[id].capabilities, ...patch } },
      },
    }));
  }

  async function handleSaveConfig() {
    setSaving(true);
    try {
      const res = await fetch("/api/ffmanage/ai-billing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, note: note || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not save configuration");
      setVersion(json.version);
      setConfig(json.config);
      setNote("");
      await load();
      toast.success(`Configuration saved as v${json.version}. Live across the platform.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRate() {
    const rate = Number(rateInput);
    if (!Number.isFinite(rate) || rate <= 0) {
      toast.error("Enter a valid USD→KES exchange rate");
      return;
    }
    setRateSaving(true);
    try {
      const res = await fetch("/api/ffmanage/ai-billing/exchange-rate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate, source: config.exchangeRateProvider.active }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not save exchange rate");
      setExchangeRate(json.rate);
      toast.success("Exchange rate updated. New requests bill at this rate.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRateSaving(false);
    }
  }

  async function handleSavePacks() {
    setPacksSaving(true);
    try {
      const res = await fetch("/api/ffmanage/ai-billing/credit-packs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packs: creditPacks }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not save credit packs");
      setCreditPacks(json.packs);
      toast.success("Credit packs updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPacksSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      </AdminShell>
    );
  }

  const revenueMultiplier = 1 + config.margin.targetGrossMarginPercent / 100;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">AI Billing Engine</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Configure AI providers, model pricing, exchange rates, margins and credit rules — all live, no redeploy.
              Active config <span className="font-mono text-violet-400">v{version}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <a href="/ffmanage/ai-billing/analytics" className="rounded-full border border-slate-700 px-3 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">Analytics →</a>
              <a href="/ffmanage/ai-billing/records" className="rounded-full border border-slate-700 px-3 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">Billing records →</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TextField label="Change note" value={note} onChange={setNote} placeholder="Optional" />
            <div className="self-end">
              <SaveButton saving={saving} label={`Save configuration v${version + 1}`} onClick={handleSaveConfig} />
            </div>
          </div>
        </div>

        {/* Provider & pricing */}
        <Card
          title="AI Providers & Model Pricing"
          subtitle="Provider pricing in USD per 1M tokens. Prices are placeholders — the Super Admin edits them whenever a provider changes pricing. Adding a provider requires no code."
          icon={Cpu}
        >
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Active provider</span>
              <select
                value={config.activeProvider}
                onChange={(e) => setConfig((c) => ({ ...c, activeProvider: e.target.value }))}
                className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-200 outline-none focus:border-violet-500"
              >
                {Object.values(config.providers).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.model}</option>
                ))}
              </select>
            </label>
            {config.exchangeRateProvider.active === "manual" && (
              <div className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">
                Exchange rate provider: <span className="font-semibold">Manual</span> · {exchangeRate ? `USD/KES ${exchangeRate.rate}` : "not set"}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {Object.values(config.providers).map((provider) => (
              <div key={provider.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-100">{provider.name}</p>
                      <p className="text-[11px] text-slate-500">{provider.id}</p>
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      checked={provider.enabled}
                      onChange={(e) => patchProvider(provider.id, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-violet-500"
                    />
                    Enabled
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <TextField label="Model" value={provider.model} onChange={(v) => patchProvider(provider.id, { model: v })} />
                  <TextField label="Provider name" value={provider.name} onChange={(v) => patchProvider(provider.id, { name: v })} />
                  <NumberField label="Input / 1M" value={provider.pricing.input} onChange={(v) => patchProviderPricing(provider.id, { input: v })} suffix="USD" />
                  <NumberField label="Cached input / 1M" value={provider.pricing.cachedInput} onChange={(v) => patchProviderPricing(provider.id, { cachedInput: v })} suffix="USD" />
                  <NumberField label="Output / 1M" value={provider.pricing.output} onChange={(v) => patchProviderPricing(provider.id, { output: v })} suffix="USD" />
                  <NumberField label="Reasoning / 1M" value={provider.pricing.reasoning} onChange={(v) => patchProviderPricing(provider.id, { reasoning: v })} suffix="USD" />
                  <NumberField label="Image tokens / 1M" value={provider.pricing.image} onChange={(v) => patchProviderPricing(provider.id, { image: v })} suffix="USD" />
                  <NumberField label="Audio tokens / 1M" value={provider.pricing.audio} onChange={(v) => patchProviderPricing(provider.id, { audio: v })} suffix="USD" />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-800 pt-3 text-xs text-slate-400">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Capabilities</span>
                  {(["caching", "reasoning", "images", "audio"] as const).map((cap) => (
                    <label key={cap} className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={provider.capabilities[cap]}
                        onChange={(e) => patchCapabilities(provider.id, { [cap]: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 accent-violet-500"
                      />
                      {cap}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Exchange rate */}
        <Card
          title="Exchange Rate (USD → KES)"
          subtitle="Every AI request stores the exact rate, source and timestamp it billed with. The Manual provider is free, offline, auditable and accurate enough for billing."
          icon={RefreshCw}
        >
          <div className="flex flex-wrap items-end gap-3">
            <NumberField
              label="USD / KES exchange rate"
              value={Number(rateInput) || 0}
              onChange={(v) => setRateInput(String(v))}
              step={0.01}
              suffix={`Currently billed: ${exchangeRate ? exchangeRate.rate : "not set"}`}
            />
            <div>
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Rate source</span>
                <select
                  value={config.exchangeRateProvider.active}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, exchangeRateProvider: { active: e.target.value as AIExchangeRateProviderId } }))
                  }
                  className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                >
                  {RATE_PROVIDERS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <SaveButton saving={rateSaving} label="Apply rate" onClick={handleSaveRate} />
          </div>

          {exchangeRate && (
            <p className="mt-3 text-xs text-slate-500">
              Updated {formatDateLabel(exchangeRate.createdAt)} · source{" "}
              <span className="text-slate-300">{exchangeRate.source}</span>
            </p>
          )}
        </Card>

        {/* Margin + credit value */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card
            title="Portfolio Margin"
            subtitle="The system measures margin across ALL AI usage, not per request. Revenue multiplier = 1 + margin/100."
            icon={Percent}
          >
            <NumberField
              label="Target gross margin (%)"
              value={config.margin.targetGrossMarginPercent}
              onChange={(v) => setConfig((c) => ({ ...c, margin: { targetGrossMarginPercent: v } }))}
              step={1}
              suffix={`Revenue multiplier: ${revenueMultiplier.toFixed(2)}×`}
            />
            <p className="mt-2 text-xs text-slate-500">
              Example: 100% → 2.0× · 50% → 1.5× · 150% → 2.5×. A margin alert is raised when the portfolio
              margin falls below this target.
            </p>
          </Card>

          <Card
            title="AI Credit Value"
            subtitle="Revenue is converted into credits using the configured value. Rounding is configurable — never assume a fixed value."
            icon={Coins}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberField
                label="Credit value (KES)"
                value={config.credit.valueKes}
                onChange={(v) => setConfig((c) => ({ ...c, credit: { ...c.credit, valueKes: v } }))}
                step={0.01}
                suffix="KES per credit"
              />
              <NumberField
                label="Minimum credits"
                value={config.credit.minimumCredits}
                onChange={(v) => setConfig((c) => ({ ...c, credit: { ...c.credit, minimumCredits: v } }))}
                step={1}
                suffix="Every request"
              />
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Rounding mode</span>
                <select
                  value={config.credit.roundingMode}
                  onChange={(e) => setConfig((c) => ({ ...c, credit: { ...c.credit, roundingMode: e.target.value as AICreditRoundingMode } }))}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                >
                  {ROUNDING_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </Card>
        </div>

        {/* Feature categories & policies */}
        <Card
          title="Feature Policies"
          subtitle="Every AI feature belongs to a category. Each category carries suggested credits, a maximum, and a description — all editable."
          icon={Tag}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Categories</h3>
              <div className="space-y-3">
                {config.featureCategories.map((cat, index) => (
                  <div key={cat.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <TextField
                        label="Name"
                        value={cat.name}
                        onChange={(v) =>
                          setConfig((c) => ({
                            ...c,
                            featureCategories: c.featureCategories.map((x, i) => (i === index ? { ...x, name: v } : x)),
                          }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((c) => ({
                            ...c,
                            featureCategories: c.featureCategories.filter((_, i) => i !== index),
                          }))
                        }
                        className="mt-4 rounded-lg p-1.5 text-slate-500 hover:bg-rose-900/30 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField
                        label="Suggested credits"
                        value={cat.suggestedCredits}
                        onChange={(v) =>
                          setConfig((c) => ({
                            ...c,
                            featureCategories: c.featureCategories.map((x, i) => (i === index ? { ...x, suggestedCredits: v } : x)),
                          }))
                        }
                        step={1}
                      />
                      <NumberField
                        label="Maximum credits"
                        value={cat.maxCredits}
                        onChange={(v) =>
                          setConfig((c) => ({
                            ...c,
                            featureCategories: c.featureCategories.map((x, i) => (i === index ? { ...x, maxCredits: v } : x)),
                          }))
                        }
                        step={1}
                      />
                    </div>
                    <label className="mt-2 block">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Description</span>
                      <input
                        type="text"
                        value={cat.description}
                        onChange={(e) =>
                          setConfig((c) => ({
                            ...c,
                            featureCategories: c.featureCategories.map((x, i) => (i === index ? { ...x, description: e.target.value } : x)),
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-200 outline-none focus:border-violet-500"
                      />
                    </label>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      featureCategories: [
                        ...c.featureCategories,
                        { id: `cat_${Date.now()}`, name: "New category", description: "", suggestedCredits: 1, maxCredits: 10 },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  <Plus className="h-3.5 w-3.5" /> Add category
                </button>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Feature → category mapping</h3>
              <div className="space-y-2">
                {Object.entries(config.featurePolicies).map(([key, category]) => (
                  <div key={key} className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300">{key}</code>
                    <select
                      value={category}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          featurePolicies: { ...c.featurePolicies, [key]: e.target.value },
                        }))
                      }
                      className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-violet-500"
                    >
                      {config.featureCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((c) => {
                          const rest = { ...c.featurePolicies };
                          delete rest[key];
                          return { ...c, featurePolicies: rest };
                        })
                      }
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-900/30 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newPolicyKey}
                    onChange={(e) => setNewPolicyKey(e.target.value)}
                    placeholder="feature.key"
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-violet-500"
                  />
                  <button
                    type="button"
                    disabled={!newPolicyKey.trim()}
                    onClick={() => {
                      const key = newPolicyKey.trim();
                      if (!key || config.featurePolicies[key]) return;
                      setConfig((c) => ({
                        ...c,
                        featurePolicies: { ...c.featurePolicies, [key]: c.featureCategories[0]?.id ?? "simple" },
                      }));
                      setNewPolicyKey("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add feature
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Credit packs */}
        <Card
          title="AI Credit Packs"
          subtitle="Stored in the database — no hardcoded values. Super Admin edits these at any time; customers see them when topping up AI credits."
          icon={Wallet}
        >
          <div className="space-y-2">
            {creditPacks.map((pack, index) => (
              <div key={pack.id} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-5">
                <TextField
                  label="Label"
                  value={pack.label}
                  onChange={(v) => setCreditPacks((prev) => prev.map((p, i) => (i === index ? { ...p, label: v } : p)))}
                />
                <NumberField
                  label="Credits"
                  value={pack.credits}
                  onChange={(v) => setCreditPacks((prev) => prev.map((p, i) => (i === index ? { ...p, credits: v } : p)))}
                  step={1}
                />
                <NumberField
                  label="Price (KES)"
                  value={pack.priceKes}
                  onChange={(v) => setCreditPacks((prev) => prev.map((p, i) => (i === index ? { ...p, priceKes: v } : p)))}
                  step={100}
                />
                <label className="flex items-center gap-2 pt-5 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={pack.active}
                    onChange={(e) => setCreditPacks((prev) => prev.map((p, i) => (i === index ? { ...p, active: e.target.checked } : p)))}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-violet-500"
                  />
                  Active
                </label>
                <div className="pt-4 flex items-center justify-start">
                  <button
                    type="button"
                    onClick={() => setCreditPacks((prev) => prev.filter((_, i) => i !== index))}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-900/30 hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setCreditPacks((prev) => [
                    ...prev,
                    { id: `pack_${Date.now()}`, label: "New pack", credits: 100, priceKes: 900, active: true, sortOrder: prev.length + 1, updatedAt: null, createdAt: new Date().toISOString() },
                  ])
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <Plus className="h-3.5 w-3.5" /> Add pack
              </button>
              <SaveButton saving={packsSaving} label="Save credit packs" onClick={handleSavePacks} />
            </div>
          </div>
        </Card>

        {/* Version history */}
        <Card
          title="Configuration History"
          subtitle="Every saved configuration is versioned and immutable. Audit who changed what and when — no redeployment required."
          icon={History}
        >
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No prior versions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-2 py-2">Version</th>
                    <th className="px-2 py-2">Note</th>
                    <th className="px-2 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {history.map((h) => (
                    <tr key={h.id} className={cn(h.version === version && "bg-violet-500/5")}>
                      <td className="px-2 py-2 font-mono text-xs text-violet-300">v{h.version}{h.version === version && <CheckCircle2 className="ml-1 inline h-3 w-3" />}</td>
                      <td className="px-2 py-2 text-xs text-slate-400">{h.note ?? "—"}</td>
                      <td className="px-2 py-2 text-xs text-slate-500">{formatDateLabel(h.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Floating save */}
        <div className="fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6">
          <SaveButton saving={saving} label={`Save configuration v${version + 1}`} onClick={handleSaveConfig} />
        </div>
      </div>
    </AdminShell>
  );
}
