"use client";

import Link from "next/link";
import Image from "next/image";
import { CartNavButton } from "./cart-nav-button";
import { MarketplaceSearchBar } from "./search-bar";
import { ProfileButton } from "./profile-button";
import { GlobalSellChannelDropdown } from "./channel-dropdown";
import { shopUrl } from "@/lib/storefront-url";

export function GlobalSellHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Top row */}
        <div className="flex h-14 items-center justify-between gap-3">
          <Link href={shopUrl()} className="flex shrink-0 items-center gap-2">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Image
                src="/images/logo.jpeg"
                alt="FundiFlow"
                fill
                sizes="36px"
                className="object-cover"
                priority
              />
            </div>
            <div className="leading-tight">
              <span className="block text-base font-bold text-slate-900">Global Sell</span>
              <span className="hidden text-[10px] text-slate-400 sm:block">by FundiFlow</span>
            </div>
          </Link>

          {/* Search — desktop */}
          <div className="hidden w-full max-w-xl flex-1 md:block">
            <MarketplaceSearchBar />
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <GlobalSellChannelDropdown />
            <CartNavButton />
            <ProfileButton />
          </div>
        </div>

        {/* Search — mobile */}
        <div className="pb-2.5 md:hidden">
          <MarketplaceSearchBar />
        </div>
      </div>
    </header>
  );
}
