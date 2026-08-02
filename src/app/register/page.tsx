"use client";

import { Suspense, useState, useEffect } from "react"; 
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Image from "next/image";
import { Loader2, ArrowRight, Scissors, Sparkles, CheckCircle2, Eye, EyeOff } from "lucide-react";
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
  const planParam = searchParams.get("plan");
  const defaultRedirect = planParam ? `/start-trial?plan=${planParam}` : "/start-trial";
  const redirectTo = searchParams.get("redirect") ?? defaultRedirect;
  const categoryParam = searchParams.get("category");
  const initialType = isBusinessType(categoryParam) ? categoryParam : DEFAULT_BUSINESS_TYPE;
  const { registerOwner } = useAuth();
  const [step, setStep] = useState<"idle" | "creating" | "redirecting">("idle");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const tailoringBusiness = BUSINESS_TYPES.filter(type => type.id === "tailoring");

  return (
    <form className="grid gap-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-emerald-100 p-2">
            <Scissors className="h-5 w-5 text-emerald-600" />
          </div>
          <Label className="text-base font-semibold text-slate-800">What type of business do you run?</Label>
        </div>
        <p className="text-sm text-slate-500">We'll set up the perfect dashboard for your tailoring business.</p>
        <div className="mt-3">
          {tailoringBusiness.map((type) => {
            const active = selectedType === type.id;
            return (
              <button
                type="button"
                key={type.id}
                onClick={() => setValue("businessType", type.id, { shouldValidate: true })}
                disabled={isBusy}
                className={cn(
                  "relative w-full flex items-center gap-4 rounded-2xl border-2 p-5 transition-all duration-200",
                  active
                    ? "border-emerald-500 bg-gradient-to-r from-emerald-50 to-emerald-100/50 shadow-lg shadow-emerald-100/50"
                    : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-50"
                )}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-3xl shadow-md shadow-emerald-200">
                  {type.emoji}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-slate-800">{type.label}</span>
                    {active && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{type.painSolved}</p>
                </div>
                {active && (
                  <div className="absolute -right-1 -top-1">
                    <div className="rounded-full bg-emerald-500 p-1 shadow-lg shadow-emerald-200">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <input type="hidden" {...register("businessType")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="displayName" className="text-sm font-medium text-slate-700">
            Your name
          </Label>
          <Input
            id="displayName"
            placeholder="e.g. Jane Wanjiru"
            {...register("displayName")}
            disabled={isBusy}
            className="rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/30"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="businessName" className="text-sm font-medium text-slate-700">
            Business name
          </Label>
          <Input
            id="businessName"
            placeholder="e.g. Mama Njeri Tailoring"
            {...register("businessName")}
            disabled={isBusy}
            className="rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/30"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
            Phone number
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+254 7XX XXX XXX"
            {...register("phone")}
            disabled={isBusy}
            className="rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/30"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location" className="text-sm font-medium text-slate-700">
            Location
          </Label>
          <Input
            id="location"
            placeholder="Nairobi, Kenya"
            {...register("location")}
            disabled={isBusy}
            className="rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/30"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@workshop.com"
            {...register("email")}
            disabled={isBusy}
            className="rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/30"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 6 characters"
              {...register("password")}
              disabled={isBusy}
              className="rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/30 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 border border-rose-100">
          {error}{" "}
          {(error.includes("already registered") || error.includes("Sign in")) && (
            <Link href="/login" className="font-semibold underline hover:text-rose-700">
              Sign in
            </Link>
          )}
        </div>
      )}

      <div>
        <Button
          className="relative w-full gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-6 text-base font-semibold shadow-lg shadow-emerald-200 transition-all hover:shadow-xl hover:shadow-emerald-200/60 hover:from-emerald-700 hover:to-emerald-600"
          type="submit"
          disabled={isBusy}
        >
          {isBusy && <Loader2 className="h-5 w-5 animate-spin" />}
          {step === "creating" && "Creating your workspace..."}
          {step === "redirecting" && (
            <>
              <Sparkles className="h-5 w-5" />
              Setting up dashboard...
            </>
          )}
          {step === "idle" && (
            <>
              Create your tailoring workspace
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function RegisterPage() {
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopIndex, setLoopIndex] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(80);
const words = [
  "Track customer measurements & orders",
  "Manage fabric & ready-made inventory",
  "Automate SMS pickup & delay reminders",
  "Manage staff payouts & performance",
  "Get real-time business reports",
  "Unlock AI-powered insights",
  "only in fundiflow "
];

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleTyping = () => {
      const currentWord = words[loopIndex % words.length];
      
      if (!isDeleting) {
        // Typing
        setDisplayText(currentWord.substring(0, displayText.length + 1));
        setTypingSpeed(80);
        
        if (displayText.length === currentWord.length) {
          // Pause at full word
          setTypingSpeed(2000);
          setIsDeleting(true);
        }
      } else {
        // Deleting
        setDisplayText(currentWord.substring(0, displayText.length - 1));
        setTypingSpeed(40);
        
        if (displayText.length === 0) {
          setIsDeleting(false);
          setLoopIndex(prev => prev + 1);
          setTypingSpeed(80);
        }
      }
    };

    timer = setTimeout(handleTyping, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, loopIndex, typingSpeed, words]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 via-white to-emerald-50/30 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-amber-200/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-emerald-100/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-emerald-100 bg-white shadow-xl shadow-emerald-100/50 transition-shadow hover:shadow-2xl hover:shadow-emerald-100">
            <Image
              src="/images/logo.jpeg"
              alt="FundiFlow Logo"
              width={80}
              height={80}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <h1 className="mt-4 text-2xl font-bold bg-gradient-to-r from-emerald-700 to-amber-600 bg-clip-text text-transparent">
            Create your tailoring workspace
          </h1>
          
          {/* Typing effect below title */}
          <div className="mt-3 min-h-[60px] flex items-center justify-center">
            <div className="text-sm text-slate-600 max-w-md mx-auto font-mono">
              <span className="inline-block bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent font-medium">
                {displayText}
              </span>
              <span className="inline-block w-[2px] h-4 bg-emerald-500 ml-0.5 animate-pulse"></span>
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Tailoring optimized
            </span>
          </div>
        </div>

        <Card className="relative overflow-hidden border-0 bg-white/80 shadow-2xl shadow-slate-200/50 backdrop-blur-sm">
          <CardContent className="p-6 md:p-8">
            <Suspense fallback={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            }>
              <RegisterForm />
            </Suspense>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-slate-400">
          By creating an account in fundiflow, you agree to our{" "}
          <a
            href="/terms"
            className="text-emerald-500 hover:text-emerald-600 underline transition-colors"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="text-emerald-500 hover:text-emerald-600 underline transition-colors"
          >
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </div>
  );
}