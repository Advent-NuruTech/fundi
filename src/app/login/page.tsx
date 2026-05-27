"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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
  const { login } = useAuth();

  const [step, setStep] = useState<
    "idle" | "authenticating" | "setting_up" | "redirecting"
  >("idle");

  const { register, handleSubmit } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    if (step !== "idle") return; // prevents multiple clicks

    try {
      setStep("authenticating");

      const inviteToken = searchParams.get("invite");

      // 1. login
      await login(values.email, values.password);

      setStep("setting_up");

      // 2. handle invitation if exists
      const { auth } = await import("@/lib/firebase");

      if (inviteToken && auth.currentUser) {
        await acceptInvitationByToken(inviteToken, auth.currentUser.uid);
      }

      setStep("redirecting");

      toast.success("Welcome back");

      // small UX delay so user sees transition
      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } catch (err) {
      setStep("idle");
      toast.error("Login failed. Check your email and password.");
    }
  };

  const isBusy = step !== "idle";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
      <Card className="w-full max-w-md relative">
        <CardHeader>
          <CardTitle>Sign in to FundiFlow</CardTitle>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} disabled={isBusy} />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} disabled={isBusy} />
            </div>

            <Button className="w-full" type="submit" disabled={isBusy}>
              {step === "authenticating" && "Signing in..."}
              {step === "setting_up" && "Setting up your workspace..."}
              {step === "redirecting" && "Redirecting..."}
              {step === "idle" && "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            New tailoring business?{" "}
            <Link href="/register" className="font-medium text-emerald-700">
              Create account
            </Link>
          </p>
        </CardContent>

        {/* 🔥 Full UX lock overlay */}
        {isBusy && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <div className="text-sm text-slate-700 animate-pulse text-center px-6">
              {step === "authenticating" && "Signing you in..."}
              {step === "setting_up" && "Setting up your workspace..."}
              {step === "redirecting" && "Taking you to your dashboard..."}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-8 text-sm text-slate-500">
          Loading sign in...
        </CardContent>
      </Card>
    </div>
  );
}