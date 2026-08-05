"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  Scissors,
  MessageCircle,
  Calendar,
  Receipt,
  Loader2,
  XCircle,
  Headphones,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatKes } from "@/lib/billing/fees";
import { usePlanConfigs } from "@/hooks/usePlanConfigs";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/billing/plan-badge";
import type { Subscription } from "@/types/billing";

// ─── Confetti ────────────────────────────────────────────────────────────────

function useConfetti(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = [
      "#10b981", "#059669", "#f59e0b", "#ef4444", "#8b5cf6",
      "#3b82f6", "#ec4899", "#14b8a6",
    ];

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      color: string; size: number; rotation: number; rotSpeed: number;
      shape: "rect" | "circle";
    }

    const particles: Particle[] = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 3 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    }));

    let running = true;

    function draw() {
      if (!ctx || !canvas || !running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.85;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
      });

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();

    // Stop after 4 seconds
    const stop = setTimeout(() => { running = false; }, 4000);

    const resize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", resize);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(stop);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  return canvasRef;
}

// ─── Main component ──────────────────────────────────────────────────────────

type State = "verifying" | "success" | "already_active" | "failed";

export function ThankYouClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref") ?? "";

  const { data: planConfigs } = usePlanConfigs();
  const [state, setState] = useState<State>("verifying");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useConfetti(state === "success" || state === "already_active");

  const verify = useCallback(async () => {
    if (!reference) {
      // No reference — might be navigated here directly; check subscription status
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const res = await fetch("/api/billing/subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.subscription?.status === "active") {
        setSubscription(data.subscription);
        setState("already_active");
      } else {
        setState("failed");
        setError("No payment reference found.");
      }
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const res = await fetch(
        `/api/billing/verify?reference=${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Verification failed");
      }

      if (data.verified) {
        setSubscription(data.subscription);
        setState("success");
      } else if (data.status === "success" || data.subscription?.status === "active") {
        setSubscription(data.subscription);
        setState("already_active");
      } else {
        setState("failed");
        setError(`Payment status: ${data.status ?? "unknown"}`);
      }
    } catch (err) {
      setState("failed");
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  }, [reference, router]);

  useEffect(() => {
    verify();
  }, [verify]);

  const plan = subscription?.planSlug
    ? (planConfigs.plans[subscription.planSlug as Exclude<Subscription["planSlug"], "custom">] ?? null)
    : null;

  const nextBillingDate = subscription?.nextBillingDate
    ? new Date(subscription.nextBillingDate).toLocaleDateString("en-KE", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // ── Verifying ──────────────────────────────────────────────────────────────
  if (state === "verifying") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-emerald-50 to-white">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        <p className="text-slate-600">Confirming your payment…</p>
        <p className="text-sm text-slate-400">This usually takes a few seconds.</p>
      </div>
    );
  }

  // ── Failed ─────────────────────────────────────────────────────────────────
  if (state === "failed") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-rose-50 to-white px-4">
        <XCircle className="h-16 w-16 text-rose-500" />
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-900">Payment not confirmed</h1>
          <p className="mt-2 text-slate-500">
            {error ?? "We could not confirm your payment."}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            If you completed the payment, your account will be activated automatically
            via our secure webhook within a few minutes.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/pricing" className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Back to Pricing
          </Link>
          <a
            href="https://wa.me/254142225233?text=Hi%2C+my+FundiFlow+payment+did+not+confirm+automatically"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-500"
          >
            <MessageCircle className="h-4 w-4" /> Contact Support
          </a>
        </div>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-slate-50">
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50"
        style={{ mixBlendMode: "multiply" }}
      />

      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-black text-slate-900">
            <Scissors className="h-5 w-5 text-emerald-600" />
            FundiFlow
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">

        {/* Success icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-200 opacity-60" />
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center gap-2">
            {subscription?.planSlug && (
              <PlanBadge planSlug={subscription.planSlug} className="text-sm px-3 py-1" />
            )}
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              ✓ Active
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 sm:text-5xl">
            Welcome to FundiFlow!
          </h1>
          <p className="mt-3 text-lg text-slate-500">
            Your <strong>{plan?.name ?? "subscription"}</strong> plan is now active.
            Your tailoring business is ready to grow.
          </p>
        </div>

        {/* Receipt card */}
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2 font-bold text-slate-900">
            <Receipt className="h-5 w-5 text-slate-400" />
            Payment confirmation
          </div>

          <div className="space-y-3 text-sm">
            {reference && (
              <div className="flex justify-between">
                <span className="text-slate-500">Reference</span>
                <span className="font-mono text-xs text-slate-700 break-all">{reference}</span>
              </div>
            )}
            {plan && (
              <div className="flex justify-between">
                <span className="text-slate-500">Plan</span>
                <span className="font-semibold text-slate-900">{plan.name}</span>
              </div>
            )}
            {plan && (
              <div className="flex justify-between">
                <span className="text-slate-500">First month subscription — launch offer</span>
                <span className="font-semibold text-emerald-700">{formatKes(plan.introPrice)}</span>
              </div>
            )}
            {subscription?.smsSenderIdPaid && (
              <div className="flex justify-between">
                <span className="text-slate-500">Custom SMS Sender ID</span>
                <span className="font-semibold text-emerald-700">Included ✓</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <span className="text-slate-500">Subscription status</span>
              <span className="font-bold text-emerald-700">Active</span>
            </div>
          </div>
        </div>

        {/* Next billing */}
        {nextBillingDate && (
          <div className="mb-8 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold text-slate-900">Next billing date</p>
              <p className="text-slate-700">{nextBillingDate}</p>
              {plan && (
                <p className="mt-1 text-sm text-slate-500">
                  {formatKes(plan.introPrice)}/month (launch offer) for your second month, then{" "}
                  {formatKes(plan.monthlyPrice)}/month from month 3.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Onboarding CTA */}
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-bold text-slate-900">Get started in minutes</p>
          <p className="mt-1 text-sm text-slate-600">
            Book a free onboarding session with our team on WhatsApp. We&apos;ll walk you through
            every feature and help you get your first order in the system.
          </p>
          <a
            href="https://wa.me/254142225233?text=Hi%2C+I+just+subscribed+to+FundiFlow+and+would+like+to+start+onboarding"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
          >
            <MessageCircle className="h-4 w-4" />
            Book onboarding on WhatsApp
          </a>
        </div>

        {/* Primary CTA */}
        <Link href="/dashboard">
          <Button className="w-full gap-2 rounded-2xl bg-slate-900 py-4 text-base font-bold text-white hover:bg-slate-800">
            Proceed to Dashboard
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>

        {/* Support */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Headphones className="h-4 w-4" />
          Need help? Email{" "}
          <a href="mailto:support@fundiflow.app" className="text-emerald-600 hover:underline">
            support@fundiflow.app
          </a>
        </div>
      </main>
    </div>
  );
}
