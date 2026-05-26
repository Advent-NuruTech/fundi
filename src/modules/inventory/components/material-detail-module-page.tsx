"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { InventoryMaterial } from "@/types/domain";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { fetchMaterialById } from "@/services/firestore.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MaterialDetailModulePage() {
  const params = useParams<{ materialId: string }>();
  const { businessId, ready } = useBusinessContext();
  const [material, setMaterial] = useState<InventoryMaterial | null>(null);

  useEffect(() => {
    if (!ready || !params.materialId) {
      return;
    }
    fetchMaterialById(businessId, params.materialId).then(setMaterial);
  }, [businessId, params.materialId, ready]);

  if (!material) {
    return <div className="text-sm text-slate-500">Material not found.</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{material.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-700">
        <p>Category: {material.category}</p>
        <p>Stock: {material.quantity} {material.unit}</p>
        <p>Reorder Level: {material.reorderLevel}</p>
        <p>Supplier ID: {material.supplierId || "Not linked"}</p>
      </CardContent>
    </Card>
  );
}
