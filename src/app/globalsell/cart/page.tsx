"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Package, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKes } from "@/lib/utils";

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, subtotal, getSellerGroups } =
    useCartStore();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <ShoppingCart className="mx-auto h-16 w-16 text-slate-200 mb-4" />
        <h1 className="text-xl font-semibold text-slate-700">Your cart is empty</h1>
        <p className="mt-1 text-sm text-slate-400">
          Browse the marketplace to find products you love
        </p>
        <Link href="/globalsell">
          <Button className="mt-6">Browse Marketplace</Button>
        </Link>
      </div>
    );
  }

  const sellerGroups = getSellerGroups();
  const total = subtotal();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Shopping Cart</h1>
        <button
          onClick={clearCart}
          className="text-sm text-slate-400 hover:text-rose-500 transition"
        >
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {Object.entries(sellerGroups).map(([, storeItems]) => {
            const storeName = storeItems[0]?.storeName ?? "Unknown Store";
            const storeSlug = storeItems[0]?.sellerStoreSlug;
            return (
              <Card key={storeSlug}>
                <CardHeader>
                  <CardTitle className="text-sm">
                    <Link
                      href={`/globalsell/store/${storeSlug}`}
                      className="text-emerald-600 hover:underline"
                    >
                      {storeName}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {storeItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 px-5 py-4 border-b border-slate-100 last:border-0"
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.productName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Package className="h-8 w-8 text-slate-300" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/globalsell/product/${item.productId}`}
                          className="text-sm font-semibold text-slate-900 hover:text-emerald-600 line-clamp-2"
                        >
                          {item.productName}
                        </Link>
                        {item.variantName && (
                          <p className="mt-0.5 text-xs text-slate-500">{item.variantName}</p>
                        )}
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {formatKes(item.unitPrice * item.quantity)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatKes(item.unitPrice)} each
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-slate-300 hover:text-rose-500 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="flex items-center gap-1 rounded-xl border border-slate-200">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-8 w-8 flex items-center justify-center text-slate-500 hover:text-slate-900 transition"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={
                              item.maxStock !== undefined && item.quantity >= item.maxStock
                            }
                            className="h-8 w-8 flex items-center justify-center text-slate-500 hover:text-slate-900 transition disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {Object.entries(sellerGroups).map(([, storeItems]) => {
                  const storeName = storeItems[0]?.storeName ?? "Store";
                  const storeTotal = storeItems.reduce(
                    (n, i) => n + i.unitPrice * i.quantity,
                    0
                  );
                  return (
                    <div
                      key={storeName}
                      className="flex justify-between text-sm text-slate-600"
                    >
                      <span className="truncate mr-2">{storeName}</span>
                      <span className="shrink-0">{formatKes(storeTotal)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-slate-900">
                <span>Total</span>
                <span>{formatKes(total)}</span>
              </div>

              <p className="text-xs text-slate-400 text-center">
                Payment will be arranged with each seller
              </p>

              <Link href="/globalsell/checkout">
                <Button className="w-full gap-2" size="lg">
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              <Link href="/globalsell" className="block text-center text-sm text-slate-400 hover:text-emerald-600 transition">
                Continue Shopping
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
