/**
 * Intelligent inventory — turns raw stock movements into actionable reorder
 * advice (velocity, days of cover, suggested order quantity).
 *
 * Pure data utilities (no React, no DB) so they can run on the client, in
 * tests, or server-side. The only signal used is `stock_movements`: any
 * movement with a negative `quantityChange` is treated as consumption
 * (a sale, a material used in an order, or a downward adjustment). This makes
 * the logic correct for every business type — a duka's sales and a tailor's
 * fabric usage are both just outflows.
 */

import type { InventoryMaterial, StockMovement } from "@/types/domain";

export interface ReorderOptions {
  /** Trailing window (days) used to measure consumption. */
  windowDays: number;
  /** How long restocking typically takes — the danger zone. */
  leadTimeDays: number;
  /** Extra buffer days to keep on hand beyond lead time. */
  safetyDays: number;
  /** Cover beyond this many days flags an item as over-stocked (capital tied up). */
  overstockDays: number;
}

export const DEFAULT_REORDER_OPTIONS: ReorderOptions = {
  windowDays: 30,
  leadTimeDays: 7,
  safetyDays: 7,
  overstockDays: 120,
};

export type StockHealth = "out" | "critical" | "low" | "healthy" | "overstocked";

export interface InventoryInsight {
  material: InventoryMaterial;
  /** Units consumed over the window (outflows only). */
  consumedInWindow: number;
  /** Average units consumed per day. */
  avgDailyUsage: number;
  /** quantity / avgDailyUsage. null when there is no measured usage. */
  daysOfCover: number | null;
  /** Quantity to order now to reach the target cover, rounded up. 0 when none needed. */
  suggestedReorderQty: number;
  /** Estimated cost of the suggested order (qty × averageUnitCost). */
  suggestedReorderCost: number;
  status: StockHealth;
  /** True when this is among the faster-moving items. */
  isFastMover: boolean;
}

function startOfWindow(windowDays: number): number {
  return Date.now() - windowDays * 24 * 60 * 60 * 1000;
}

/** Total outflow (consumption) per material id within the window. */
function consumptionByMaterial(movements: StockMovement[], windowStart: number): Map<string, number> {
  const totals = new Map<string, number>();
  for (const m of movements) {
    if (!m.materialId || m.quantityChange >= 0) continue;
    const when = m.createdAt ? new Date(m.createdAt).getTime() : Date.now();
    if (when < windowStart) continue;
    totals.set(m.materialId, (totals.get(m.materialId) ?? 0) + Math.abs(m.quantityChange));
  }
  return totals;
}

/**
 * Compute a reorder insight for every material, ordered by urgency
 * (out → critical → low → healthy → overstocked, then by days of cover).
 */
export function computeInventoryInsights(
  materials: InventoryMaterial[],
  movements: StockMovement[],
  options: Partial<ReorderOptions> = {},
): InventoryInsight[] {
  const opts = { ...DEFAULT_REORDER_OPTIONS, ...options };
  const windowStart = startOfWindow(opts.windowDays);
  const consumed = consumptionByMaterial(movements, windowStart);

  // Fast movers = top third by average daily usage (with any usage at all).
  const usages = [...consumed.values()].filter((v) => v > 0).sort((a, b) => b - a);
  const fastMoverThreshold = usages.length
    ? usages[Math.min(usages.length - 1, Math.floor(usages.length / 3))]
    : Infinity;

  const insights: InventoryInsight[] = materials.map((material) => {
    const consumedInWindow = consumed.get(material.id) ?? 0;
    const avgDailyUsage = consumedInWindow / opts.windowDays;
    const daysOfCover = avgDailyUsage > 0 ? material.quantity / avgDailyUsage : null;

    // Target stock keeps us covered through lead time + safety buffer, but
    // never drops below the manually-set reorder level.
    const targetStock = Math.max(
      material.reorderLevel,
      avgDailyUsage * (opts.leadTimeDays + opts.safetyDays),
    );

    let status: StockHealth;
    if (material.quantity <= 0) {
      status = "out";
    } else if (daysOfCover !== null && daysOfCover <= opts.leadTimeDays) {
      status = "critical";
    } else if (material.quantity <= material.reorderLevel) {
      status = "low";
    } else if (daysOfCover !== null && daysOfCover > opts.overstockDays) {
      status = "overstocked";
    } else {
      status = "healthy";
    }

    const needsReorder = status === "out" || status === "critical" || status === "low";
    const suggestedReorderQty = needsReorder
      ? Math.max(0, Math.ceil(targetStock - material.quantity))
      : 0;

    return {
      material,
      consumedInWindow,
      avgDailyUsage,
      daysOfCover,
      suggestedReorderQty,
      suggestedReorderCost: suggestedReorderQty * (material.averageUnitCost || 0),
      status,
      isFastMover: avgDailyUsage > 0 && avgDailyUsage >= fastMoverThreshold,
    };
  });

  const rank: Record<StockHealth, number> = { out: 0, critical: 1, low: 2, healthy: 3, overstocked: 4 };
  return insights.sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    const ac = a.daysOfCover ?? Infinity;
    const bc = b.daysOfCover ?? Infinity;
    return ac - bc;
  });
}

/** Items that should be re-ordered now, most urgent first. */
export function reorderSuggestions(insights: InventoryInsight[]): InventoryInsight[] {
  return insights.filter((i) => i.suggestedReorderQty > 0);
}

/**
 * Build the prefilled purchase-order link for an insight. The PO form reads
 * `reorderMaterialId`, `reorderQuantity`, `reorderUnit` and `reorderUnitCost`
 * from the query string (see purchase-orders-section.tsx).
 */
export function reorderPoHref(insight: InventoryInsight): string {
  const { material, suggestedReorderQty } = insight;
  const params = new URLSearchParams({
    section: "purchase-orders",
    reorderMaterialId: material.id,
    materialName: material.name,
    reorderUnit: material.unitName ?? "",
    reorderQuantity: String(suggestedReorderQty || material.reorderLevel || 1),
  });
  if (material.averageUnitCost) {
    params.set("reorderUnitCost", String(material.averageUnitCost));
  }
  if (material.supplierId) {
    params.set("reorderSupplierId", material.supplierId);
  }
  return `/inventory?${params.toString()}`;
}

const COVER_FORMAT_THRESHOLD = 999;

/** Human label for days of cover, e.g. "~12 days left" / "No recent sales". */
export function coverLabel(daysOfCover: number | null): string {
  if (daysOfCover === null) return "No recent usage";
  if (daysOfCover > COVER_FORMAT_THRESHOLD) return "Plenty in stock";
  if (daysOfCover < 1) return "Less than a day left";
  return `~${Math.round(daysOfCover)} days left`;
}
