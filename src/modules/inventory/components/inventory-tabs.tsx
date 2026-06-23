"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "smart-reorder", label: "Smart Reorder" },
  { key: "materials", label: "Materials" },
  { key: "suppliers", label: "Suppliers" },
  { key: "purchase-orders", label: "Purchase Orders" },
  { key: "stock-movements", label: "Stock Movements" },
  { key: "low-stock", label: "Low Stock" },
  { key: "fabric-consumption", label: "Material Consumption" },
];

export function InventoryTabs({ activeSection }: { activeSection: string }) {
  const router = useRouter();

  const handleTabClick = (key: string) => {
    if (key === "overview") {
      router.push("/inventory");
    } else {
      router.push(`/inventory?section=${key}`);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 border-b pb-3">
      {TABS.map((tab) => (
        <Button
          key={tab.key}
          variant={activeSection === tab.key ? "default" : "outline"}
          onClick={() => handleTabClick(tab.key)}
          size="sm"
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
