"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { FabricRoll, InventoryMaterial, PurchaseOrder, StockMovement, Supplier } from "@/types/domain";
import {
  createFabricRoll,
  createMaterial,
  createPurchaseOrder,
  createSupplier,
  listenFabricRolls,
  listenMaterials,
  listenPurchaseOrders,
  listenStockMovements,
  listenSuppliers,
  lowStockMaterials,
  fabricConsumptionFromMovements,
} from "@/services/firestore.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatKes } from "@/lib/utils";

interface MaterialForm {
  name: string;
  category: InventoryMaterial["category"];
  unit: InventoryMaterial["unit"];
  supplierId: string;
  quantity: number;
  reorderLevel: number;
  averageUnitCost: number;
}

interface RollForm {
  fabricType: string;
  color: string;
  metersRemaining: number;
  costPerMeter: number;
  purchasedOn: string;
}

interface SupplierForm {
  name: string;
  phone: string;
}

interface PoForm {
  supplierId: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  expectedDate: string;
}

export function InventoryModulePage({ section }: { section: string }) {
  const { businessId, ready } = useBusinessContext();
  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);
  const [rolls, setRolls] = useState<FabricRoll[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const materialForm = useForm<MaterialForm>({ defaultValues: { category: "accessories", unit: "pcs", supplierId: "", quantity: 0, reorderLevel: 0, averageUnitCost: 0 } });
  const rollForm = useForm<RollForm>({ defaultValues: { purchasedOn: new Date().toISOString().slice(0, 10), metersRemaining: 0, costPerMeter: 0 } });
  const supplierForm = useForm<SupplierForm>();
  const poForm = useForm<PoForm>({ defaultValues: { unit: "pcs", expectedDate: new Date().toISOString().slice(0, 10) } });

  useEffect(() => {
    if (!ready) return;
    const a = listenMaterials(businessId, setMaterials);
    const b = listenFabricRolls(businessId, setRolls);
    const c = listenStockMovements(businessId, setMovements);
    const d = listenSuppliers(businessId, setSuppliers);
    const e = listenPurchaseOrders(businessId, setPurchaseOrders);
    return () => {
      a();
      b();
      c();
      d();
      e();
    };
  }, [businessId, ready]);

  const lowStock = useMemo(() => lowStockMaterials(materials), [materials]);
  const consumption = useMemo(() => fabricConsumptionFromMovements(movements), [movements]);

  const saveMaterial = materialForm.handleSubmit(async (values) => {
    await createMaterial(businessId, { ...values, businessId });
    materialForm.reset();
    toast.success("Material added");
  });

  const saveRoll = rollForm.handleSubmit(async (values) => {
    await createFabricRoll(businessId, { ...values, businessId });
    rollForm.reset({ purchasedOn: new Date().toISOString().slice(0, 10), metersRemaining: 0, costPerMeter: 0, fabricType: "", color: "" });
    toast.success("Fabric roll added");
  });

  const saveSupplier = supplierForm.handleSubmit(async (values) => {
    await createSupplier(businessId, { ...values, businessId });
    supplierForm.reset();
    toast.success("Supplier saved");
  });

  const savePo = poForm.handleSubmit(async (values) => {
    const supplier = suppliers.find((entry) => entry.id === values.supplierId);
    if (!supplier) {
      toast.error("Select supplier");
      return;
    }
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
    poForm.reset({ unit: "pcs", expectedDate: new Date().toISOString().slice(0, 10) });
    toast.success("Purchase order created");
  });

  if (section === "materials") {
    return (
      <Card>
        <CardHeader><CardTitle>Materials</CardTitle></CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <form className="space-y-3" onSubmit={saveMaterial}>
            <Input placeholder="Name" {...materialForm.register("name")} />
            <Select {...materialForm.register("category")}>
              <option value="buttons">Buttons</option><option value="zips">Zips</option><option value="thread">Thread</option><option value="elastic">Elastic</option><option value="lining">Lining</option><option value="accessories">Accessories</option>
            </Select>
            <Select {...materialForm.register("unit")}>
              <option value="pcs">Pieces</option><option value="meters">Meters</option><option value="cones">Cones</option>
            </Select>
            <Select {...materialForm.register("supplierId")}>
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
            <Input type="number" placeholder="Quantity" {...materialForm.register("quantity", { valueAsNumber: true })} />
            <Input type="number" placeholder="Reorder level" {...materialForm.register("reorderLevel", { valueAsNumber: true })} />
            <Input type="number" placeholder="Unit cost" {...materialForm.register("averageUnitCost", { valueAsNumber: true })} />
            <Button type="submit">Add material</Button>
          </form>
          <div className="space-y-2">
            {materials.map((material) => (
              <div key={material.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <p className="font-medium">{material.name}</p>
                <p className="text-slate-500">{material.quantity} {material.unit} | Reorder {material.reorderLevel}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (section === "fabric-rolls") {
    return (
      <Card>
        <CardHeader><CardTitle>Fabric Rolls</CardTitle></CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <form className="space-y-3" onSubmit={saveRoll}>
            <Input placeholder="Fabric type" {...rollForm.register("fabricType")} />
            <Input placeholder="Color" {...rollForm.register("color")} />
            <Input type="number" step="0.1" placeholder="Meters remaining" {...rollForm.register("metersRemaining", { valueAsNumber: true })} />
            <Input type="number" placeholder="Cost per meter" {...rollForm.register("costPerMeter", { valueAsNumber: true })} />
            <Input type="date" {...rollForm.register("purchasedOn")} />
            <Button type="submit">Add roll</Button>
          </form>
          <div className="space-y-2">
            {rolls.map((roll) => (
              <div key={roll.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <p className="font-medium">{roll.fabricType} - {roll.color}</p>
                <p className="text-slate-500">{roll.metersRemaining}m left | {formatKes(roll.costPerMeter)}/m</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (section === "stock-movements") {
    return (
      <Card>
        <CardHeader><CardTitle>System Stock Movements</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {movements.map((movement) => (
            <div key={movement.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{movement.materialName}</p>
                <p className="text-xs text-slate-500">{movement.reason}</p>
              </div>
              <Badge variant={movement.quantityChange < 0 ? "warning" : "success"}>{movement.quantityChange} {movement.unit}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (section === "suppliers") {
    return (
      <Card>
        <CardHeader><CardTitle>Suppliers</CardTitle></CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <form className="space-y-3" onSubmit={saveSupplier}>
            <Input placeholder="Supplier name" {...supplierForm.register("name")} />
            <Input placeholder="Phone" {...supplierForm.register("phone")} />
            <Button type="submit">Save supplier</Button>
          </form>
          <div className="space-y-2">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <p className="font-medium">{supplier.name}</p>
                <p className="text-slate-500">{supplier.phone}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (section === "purchase-orders") {
    return (
      <Card>
        <CardHeader><CardTitle>Purchase Orders</CardTitle></CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <form className="space-y-3" onSubmit={savePo}>
            <Select {...poForm.register("supplierId")}>
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </Select>
            <Input placeholder="Item" {...poForm.register("itemName")} />
            <Input type="number" placeholder="Quantity" {...poForm.register("quantity", { valueAsNumber: true })} />
            <Input placeholder="Unit" {...poForm.register("unit")} />
            <Input type="number" placeholder="Unit cost" {...poForm.register("unitCost", { valueAsNumber: true })} />
            <Input type="date" {...poForm.register("expectedDate")} />
            <Button type="submit">Create PO</Button>
          </form>
          <div className="space-y-2">
            {purchaseOrders.map((po) => (
              <div key={po.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <p className="font-medium">{po.itemName} ({po.quantity} {po.unit})</p>
                <p className="text-slate-500">{po.supplierName} - {po.status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (section === "low-stock") {
    return (
      <Card>
        <CardHeader><CardTitle>Low Stock Alerts (Derived)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {lowStock.map((material) => (
            <div key={material.id} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
              {material.name}: {material.quantity} {material.unit} remaining
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (section === "fabric-consumption") {
    return (
      <Card>
        <CardHeader><CardTitle>Fabric Consumption (Derived from Stock Movements)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(consumption).map(([materialName, qty]) => (
            <div key={materialName} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              {materialName}: {qty.toFixed(2)} meters consumed
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card><CardContent className="pt-5"><p className="text-xs text-slate-500">Materials</p><p className="text-2xl font-semibold">{materials.length}</p></CardContent></Card>
      <Card><CardContent className="pt-5"><p className="text-xs text-slate-500">Fabric rolls</p><p className="text-2xl font-semibold">{rolls.length}</p></CardContent></Card>
      <Card><CardContent className="pt-5"><p className="text-xs text-slate-500">Low stock</p><p className="text-2xl font-semibold text-amber-600">{lowStock.length}</p></CardContent></Card>
      <Card><CardContent className="pt-5"><p className="text-xs text-slate-500">Suppliers</p><p className="text-2xl font-semibold">{suppliers.length}</p></CardContent></Card>
    </div>
  );
}
