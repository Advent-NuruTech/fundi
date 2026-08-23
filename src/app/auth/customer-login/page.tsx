"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginCustomerPortal } from "@/services/customer-portal.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function CustomerLoginPage() {
  return <Suspense fallback={<CustomerAuthFallback />}><CustomerLoginForm /></Suspense>;
}

function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  // "Remember me" is Supabase Auth default (session persists in localStorage).
  // No opt-out needed — customers expect to stay logged in on their device.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await loginCustomerPortal(loginId, password);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      router.push(getSafeRedirect(searchParams.get("redirect")));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-2xl">✂️</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Customer portal</p>
          <CardTitle className="text-lg">Welcome back</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">Your purchases across every connected business</p>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="loginId" className="text-xs">Email or phone number</Label>
              <Input
                id="loginId"
                type="text"
                required
                autoComplete="username"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="you@example.com or 07XX XXX XXX"
                className="mt-1"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs">Password</Label>
              </div>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Your first password was in the SMS you received when your order was created. You can change it after signing in.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 hover:bg-emerald-800 mt-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sign in
            </Button>
          </form>

        

          
          <div className="mt-5 border-t border-slate-100 pt-4 text-center">
            <p className="text-xs text-slate-500">
              New customer?{" "}
              <Link
                href={`/auth/customer-register?redirect=${encodeURIComponent(getSafeRedirect(searchParams.get("redirect")))}`}
                className="font-semibold text-emerald-700 hover:underline"
              >
                Create an account
              </Link>
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Managing a business?{" "}
              <Link href="/login" className="font-medium text-slate-600 hover:underline">
                Business sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getSafeRedirect(redirect: string | null) {
  return redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/portal";
}

function CustomerAuthFallback() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading sign in…</div>;
}
