import { Suspense } from "react";
import { StartTrialClient } from "./start-trial-client";

export default function StartTrialPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </div>
      }
    >
      <StartTrialClient />
    </Suspense>
  );
}
