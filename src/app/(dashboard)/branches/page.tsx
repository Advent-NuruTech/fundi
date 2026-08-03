"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Store, Check, Plus, Loader2, Lock, ArrowUpRight, MapPin } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { usePlanConfigs } from "@/hooks/usePlanConfigs";
import { getBusinessTypeConfig } from "@/lib/business-types";
import { cn } from "@/lib/utils";
import type { PlanSlug } from "@/types/billing";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const SALES_URL =
  "https://wa.me/254142225233?text=Hi%2C%20I%27d%20like%20more%20branches%20than%20my%20plan%20allows";

export default function BranchesPage() {
  const { branches, activeBranchId, switchBranch, addBranch, business, isOwner } = useAuth();
  const { subscription } = useSubscription();
  const { data: planConfigs } = usePlanConfigs();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [creating, setCreating] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const cfg = getBusinessTypeConfig(business?.businessType);
  const planSlug = subscription?.planSlug;
  const limit =
    planSlug === "custom"
      ? Number.POSITIVE_INFINITY
      : planConfigs.branchLimits[planSlug as Exclude<PlanSlug, "custom">] ??
        planConfigs.branchLimits.sindano;
  const hasLimit = Number.isFinite(limit);
  const atLimit = branches.length >= limit;
  const isStarter = limit <= 1;

  const handleCreate = async () => {
    if (atLimit) { toast.error(`Your plan allows up to ${limit} branch${limit === 1 ? "" : "es"}.`); return; }
    if (name.trim().length < 2) { toast.error("Enter a branch name."); return; }
    setCreating(true);
    try {
      await addBranch({ name: name.trim(), location: location.trim() || undefined });
      // addBranch hard-reloads into the new branch on success.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create branch.");
      setCreating(false);
    }
  };

  const handleSwitch = (id: string) => {
    if (id === activeBranchId) return;
    setSwitchingId(id);
    switchBranch(id); // hard-reloads
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branches</h1>
          <p className="text-sm text-slate-500">
            Each branch of <span className="font-medium">{business?.name ?? "your business"}</span> keeps its own
            stock, sales, customers and finance — fully separate.
          </p>
        </div>
        {hasLimit && (
          <Badge variant={atLimit ? "warning" : "default"} className="shrink-0">
            {branches.length} / {limit} branches
          </Badge>
        )}
      </div>

      {/* Branch list */}
      <div className="space-y-3">
        {branches.map((b) => {
          const active = b.id === activeBranchId;
          return (
            <Card key={b.id} className={cn(active && "ring-2 ring-emerald-500")}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <Store className="h-5 w-5 text-slate-500" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-slate-900">
                      <span className="truncate">{b.name}</span>
                      {b.isDefault && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Main</span>
                      )}
                    </p>
                    {b.location && (
                      <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />{b.location}
                      </p>
                    )}
                  </div>
                </div>
                {active ? (
                  <Badge variant="success" className="shrink-0 gap-1"><Check className="h-3 w-3" /> Active</Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleSwitch(b.id)} disabled={!!switchingId}>
                    {switchingId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Switch to"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add / upgrade / contact */}
      {!isOwner ? null : !atLimit ? (
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add a branch
        </Button>
      ) : isStarter ? (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">Want more outlets?</p>
              <p className="text-sm text-slate-600">Branches are available on Fundi (up to 4) and Dhahabu (up to 9).</p>
            </div>
            <Link
              href="/settings/billing"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
            >
              <ArrowUpRight className="h-4 w-4" /> Upgrade plan
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">You&apos;ve reached your plan&apos;s branch limit ({limit}).</p>
              <p className="text-sm text-slate-600">Need more branches? We&apos;ll set up a custom plan for you.</p>
            </div>
            <a
              href={SALES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <Lock className="h-4 w-4" /> Contact sales
            </a>
          </CardContent>
        </Card>
      )}

      <Dialog open={addOpen} onClose={() => !creating && setAddOpen(false)} title="Add a branch">
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-slate-500">
            A new branch starts with its own empty stock, orders, customers and finance — fully separate from your other branches.
          </p>
          <div>
            <Label htmlFor="branch-name">Branch name</Label>
            <Input id="branch-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Westlands Branch" disabled={creating} />
          </div>
          <div>
            <Label htmlFor="branch-location">Location (optional)</Label>
            <Input id="branch-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Westlands, Nairobi" disabled={creating} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-2">
              {creating && <Loader2 className="h-4 w-4 animate-spin" />} Create branch
            </Button>
          </div>
        </div>
      </Dialog>

      <p className="text-center text-xs text-slate-400">{cfg.label} · {business?.name}</p>
    </div>
  );
}
