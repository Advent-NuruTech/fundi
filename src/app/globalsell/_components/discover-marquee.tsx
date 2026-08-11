"use client";

import { Sparkles } from "lucide-react";

const ITEMS = [
  "Discover Quality",
  "Verified Kenyan Sellers",
  "Handmade & Bespoke",
  "Nationwide Delivery",
  "Premium Fabrics & Clothes",
  "Retail & Wholesale",
];

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {ITEMS.map((item, i) => (
        <span key={i} className="flex shrink-0 items-center gap-8 pr-8 text-sm font-semibold tracking-wide text-white">
          {item}
          <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
        </span>
      ))}
    </div>
  );
}

export function DiscoverMarquee() {
  return (
    <div className="relative w-full overflow-hidden border-b border-emerald-700/20 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 py-2.5">
      <div className="flex w-max animate-marquee">
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}
