"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createPurchaseOrder, receiveStockFromPurchaseOrder } from "@/services/firestore.service";
import { notifyPurchaseOrderCreated, notifyStockReceived, notifyPurchaseOrderReceived } from "@/services/notification-catalog";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import { formatKes } from "@/lib/utils";
import type { PurchaseOrder, Supplier, InventoryMaterial } from "@/types/domain";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, X, ChevronRight, Package, Calendar, Truck, DollarSign, CheckCircle, Clock, Search } from "lucide-react";

interface PoForm {
  supplierId: string;
  materialId: string;
  quantity: number;
  unit: string;
  unitCost: number;
  expectedDate: string;
}

function OrderDetailsModal({ 
  order, 
  onClose, 
  materials,
  onReceive 
}: { 
  order: PurchaseOrder; 
  onClose: () => void; 
  materials: InventoryMaterial[];
  onReceive: (po: PurchaseOrder, quantity: number) => void;
}) {
  const [receiveQuantity, setReceiveQuantity] = useState<number>(0);
  const remaining = order.quantity - (order.quantityReceived || 0);
  const material = materials.find(m => m.id === order.materialId);
  const isCompleted = order.status === "received";
  
  const handleReceive = () => {
    if (receiveQuantity <= 0) {
      toast.error("Please Enter A Valid Quantity");
      return;
    }
    if (receiveQuantity > remaining) {
      toast.error(`Cannot Receive More Than ${remaining} Units`);
      return;
    }
    onReceive(order, receiveQuantity);
    setReceiveQuantity(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl mx-4 bg-white rounded-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Order Details</h2>
            <p className="text-sm text-gray-500 mt-1">Purchase Order #{order.id?.slice(-8)}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Received
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                <Clock className="h-3 w-3" />
                Pending
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Material</p>
                  <p className="font-medium">{order.materialName}</p>
                  {material && (
                    <p className="text-xs text-gray-500">
                      Current Stock: {material.quantity} {order.unit}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Supplier</p>
                  <p className="font-medium">{order.supplierName}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Cost Details</p>
                  <p className="font-medium">
                    {formatKes(order.unitCost)} Per {order.unit}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total: {formatKes(order.unitCost * order.quantity)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Expected Date</p>
                  <p className="font-medium">
                    {new Date(order.expectedDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Receiving Progress</span>
              <span className="font-medium">
                {order.quantityReceived || 0} / {order.quantity} {order.unit}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className="bg-blue-600 rounded-full h-2"
                style={{ width: `${((order.quantityReceived || 0) / order.quantity) * 100}%` }}
              />
            </div>
            {!isCompleted && (
              <p className="text-xs text-gray-500 mt-2">
                Remaining: {remaining} {order.unit}
              </p>
            )}
          </div>

          {!isCompleted && (
            <div className="border-t pt-4">
              <label className="text-sm font-medium mb-2 block">
                Receive Stock
              </label>
              <div className="flex gap-3">
                <Input
                  type="number"
                  placeholder={`Quantity (Max ${remaining})`}
                  value={receiveQuantity || ""}
                  onChange={(e) => setReceiveQuantity(Number(e.target.value))}
                  max={remaining}
                  min={0}
                  className="flex-1"
                />
                <Button onClick={handleReceive} disabled={!receiveQuantity || receiveQuantity <= 0}>
                  Receive
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PurchaseOrdersSection({
  purchaseOrders,
  suppliers: initialSuppliers,
  materials: initialMaterials,
  units: initialUnits,
}: {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  materials: InventoryMaterial[];
  units: { id: string; name: string }[];
}) {
  const { businessId, user } = useBusinessContext();
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [materials, setMaterials] = useState(initialMaterials);
  const [units, setUnits] = useState(initialUnits);
  
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { register, handleSubmit, reset, setValue, watch } = useForm<PoForm>({
    defaultValues: {
      unit: "",
      expectedDate: new Date().toISOString().slice(0, 10),
    },
  });

  const selectedSupplierId = watch("supplierId");
  const selectedMaterialId = watch("materialId");

  const supplierOptions: SearchableOption[] = suppliers.map((s) => ({ value: s.id, label: s.name }));
  const materialOptions: SearchableOption[] = materials.map((m) => ({ value: m.id, label: `${m.name} (${m.quantity || 0} ${m.unitName || ''})` }));
  const unitOptions: SearchableOption[] = units.map((u) => ({ value: u.name, label: u.name }));

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast.error("Please Enter A Supplier Name");
      return;
    }
    
    setIsAdding(true);
    try {
      const q = query(
        collection(db, `businesses/${businessId}/suppliers`), 
        where('name', '==', newSupplierName.trim())
      );
      const existing = await getDocs(q);
      
      if (!existing.empty) {
        toast.error("Supplier Already Exists");
        return;
      }
      
      const docRef = await addDoc(collection(db, `businesses/${businessId}/suppliers`), {
        name: newSupplierName.trim(),
        businessId,
        createdAt: new Date().toISOString(),
      });
      
      const newSupplier: Supplier = { 
        id: docRef.id, 
        businessId,
        name: newSupplierName.trim(),
        phone: '',
        createdAt: new Date() as any,
      };
      
      setSuppliers(prev => [...prev, newSupplier]);
      setValue("supplierId", docRef.id);
      setNewSupplierName('');
      setShowAddSupplier(false);
      toast.success("Supplier Added Successfully");
    } catch (error) {
      console.error("Error Adding Supplier:", error);
      toast.error("Could Not Add Supplier");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterialName.trim()) {
      toast.error("Please Enter A Material Name");
      return;
    }
    
    setIsAdding(true);
    try {
      const q = query(
        collection(db, `businesses/${businessId}/inventoryMaterials`), 
        where('name', '==', newMaterialName.trim())
      );
      const existing = await getDocs(q);
      
      if (!existing.empty) {
        toast.error("Material Already Exists");
        return;
      }
      
      const docRef = await addDoc(collection(db, `businesses/${businessId}/inventoryMaterials`), {
        name: newMaterialName.trim(),
        businessId,
        quantity: 0,
        unitName: '',
        unitCost: 0,
        createdAt: new Date().toISOString(),
      });
      
      const newMaterial: InventoryMaterial = { 
        id: docRef.id, 
        businessId,
        name: newMaterialName.trim(),
        categoryId: '',
        categoryName: '',
        unitId: '',
        unitName: '',
        quantity: 0,
        reorderLevel: 0,
        averageUnitCost: 0,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      };
      
      setMaterials(prev => [...prev, newMaterial]);
      setValue("materialId", docRef.id);
      setNewMaterialName('');
      setShowAddMaterial(false);
      toast.success("Material Added Successfully");
    } catch (error) {
      console.error("Error Adding Material:", error);
      toast.error("Could Not Add Material");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddUnit = async () => {
    if (!newUnitName.trim()) {
      toast.error("Please Enter A Unit Name");
      return;
    }
    
    setIsAdding(true);
    try {
      const q = query(
        collection(db, `businesses/${businessId}/units`), 
        where('name', '==', newUnitName.trim())
      );
      const existing = await getDocs(q);
      
      if (!existing.empty) {
        toast.error("Unit Already Exists");
        return;
      }
      
      const docRef = await addDoc(collection(db, `businesses/${businessId}/units`), {
        name: newUnitName.trim(),
        businessId,
        createdAt: new Date().toISOString(),
      });
      
      const newUnit = { 
        id: docRef.id, 
        name: newUnitName.trim()
      };
      
      setUnits(prev => [...prev, newUnit]);
      setValue("unit", newUnitName.trim());
      setNewUnitName('');
      setShowAddUnit(false);
      toast.success("Unit Added Successfully");
    } catch (error) {
      console.error("Error Adding Unit:", error);
      toast.error("Could Not Add Unit");
    } finally {
      setIsAdding(false);
    }
  };

  const savePo = handleSubmit(async (values) => {
    const supplier = suppliers.find((s) => s.id === values.supplierId);
    if (!supplier) {
      toast.error("Select A Supplier");
      return;
    }
    const material = materials.find((m) => m.id === values.materialId);
    if (!material) {
      toast.error("Select A Material");
      return;
    }
    try {
      await createPurchaseOrder(businessId, {
        businessId,
        supplierId: supplier.id,
        supplierName: supplier.name,
        materialId: material.id,
        materialName: material.name,
        quantity: Number(values.quantity),
        unit: values.unit || material.unitName,
        unitCost: Number(values.unitCost),
        status: "pending",
        quantityReceived: 0,
        expectedDate: values.expectedDate,
      });
      if (user) {
        await notifyPurchaseOrderCreated(businessId, supplier.name, material.name, "", user.uid);
      }
      reset({
        unit: "",
        expectedDate: new Date().toISOString().slice(0, 10),
      });
      setShowPurchaseForm(false);
      toast.success("Purchase Order Created");
    } catch {
      toast.error("Could Not Create Purchase Order");
    }
  });

  const handleReceive = async (po: PurchaseOrder, quantity?: number) => {
    if (!user) return;
    const qtyToReceive = quantity || receiveQuantities[po.id] || po.quantity - (po.quantityReceived || 0);
    if (qtyToReceive <= 0) {
      toast.error("Enter A Quantity To Receive");
      return;
    }
    try {
      await receiveStockFromPurchaseOrder(businessId, {
        purchaseOrderId: po.id,
        materialId: po.materialId,
        materialName: po.materialName,
        quantity: qtyToReceive,
        unit: po.unit,
        actorUid: user.uid,
        actorName: user.displayName,
      });
      await notifyStockReceived(businessId, po.materialName, qtyToReceive, po.unit, po.materialId, user.uid);
      const updatedPo = purchaseOrders.find((p) => p.id === po.id);
      if (updatedPo && (updatedPo.quantityReceived || 0) + qtyToReceive >= updatedPo.quantity) {
        await notifyPurchaseOrderReceived(businessId, po.materialName, po.id, user.uid);
      }
      setReceiveQuantities((prev) => ({ ...prev, [po.id]: 0 }));
      setSelectedOrder(null);
      toast.success("Stock Received");
    } catch {
      toast.error("Could Not Receive Stock");
    }
  };

  const filteredPurchaseOrders = purchaseOrders.filter(po =>
    po.materialName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingPOs = filteredPurchaseOrders.filter((po) => po.status === "pending" || po.status === "partial");
  const receivedPOs = filteredPurchaseOrders.filter((po) => po.status === "received");

  return (
    <div className="space-y-4">
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          materials={materials}
          onReceive={handleReceive}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Purchase Orders</CardTitle>
          <Button onClick={() => setShowPurchaseForm(!showPurchaseForm)}>
            {showPurchaseForm ? "Close Form" : "New Purchase"}
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search Orders By Material, Supplier Or Id..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {showPurchaseForm && (
            <form className="grid gap-4 md:grid-cols-2 border-t pt-4" onSubmit={savePo}>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs text-gray-500">Supplier</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowAddSupplier(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add New
                  </Button>
                </div>
                {showAddSupplier ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter Supplier Name"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSupplier()}
                      className="flex-1"
                      autoFocus
                    />
                    <Button type="button" size="sm" onClick={handleAddSupplier} disabled={isAdding}>
                      Add
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => {
                      setShowAddSupplier(false);
                      setNewSupplierName('');
                    }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <SearchableSelect
                    options={supplierOptions}
                    value={selectedSupplierId}
                    onChange={(v) => setValue("supplierId", v)}
                    placeholder="Select Supplier"
                  />
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs text-gray-500">Material</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowAddMaterial(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add New
                  </Button>
                </div>
                {showAddMaterial ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter Material Name"
                      value={newMaterialName}
                      onChange={(e) => setNewMaterialName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddMaterial()}
                      className="flex-1"
                      autoFocus
                    />
                    <Button type="button" size="sm" onClick={handleAddMaterial} disabled={isAdding}>
                      Add
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => {
                      setShowAddMaterial(false);
                      setNewMaterialName('');
                    }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <SearchableSelect
                    options={materialOptions}
                    value={selectedMaterialId}
                    onChange={(v) => setValue("materialId", v)}
                    placeholder="Select Material"
                  />
                )}
              </div>

              <div>
                <Input 
                  type="number" 
                  placeholder="Quantity" 
                  {...register("quantity", { valueAsNumber: true, required: "Quantity Is Required" })} 
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs text-gray-500">Unit</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowAddUnit(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add New
                  </Button>
                </div>
                {showAddUnit ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter Unit Name"
                      value={newUnitName}
                      onChange={(e) => setNewUnitName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddUnit()}
                      className="flex-1"
                      autoFocus
                    />
                    <Button type="button" size="sm" onClick={handleAddUnit} disabled={isAdding}>
                      Add
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => {
                      setShowAddUnit(false);
                      setNewUnitName('');
                    }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <SearchableSelect
                    options={unitOptions}
                    value={watch("unit") || selectedMaterial?.unitName || ""}
                    onChange={(v) => setValue("unit", v)}
                    placeholder="Select Unit"
                  />
                )}
              </div>

              <div>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="Price Per Item" 
                  {...register("unitCost", { valueAsNumber: true, required: "Unit Cost Is Required" })} 
                />
              </div>

              <div>
                <Input type="date" {...register("expectedDate")} />
              </div>

              <div className="md:col-span-2">
                <Button type="submit">Create Purchase Order</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Orders ({pendingPOs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingPOs.length === 0 ? (
            <p className="text-sm text-gray-500">No Pending Purchase Orders.</p>
          ) : (
            <div className="space-y-2">
              {pendingPOs.map((po) => {
                const remaining = po.quantity - (po.quantityReceived || 0);
                return (
                  <div 
                    key={po.id} 
                    className="border rounded-lg px-3 py-2 text-sm cursor-pointer hover:border-blue-300"
                    onClick={() => setSelectedOrder(po)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{po.materialName}</p>
                          <ChevronRight className="h-3 w-3 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500">
                          {po.supplierName} · {po.quantityReceived || 0}/{po.quantity} {po.unit} @ {formatKes(po.unitCost)} · Due {po.expectedDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={po.status === "partial" ? "default" : "warning"}>
                          {po.status === "partial" ? "Partial" : "Pending"}
                        </Badge>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="number"
                            className="h-8 w-24 text-xs"
                            placeholder={`Max ${remaining}`}
                            max={remaining}
                            value={receiveQuantities[po.id] ?? ""}
                            onChange={(e) =>
                              setReceiveQuantities((prev) => ({ ...prev, [po.id]: Number(e.target.value) }))
                            }
                          />
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleReceive(po)}
                            disabled={!receiveQuantities[po.id] || receiveQuantities[po.id] <= 0}
                          >
                            Receive
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                <div 
                  key={po.id} 
                  className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm cursor-pointer hover:border-blue-300"
                  onClick={() => setSelectedOrder(po)}
                >
                  <div>
                    <p className="font-medium">{po.materialName}</p>
                    <p className="text-xs text-gray-500">
                      {po.supplierName} · {po.quantity} {po.unit} @ {formatKes(po.unitCost)}
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
