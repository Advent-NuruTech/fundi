"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createPurchaseOrder, receiveStockFromPurchaseOrder } from "@/services/firestore.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatKes } from "@/lib/utils";
import type { PurchaseOrder, Supplier, InventoryMaterial } from "@/types/domain";

interface PoForm {
  supplierId: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  expectedDate: string;
}

export function PurchaseOrdersSection({
  purchaseOrders,
  suppliers,
  materials,
}: {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  materials: InventoryMaterial[];
}) {
  const { businessId, user } = useBusinessContext();
  const { register, handleSubmit, reset } = useForm<PoForm>({
    defaultValues: {
      unit: "pcs",
      expectedDate: new Date().toISOString().slice(0, 10),
    },
  });

  const savePo = handleSubmit(async (values) => {
    const supplier = suppliers.find((s) => s.id === values.supplierId);
    if (!supplier) {
      toast.error("Select a supplier");
      return;
    }
    try {
      await createPurchaseOrder(businessId, {
        businessId,
        supplierId: supplier.id,
        supplierName: supplier.name,
        itemName: values.itemName,
        quantity: Number(values.quantity),
        unit: values.unit,
        unitCost: Number(values.unitCost),
        status: "pending",
        expectedDate: values.expectedDate,
      });
      reset({
        unit: "pcs",
        expectedDate: new Date().toISOString().slice(0, 10),
      });
      toast.success("Purchase order created");
    } catch {
      toast.error("Could not create purchase order");
    }
  });

  const handleReceive = async (po: PurchaseOrder) => {
    if (!user) return;
    const material = materials.find(
      (m) => m.name.toLowerCase() === po.itemName.toLowerCase()
    );
    if (!material) {
      toast.error("No matching material found in inventory. Create the material first.");
      return;
    }
    try {
      await receiveStockFromPurchaseOrder(businessId, {
        purchaseOrderId: po.id,
        materialId: material.id,
        materialName: material.name,
        quantity: po.quantity,
        unit: po.unit,
        actorUid: user.uid,
        actorName: user.displayName,
      });
      toast.success("Stock received");
    } catch {
      toast.error("Could not receive stock");
    }
  };

  const pendingPOs = purchaseOrders.filter((po) => po.status === "pending");
  const receivedPOs = purchaseOrders.filter((po) => po.status === "received");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New Purchase Order</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={savePo}>
            <div>
              <Select {...register("supplierId", { required: true })}>
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Input placeholder="Item name" {...register("itemName", { required: true })} />
            </div>
            <div>
              <Input type="number" placeholder="Quantity" {...register("quantity", { valueAsNumber: true })} />
            </div>
            <div>
              <Select {...register("unit")}>
                <option value="pcs">Pieces</option>
                <option value="meters">Meters</option>
                <option value="cones">Cones</option>
              </Select>
            </div>
            <div>
              <Input type="number" step="0.01" placeholder="Unit cost" {...register("unitCost", { valueAsNumber: true })} />
            </div>
            <div>
              <Input type="date" {...register("expectedDate")} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Create purchase order</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Orders ({pendingPOs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingPOs.length === 0 ? (
            <p className="text-sm text-slate-500">No pending purchase orders.</p>
          ) : (
            <div className="space-y-2">
              {pendingPOs.map((po) => (
                <div key={po.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{po.itemName}</p>
                    <p className="text-xs text-slate-500">
                      {po.supplierName} &middot; {po.quantity} {po.unit} @ {formatKes(po.unitCost)} &middot; Due {po.expectedDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">Pending</Badge>
                    <Button size="sm" variant="default" onClick={() => handleReceive(po)}>
                      Receive
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {receivedPOs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Received Orders ({receivedPOs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {receivedPOs.map((po) => (
                <div key={po.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{po.itemName}</p>
                    <p className="text-xs text-slate-500">
                      {po.supplierName} &middot; {po.quantity} {po.unit} @ {formatKes(po.unitCost)}
                    </p>
                  </div>
                  <Badge variant="success">Received</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
