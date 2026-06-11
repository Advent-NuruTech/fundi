"use client";

import { WifiOff, RefreshCw, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
        <WifiOff className="h-8 w-8 text-slate-500" />
      </div>
      <h1 className="mt-6 text-xl font-semibold text-slate-900">
        You&apos;re offline
      </h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        This page hasn&apos;t been saved for offline use yet. Pages you&apos;ve
        visited before are still available, and any changes you make will sync
        automatically when you reconnect.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <LayoutDashboard className="h-4 w-4" />
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
