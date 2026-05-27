"use client";

import { useForm } from "react-hook-form";
import Link from "next/link";
import { toast } from "sonner";
import { createMaterial } from "@/services/firestore.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { InventoryMaterial, Supplier } from "@/types/domain";

interface MaterialForm {
  name: string;
  category: InventoryMaterial["category"];
  unit: InventoryMaterial["unit"];
  supplierId: string;
  quantity: number;
  reorderLevel: number;
  averageUnitCost: number;
}

export function MaterialsSection({
  materials,
  suppliers,
}: {
  materials: InventoryMaterial[];
  suppliers: Supplier[];
}) {
  const { businessId } = useBusinessContext();
  const { register, handleSubmit, reset } = useForm<MaterialForm>({
    defaultValues: {
      category: "accessories",
      unit: "pcs",
      supplierId: "",
      quantity: 0,
      reorderLevel: 0,
      averageUnitCost: 0,
    },
  });

  const saveMaterial = handleSubmit(async (values) => {
    try {
      await createMaterial(businessId, { ...values, businessId });
      reset({
        category: "accessories",
        unit: "pcs",
        supplierId: "",
        quantity: 0,
        reorderLevel: 0,
        averageUnitCost: 0,
      });
      toast.success("Material added");
    } catch {
      toast.error("Could not add material");
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Materials</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <form className="space-y-3" onSubmit={saveMaterial}>
          <Input placeholder="Material name" {...register("name", { required: true })} />
          <Select {...register("category")}>
            <option value="buttons">Buttons</option>
            <option value="zips">Zips</option>
            <option value="thread">Thread</option>
            <option value="elastic">Elastic</option>
            <option value="lining">Lining</option>
            <option value="accessories">Accessories</option>
          </Select>
          <Select {...register("unit")}>
            <option value="pcs">Pieces</option>
            <option value="meters">Meters</option>
            <option value="cones">Cones</option>
          </Select>
          <Select {...register("supplierId")}>
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            placeholder="Quantity"
            {...register("quantity", { valueAsNumber: true })}
          />
          <Input
            type="number"
            placeholder="Reorder level"
            {...register("reorderLevel", { valueAsNumber: true })}
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Unit cost"
            {...register("averageUnitCost", { valueAsNumber: true })}
          />
          <Button type="submit">Add material</Button>
        </form>

        <div className="space-y-2">
          {materials.length === 0 ? (
            <p className="text-sm text-slate-500">No materials yet.</p>
          ) : (
            materials.map((m) => (
              <Link key={m.id} href={`/inventory/materials/${m.id}`}>
                <div className="rounded-xl border px-3 py-2 text-sm transition hover:border-emerald-200 hover:bg-emerald-50">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{m.name}</p>
                    <Badge variant={m.quantity <= m.reorderLevel ? "warning" : "success"}>
                      {m.quantity} {m.unit}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 capitalize">{m.category}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
