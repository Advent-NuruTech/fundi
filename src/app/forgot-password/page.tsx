"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type EmailValues = z.infer<typeof emailSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
  });

  const onSubmit = async (values: EmailValues) => {
    try {
      setError("");
      await sendPasswordResetEmail(auth, values.email);
      setSent(true);
      toast.success("Password reset email sent");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("user-not-found")) {
        setError("No account found with this email.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Check your email</h2>
            <p className="mt-2 text-sm text-slate-500">
              If an account exists, we&apos;ve sent a password reset link to your email.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <Mail className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>Reset your password</CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  Enter your email and we&apos;ll send you a reset link.
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
                  {...register("email")}
                />
                {formState.errors.email && (
                  <p className="mt-1 text-xs text-rose-500">{formState.errors.email.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <Button className="w-full" type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              <Link href="/login" className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-600">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
