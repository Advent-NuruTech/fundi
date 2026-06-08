"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Image from "next/image";
import { Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { registerSchema, type RegisterValues } from "@/schemas/auth.schema";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/pricing";
  const { registerOwner } = useAuth();
  const [step, setStep] = useState<"idle" | "creating" | "redirecting">("idle");
  const [error, setError] = useState("");

  const { register, handleSubmit } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterValues) => {
    if (step !== "idle") return;

    try {
      setStep("creating");
      setError("");
      await registerOwner(values);
      setStep("redirecting");
      toast.success("Workshop created. Welcome to FundiFlow!");
      setTimeout(() => {
        router.push(redirectTo);
      }, 700);
    } catch (err) {
      setStep("idle");
      const message = err instanceof Error ? err.message : "";
      const lower = message.toLowerCase();

      if (
        lower.includes("already registered") ||
        lower.includes("email-already-in-use") ||
        lower.includes("already been registered") ||
        lower.includes("user already exists")
      ) {
        setError("This email is already registered. Sign in instead.");
      } else if (lower.includes("check your email") || lower.includes("confirm your account")) {
        setError("Account created! Please check your email to confirm, then sign in.");
      } else if (lower.includes("account setup failed") || lower.includes("onboarding")) {
        setError("Your account was created but setup failed. Please sign in — we'll complete setup automatically.");
      } else {
        setError(message || "Registration failed. Please check your details and try again.");
      }
    }
  };

  const isBusy = step !== "idle";

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <Label htmlFor="displayName">Your name</Label>
        <Input id="displayName" placeholder="Jane Tailor" {...register("displayName")} disabled={isBusy} />
      </div>
      <div>
        <Label htmlFor="businessName">Business name</Label>
        <Input id="businessName" placeholder="ABC Tailoring" {...register("businessName")} disabled={isBusy} />
      </div>
      <div>
        <Label htmlFor="phone">Phone number</Label>
        <Input id="phone" type="tel" placeholder="+254 7XX XXX XXX" {...register("phone")} disabled={isBusy} />
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input id="location" placeholder="Nairobi, Kenya" {...register("location")} disabled={isBusy} />
      </div>
      <div>
        <Label htmlFor="email">Email address</Label>
        <Input id="email" type="email" placeholder="you@workshop.com" {...register("email")} disabled={isBusy} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="Min. 6 characters" {...register("password")} disabled={isBusy} />
      </div>

      {error && (
        <div className="md:col-span-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}{" "}
          {(error.includes("already registered") || error.includes("Sign in")) && (
            <Link href="/login" className="font-semibold underline">
              Sign in
            </Link>
          )}
        </div>
      )}

      <div className="md:col-span-2">
        <Button className="w-full gap-2" type="submit" disabled={isBusy}>
          {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
          {step === "creating" && "Creating your workspace..."}
          {step === "redirecting" && "Setting up dashboard..."}
          {step === "idle" && (
            <>
              Create workspace
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-white p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
  <Image
    src="/images/logo.jpeg"
    alt="FundiFlow Logo"
    width={56}
    height={56}
    className="h-full w-full object-cover"
    priority
  />
</div>
          <h1 className="mt-3 text-xl font-bold text-slate-900">Create your tailoring workspace</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set up your business in minutes. Invite your team and start managing orders.
          </p>
        </div>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <Suspense fallback={
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            }>
              <RegisterForm />
            </Suspense>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-emerald-700 hover:text-emerald-600">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

       <div className="mt-6 text-center text-xs text-slate-400">
  By creating an account, you agree to our{" "}
  <a
    href="/terms"
    className="text-amber-400 hover:text-amber-300 underline"
  >
    Terms of Service
  </a>{" "}
  and{" "}
  <a
    href="/privacy"
    className="text-amber-400 hover:text-amber-300 underline"
  >
    Privacy Policy
  </a>
  .
</div>
      </div>
    </div>
  );
}
