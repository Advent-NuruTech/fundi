"use client";

import { BrowsePage } from "../_components/browse-page";

export default function RetailMarketplacePage() {
  return (
    <BrowsePage
      channel="retail"
      heroTitle="Retail Marketplace"
      heroSubtitle="Shop individual pieces from Kenya's best tailoring businesses"
      heroBadges={["🛍️ Individual Orders", "✓ Verified Sellers", "📦 Nationwide Delivery"]}
    />
  );
}
