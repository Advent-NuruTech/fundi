"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogIn,
  LogOut,
  ShoppingBag,
  Store,
  UserRound,
  UserPlus,
} from "lucide-react";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/components/auth-context";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type AccountKind = "loading" | "signed-out" | "customer" | "business";

export function ProfileButton() {
  const pathname = usePathname();
  const { business } = useAuth();
  const [kind, setKind] = useState<AccountKind>("loading");
  const [accountLabel, setAccountLabel] = useState("");

  useEffect(() => {
    const resolveAccount = (user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]) => {
      if (!user) {
        setKind("signed-out");
        setAccountLabel("");
        return;
      }
      const isCustomer = user.user_metadata?.portal_type === "customer";
      setKind(isCustomer ? "customer" : "business");
      setAccountLabel(
        (user.user_metadata?.display_name as string | undefined) ??
          user.email ??
          (isCustomer ? "Customer" : "Business account")
      );
    };

    supabase.auth.getUser().then(({ data }) => resolveAccount(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveAccount(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const returnPath = pathname || "/";
  const customerLogin = `/auth/customer-login?redirect=${encodeURIComponent(returnPath)}`;
  const customerRegister = `/auth/customer-register?redirect=${encodeURIComponent(returnPath)}`;
  const businessLogin = `/login?redirect=${encodeURIComponent(returnPath)}`;
  const triggerLabel =
    kind === "customer" ? "My orders" : kind === "business" ? "Business" : "Account";

  const signOut = async () => {
    await supabase.auth.signOut();
    setKind("signed-out");
    setAccountLabel("");
  };

  return (
    <DropdownMenu
      className="w-72 p-1"
      trigger={
        <button
          type="button"
          aria-label={`${triggerLabel} menu`}
          className={cn(
            "flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800",
            kind === "loading" && "animate-pulse"
          )}
        >
          {kind === "business" ? <Building2 className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
          <span className="hidden text-xs font-semibold sm:inline">{triggerLabel}</span>
          <ChevronDown className="hidden h-3.5 w-3.5 sm:block" />
        </button>
      }
    >
      {kind === "signed-out" || kind === "loading" ? (
        <div className="p-1">
          <div className="px-3 pb-2 pt-1">
            <p className="text-sm font-bold text-slate-900">Choose your account</p>
            <p className="mt-0.5 text-xs text-slate-500">Customer shopping and business selling stay separate.</p>
          </div>
          <Link href={customerLogin} className="flex gap-3 rounded-xl px-3 py-2.5 transition hover:bg-emerald-50">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Customer sign in</span>
              <span className="block text-xs text-slate-500">Track purchases and workshop orders</span>
            </span>
          </Link>
          <Link href={businessLogin} className="flex gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Business sign in</span>
              <span className="block text-xs text-slate-500">Buy for or manage a business</span>
            </span>
          </Link>
          <div className="my-1 border-t border-slate-100" />
          <Link href={customerRegister} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
            <UserPlus className="h-4 w-4" /> New customer account
          </Link>
        </div>
      ) : kind === "customer" ? (
        <div className="p-1">
          <div className="border-b border-slate-100 px-3 pb-3 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Customer account</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">{accountLabel}</p>
            <p className="text-xs text-slate-500">Orders from every connected business</p>
          </div>
          <Link href="/portal/orders" className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800">
            <ShoppingBag className="h-4 w-4" /> My orders
          </Link>
          <Link href="/portal/profile" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800">
            <UserRound className="h-4 w-4" /> Customer profile
          </Link>
          <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      ) : (
        <div className="p-1">
          <div className="border-b border-slate-100 px-3 pb-3 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-700">Business account</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">{business?.name || accountLabel}</p>
            <p className="text-xs text-slate-500">Buying and selling tools</p>
          </div>
          <Link href="/sell/purchases" className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800">
            <ShoppingBag className="h-4 w-4" /> Business purchases
          </Link>
          <Link href="/sell" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800">
            <Store className="h-4 w-4" /> Seller workspace
          </Link>
          <Link href="/dashboard" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <LayoutDashboard className="h-4 w-4" /> Business dashboard
          </Link>
          <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </DropdownMenu>
  );
}
