"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ArrowRight, Mail, Eye, EyeOff, LogIn } from "lucide-react";
import Image from "next/image";

import { useAuth } from "@/features/auth/components/auth-context";
import { loginSchema, type LoginValues } from "@/schemas/auth.schema";

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
  const { login, loginWithGoogle, refreshProfile } = useAuth();

  const inviteToken = searchParams.get("invite");
  const requestedRedirect = searchParams.get("redirect");
  const [step, setStep] = useState<"idle" | "authenticating" | "setting_up" | "redirecting">("idle");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
      await refreshProfile();

      setStep("redirecting");
      toast.success(inviteToken ? "Invitation accepted! Welcome aboard." : "Welcome back");

      setTimeout(() => {
        router.push(getSafeRedirect(requestedRedirect));
      }, 700);
    } catch (err) {
      setStep("idle");
      const message = err instanceof Error ? err.message : "";
      if (message.includes("invitation")) {
        setError(message);
      } else if (message.toLowerCase().includes("too many")) {
        setError("Too many attempts. Please try again later.");
      } else {
        // Deliberately generic — never reveal whether the account exists.
        setError("Invalid email or password.");
      }
    }
  };

  const handleGoogleLogin = async () => {
    if (isBusy) return;
    try {
      setError("");
      await loginWithGoogle(getSafeRedirect(requestedRedirect));
    } catch {
      setError("Google sign-in failed. Please try again.");
    }
  };

  const isBusy = step !== "idle";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 p-4">
      <div className="w-full max-w-md">
        {inviteToken && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100/50 p-4 text-sm shadow-sm">
            <p className="font-semibold text-emerald-800">🎉 You have been invited!</p>
            <p className="mt-1 text-emerald-700">
              Sign in with your temporary credentials to accept the invitation and join your workshop.
            </p>
          </div>
        )}

        <Card className="relative overflow-hidden border-0 shadow-2xl shadow-emerald-100/50">
          {/* Decorative gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500" />

          <CardHeader className="space-y-4 pt-8">
            <div className="flex flex-col items-center gap-4">
              {/* Logo */}
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 p-1 shadow-lg shadow-emerald-200/50">
                <div className="flex h-full w-full items-center justify-center rounded-xl bg-white">
                  <Image
                    src="/images/logo.jpeg"
                    alt="FundiFlow Logo"
                    width={70}
                    height={70}
                    className="rounded-lg object-contain"
                    priority
                  />
                </div>
              </div>
              <div className="text-center">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent">
                  FundiFlow
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {inviteToken ? "Accept your invitation" : requestedRedirect ? "Sign in to continue to checkout" : "Welcome back to your workshop"}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@workshop.com"
                    autoComplete="email"
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
                    {...register("email")}
                    disabled={isBusy}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Password
                  </Label>
                  {!inviteToken && (
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
                    {...register("password")}
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    disabled={isBusy}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 border border-rose-100">
                  {error}
                </div>
              )}

              <Button
                className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 transition-all duration-300 shadow-lg shadow-emerald-200 hover:shadow-emerald-300/50"
                type="submit"
                disabled={isBusy}
                size="lg"
              >
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                {step === "authenticating" && "Signing in..."}
                {step === "setting_up" && "Setting up..."}
                {step === "redirecting" && "Redirecting..."}
                {step === "idle" && (
                  <>
                    <LogIn className="h-4 w-4" />
                    {inviteToken ? "Accept invitation & sign in" : "Sign in"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Google Sign-in */}
            {!inviteToken && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500">or continue with</span>
                </div>
                <Button
                  className="mt-4 w-full gap-2 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-emerald-200 transition-all duration-300 shadow-sm hover:shadow-md"
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  disabled={isBusy}
                  size="lg"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </div>
            )}

            <div className="space-y-2 text-center text-sm">
              <p className="text-slate-600">
                New tailoring business?{" "}
                <Link
                  href={`/register${requestedRedirect ? `?redirect=${encodeURIComponent(getSafeRedirect(requestedRedirect))}` : ""}`}
                  className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors hover:underline underline-offset-2"
                >
                  Create account
                </Link>
              </p>
              {!inviteToken && (
                <p className="text-xs text-slate-400">✨ Secure & encrypted sign-in</p>
              )}
            </div>
          </CardContent>

          {/* Loading Overlay */}
          {isBusy && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
                  <Loader2 className="relative h-8 w-8 animate-spin text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {step === "authenticating" && "Signing you in..."}
                  {step === "setting_up" && inviteToken ? "Accepting invitation..." : "Preparing your workspace..."}
                  {step === "redirecting" && "Taking you to your dashboard..."}
                </p>
                <p className="text-xs text-slate-400">Please tell more tailors about fundiflow</p>
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl shadow-emerald-100/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="ml-3 text-sm text-slate-500">Loading sign in...</span>
        </CardContent>
      </Card>
    </div>
  );
}

function getSafeRedirect(redirect: string | null) {
  return redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard";
}
