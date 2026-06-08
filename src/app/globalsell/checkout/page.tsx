"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Package, CheckCircle2, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { CheckoutForm } from "@/modules/globalsell/components/checkout-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKes } from "@/lib/utils";
import { toast } from "sonner";
import type { CheckoutInput } from "@/types/ecommerce";

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

  if (items.length === 0 && !done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Package className="mx-auto h-16 w-16 text-slate-200 mb-4" />
        <h1 className="text-xl font-semibold text-slate-700">No items to checkout</h1>
        <Link href="/globalsell">
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
                  href={`/globalsell/track?order=${order.orderNumber}`}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  Track Order →
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Link href="/globalsell/track">
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition">
              Track Your Orders
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
          <Link href="/globalsell" className="text-sm text-slate-400 hover:text-emerald-600">
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
        const storeTotal = cartItems.reduce((n, i) => n + i.unitPrice * i.quantity, 0);

        const res = await fetch("/api/globalsell/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
          storeName,
          total: storeTotal,
        });
      }

      clearCart();
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
        href="/globalsell/cart"
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
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckoutForm onSubmit={handleCheckout} submitting={submitting} />
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
