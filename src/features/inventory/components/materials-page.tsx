"use client";

import { useState } from "react";
import Link from "next/link";
import { MaterialCard } from "./material-card";
import { InventoryStats } from "./inventory-stats";
import { InventoryFilters } from "./inventory-filters";
import { inventoryMaterials } from "../data/inventory.mock";
import { Search } from "lucide-react";

export function MaterialsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMaterials = inventoryMaterials.filter((material) =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Materials</h1>
        <p className="text-muted-foreground">
          Manage all tailoring materials and fabrics
        </p>
      </div>

      <InventoryStats />

      {/* Search Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-black"
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredMaterials.length} material{filteredMaterials.length !== 1 ? "s" : ""}
        </div>
      </div>

      <InventoryFilters />

      {/* Materials Grid */}
      {filteredMaterials.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredMaterials.map((material) => (
            <Link
              key={material.id}
              href={`/inventory/materials/${material.id}`}
            >
              <MaterialCard material={material} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-white">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">No materials found</p>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search terms
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
