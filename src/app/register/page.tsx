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
import { cn } from "@/lib/utils";
import { BUSINESS_TYPES, DEFAULT_BUSINESS_TYPE, isBusinessType } from "@/lib/business-types";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // After sign-up, send new owners straight into the free-trial chooser.
  // A ?plan= hint from the pricing page is forwarded so it's pre-selected.
  const planParam = searchParams.get("plan");
  const defaultRedirect = planParam ? `/start-trial?plan=${planParam}` : "/start-trial";
  const redirectTo = searchParams.get("redirect") ?? defaultRedirect;
  // Pre-select the industry chosen on the pricing page (?category=…).
  const categoryParam = searchParams.get("category");
  const initialType = isBusinessType(categoryParam) ? categoryParam : DEFAULT_BUSINESS_TYPE;
  const { registerOwner } = useAuth();
  const [step, setStep] = useState<"idle" | "creating" | "redirecting">("idle");
  const [error, setError] = useState("");

  const { register, handleSubmit, setValue, watch } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { businessType: initialType },
  });

  const selectedType = watch("businessType") ?? DEFAULT_BUSINESS_TYPE;

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
      <div className="md:col-span-2">
        <Label>What kind of business do you run?</Label>
        <p className="mt-0.5 text-xs text-slate-500">Pick one — we&apos;ll set up the right dashboard, stock list and words for you.</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BUSINESS_TYPES.map((type) => {
            const active = selectedType === type.id;
            return (
              <button
                type="button"
                key={type.id}
                onClick={() => setValue("businessType", type.id, { shouldValidate: true })}
                disabled={isBusy}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                  active
                    ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                    : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40"
                )}
              >
                <span className="text-xl leading-none">{type.emoji}</span>
                <span className="text-sm font-semibold text-slate-800">{type.label}</span>
                <span className="text-[11px] leading-tight text-slate-500">{type.painSolved}</span>
              </button>
            );
          })}
        </div>
        <input type="hidden" {...register("businessType")} />
      </div>
      <div>
        <Label htmlFor="displayName">Your name</Label>
        <Input id="displayName" placeholder="e.g. Jane Wanjiru" {...register("displayName")} disabled={isBusy} />
      </div>
      <div>
        <Label htmlFor="businessName">Business name</Label>
        <Input id="businessName" placeholder="e.g. Mama Njeri Stores" {...register("businessName")} disabled={isBusy} />
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
          <h1 className="mt-3 text-xl font-bold text-slate-900">Create your business workspace</h1>
          <p className="mt-1 text-sm text-slate-500">
            Built for Kenyan & African SMEs. Manage stock, sales, customers and money — in minutes.
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
