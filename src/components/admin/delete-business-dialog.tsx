"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  businessId: string;
  businessName: string;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteBusinessDialog({ businessId, businessName, onClose, onDeleted }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmName, setConfirmName] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const nameMatches =
    confirmName.trim().toLowerCase() === businessName.trim().toLowerCase();

  async function handleDelete() {
    if (!nameMatches || !password) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ffmanage/businesses/${businessId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName, ownerPassword: password, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      toast.success("Business permanently deleted");
      onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-900/40">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Delete Business</h2>
              <p className="text-xs text-slate-500">This action is permanent and cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <div className="rounded-lg bg-rose-900/20 border border-rose-800/40 p-4">
                <p className="text-sm text-rose-300 font-medium mb-2">
                  You are about to permanently delete:
                </p>
                <p className="text-base font-bold text-white">{businessName}</p>
                <p className="mt-2 text-xs text-rose-400">
                  All data — employees, customers, orders, payments, inventory, analytics, and
                  ecommerce records — will be irreversibly removed.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Reason for deletion <span className="text-slate-600">(optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-rose-500 focus:outline-none resize-none"
                  placeholder="e.g. Abuse, non-payment, test account…"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Type the business name to confirm
                </label>
                <input
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-rose-500 focus:outline-none"
                  placeholder={businessName}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={onClose} className="flex-1 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700">
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  disabled={!nameMatches}
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="rounded-lg bg-amber-900/20 border border-amber-800/40 p-4">
                <p className="text-sm text-amber-300">
                  Final confirmation required. Enter your admin password to authorize this deletion.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Your admin password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-rose-500 focus:outline-none"
                  placeholder="Enter your password"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700">
                  Back
                </Button>
                <Button
                  variant="danger"
                  disabled={!password || loading}
                  onClick={handleDelete}
                  className="flex-1"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete Permanently
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
