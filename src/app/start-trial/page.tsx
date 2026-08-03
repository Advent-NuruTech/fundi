import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getFreeTrialEnabled } from "@/lib/billing/free-trial-flag";
import { isValidPlanSlug } from "@/lib/billing/constants";
import { StartTrialClient } from "./start-trial-client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function StartTrialPage({ searchParams }: PageProps) {
  const { plan } = await searchParams;

  // When the platform free-trial flag is OFF no user may start a trial.
  // Route them straight to checkout (preserving their plan choice) or pricing.
  const enabled = await getFreeTrialEnabled();
  if (!enabled) {
    redirect(isValidPlanSlug(plan) ? `/checkout?plan=${plan}` : "/pricing");
  }

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
