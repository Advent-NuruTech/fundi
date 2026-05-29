"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ArrowRight, Mail } from "lucide-react";

import { useAuth } from "@/features/auth/components/auth-context";
import { loginSchema, type LoginValues } from "@/schemas/auth.schema";
import { acceptInvitationByToken } from "@/services/firestore.service";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, refreshProfile } = useAuth();

  const inviteToken = searchParams.get("invite");
  const [step, setStep] = useState<"idle" | "authenticating" | "setting_up" | "redirecting">("idle");
  const [error, setError] = useState("");

  const { register, handleSubmit } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    if (step !== "idle") return;

    try {
      setStep("authenticating");
      setError("");

      await login(values.email, values.password);

      setStep("setting_up");

      if (inviteToken) {
        const { auth } = await import("@/lib/firebase");
        if (auth.currentUser) {
          await acceptInvitationByToken(inviteToken, auth.currentUser.uid);
          await refreshProfile();
        }
      }

      setStep("redirecting");
      toast.success(inviteToken ? "Invitation accepted! Welcome aboard." : "Welcome back");

      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } catch (err) {
      setStep("idle");
      const message = err instanceof Error ? err.message : "";
      if (message.includes("user-not-found") || message.includes("wrong-password") || message.includes("invalid-credential")) {
        setError("Invalid email or password. Please try again.");
      } else if (message.includes("too-many-requests")) {
        setError("Too many attempts. Please try again later.");
      } else if (message.includes("invitation")) {
        setError(message);
      } else {
        setError("Login failed. Check your email and password.");
      }
    }
  };

  const isBusy = step !== "idle";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
      <div className="w-full max-w-md">
        {inviteToken && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-semibold text-emerald-800">You have been invited!</p>
            <p className="mt-1 text-emerald-700">
              Sign in with your temporary credentials to accept the invitation and join your workshop.
            </p>
          </div>
        )}

        <Card className="relative overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <Mail className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>Sign in to FundiFlow</CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  {inviteToken ? "Accept your invitation" : "Welcome back to your workshop"}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@workshop.com"
                  autoComplete="email"
                  {...register("email")}
                  disabled={isBusy}
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  {...register("password")}
                  disabled={isBusy}
                />
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <Button className="w-full gap-2" type="submit" disabled={isBusy}>
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                {step === "authenticating" && "Signing in..."}
                {step === "setting_up" && "Setting up..."}
                {step === "redirecting" && "Redirecting..."}
                {step === "idle" && (
                  <>
                    {inviteToken ? "Accept invitation & sign in" : "Sign in"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-3 text-center text-sm">
              <p className="text-slate-600">
                New tailoring business?{" "}
                <Link href="/register" className="font-medium text-emerald-700 hover:text-emerald-600">
                  Create account
                </Link>
              </p>
              {!inviteToken && (
                <p>
                  <Link href="/forgot-password" className="text-slate-500 hover:text-slate-700">
                    Forgot password?
                  </Link>
                </p>
              )}
            </div>
          </CardContent>

          {isBusy && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <p className="text-sm text-slate-600">
                  {step === "authenticating" && "Signing you in..."}
                  {step === "setting_up" && inviteToken ? "Accepting invitation..." : "Preparing your workspace..."}
                  {step === "redirecting" && "Taking you to your dashboard..."}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          <span className="ml-2 text-sm text-slate-500">Loading sign in...</span>
        </CardContent>
      </Card>
    </div>
  );
}
