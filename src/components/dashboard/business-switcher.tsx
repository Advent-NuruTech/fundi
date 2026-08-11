"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronsUpDown, Check, Plus, Loader2, Building2 } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BUSINESS_TYPES,
  DEFAULT_BUSINESS_TYPE,
  getBusinessTypeConfig,
  type BusinessType,
} from "@/lib/business-types";
import { cn } from "@/lib/utils";

/**
 * Sidebar control that shows the active business and lets the owner switch
 * between every business their email belongs to — or spin up a new one of any
 * industry. Switching is instant: it re-scopes the whole app to the chosen
 * business without a full reload.
 */
export function BusinessSwitcher() {
  const { business, memberships, activeBusinessId, switchBusiness, addBusiness } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  // New-business form
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<BusinessType>(DEFAULT_BUSINESS_TYPE);
  const [creating, setCreating] = useState(false);

  const activeName = business?.name ?? memberships.find((m) => m.businessId === activeBusinessId)?.businessName ?? "FundiFlow";
  const activeConfig = getBusinessTypeConfig(business?.businessType);

  const handleSwitch = async (businessId: string) => {
    if (businessId === activeBusinessId) return;
    setSwitching(true);
    try {
      await switchBusiness(businessId);
      toast.success("Switched business");
    } catch {
      toast.error("Could not switch business.");
    } finally {
      setSwitching(false);
    }
  };

  const handleCreate = async () => {
    if (name.trim().length < 2) {
      toast.error("Enter a business name (at least 2 characters).");
      return;
    }
    setCreating(true);
    try {
      await addBusiness({ businessName: name.trim(), location, phone, businessType: type });
      toast.success(`${name.trim()} created. You're now in your new business.`);
      setAddOpen(false);
      setName("");
      setLocation("");
      setPhone("");
      setType(DEFAULT_BUSINESS_TYPE);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create business.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <DropdownMenu
        align="start"
        className="min-w-[240px]"
        trigger={
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:bg-slate-50"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="text-base leading-none">{activeConfig.emoji}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-emerald-700">{activeName}</span>
                <span className="block truncate text-[11px] text-slate-500">{activeConfig.tagline}</span>
              </span>
            </span>
            {switching ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
            )}
          </button>
        }
      >
        <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Your businesses
        </p>
        {memberships.map((m) => {
          const cfg = getBusinessTypeConfig(m.businessType);
          const active = m.businessId === activeBusinessId;
          return (
            <DropdownItem key={m.businessId} onClick={() => handleSwitch(m.businessId)}>
              <span className="text-base leading-none">{cfg.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{m.businessName}</span>
                <span className="block truncate text-[11px] capitalize text-slate-400">
                  {cfg.label} · {m.role.replace("_", " ")}
                </span>
              </span>
              {active && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
            </DropdownItem>
          );
        })}
        <div className="my-1 border-t border-slate-100" />
        <DropdownItem onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add a business
        </DropdownItem>
      </DropdownMenu>

      <Dialog open={addOpen} onClose={() => !creating && setAddOpen(false)} title="Add a business">
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-slate-500">
            Run another shop, store or workshop under the same login. You can switch between them any time.
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
                      sel
                        ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                        : "border-slate-200 bg-white hover:border-emerald-300"
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
            <Label htmlFor="biz-name">Business name</Label>
            <Input
              id="biz-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mama Njeri Tailoring"
              disabled={creating}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="biz-location">Location</Label>
              <Input
                id="biz-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Nairobi"
                disabled={creating}
              />
            </div>
            <div>
              <Label htmlFor="biz-phone">Phone</Label>
              <Input
                id="biz-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                disabled={creating}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              Create business
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
