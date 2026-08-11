"use client";

import { BrowsePage } from "../_components/browse-page";

export default function BothMarketplacePage() {
  return (
    <BrowsePage
      channel="both"
      heroTitle="Wholesale & Retail Marketplace"
      heroSubtitle="Shop single pieces or order in bulk from Kenya's best tailoring businesses"
      heroBadges={["🛍️ Retail & Bulk", "✓ Verified Sellers", "📦 Nationwide Delivery"]}
    />
  );
}
