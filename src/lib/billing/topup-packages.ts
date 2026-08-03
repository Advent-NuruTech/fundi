import type { UsageResource } from "@/types/billing";

/**
 * Top-up packages customers can buy in-app when their plan capacity runs out.
 *
 * Every package maps an exact unit count to an exact price (KES) — the system
 * credits precisely what is paid, never more or less. Prices are transparent
 * (unit price is shown in the UI). Adjust here or extend later.
 *
 * CLIENT-SAFE — import from components, hooks and API routes.
 */

export const GB = 1024 ** 3;

export interface TopupPackage {
  id: string;
  resource: UsageResource;
  label: string;
  units: number;
  priceKes: number;
}

export const TOPUP_PACKAGES: Record<UsageResource, TopupPackage[]> = {
  sms: [
    { id: "sms_100", resource: "sms", label: "100 SMS", units: 100, priceKes: 300 },
    { id: "sms_500", resource: "sms", label: "500 SMS", units: 500, priceKes: 1_400 },
    { id: "sms_1000", resource: "sms", label: "1,000 SMS", units: 1_000, priceKes: 2_500 },
    { id: "sms_5000", resource: "sms", label: "5,000 SMS", units: 5_000, priceKes: 11_250 },
  ],
  ai_credits: [
    { id: "ai_100", resource: "ai_credits", label: "100 credits", units: 100, priceKes: 900 },
    { id: "ai_500", resource: "ai_credits", label: "500 credits", units: 500, priceKes: 4_000 },
    { id: "ai_2000", resource: "ai_credits", label: "2,000 credits", units: 2_000, priceKes: 14_000 },
  ],
  storage: [
    { id: "storage_5", resource: "storage", label: "+5 GB", units: 5 * GB, priceKes: 1_000 },
    { id: "storage_20", resource: "storage", label: "+20 GB", units: 20 * GB, priceKes: 3_500 },
    { id: "storage_100", resource: "storage", label: "+100 GB", units: 100 * GB, priceKes: 15_000 },
  ],
};

export const USAGE_RESOURCE_META: Record<
  UsageResource,
  {
    name: string;
    unitLabel: string;
    pluralLabel: string;
    description: string;
  }
> = {
  sms: {
    name: "SMS",
    unitLabel: "SMS",
    pluralLabel: "SMS",
    description: "Customer SMS notifications (ready-for-pickup, delay alerts).",
  },
  ai_credits: {
    name: "AI Credits",
    unitLabel: "credit",
    pluralLabel: "credits",
    description: "AI Assistant requests used for smart order & text assistance.",
  },
  storage: {
    name: "Storage",
    unitLabel: "GB",
    pluralLabel: "GB",
    description: "Cloud image storage for orders, customers and products.",
  },
};

export function getTopupPackage(
  resource: UsageResource,
  packageId: string
): TopupPackage | undefined {
  return TOPUP_PACKAGES[resource]?.find((p) => p.id === packageId);
}

export function getAllTopupPackages(): TopupPackage[] {
  return Object.values(TOPUP_PACKAGES).flat();
}

/** Human-friendly unit count for a resource (GB for storage, plain for SMS/credits). */
export function formatUsageUnits(resource: UsageResource, units: number): string {
  if (resource === "storage") {
    const gb = units / GB;
    return Number.isInteger(gb) ? String(gb) : gb.toFixed(2);
  }
  return Number(units).toLocaleString("en-KE");
}

/** Exact per-unit price, e.g. "KES 3.00 per SMS". */
export function pricePerUnit(
  resource: UsageResource,
  units: number,
  priceKes: number
): string {
  if (units <= 0) return "—";
  if (resource === "storage") {
    const gb = units / GB;
    return `KES ${(priceKes / gb).toLocaleString("en-KE")}/GB`;
  }
  return `KES ${(priceKes / units).toFixed(2)}/${resource === "sms" ? "SMS" : "credit"}`;
}
