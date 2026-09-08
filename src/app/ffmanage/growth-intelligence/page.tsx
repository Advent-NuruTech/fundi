"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  FlaskConical,
  Lightbulb,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { cn } from "@/lib/utils";
import type { GrowthIntelligenceReport, GrowthRecommendation } from "@/types/growth-intelligence";

const number = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });

function Metric({ label, value, detail, icon: Icon, good }: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  good?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className={cn("mt-1 text-2xl font-bold tracking-tight", good === false ? "text-amber-300" : "text-slate-100")}>{value}</p>
        </div>
        <span className="rounded-xl bg-violet-500/10 p-2 text-violet-300"><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function RecommendationCard({ item, rank }: { item: GrowthRecommendation; rank: number }) {
  const tone = {
    product: "bg-violet-500/10 text-violet-300",
    experience: "bg-sky-500/10 text-sky-300",
    revenue: "bg-emerald-500/10 text-emerald-300",
    reliability: "bg-amber-500/10 text-amber-300",
  }[item.kind];

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">{rank}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-100">{item.title}</h3>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", tone)}>{item.kind}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-400">{item.evidence}</p>
          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
            <div><p className="text-slate-600">Expected impact</p><p className="mt-1 leading-5 text-slate-300">{item.expectedImpact}</p></div>
            <div><p className="text-slate-600">Effort / confidence</p><p className="mt-1 text-slate-300">{item.effort} / {item.confidence}</p></div>
            <div><p className="text-slate-600">Expected ROI</p><p className="mt-1 leading-5 text-slate-300">{item.expectedRoi}</p></div>
          </div>
          <div className="mt-4 flex gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
            <span><strong className="text-slate-200">Next experiment:</strong> {item.nextStep}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function GrowthIntelligencePage() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GrowthIntelligenceReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ffmanage/growth-intelligence?days=${days}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not load growth intelligence");
      setData(payload as GrowthIntelligenceReport);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load growth intelligence");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const featureMax = useMemo(
    () => Math.max(1, ...(data?.features.map((feature) => feature.adoptionPercent) ?? [1])),
    [data]
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        <header className="overflow-hidden rounded-3xl border border-violet-500/20 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.22),transparent_38%),linear-gradient(135deg,#0f172a,#020617)] p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
                <Sparkles className="h-4 w-4" /> FundiFlow Growth Intelligence
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Turn anonymous product signals into the next best growth move.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">A platform-owner command centre for adoption, dormant workflows, AI quality, unit economics and evidence-backed product experiments.</p>
            </div>
            <div className="flex items-center gap-2">
              {[7, 30, 90].map((value) => (
                <button key={value} onClick={() => setDays(value)} className={cn("rounded-lg px-3 py-2 text-xs font-semibold", days === value ? "bg-violet-600 text-white" : "border border-slate-700 text-slate-400 hover:bg-slate-800")}>{value}d</button>
              ))}
              <button onClick={() => void load()} className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800" aria-label="Refresh intelligence"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /></button>
            </div>
          </div>
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs leading-5 text-emerald-200/80">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span><strong className="text-emerald-300">Strict isolation:</strong> this module uses aggregated counters and categories only. It cannot read tenant customers, finances, order details or AI conversation content.</span>
          </div>
        </header>

        {loading && !data ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900"><Loader2 className="h-6 w-6 animate-spin text-violet-400" /></div>
        ) : error ? (
          <div className="rounded-2xl border border-amber-700/50 bg-amber-950/30 p-5 text-sm text-amber-200">{error}. Apply the latest Supabase migration if this module has just been deployed.</div>
        ) : data ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Businesses" value={number.format(data.summary.totalBusinesses)} detail={`${number.format(data.summary.activeSubscriptions)} active or trial subscriptions`} icon={Users} />
              <Metric label="Daily product reach" value={number.format(data.summary.trackedBusinessDailyAverage)} detail={`Average businesses using the strongest workflow each day over ${data.windowDays} days`} icon={Activity} />
              <Metric label="AI helpfulness" value={data.summary.aiHelpfulnessPercent === null ? "Collecting" : `${data.summary.aiHelpfulnessPercent.toFixed(0)}%`} detail={`${number.format(data.summary.feedbackResponses)} owner ratings; target at least 85%`} icon={BrainCircuit} good={data.summary.aiHelpfulnessPercent === null || data.summary.aiHelpfulnessPercent >= 85} />
              <Metric label="AI cost markup" value={`${data.summary.aiCostMarkupPercent.toFixed(1)}%`} detail={`Commercial target ${data.summary.aiTargetMarkupPercent.toFixed(0)}% (2.5× cost at 150%)`} icon={Target} good={data.summary.aiMarkupOnTarget} />
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2"><Lightbulb className="h-5 w-5 text-violet-400" /><h2 className="text-lg font-semibold text-slate-100">Highest-leverage recommendations</h2></div>
              <div className="space-y-3">{data.recommendations.map((item, index) => <RecommendationCard key={item.id} item={item} rank={index + 1} />)}</div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-100">Feature adoption map</h2><p className="mt-1 text-xs text-slate-500">Average daily business reach; page views are deduplicated for 15 minutes.</p></div><ArrowUpRight className="h-4 w-4 text-slate-600" /></div>
                <div className="space-y-4">
                  {data.features.map((feature) => (
                    <div key={feature.key}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-medium text-slate-300">{feature.label}</span><span className="text-slate-500">{feature.events ? `${feature.adoptionPercent.toFixed(1)}% daily · ${feature.repeatUse.toFixed(1)} uses/visit-day` : "Collecting signal"}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className={cn("h-full rounded-full", feature.status === "strong" ? "bg-emerald-500" : feature.status === "dormant" ? "bg-amber-500" : "bg-violet-500")} style={{ width: `${feature.events ? Math.max(2, (feature.adoptionPercent / featureMax) * 100) : 0}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /><h2 className="font-semibold text-slate-100">Strongest signals</h2></div>
                  <div className="mt-4 space-y-3">{data.strongestFeatures.length ? data.strongestFeatures.map((feature) => <div key={feature.key} className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-300">{feature.label}</span><span className="text-emerald-300">{feature.adoptionPercent.toFixed(1)}%</span></div>) : <p className="text-sm text-slate-500">Signals will appear as businesses use the updated platform.</p>}</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-amber-400" /><h2 className="font-semibold text-slate-100">Dormant workflows</h2></div>
                  <div className="mt-4 space-y-3">{data.dormantFeatures.length ? data.dormantFeatures.map((feature) => <div key={feature.key} className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-300">{feature.label}</span><span className="text-amber-300">{feature.adoptionPercent.toFixed(1)}%</span></div>) : <p className="text-sm text-slate-500">No low-adoption feature has enough signal yet.</p>}</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <h2 className="font-semibold text-slate-100">Support themes</h2>
                  <div className="mt-4 flex flex-wrap gap-2">{data.supportThemes.length ? data.supportThemes.map((theme) => <span key={theme.label} className="rounded-full bg-slate-800 px-3 py-1.5 text-xs text-slate-300">{theme.label} · {theme.count}</span>) : <span className="text-sm text-slate-500">No support themes in this window.</span>}</div>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}
