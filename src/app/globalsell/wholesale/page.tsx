"use client";

import { BrowsePage } from "../_components/browse-page";

export default function WholesaleMarketplacePage() {
  return (
    <BrowsePage
      channel="wholesale"
      heroTitle="Wholesale Marketplace"
      heroSubtitle="Bulk orders from Kenya's top tailoring businesses — minimum quantities apply"
      heroBadges={["📦 Bulk Orders", "💰 Wholesale Pricing", "🏭 Direct from Tailors"]}
    />
  );
}
