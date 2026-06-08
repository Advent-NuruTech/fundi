"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, Loader2, Eye, EyeOff, Lock, CheckCircle2,
  XCircle, User, Building2, ChevronRight, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Password strength ──────────────────────────────────────────────────────

interface StrengthRule { label: string; test: (p: string) => boolean }
const RULES: StrengthRule[] = [
  { label: "At least 8 characters",      test: (p) => p.length >= 8 },
  { label: "Uppercase letter (A–Z)",      test: (p) => /[A-Z]/.test(p) },
  { label: "Number (0–9)",                test: (p) => /[0-9]/.test(p) },
  { label: "Special character (!@#…)",    test: (p) => /[^A-Za-z0-9]/.test(p) },
];
function passwordScore(p: string) { return RULES.filter((r) => r.test(p)).length; }

function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const score = passwordScore(password);
  const bars = 4;
  const colorMap = ["bg-rose-500", "bg-orange-500", "bg-amber-400", "bg-emerald-500"];
  const labelMap = ["Too weak", "Weak", "Fair", "Strong"];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i < score ? colorMap[score - 1] : "bg-slate-700"
            )}
          />
        ))}
      </div>
      <p className={cn("text-[10px] font-medium", score > 0 ? colorMap[score - 1].replace("bg-", "text-") : "text-slate-600")}>
        {labelMap[score - 1] ?? "Too weak"}
      </p>
      <ul className="space-y-0.5">
        {RULES.map((rule) => {
          const pass = rule.test(password);
          return (
            <li key={rule.label} className="flex items-center gap-1.5">
              {pass
                ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                : <XCircle className="h-3 w-3 text-slate-600" />}
              <span className={cn("text-[10px]", pass ? "text-emerald-400" : "text-slate-600")}>
                {rule.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

type Mode = "checking" | "bootstrap" | "signin";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("checking");

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // Bootstrap state
  const [bsFullName, setBsFullName] = useState("");
  const [bsEmail, setBsEmail] = useState("");
  const [bsPassword, setBsPassword] = useState("");
  const [bsConfirm, setBsConfirm] = useState("");
  const [bsBusiness, setBsBusiness] = useState("");
  const [showBsPassword, setShowBsPassword] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bsStep, setBsStep] = useState<1 | 2>(1);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const [sessionRes, setupRes] = await Promise.all([
          fetch("/api/ffmanage/auth/session"),
          fetch("/api/ffmanage/auth/setup-status"),
        ]);
        if (cancelled) return;
        const session = await sessionRes.json();
        if (session.authenticated) { router.replace("/ffmanage/dashboard"); return; }
        const setup = await setupRes.json();
        setMode(setup.ownerExists ? "signin" : "bootstrap");
      } catch {
        if (!cancelled) setMode("signin");
      }
    }
    init();
    return () => { cancelled = true; };
  }, [router]);

  // ── Sign-in handler ──────────────────────────────────────────────────────

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSigningIn(true);
    try {
      const res = await fetch("/api/ffmanage/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      toast.success("Authenticated successfully");
      router.replace("/ffmanage/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSigningIn(false);
    }
  }

  // ── Bootstrap handler ─────────────────────────────────────────────────────

  const bsScore = passwordScore(bsPassword);
  const bsPasswordOk = bsScore === 4;
  const bsStep1Valid = bsFullName.length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bsEmail);
  const bsStep2Valid = bsPasswordOk && bsPassword === bsConfirm;

  async function handleBootstrap(e: React.FormEvent) {
    e.preventDefault();
    if (!bsStep2Valid) return;
    setBootstrapping(true);
    try {
      const res = await fetch("/api/ffmanage/auth/bootstrap-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: bsFullName,
          email: bsEmail,
          password: bsPassword,
          confirmPassword: bsConfirm,
          businessName: bsBusiness || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Setup failed");
      toast.success("Owner account created. Welcome to FundiFlow Admin.");
      router.replace("/ffmanage/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setBootstrapping(false);
    }
  }

  // ── Loading / checking ───────────────────────────────────────────────────

  if (mode === "checking") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  // ── Shared outer layout ───────────────────────────────────────────────────

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 p-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-60 -right-60 h-[500px] w-[500px] rounded-full bg-violet-900/15 blur-3xl" />
        <div className="absolute -bottom-60 -left-60 h-[500px] w-[500px] rounded-full bg-indigo-900/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-violet-800/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo mark */}
        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-violet-600/20 blur-lg" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 shadow-xl shadow-violet-900/60">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          {mode === "bootstrap" ? (
            <>
              <h1 className="text-2xl font-bold text-white">Welcome to FundiFlow</h1>
              <p className="mt-1.5 text-sm text-slate-400">
                Create your owner account to get started
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-900/30 border border-emerald-800/40 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">First-time setup</span>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white">FundiFlow Admin</h1>
              <p className="mt-1.5 text-sm text-slate-500">Restricted — system owner only</p>
            </>
          )}
        </div>

        {/* ── BOOTSTRAP FORM ───────────────────────────────────────────── */}
        {mode === "bootstrap" && (
          <form onSubmit={handleBootstrap}>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-sm overflow-hidden">
              {/* Step indicator */}
              <div className="flex border-b border-slate-800">
                {[1, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => s === 1 || bsStep1Valid ? setBsStep(s as 1 | 2) : undefined}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 py-3 text-xs font-medium transition-colors",
                      bsStep === s
                        ? "bg-violet-900/30 text-violet-300 border-b-2 border-violet-500"
                        : "text-slate-600 hover:text-slate-400"
                    )}
                  >
                    <span className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      bsStep === s ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-500"
                    )}>{s}</span>
                    {s === 1 ? "Your info" : "Security"}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-4">
                {/* Step 1: personal + business info */}
                {bsStep === 1 && (
                  <>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                        Full name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={bsFullName}
                          onChange={(e) => setBsFullName(e.target.value)}
                          required
                          autoFocus
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
                          placeholder="Jane Wanjiru"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                        Email address
                      </label>
                      <input
                        type="email"
                        value={bsEmail}
                        onChange={(e) => setBsEmail(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
                        placeholder="owner@yourworkshop.co.ke"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                        Workshop name <span className="text-slate-600 normal-case">(optional)</span>
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={bsBusiness}
                          onChange={(e) => setBsBusiness(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
                          placeholder="Jane's Tailor Shop"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!bsStep1Valid}
                      onClick={() => setBsStep(2)}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Continue <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}

                {/* Step 2: password */}
                {bsStep === 2 && (
                  <>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                        Create password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type={showBsPassword ? "text" : "password"}
                          value={bsPassword}
                          onChange={(e) => setBsPassword(e.target.value)}
                          required
                          autoFocus
                          autoComplete="new-password"
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-11 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
                          placeholder="Min 8 chars, uppercase, number, symbol"
                        />
                        <button
                          type="button"
                          onClick={() => setShowBsPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showBsPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <PasswordStrengthMeter password={bsPassword} />
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                        Confirm password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type="password"
                          value={bsConfirm}
                          onChange={(e) => setBsConfirm(e.target.value)}
                          required
                          autoComplete="new-password"
                          className={cn(
                            "w-full rounded-xl border bg-slate-800 pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-colors",
                            bsConfirm && bsConfirm !== bsPassword
                              ? "border-rose-600 focus:border-rose-500 focus:ring-rose-500"
                              : bsConfirm && bsConfirm === bsPassword
                              ? "border-emerald-600 focus:border-emerald-500 focus:ring-emerald-500"
                              : "border-slate-700 focus:border-violet-500 focus:ring-violet-500"
                          )}
                          placeholder="Re-enter password"
                        />
                        {bsConfirm && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {bsConfirm === bsPassword
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              : <XCircle className="h-4 w-4 text-rose-500" />}
                          </div>
                        )}
                      </div>
                      {bsConfirm && bsConfirm !== bsPassword && (
                        <p className="mt-1 text-[10px] text-rose-400">Passwords do not match</p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setBsStep(1)}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={!bsStep2Valid || bootstrapping}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {bootstrapping ? (
                          <><Loader2 className="h-4 w-4 animate-spin" />Creating account…</>
                        ) : (
                          <>Create Owner Account <ArrowRight className="h-4 w-4" /></>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-amber-900/30 bg-amber-900/10 p-4">
              <p className="text-xs text-amber-400 font-medium mb-1">One-time setup</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                This form is only visible because no owner account exists yet.
                After creation, public signup is permanently disabled —
                future users must use invite links.
              </p>
            </div>
          </form>
        )}

        {/* ── SIGN-IN FORM ─────────────────────────────────────────────── */}
        {mode === "signin" && (
          <>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-sm">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
                    placeholder="owner@yourworkshop.co.ke"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pr-11 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={signingIn || !email || !password}
                  className="w-full bg-violet-600 hover:bg-violet-500 focus-visible:ring-violet-500 mt-2"
                >
                  {signingIn ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Authenticating…</>
                  ) : (
                    "Sign in to Admin Panel"
                  )}
                </Button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-slate-600">
              This panel is only accessible to the FundiFlow system owner.
              <br />
              All access attempts are logged and monitored.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
