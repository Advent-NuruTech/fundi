"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, MessageCircle, RefreshCw, Scissors } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";

export default function BillingPendingPage() {
  const router = useRouter();
  const { subscription, loading, refetch } = useSubscription();

  // Auto-redirect once subscription becomes active
  useEffect(() => {
    if (loading) return;
    if (subscription?.status === "active") {
      router.replace("/dashboard");
    }
  }, [subscription, loading, router]);

  // Poll every 8 seconds for webhook-activated subscription
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 8000);
    return () => clearInterval(interval);
  }, [refetch]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-amber-50 to-white px-4">
      <header className="fixed top-0 inset-x-0 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-4">
          <Link href="/" className="flex items-center gap-2 font-black text-slate-900">
            <Scissors className="h-5 w-5 text-emerald-600" />
            FundiFlow
          </Link>
        </div>
      </header>

      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
          <Clock className="h-10 w-10 text-amber-600" />
        </div>

        <h1 className="text-3xl font-black text-slate-900">
          Payment pending confirmation
        </h1>
        <p className="mt-3 text-slate-500">
          Your payment is being verified. This usually takes less than a minute.
          Your dashboard will unlock automatically once confirmed — you don&apos;t need
          to do anything.
        </p>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-white p-5 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">What happens next?</p>
          <ol className="mt-3 space-y-2 text-left">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">1</span>
              Paystack confirms your payment (usually instant)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">2</span>
              We activate your workspace automatically
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">3</span>
              This page redirects you to your dashboard
            </li>
          </ol>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Check status now
          </Button>

          <a
            href="https://wa.me/254142225233?text=Hi%2C+my+FundiFlow+payment+is+showing+as+pending"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
          >
            <MessageCircle className="h-4 w-4" />
            Contact Support
          </a>
        </div>

        <p className="mt-8 text-xs text-slate-400">
          Already paid and still seeing this?{" "}
          <Link href="/pricing" className="text-emerald-600 hover:underline">
            Go back to pricing
          </Link>{" "}
          or contact us on WhatsApp.
        </p>
      </div>
    </div>
  );
}
