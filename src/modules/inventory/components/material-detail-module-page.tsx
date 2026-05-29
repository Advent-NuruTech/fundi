"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExternalLink, Package, AlertTriangle, ImageIcon } from "lucide-react";
import type { InventoryMaterial, Supplier } from "@/types/domain";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { fetchMaterialById, fetchSupplierById } from "@/services/firestore.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKes } from "@/lib/utils";

export function MaterialDetailModulePage() {
  const params = useParams<{ materialId: string }>();
  const { businessId, ready } = useBusinessContext();
  const [material, setMaterial] = useState<InventoryMaterial | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !params.materialId) return;
    setLoading(true);
    fetchMaterialById(businessId, params.materialId).then(async (mat) => {
      setMaterial(mat);
      if (mat?.supplierId) {
        const sup = await fetchSupplierById(businessId, mat.supplierId);
        setSupplier(sup);
      }
      setLoading(false);
    });
  }, [businessId, params.materialId, ready]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  if (!material) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-slate-500">
          Material not found.
        </CardContent>
      </Card>
    );
  }

  const isLowStock = material.quantity <= material.reorderLevel;
  const fabricMeta = material.fabricMeta;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {material.imageUrl ? (
                <img src={material.imageUrl} alt={material.name} className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <Package className="h-5 w-5 text-emerald-600" />
              )}
              <CardTitle>{material.name}</CardTitle>
            </div>
            {isLowStock && (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Low Stock
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <DetailRow label="Category" value={material.categoryName} />
              <DetailRow label="Current stock" value={`${material.quantity} ${material.unitName}`} />
              <DetailRow label="Reorder level" value={`${material.reorderLevel} ${material.unitName}`} />
              <DetailRow label="Price per item" value={formatKes(material.averageUnitCost || 0)} />
            </div>
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Supplier</p>
                {supplier ? (
                  <Link
                    href={`/inventory/suppliers`}
                    className="mt-1 flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-600"
                  >
                    {supplier.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">{material.supplierId ? "Loading..." : "Not linked"}</p>
                )}
                {supplier && (
                  <p className="text-xs text-slate-400 mt-0.5">{supplier.phone}</p>
                )}
              </div>

              {material.imageUrl && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500 mb-2">Image</p>
                  <img src={material.imageUrl} alt={material.name} className="max-h-48 rounded-lg object-cover" />
                </div>
              )}
            </div>
          </div>

          {fabricMeta && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fabricMeta.color && <DetailRow label="Color" value={fabricMeta.color} />}
              {fabricMeta.gsm !== undefined && <DetailRow label="GSM" value={String(fabricMeta.gsm)} />}
              {fabricMeta.rollLength !== undefined && <DetailRow label="Roll Length" value={`${fabricMeta.rollLength}`} />}
              {fabricMeta.pattern && <DetailRow label="Pattern" value={fabricMeta.pattern} />}
              {fabricMeta.composition && <DetailRow label="Composition" value={fabricMeta.composition} />}
            </div>
          )}

          {fabricMeta?.customFields && fabricMeta.customFields.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Custom Fields</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {fabricMeta.customFields.map((field, i) => (
                  <DetailRow key={i} label={field.key} value={String(field.value)} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 capitalize">{value}</span>
    </div>
  );
}
