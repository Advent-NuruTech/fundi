"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2, Plus, Check, Loader2, ShoppingBag, Users, Store, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { supabase } from "@/lib/supabase";
import { formatKes, cn } from "@/lib/utils";
import {
  BUSINESS_TYPES, DEFAULT_BUSINESS_TYPE, getBusinessTypeConfig, type BusinessType,
} from "@/lib/business-types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface BusinessOverview {
  id: string;
  name: string;
  businessType: string;
  location: string | null;
  role: string;
  plan: string;
  subscriptionStatus: string | null;
  revenue: number;
  orderCount: number;
  customerCount: number;
  branchCount: number;
  createdAt: string;
}

const PLAN_LABELS: Record<string, string> = {
  sindano: "Sindano", fundi: "Fundi", dhahabu: "Dhahabu", custom: "Custom", none: "No plan",
};

export default function MyBusinessesPage() {
  const router = useRouter();
  const { activeBusinessId, switchBusiness, addBusiness } = useAuth();
  const [rows, setRows] = useState<BusinessOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  // Add-business dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<BusinessType>(DEFAULT_BUSINESS_TYPE);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { setLoading(false); return; }
    const res = await fetch("/api/businesses/overview", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    setRows(data.businesses ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSwitch = async (id: string) => {
    if (id === activeBusinessId) { router.push("/dashboard"); return; }
    setSwitchingId(id);
    try {
      await switchBusiness(id); // hard-reloads on success
    } catch {
      toast.error("Could not switch business.");
      setSwitchingId(null);
    }
  };

  const handleCreate = async () => {
    if (name.trim().length < 2) { toast.error("Enter a business name (at least 2 characters)."); return; }
    setCreating(true);
    try {
      await addBusiness({ businessName: name.trim(), location, phone, businessType: type });
      // addBusiness hard-reloads into the new business on success.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create business.");
      setCreating(false);
    }
  };

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Businesses</h1>
          <p className="text-sm text-slate-500">
            All the businesses you run under this login, with how each is performing.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add a business
        </Button>
      </div>

      {/* Portfolio summary */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat label="Businesses" value={String(rows.length)} icon={Building2} />
          <SummaryStat label="Total revenue" value={formatKes(totalRevenue)} icon={ShoppingBag} />
          <SummaryStat label="Total orders" value={String(rows.reduce((s, r) => s + r.orderCount, 0))} icon={ShoppingBag} />
          <SummaryStat label="Total branches" value={String(rows.reduce((s, r) => s + r.branchCount, 0))} icon={Store} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Building2 className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">No businesses yet.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((b) => {
            const cfg = getBusinessTypeConfig(b.businessType);
            const active = b.id === activeBusinessId;
            return (
              <Card key={b.id} className={cn(active && "ring-2 ring-emerald-500")}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="text-2xl leading-none">{cfg.emoji}</span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{b.name}</p>
                        <p className="truncate text-xs text-slate-500">{cfg.label}{b.location ? ` · ${b.location}` : ""}</p>
                      </div>
                    </div>
                    {active && (
                      <Badge variant="success" className="shrink-0 gap-1">
                        <Check className="h-3 w-3" /> Current
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Metric label="Revenue" value={formatKes(b.revenue)} />
                    <Metric label="Orders" value={String(b.orderCount)} icon={ShoppingBag} />
                    <Metric label="Customers" value={String(b.customerCount)} icon={Users} />
                    <Metric label="Branches" value={String(b.branchCount)} icon={Store} />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {PLAN_LABELS[b.plan] ?? b.plan}
                      {b.subscriptionStatus && b.subscriptionStatus !== "active" ? ` · ${b.subscriptionStatus}` : ""}
                    </span>
                    <Button
                      size="sm"
                      variant={active ? "outline" : "default"}
                      onClick={() => handleSwitch(b.id)}
                      disabled={switchingId === b.id}
                      className="gap-1.5"
                    >
                      {switchingId === b.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : active ? (
                        <>Open <ArrowRight className="h-3.5 w-3.5" /></>
                      ) : (
                        <>Switch <ArrowRight className="h-3.5 w-3.5" /></>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add business dialog */}
      <Dialog open={addOpen} onClose={() => !creating && setAddOpen(false)} title="Add a business">
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-slate-500">
            Run another shop, store or workshop under the same login. Each business is billed separately.
          </p>
          <div>
            <Label>What kind of business?</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {BUSINESS_TYPES.map((t) => {
                const sel = type === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setType(t.id)}
                    disabled={creating}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-xl border p-2.5 text-left transition",
                      sel ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600" : "border-slate-200 bg-white hover:border-emerald-300",
                    )}
                  >
                    <span className="text-lg leading-none">{t.emoji}</span>
                    <span className="text-xs font-semibold text-slate-800">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label htmlFor="mb-name">Business name</Label>
            <Input id="mb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mama Njeri Tailoring" disabled={creating} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mb-location">Location</Label>
              <Input id="mb-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Nairobi" disabled={creating} />
            </div>
            <div>
              <Label htmlFor="mb-phone">Phone</Label>
              <Input id="mb-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" disabled={creating} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              Create business
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function SummaryStat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
        <Icon className="h-4 w-4 text-slate-300" />
      </div>
      <p className="mt-1.5 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-slate-400">
        {Icon && <Icon className="h-3 w-3" />}{label}
      </p>
      <p className="mt-0.5 font-semibold text-slate-800">{value}</p>
    </div>
  );
}
