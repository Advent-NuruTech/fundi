"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Store, Check, Plus, ChevronDown, Loader2, Lock, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { branchLimitForPlan } from "@/lib/billing/constants";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** WhatsApp sales line for custom (10+ branch) enterprise plans. */
const SALES_URL =
  "https://wa.me/254142225233?text=Hi%2C%20I%27d%20like%20more%20branches%20than%20my%20plan%20allows";

/**
 * Compact branch (outlet) selector shown under the business switcher. Each
 * branch fully isolates its orders, stock, customers and finance. Hidden until
 * branches exist (i.e. migration 00029 has been applied), so it never appears
 * broken on an un-migrated database.
 */
export function BranchSwitcher() {
  const { branches, activeBranchId, switchBranch, addBranch } = useAuth();
  const { subscription } = useSubscription();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [creating, setCreating] = useState(false);

  if (!branches.length) return null;

  const active = branches.find((b) => b.id === activeBranchId) ?? branches[0];

  // Branches allowed by the active plan (includes the main branch).
  const limit = branchLimitForPlan(subscription?.planSlug);
  const hasLimit = Number.isFinite(limit);
  const atLimit = branches.length >= limit;
  // Sindano (limit 1) has no extra outlets at all — show an upgrade nudge.
  // Higher tiers at their cap point owners to sales for a custom plan.
  const isStarter = limit <= 1;

  const handleCreate = async () => {
    if (atLimit) {
      toast.error(`Your plan allows up to ${limit} branch${limit === 1 ? "" : "es"}.`);
      return;
    }
    if (name.trim().length < 2) {
      toast.error("Enter a branch name.");
      return;
    }
    setCreating(true);
    try {
      await addBranch({ name: name.trim(), location: location.trim() || undefined });
      // addBranch reloads the page on success.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create branch.");
      setCreating(false);
    }
  };

  return (
    <>
      <DropdownMenu
        align="start"
        className="min-w-[220px]"
        trigger={
          <button
            type="button"
            className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition hover:bg-slate-50"
          >
            <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
              <Store className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate font-medium">{active?.name ?? "Main Branch"}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          </button>
        }
      >
        <div className="flex items-center justify-between px-3 py-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Branches
          </p>
          {hasLimit && (
            <span className="text-[11px] font-medium text-slate-400">
              {branches.length} / {limit}
            </span>
          )}
        </div>
        {branches.map((b) => (
          <DropdownItem key={b.id} onClick={() => switchBranch(b.id)}>
            <Store className="h-4 w-4 text-slate-400" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{b.name}</span>
              {b.location && <span className="block truncate text-[11px] text-slate-400">{b.location}</span>}
            </span>
            {b.id === active?.id && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
          </DropdownItem>
        ))}
        <div className="my-1 border-t border-slate-100" />
        {!atLimit ? (
          <DropdownItem onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add a branch
          </DropdownItem>
        ) : isStarter ? (
          <Link
            href="/settings/billing"
            className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-700 transition hover:bg-emerald-50"
          >
            <ArrowUpRight className="h-4 w-4" />
            Upgrade to add branches
          </Link>
        ) : (
          <a
            href={SALES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-700 transition hover:bg-emerald-50"
          >
            <Lock className="h-4 w-4" />
            Limit reached — contact sales
          </a>
        )}
      </DropdownMenu>

      <Dialog open={addOpen} onClose={() => !creating && setAddOpen(false)} title="Add a branch">
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-slate-500">
            A new branch starts with its own empty stock, orders, customers and finance — fully separate from your other branches.
          </p>
          <div>
            <Label htmlFor="branch-name">Branch name</Label>
            <Input
              id="branch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Westlands Branch"
              disabled={creating}
            />
          </div>
          <div>
            <Label htmlFor="branch-location">Location (optional)</Label>
            <Input
              id="branch-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Westlands, Nairobi"
              disabled={creating}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-2">
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create branch
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
