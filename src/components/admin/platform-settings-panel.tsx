"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Power, Loader2, CheckCircle2 } from "lucide-react";

/**
 * Platform settings panel for platform managers. Currently exposes a single
 * control: turning the free trial LIVE or OFF for the whole platform.
 *
 *   LIVE → any new workspace can start a free trial; trial wording is shown.
 *   OFF  → no user may start a free trial; all trial wording is hidden across
 *          pricing, signup, the dashboard and the start-trial page.
 */
export function PlatformSettingsPanel() {
  const [freeTrialEnabled, setFreeTrialEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/ffmanage/settings")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.freeTrialEnabled === "boolean") {
          setFreeTrialEnabled(d.freeTrialEnabled);
        }
      })
      .catch(() => toast.error("Could not load platform settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(value: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/ffmanage/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeTrialEnabled: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not update settings");
      setFreeTrialEnabled(data.freeTrialEnabled);
      toast.success(
        data.freeTrialEnabled
          ? "Free trial is now LIVE. New users can start a trial."
          : "Free trial is now OFF. No user can start a trial."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-slate-800 bg-slate-900">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      </div>
    );
  }

  const enabled = freeTrialEnabled === true;

  return (
    <div className="grid gap-4">
      {/* Free trial toggle */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-500"
              }`}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-100">Free Trial</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                {enabled ? (
                  <>
                    <span className="font-medium text-emerald-400">LIVE.</span> New workspaces can
                    start a 14-day free trial. Trial wording is visible on pricing, signup and the
                    dashboard.
                  </>
                ) : (
                  <>
                    <span className="font-medium text-slate-300">OFF.</span> No user can start a
                    free trial. All trial wording is hidden and signup routes straight to checkout.
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleToggle(!enabled)}
            disabled={saving}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
              enabled
                ? "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                : "bg-emerald-600 text-white hover:bg-emerald-500"
            }`}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : enabled ? (
              <Power className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {enabled ? "Turn Off" : "Turn On"}
          </button>
        </div>

        {/* Status pill */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4 text-xs">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
              enabled
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-emerald-400" : "bg-slate-500"}`} />
            Free trial {enabled ? "enabled" : "disabled"} platform-wide
          </span>
          <span className="text-slate-500">
            Changes apply instantly — no deployment or cache flush required.
          </span>
        </div>
      </div>
    </div>
  );
}
