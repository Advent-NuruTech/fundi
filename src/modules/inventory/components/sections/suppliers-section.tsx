"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createSupplier } from "@/services/firestore.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Supplier } from "@/types/domain";

interface SupplierForm {
  name: string;
  phone: string;
  contactPerson: string;
  notes: string;
}

export function SuppliersSection({ suppliers }: { suppliers: Supplier[] }) {
  const { businessId } = useBusinessContext();
  const { register, handleSubmit, reset } = useForm<SupplierForm>();

  const saveSupplier = handleSubmit(async (values) => {
    try {
      await createSupplier(businessId, { ...values, businessId });
      reset();
      toast.success("Supplier saved");
    } catch {
      toast.error("Could not save supplier");
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suppliers</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <form className="space-y-3" onSubmit={saveSupplier}>
          <Input placeholder="Supplier name" {...register("name", { required: true })} />
          <Input placeholder="Phone" {...register("phone", { required: true })} />
          <Input placeholder="Contact person" {...register("contactPerson")} />
          <Input placeholder="Notes" {...register("notes")} />
          <Button type="submit">Add supplier</Button>
        </form>

        <div className="space-y-2">
          {suppliers.length === 0 ? (
            <p className="text-sm text-slate-500">No suppliers yet.</p>
          ) : (
            suppliers.map((s) => (
              <div key={s.id} className="rounded-xl border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">{s.name}</p>
                  <Badge variant="default">{s.phone}</Badge>
                </div>
                {s.contactPerson && (
                  <p className="mt-0.5 text-xs text-slate-500">Contact: {s.contactPerson}</p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
