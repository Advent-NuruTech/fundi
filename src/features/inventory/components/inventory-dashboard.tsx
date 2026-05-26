"use client";

import { MaterialsTable } from "./materials-table";
import { InventoryStats } from "./inventory-stats";
import { InventoryFilters } from "./inventory-filters";
import { inventoryMaterials } from "../data/inventory.mock";

export function InventoryDashboard() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory</h1>
        <p className="text-muted-foreground">
          Tailoring materials and fabric management
        </p>
      </div>

      <InventoryStats />

      <InventoryFilters />

      <MaterialsTable materials={inventoryMaterials} />
    </div>
  );
}