"use client";

import { useSearchParams } from "next/navigation";
import { useInventory } from "@/modules/inventory/hooks/use-inventory";
import { InventoryTabs } from "@/modules/inventory/components/inventory-tabs";
import { OverviewSection } from "@/modules/inventory/components/sections/overview-section";
import { MaterialsSection } from "@/modules/inventory/components/sections/materials-section";
import { FabricRollsSection } from "@/modules/inventory/components/sections/fabric-rolls-section";
import { SuppliersSection } from "@/modules/inventory/components/sections/suppliers-section";
import { PurchaseOrdersSection } from "@/modules/inventory/components/sections/purchase-orders-section";
import { StockMovementsSection } from "@/modules/inventory/components/sections/stock-movements-section";
import { LowStockSection } from "@/modules/inventory/components/sections/low-stock-section";
import { FabricConsumptionSection } from "@/modules/inventory/components/sections/fabric-consumption-section";

export function InventoryModulePage({ section: defaultSection }: { section?: string }) {
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") || defaultSection || "overview";

  const {
    materials,
    rolls,
    movements,
    suppliers,
    purchaseOrders,
    lowStock,
    consumption,
    stockValue,
    loading,
  } = useInventory();

  return (
    <div className="space-y-4">
      <InventoryTabs activeSection={activeSection} />

      {activeSection === "overview" && (
        <OverviewSection
          materials={materials}
          rolls={rolls}
          movements={movements}
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
          lowStock={lowStock}
          stockValue={stockValue}
          loading={loading}
        />
      )}

      {activeSection === "materials" && (
        <MaterialsSection materials={materials} suppliers={suppliers} />
      )}

      {activeSection === "fabric-rolls" && (
        <FabricRollsSection rolls={rolls} />
      )}

      {activeSection === "suppliers" && (
        <SuppliersSection suppliers={suppliers} />
      )}

      {activeSection === "purchase-orders" && (
        <PurchaseOrdersSection
          purchaseOrders={purchaseOrders}
          suppliers={suppliers}
          materials={materials}
        />
      )}

      {activeSection === "stock-movements" && (
        <StockMovementsSection movements={movements} />
      )}

      {activeSection === "low-stock" && (
        <LowStockSection lowStock={lowStock} materials={materials} />
      )}

      {activeSection === "fabric-consumption" && (
        <FabricConsumptionSection consumption={consumption} movements={movements} />
      )}
    </div>
  );
}
