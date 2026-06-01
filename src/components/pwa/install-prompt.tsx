"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function InstallPrompt() {
  const { canInstall, isInstalled, isStandalone, platform, install, dismiss } =
    usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (canInstall && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [canInstall, dismissed]);

  if (!visible || !canInstall || isInstalled || isStandalone) return null;

  const handleInstall = async () => {
    const outcome = await install();
    if (outcome === "accepted") {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    dismiss();
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="rounded-2xl border border-emerald-100 bg-white px-5 py-4 shadow-lg shadow-emerald-900/5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <Download className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              Install FundiFlow
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {platform === "mobile"
                ? "Add to your home screen for the best experience"
                : "Install to your desktop for offline access"}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.97]"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
