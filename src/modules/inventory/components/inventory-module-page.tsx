"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import type {
  FabricRoll,
  InventoryMaterial,
  PurchaseOrder,
  StockMovement,
  Supplier,
} from "@/types/domain";

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
  const router = useRouter();
  const searchParams = useSearchParams();

  const { businessId, ready } = useBusinessContext();

  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);
  const [rolls, setRolls] = useState<FabricRoll[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const materialForm = useForm<MaterialForm>({
    defaultValues: {
      category: "accessories",
      unit: "pcs",
      supplierId: "",
      quantity: 0,
      reorderLevel: 0,
      averageUnitCost: 0,
    },
  });

  const rollForm = useForm<RollForm>({
    defaultValues: {
      purchasedOn: new Date().toISOString().slice(0, 10),
      metersRemaining: 0,
      costPerMeter: 0,
    },
  });

  const supplierForm = useForm<SupplierForm>();
  const poForm = useForm<PoForm>({
    defaultValues: {
      unit: "pcs",
      expectedDate: new Date().toISOString().slice(0, 10),
    },
  });

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

  const lowStock = useMemo(
    () => lowStockMaterials(materials),
    [materials]
  );

  const consumption = useMemo(
    () => fabricConsumptionFromMovements(movements),
    [movements]
  );

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", tab);
    router.push(`?${params.toString()}`);
  };

  const saveMaterial = materialForm.handleSubmit(async (values) => {
    await createMaterial(businessId, { ...values, businessId });
    materialForm.reset();
    toast.success("Material added");
  });

  const saveRoll = rollForm.handleSubmit(async (values) => {
    await createFabricRoll(businessId, { ...values, businessId });
    rollForm.reset({
      purchasedOn: new Date().toISOString().slice(0, 10),
      metersRemaining: 0,
      costPerMeter: 0,
      fabricType: "",
      color: "",
    });
    toast.success("Fabric roll added");
  });

  const saveSupplier = supplierForm.handleSubmit(async (values) => {
    await createSupplier(businessId, { ...values, businessId });
    supplierForm.reset();
    toast.success("Supplier saved");
  });

  const savePo = poForm.handleSubmit(async (values) => {
    const supplier = suppliers.find((s) => s.id === values.supplierId);
    if (!supplier) return toast.error("Select supplier");

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

    poForm.reset({
      unit: "pcs",
      expectedDate: new Date().toISOString().slice(0, 10),
    });

    toast.success("Purchase order created");
  });

  const Tabs = () => (
    <div className="flex flex-wrap gap-2 border-b pb-3">
      {[
        "materials",
        "fabric-rolls",
        "suppliers",
        "purchase-orders",
        "stock-movements",
        "low-stock",
      ].map((tab) => (
        <Button
          key={tab}
          variant={section === tab ? "default" : "outline"}
          onClick={() => setTab(tab)}
          className="capitalize"
        >
          {tab.replace("-", " ")}
        </Button>
      ))}
    </div>
  );

  /* ================= MATERIALS ================= */
  if (section === "materials") {
    return (
      <div className="space-y-4">
        <Tabs />

        <Card>
          <CardHeader>
            <CardTitle>Materials</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-6 lg:grid-cols-2">
            <form className="space-y-3" onSubmit={saveMaterial}>
              <Input placeholder="Name" {...materialForm.register("name")} />

              <Select {...materialForm.register("category")}>
                <option value="buttons">Buttons</option>
                <option value="zips">Zips</option>
                <option value="thread">Thread</option>
                <option value="elastic">Elastic</option>
                <option value="lining">Lining</option>
                <option value="accessories">Accessories</option>
              </Select>

              <Select {...materialForm.register("unit")}>
                <option value="pcs">Pieces</option>
                <option value="meters">Meters</option>
                <option value="cones">Cones</option>
              </Select>

              <Select {...materialForm.register("supplierId")}>
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
                {...materialForm.register("quantity", { valueAsNumber: true })}
              />

              <Input
                type="number"
                placeholder="Reorder level"
                {...materialForm.register("reorderLevel", {
                  valueAsNumber: true,
                })}
              />

              <Input
                type="number"
                placeholder="Unit cost"
                {...materialForm.register("averageUnitCost", {
                  valueAsNumber: true,
                })}
              />

              <Button type="submit">Add material</Button>
            </form>

            <div className="space-y-2">
              {materials.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  <p className="font-medium">{m.name}</p>
                  <p className="text-slate-500">
                    {m.quantity} {m.unit}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ================= FABRIC ROLLS ================= */
  if (section === "fabric-rolls") {
    return (
      <div className="space-y-4">
        <Tabs />
        <Card>
          <CardHeader>
            <CardTitle>Fabric Rolls</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <form className="space-y-3" onSubmit={saveRoll}>
              <Input {...rollForm.register("fabricType")} />
              <Input {...rollForm.register("color")} />
              <Input type="number" {...rollForm.register("metersRemaining")} />
              <Input type="number" {...rollForm.register("costPerMeter")} />
              <Input type="date" {...rollForm.register("purchasedOn")} />
              <Button type="submit">Add roll</Button>
            </form>

            <div className="space-y-2">
              {rolls.map((r) => (
                <div key={r.id} className="border rounded-xl p-2 text-sm">
                  {r.fabricType} - {r.color}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ================= DEFAULT DASHBOARD ================= */
  return (
    <div className="space-y-4">
      <Tabs />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">Materials: {materials.length}</CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">Rolls: {rolls.length}</CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 text-amber-600">
            Low Stock: {lowStock.length}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">Suppliers: {suppliers.length}</CardContent>
        </Card>
      </div>
    </div>
  );
}