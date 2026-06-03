"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/components/auth-context";

type CallbackStep = "validating_session" | "setting_up" | "redirecting" | "error";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState<CallbackStep>("validating_session");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const handleCallback = async () => {
      try {
        setStep("validating_session");

        // Give Supabase a moment to process the OAuth code from the URL
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          throw new Error(sessionError?.message ?? "No session found. Please try signing in again.");
        }

        const user = session.user;
        if (!user.email) {
          throw new Error("No email address returned. Please try again.");
        }

        setStep("setting_up");

        // Call the server-side onboard API to ensure profile/business exist.
        // This is idempotent — safe to call on every Google login.
        const res = await fetch("/api/auth/onboard", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            displayName: user.user_metadata?.full_name ?? user.user_metadata?.name,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Account setup failed. Please try again.");
        }

        await refreshProfile();

        if (!mounted) return;
        setStep("redirecting");
        router.replace("/dashboard");
      } catch (err) {
        if (!mounted) return;
        setStep("error");
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong during sign in.");
      }
    };

    handleCallback();
    return () => { mounted = false; };
  }, [router, refreshProfile]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 text-center">
        {(step === "validating_session" || step === "setting_up") && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm text-slate-600">
              {step === "validating_session" && "Completing sign in..."}
              {step === "setting_up" && "Setting up your workspace..."}
            </p>
          </>
        )}

        {step === "redirecting" && (
          <>
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <p className="text-sm text-slate-600">Taking you to your dashboard...</p>
          </>
        )}

        {step === "error" && (
          <>
            <XCircle className="h-8 w-8 text-rose-600" />
            <p className="text-sm font-medium text-rose-600">Sign in failed</p>
            <p className="max-w-sm text-sm text-slate-500">{errorMessage}</p>
            <button
              onClick={() => router.replace("/login")}
              className="mt-2 text-sm font-medium text-emerald-700 underline hover:text-emerald-600"
            >
              Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
