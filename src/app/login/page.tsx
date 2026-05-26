"use client";

import { Suspense } from "react";
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
  const { register, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      const inviteToken = searchParams.get("invite");
      await login(values.email, values.password);
      if (inviteToken) {
        const { auth } = await import("@/lib/firebase");
        if (auth.currentUser) {
          await acceptInvitationByToken(inviteToken, auth.currentUser.uid);
        }
      }
      toast.success("Welcome back");
      router.push("/dashboard");
    } catch {
      toast.error("Login failed. Check your email and password.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to FundiFlow</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} />
            </div>
            <Button className="w-full" type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-600">
            New tailoring business? <Link href="/register" className="font-medium text-emerald-700">Create account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-8 text-sm text-slate-500">Loading sign in...</CardContent>
      </Card>
    </div>
  );
}
