"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { registerCustomerPortal } from "@/services/customer-portal.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function CustomerRegisterPage() {
  return <Suspense fallback={<CustomerAuthFallback />}><CustomerRegisterForm /></Suspense>;
}

function CustomerRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const { error } = await registerCustomerPortal({ email, password, name, phone });
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Account created! You can now track your orders.");
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
          <CardTitle className="text-lg">Create your account</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">Track your orders from any device</p>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-xs">Full name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-xs">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712345678"
                className="mt-1"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Must match the number used when your order was placed
              </p>
            </div>
            <div>
              <Label htmlFor="email" className="text-xs">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
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
            </div>
            <div>
              <Label htmlFor="confirm" className="text-xs">Confirm password</Label>
              <Input
                id="confirm"
                type={showPwd ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 hover:bg-emerald-800 mt-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create account & track orders
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link href={`/auth/customer-login?redirect=${encodeURIComponent(getSafeRedirect(searchParams.get("redirect")))}`} className="font-medium text-emerald-700 hover:underline">
              Sign in
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-slate-400">
            Are you a workshop owner?{" "}
            <Link href="/login" className="text-slate-600 hover:underline">
              Staff login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function getSafeRedirect(redirect: string | null) {
  return redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/portal";
}

function CustomerAuthFallback() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading registration…</div>;
}
