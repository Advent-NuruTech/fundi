"use client";

import Link from "next/link";
import Image from "next/image";
import { X, ShoppingCart, Plus, Minus, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatKes } from "@/lib/utils";
import { isAllowedImageUrl } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import type { CartItem } from "@/types/ecommerce";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

function CartItemRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {isAllowedImageUrl(item.imageUrl) ? (
          <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-6 w-6 text-slate-300" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{item.productName}</p>
        {item.variantName && (
          <p className="text-xs text-slate-500">{item.variantName}</p>
        )}
        <p className="text-xs text-emerald-600">{item.storeName}</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {formatKes(item.unitPrice * item.quantity)}
        </p>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <button
          onClick={() => removeItem(item.id)}
          className="text-slate-400 hover:text-rose-500 transition"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-100 transition"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
          <button
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            disabled={item.maxStock !== undefined && item.quantity >= item.maxStock}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-100 transition disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, subtotal, clearCart } = useCartStore();
  const itemCount = items.length;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Cart{" "}
              {itemCount > 0 && (
                <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                  {itemCount}
                </span>
              )}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingCart className="h-12 w-12 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500">Your cart is empty</p>
              <p className="text-xs text-slate-400 mt-1">
                Browse the marketplace to find products
              </p>
              <Link href="/globalsell" onClick={onClose}>
                <Button size="sm" className="mt-4">Browse Marketplace</Button>
              </Link>
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-slate-200 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Subtotal</span>
              <span className="text-base font-bold text-slate-900">
                {formatKes(subtotal())}
              </span>
            </div>
            <Link href="/globalsell/checkout" onClick={onClose} className="block">
              <Button className="w-full gap-2" size="lg">
                Checkout
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <button
              onClick={clearCart}
              className="w-full text-xs text-slate-400 hover:text-rose-500 transition"
            >
              Clear cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}
