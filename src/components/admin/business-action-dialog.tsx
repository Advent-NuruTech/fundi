"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { AdminBusinessDetail } from "@/types/admin";

type ActionType = "suspend" | "reactivate" | "change_plan" | "extend_subscription" | "cancel_subscription" | "add_manual_subscription";

interface Props {
  business: AdminBusinessDetail;
  action: ActionType;
  onClose: () => void;
  onSuccess: () => void;
}

const PLAN_LABELS: Record<string, string> = {
  sindano: "Sindano (KES 690/mo)",
  fundi: "Fundi (KES 3,399/mo)",
  dhahabu: "Dhahabu (KES 8,999/mo)",
};

const ACTION_TITLES: Record<ActionType, string> = {
  suspend: "Suspend Business",
  reactivate: "Reactivate Business",
  change_plan: "Change Plan",
  extend_subscription: "Extend Subscription",
  cancel_subscription: "Cancel Subscription",
  add_manual_subscription: "Add Manual Subscription",
};

export function BusinessActionDialog({ business, action, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [planSlug, setPlanSlug] = useState("fundi");
  const [days, setDays] = useState(30);
  const [durationDays, setDurationDays] = useState(30);

  async function handleSubmit() {
    setLoading(true);
    try {
      let body: Record<string, unknown> = { action };
      if (action === "change_plan") body = { action, planSlug, reason };
      else if (action === "extend_subscription") body = { action, days, reason };
      else if (action === "cancel_subscription") body = { action, reason };
      else if (action === "add_manual_subscription") body = { action, planSlug, durationDays, reason };
      else body = { action };

      const res = await fetch(`/api/ffmanage/businesses/${business.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      toast.success("Action completed successfully");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="font-semibold text-white">{ACTION_TITLES[action]}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-400">
            Business: <span className="font-medium text-slate-200">{business.name}</span>
          </p>

          {(action === "change_plan" || action === "add_manual_subscription") && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Plan</label>
              <select
                value={planSlug}
                onChange={(e) => setPlanSlug(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
              >
                {Object.entries(PLAN_LABELS).map(([slug, label]) => (
                  <option key={slug} value={slug}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {action === "extend_subscription" && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Extend by (days)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
          )}

          {action === "add_manual_subscription" && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Duration (days)</label>
              <input
                type="number"
                min={1}
                max={730}
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Reason <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none resize-none"
              placeholder="Reason for this action…"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700">
              Cancel
            </Button>
            <Button
              variant={action === "suspend" || action === "cancel_subscription" ? "danger" : "default"}
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
