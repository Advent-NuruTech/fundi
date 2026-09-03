import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { CartNavButton } from "@/app/globalsell/_components/cart-nav-button";
import { ProfileButton } from "@/app/globalsell/_components/profile-button";
import { isSecureImageUrl } from "@/lib/utils";
import { storeUrl } from "@/lib/storefront-url";
import type { EcommerceStore } from "@/types/ecommerce";

interface StorefrontHeaderProps {
  store?: EcommerceStore;
}

export function StorefrontHeader({ store }: StorefrontHeaderProps) {
  const storeName = store?.storeName ?? "Store";
  const storeHref = store ? storeUrl(store.publicHandle) : "/";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href={storeHref} className="flex min-w-0 items-center gap-2.5" aria-label={`${storeName} home`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 ring-1 ring-emerald-100">
            {isSecureImageUrl(store?.logoUrl) ? (
              <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <ShoppingBag className="h-5 w-5 text-emerald-700" />
            )}
          </div>
          <div className="min-w-0 leading-tight">
            <span className="block truncate text-base font-bold text-slate-900">{storeName}</span>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-emerald-700">Online store</span>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {/* FUTURE MARKETPLACE LINK: Uncomment this block once Global Sell has enough active sellers. */}
          {/*
          <Link href="/" className="hidden text-sm font-medium text-slate-600 hover:text-emerald-700 sm:inline-flex">
            Explore all stores
          </Link>
          */}
          <CartNavButton />
          <ProfileButton />
        </div>
      </div>
    </header>
  );
}
