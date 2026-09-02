"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface PWAInstallButtonProps {
  className?: string;
  iconClassName?: string;
  onInstallClick?: () => void;
}

export function PWAInstallButton({
  className,
  iconClassName,
  onInstallClick,
}: PWAInstallButtonProps) {
  const { hydrated, isInstalled, isStandalone, platform, install } = usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);

  // The standard metadata marks the site as capable of being installed, not as
  // installed. Only a standalone launch or the appinstalled event hides this.
  if (!hydrated || isInstalled || isStandalone) return null;

  const handleInstall = async () => {
    onInstallClick?.();
    const outcome = await install();
    if (outcome === "unavailable") setShowInstructions(true);
  };

  const instructions =
    platform === "mobile"
      ? "Open your browser menu and choose Install app or Add to Home screen. On iPhone or iPad, use Safari's Share button, then Add to Home Screen."
      : "Open your browser menu and choose Install FundiFlow or Install app.";

  return (
    <>
      <button type="button" className={className} onClick={handleInstall}>
        <Download className={cn("h-4 w-4 shrink-0", iconClassName)} />
        Install app
      </button>

      {showInstructions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="install-app-title">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="install-app-title" className="text-base font-semibold text-slate-900">Install FundiFlow</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{instructions}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close install instructions"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
