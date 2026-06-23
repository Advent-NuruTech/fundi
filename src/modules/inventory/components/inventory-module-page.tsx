"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useInventory } from "@/modules/inventory/hooks/use-inventory";
import { listenUnits } from "@/services/firestore.service";
import { InventoryTabs } from "@/modules/inventory/components/inventory-tabs";
import { OverviewSection } from "@/modules/inventory/components/sections/overview-section";
import { MaterialsSection } from "@/modules/inventory/components/sections/materials-section";
import { SuppliersSection } from "@/modules/inventory/components/sections/suppliers-section";
import { PurchaseOrdersSection } from "@/modules/inventory/components/sections/purchase-orders-section";
import { StockMovementsSection } from "@/modules/inventory/components/sections/stock-movements-section";
import { LowStockSection } from "@/modules/inventory/components/sections/low-stock-section";
import { SmartReorderSection } from "@/modules/inventory/components/sections/smart-reorder-section";
import { FabricConsumptionSection } from "@/modules/inventory/components/sections/fabric-consumption-section";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import type { DbUnit } from "@/types/domain";

function InventoryModulePageContent({ section: defaultSection }: { section?: string }) {
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") || defaultSection || "overview";
  const { businessId, ready } = useBusinessContext();
  const [units, setUnits] = useState<DbUnit[]>([]);

  useEffect(() => {
    if (!ready) return;
    return listenUnits(businessId, setUnits);
  }, [businessId, ready]);

  const {
    materials,
    movements,
    suppliers,
    purchaseOrders,
    lowStock,
    consumption,
    stockValue,
    loading,
    insights,
    reorderList,
    insightByMaterialId,
  } = useInventory();

  return (
    <div className="space-y-4">
      <InventoryTabs activeSection={activeSection} />

      {activeSection === "overview" && (
        <OverviewSection
          materials={materials}
          movements={movements}
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
          lowStock={lowStock}
          stockValue={stockValue}
          loading={loading}
        />
      )}

      {activeSection === "smart-reorder" && (
        <SmartReorderSection insights={insights} reorderList={reorderList} />
      )}

      {activeSection === "materials" && (
        <MaterialsSection materials={materials} suppliers={suppliers} />
      )}

      {activeSection === "suppliers" && (
        <SuppliersSection suppliers={suppliers} />
      )}

      {activeSection === "purchase-orders" && (
        <PurchaseOrdersSection
          purchaseOrders={purchaseOrders}
          suppliers={suppliers}
          materials={materials}
          units={units}
        />
      )}

      {activeSection === "stock-movements" && (
        <StockMovementsSection movements={movements} />
      )}

      {activeSection === "low-stock" && (
        <LowStockSection lowStock={lowStock} materials={materials} insightByMaterialId={insightByMaterialId} />
      )}

      {activeSection === "fabric-consumption" && (
        <FabricConsumptionSection consumption={consumption} movements={movements} />
      )}
    </div>
  );
}

export function InventoryModulePage({ section }: { section?: string }) {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading inventory...</div>}>
      <InventoryModulePageContent section={section} />
    </Suspense>
  );
}
