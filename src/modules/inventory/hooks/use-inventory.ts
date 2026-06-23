"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import type { InventoryMaterial, PurchaseOrder, StockMovement, Supplier } from "@/types/domain";
import {
  listenMaterials,
  listenStockMovements,
  listenSuppliers,
  listenPurchaseOrders,
  lowStockMaterials,
  materialConsumptionFromMovements,
} from "@/services/firestore.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { computeInventoryInsights, reorderSuggestions } from "@/lib/inventory-intelligence";

export function useInventory() {
  const { businessId, ready } = useBusinessContext();

  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;

    const state = { materials: false, movements: false, suppliers: false, purchaseOrders: false };
    const checkLoaded = () => {
      if (Object.values(state).every(Boolean)) setLoading(false);
    };

    const unsubs = [
      listenMaterials(businessId, (data) => { setMaterials(data); if (!state.materials) { state.materials = true; checkLoaded(); } }),
      listenStockMovements(businessId, (data) => { setMovements(data); if (!state.movements) { state.movements = true; checkLoaded(); } }),
      listenSuppliers(businessId, (data) => { setSuppliers(data); if (!state.suppliers) { state.suppliers = true; checkLoaded(); } }),
      listenPurchaseOrders(businessId, (data) => { setPurchaseOrders(data); if (!state.purchaseOrders) { state.purchaseOrders = true; checkLoaded(); } }),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [businessId, ready]);

  const lowStock = useMemo(() => lowStockMaterials(materials), [materials]);
  const consumption = useMemo(() => materialConsumptionFromMovements(movements), [movements]);

  // Velocity-aware insights: days of cover + suggested reorder qty per material.
  const insights = useMemo(
    () => computeInventoryInsights(materials, movements),
    [materials, movements]
  );
  const reorderList = useMemo(() => reorderSuggestions(insights), [insights]);
  const insightByMaterialId = useMemo(
    () => new Map(insights.map((i) => [i.material.id, i])),
    [insights]
  );
  const stockValue = useMemo(
    () => materials.reduce((sum, m) => sum + m.quantity * m.averageUnitCost, 0),
    [materials]
  );

  const pendingPOs = useMemo(
    () => purchaseOrders.filter((po) => po.status === "pending"),
    [purchaseOrders]
  );

  const movementsByType = useCallback(
    (type: StockMovement["movementType"]) => movements.filter((m) => m.movementType === type),
    [movements]
  );

  return {
    materials,
    movements,
    suppliers,
    purchaseOrders,
    lowStock,
    consumption,
    stockValue,
    loading,
    pendingPOs,
    movementsByType,
    insights,
    reorderList,
    insightByMaterialId,
  };
}
