"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Lock, CheckCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { forcePasswordResetForFirstLogin } from "@/services/auth.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "saving" | "success">("idle");
  const [error, setError] = useState("");

  const { register, handleSubmit, formState } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (values: PasswordValues) => {
    if (step !== "idle") return;

    if (!auth.currentUser) {
      toast.error("Session expired. Please login again.");
      router.push("/login");
      return;
    }

    setStep("saving");
    setError("");

    try {
      await forcePasswordResetForFirstLogin(auth.currentUser, values.password);
      setStep("success");
      toast.success("Password updated successfully!");

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      setStep("idle");
      const message = err instanceof Error ? err.message : "";
      if (message.includes("weak-password")) {
        setError("Password is too weak. Use at least 8 characters with mixed case and numbers.");
      } else {
        setError("Could not update password. Please try again.");
      }
    }
  };

  if (step === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Password set successfully!</h2>
            <p className="mt-2 text-sm text-slate-500">Taking you to your dashboard...</p>
            <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-emerald-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
            <Lock className="h-6 w-6 text-emerald-600" />
          </div>
          <h1 className="mt-3 text-xl font-bold text-slate-900">Set your new password</h1>
          <p className="mt-1 text-sm text-slate-500">
            This is your first login. Please create a secure password to continue.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  {...register("password")}
                  disabled={step !== "idle"}
                />
                {formState.errors.password && (
                  <p className="mt-1 text-xs text-rose-500">{formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                  disabled={step !== "idle"}
                />
                {formState.errors.confirmPassword && (
                  <p className="mt-1 text-xs text-rose-500">{formState.errors.confirmPassword.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <Button className="w-full gap-2" type="submit" disabled={step !== "idle"}>
                {step === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
                {step !== "idle" ? "Setting password..." : "Set password & continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
