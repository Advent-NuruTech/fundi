"use client";

import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { CartDrawer } from "@/modules/globalsell/components/cart-drawer";

export function CartNavButton() {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const storedItemCount = useCartStore((s) => s.itemCount());
  const itemCount = hydrated ? storedItemCount : 0;

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
        aria-label="Open cart"
      >
        <ShoppingCart className="h-4.5 w-4.5" />
        {itemCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </button>
      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
