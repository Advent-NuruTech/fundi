"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Package, CheckCircle2, ArrowRight, Building2, LogIn, UserPlus } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { CheckoutForm } from "@/modules/globalsell/components/checkout-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKes } from "@/lib/utils";
import { toast } from "sonner";
import type { CheckoutInput } from "@/types/ecommerce";
import { useAuth } from "@/features/auth/components/auth-context";
import { getMyCustomerRecords } from "@/services/customer-portal.service";
import { supabase } from "@/lib/supabase";
import type { Customer } from "@/types/domain";
import { shopUrl } from "@/lib/storefront-url";

type OrderResult = {
  orderNumber: string;
  storeName: string;
  total: number;
};

export default function CheckoutPage() {
  const { items, getSellerGroups, clearCart, subtotal } = useCartStore();
  const [submitting, setSubmitting] = useState(false);
  const [placedOrders, setPlacedOrders] = useState<OrderResult[]>([]);
  const [done, setDone] = useState(false);
  const { user, business, loading: authLoading } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [authEmail, setAuthEmail] = useState<string | undefined>();
  const [authPhone, setAuthPhone] = useState<string | undefined>();
  const checkoutKeys = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!user || business) {
      setCustomer(null);
      return;
    }
    getMyCustomerRecords().then((records) => setCustomer(records[0] ?? null));
  }, [user, business]);

  useEffect(() => {
    if (!user) {
      setAuthEmail(undefined);
      setAuthPhone(undefined);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setAuthEmail((data.user?.user_metadata?.email as string | undefined) ?? data.user?.email);
      setAuthPhone(data.user?.user_metadata?.phone as string | undefined);
    });
  }, [user]);

  const checkoutDefaults = useMemo<Partial<CheckoutInput> | undefined>(() => {
    if (!user) return undefined;
    if (business) {
      return {
        buyerName: business.name,
        buyerPhone: business.phone ?? user.phone ?? authPhone ?? "",
        buyerEmail: business.email ?? authEmail ?? user.email,
        deliveryLocation: business.address ?? business.location ?? "",
        buyerBusinessId: business.id,
        buyerUserId: user.uid,
      };
    }
    return {
      buyerName: customer?.fullName ?? user.name,
      buyerPhone: customer?.phone ?? user.phone ?? authPhone ?? "",
      buyerEmail: customer?.email ?? authEmail,
      buyerUserId: user.uid,
    };
  }, [authEmail, authPhone, business, customer, user]);

  if (items.length === 0 && !done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Package className="mx-auto h-16 w-16 text-slate-200 mb-4" />
        <h1 className="text-xl font-semibold text-slate-700">No items to checkout</h1>
        <Link href={shopUrl()}>
          <button className="mt-4 text-sm text-emerald-600 hover:underline">
            Browse marketplace
          </button>
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Orders Placed!</h1>
        <p className="mt-2 text-slate-500">
          Your orders have been sent to the sellers. They will contact you to confirm.
        </p>

        <div className="mt-6 space-y-3 text-left">
          {placedOrders.map((order) => (
            <div
              key={order.orderNumber}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Order #{order.orderNumber}
                </p>
                <p className="text-xs text-slate-500">{order.storeName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">
                  {formatKes(order.total)}
                </p>
                <Link
                  href={`${shopUrl("track")}?order=${encodeURIComponent(order.orderNumber)}`}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  Track Order →
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Link href={shopUrl("track")}>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition">
              Track Your Orders
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
          <Link href={shopUrl()} className="text-sm text-slate-400 hover:text-emerald-600">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  const sellerGroups = getSellerGroups();
  const total = subtotal();

  async function handleCheckout(checkoutInput: CheckoutInput) {
    setSubmitting(true);
    const results: OrderResult[] = [];

    try {
      for (const [sellerBusinessId, cartItems] of Object.entries(sellerGroups)) {
        const storeName = cartItems[0]?.storeName ?? "Store";
        checkoutKeys.current[sellerBusinessId] ??= crypto.randomUUID();

        const res = await fetch("/api/globalsell/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}`,
            "Idempotency-Key": checkoutKeys.current[sellerBusinessId],
          },
          body: JSON.stringify({
            sellerBusinessId,
            cartItems,
            checkout: checkoutInput,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.order) {
          throw new Error(data.error ?? "Failed to place order");
        }

        results.push({
          orderNumber: data.order.orderNumber,
          storeName: data.storeName ?? storeName,
          total: Number(data.order.total),
        });
      }

      clearCart();
      checkoutKeys.current = {};
      setPlacedOrders(results);
      setDone(true);
      toast.success("Orders placed successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href={shopUrl("cart")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 transition"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Cart
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-slate-900">Checkout</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{business ? "Confirm business & delivery details" : "Confirm your delivery details"}</CardTitle>
            </CardHeader>
            <CardContent>
              {authLoading ? (
                <p className="py-8 text-center text-sm text-slate-500">Checking your FundiFlow account…</p>
              ) : !user ? (
                <CheckoutAccountChoice />
              ) : (
                <>
                  <p className="mb-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {business
                      ? "Using your existing FundiFlow business account. Review the prefilled details before placing the order."
                      : "Using your existing FundiFlow customer account. Review or update the prefilled details before placing the order."}
                  </p>
                  <CheckoutForm defaultValues={checkoutDefaults} onSubmit={handleCheckout} submitting={submitting} />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {/* Items */}
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-5 w-5 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 truncate">
                      {item.productName}
                    </p>
                    {item.variantName && (
                      <p className="text-xs text-slate-400">{item.variantName}</p>
                    )}
                    <p className="text-xs text-slate-500">×{item.quantity}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-900">
                    {formatKes(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}

              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Total</span>
                  <span>{formatKes(total)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Payment arranged directly with seller
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CheckoutAccountChoice() {
  const redirect = encodeURIComponent("/checkout");
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Sign in once with your FundiFlow identity to continue. New shoppers can create a customer account.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={`/login?redirect=${redirect}`} className="rounded-xl border border-slate-200 p-4 transition hover:border-emerald-400 hover:bg-emerald-50">
          <Building2 className="mb-2 h-5 w-5 text-emerald-700" />
          <p className="font-semibold text-slate-900">I have a FundiFlow business</p>
          <p className="mt-1 text-xs text-slate-500">Sign in to use your business details.</p>
        </Link>
        <Link href={`/auth/customer-login?redirect=${redirect}`} className="rounded-xl border border-slate-200 p-4 transition hover:border-emerald-400 hover:bg-emerald-50">
          <LogIn className="mb-2 h-5 w-5 text-emerald-700" />
          <p className="font-semibold text-slate-900">I am a customer</p>
          <p className="mt-1 text-xs text-slate-500">Sign in with the account your business created for you.</p>
        </Link>
      </div>
      <Link href={`/auth/customer-register?redirect=${redirect}`} className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-700 hover:underline">
        <UserPlus className="h-4 w-4" /> New customer? Create your FundiFlow account
      </Link>
    </div>
  );
}
