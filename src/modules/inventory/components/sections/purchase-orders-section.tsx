"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createMaterial, createPurchaseOrder, createSupplier, updatePurchaseOrder, deletePurchaseOrder, receiveStockFromPurchaseOrder, createUnit } from "@/services/firestore.service";
import { notifyPurchaseOrderCreated, notifyStockReceived, notifyPurchaseOrderReceived } from "@/services/notification-catalog";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import { formatKes } from "@/lib/utils";
import type { PurchaseOrder, Supplier, InventoryMaterial } from "@/types/domain";
import { Plus, X, ChevronRight, Package, Calendar, Truck, DollarSign, CheckCircle, Clock, Search, Pencil, Trash2, AlertTriangle, ChevronLeft } from "lucide-react";

const PO_PAGE_SIZE = 10;

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
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null);

  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [materials, setMaterials] = useState(initialMaterials);
  const [units, setUnits] = useState(initialUnits);

  const [pendingPage, setPendingPage] = useState(0);
  const [receivedPage, setReceivedPage] = useState(0);

  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newMaterialName, setNewMaterialName] = useState('');
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
  const formQuantity = Number(watch("quantity") || 0);
  const formUnitCost = Number(watch("unitCost") || 0);
  const formUnit = watch("unit") || selectedMaterial?.unitName || "";

  // Handle reorder params from URL (from low-stock "Create PO" button or material detail page)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const reorderMaterialId = searchParams.get("reorderMaterialId") || searchParams.get("materialId");
    const reorderSupplierId = searchParams.get("reorderSupplierId");
    const reorderQuantity = searchParams.get("reorderQuantity");
    const reorderUnit = searchParams.get("reorderUnit") || searchParams.get("unit");
    const reorderUnitCost = searchParams.get("reorderUnitCost");

    if (reorderMaterialId) {
      setShowPurchaseForm(true);
      setValue("materialId", reorderMaterialId);
      if (reorderSupplierId) setValue("supplierId", reorderSupplierId);
      if (reorderQuantity) setValue("quantity", Number(reorderQuantity));
      if (reorderUnit) setValue("unit", reorderUnit);
      if (reorderUnitCost) setValue("unitCost", Number(reorderUnitCost));
    }
  }, [setValue]);

  useEffect(() => {
    setReceiveQuantities((current) => {
      const defaults: Record<string, number> = {};
      for (const po of purchaseOrders) {
        if (po.status === "received") continue;
        const remaining = po.quantity - (po.quantityReceived || 0);
        if (remaining > 0) {
          defaults[po.id] = current[po.id] ?? remaining;
        }
      }
      return defaults;
    });
  }, [purchaseOrders]);

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast.error("Please Enter A Supplier Name");
      return;
    }
    
    setIsAdding(true);
    try {
      const existing = suppliers.find((supplier) => supplier.name.toLowerCase() === newSupplierName.trim().toLowerCase());
      if (existing) {
        toast.error("Supplier Already Exists");
        return;
      }

      const supplierId = await createSupplier(businessId, {
        name: newSupplierName.trim(),
        businessId,
        phone: "",
      });
      
      const newSupplier: Supplier = { 
        id: supplierId, 
        businessId,
        name: newSupplierName.trim(),
        phone: '',
        createdAt: new Date() as any,
      };
      
      setSuppliers(prev => [...prev, newSupplier]);
      setValue("supplierId", supplierId);
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
      const existing = materials.find((material) => material.name.toLowerCase() === newMaterialName.trim().toLowerCase());

      if (existing) {
        toast.error("Material Already Exists");
        return;
      }

      const materialId = await createMaterial(businessId, {
        name: newMaterialName.trim(),
        businessId,
        categoryId: "",
        categoryName: "",
        unitId: "",
        unitName: "",
        quantity: 0,
        reorderLevel: 0,
        averageUnitCost: 0,
      });
      
      const newMaterial: InventoryMaterial = { 
        id: materialId, 
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
      setValue("materialId", materialId);
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
    const quantity = Number(values.quantity);
    const quantityReceived = editingPo?.quantityReceived || 0;
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Enter A Purchase Quantity Above 0");
      return;
    }
    if (editingPo && quantity < quantityReceived) {
      toast.error(`Quantity Cannot Be Less Than The ${quantityReceived} Already Received`);
      return;
    }
    try {
      if (editingPo) {
        const nextStatus = quantityReceived >= quantity ? "received" : quantityReceived > 0 ? "partial" : "pending";
        await updatePurchaseOrder(businessId, editingPo.id, {
          supplierId: supplier.id,
          supplierName: supplier.name,
          materialId: material.id,
          materialName: material.name,
          quantity,
          unit: values.unit || material.unitName,
          unitCost: Number(values.unitCost),
          expectedDate: values.expectedDate,
          status: nextStatus,
        });
        toast.success("Purchase Order Updated");
      } else {
        await createPurchaseOrder(businessId, {
          businessId,
          supplierId: supplier.id,
          supplierName: supplier.name,
          materialId: material.id,
          materialName: material.name,
          quantity,
          unit: values.unit || material.unitName,
          unitCost: Number(values.unitCost),
          status: "pending",
          quantityReceived: 0,
          expectedDate: values.expectedDate,
        });
        if (user) {
          await notifyPurchaseOrderCreated(businessId, supplier.name, material.name, "", user.uid);
        }
        toast.success("Purchase Order Created");
      }
      reset({
        unit: "",
        expectedDate: new Date().toISOString().slice(0, 10),
      });
      setEditingPo(null);
      setShowPurchaseForm(false);
    } catch {
      toast.error(editingPo ? "Could Not Update Purchase Order" : "Could Not Create Purchase Order");
    }
  });

  const handleDeletePo = async (po: PurchaseOrder) => {
    if (!confirm(`Delete purchase order for "${po.materialName}"?`)) return;
    try {
      await deletePurchaseOrder(businessId, po.id);
      toast.success("Purchase Order Deleted");
    } catch {
      toast.error("Could Not Delete Purchase Order");
    }
  };

  const handleEditPo = (po: PurchaseOrder) => {
    setEditingPo(po);
    setValue("supplierId", po.supplierId);
    setValue("materialId", po.materialId);
    setValue("quantity", po.quantity);
    setValue("unit", po.unit);
    setValue("unitCost", po.unitCost);
    setValue("expectedDate", po.expectedDate);
    setShowPurchaseForm(true);
  };

  const handleReceive = async (po: PurchaseOrder, quantity?: number) => {
    if (!user) return;
    const qtyToReceive = quantity || receiveQuantities[po.id] || po.quantity - (po.quantityReceived || 0);
    const remaining = po.quantity - (po.quantityReceived || 0);
    if (qtyToReceive <= 0) {
      toast.error("Enter A Quantity To Receive");
      return;
    }
    if (qtyToReceive > remaining) {
      toast.error(`Only ${remaining} ${po.unit} Is Still Waiting To Be Received`);
      return;
    }
    try {
      const materialId = await receiveStockFromPurchaseOrder(businessId, {
        purchaseOrderId: po.id,
        materialId: po.materialId,
        materialName: po.materialName,
        quantity: qtyToReceive,
        unit: po.unit,
        actorUid: user.uid,
        actorName: user.displayName,
      });
      if (materialId) {
        await notifyStockReceived(businessId, po.materialName, qtyToReceive, po.unit, materialId, user.uid);
      }
      if ((po.quantityReceived || 0) + qtyToReceive >= po.quantity) {
        await notifyPurchaseOrderReceived(businessId, po.materialName, po.id, user.uid);
      }
      setReceiveQuantities((prev) => ({ ...prev, [po.id]: 0 }));
      setSelectedOrder(null);
      toast.success(`${qtyToReceive} ${po.unit} Added To Inventory`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could Not Receive Stock");
    }
  };

  const filteredPurchaseOrders = purchaseOrders.filter(po =>
    po.materialName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingPOs = filteredPurchaseOrders.filter((po) => po.status === "pending" || po.status === "partial");
  const receivedPOs = filteredPurchaseOrders.filter((po) => po.status === "received");

  const pendingPageCount = Math.ceil(pendingPOs.length / PO_PAGE_SIZE);
  const receivedPageCount = Math.ceil(receivedPOs.length / PO_PAGE_SIZE);
  const pagedPendingPOs = pendingPOs.slice(pendingPage * PO_PAGE_SIZE, (pendingPage + 1) * PO_PAGE_SIZE);
  const pagedReceivedPOs = receivedPOs.slice(receivedPage * PO_PAGE_SIZE, (receivedPage + 1) * PO_PAGE_SIZE);

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
          <div>
            <CardTitle>Purchase Orders And Receiving</CardTitle>
            <p className="mt-1 text-sm text-gray-500">
              Buy materials here, then receive them here. Inventory updates immediately.
            </p>
          </div>
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
                <p className="mb-1 text-xs text-gray-500">Purchase Quantity</p>
                <Input 
                  type="number" 
                  placeholder="Quantity" 
                  {...register("quantity", { valueAsNumber: true, required: "Quantity Is Required" })} 
                />
              </div>

              <div>
                <p className="mb-1 text-xs text-gray-500">Unit</p>
                <SearchableSelect
                  options={unitOptions}
                  value={watch("unit") || selectedMaterial?.unitName || ""}
                  onChange={(v) => setValue("unit", v)}
                  placeholder="Select or create unit"
                  onCreate={async (label) => {
                    const id = await createUnit(businessId, label);
                    setUnits(prev => [...prev, { id, name: label }]);
                    setValue("unit", label);
                    toast.success(`Unit "${label}" created`);
                  }}
                />
              </div>

              <div>
                <p className="mb-1 text-xs text-gray-500">Price Per Unit</p>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="Unit Cost" 
                  {...register("unitCost", { valueAsNumber: true, required: "Unit Cost Is Required" })} 
                />
              </div>

              <div>
                <p className="mb-1 text-xs text-gray-500">Expected Delivery Date</p>
                <Input type="date" placeholder="Expected Date" {...register("expectedDate")} />
              </div>

              {selectedMaterial && (
                <div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-emerald-900">{selectedMaterial.name}</p>
                      <p className="text-xs text-emerald-700">
                        Current stock: {selectedMaterial.quantity} {selectedMaterial.unitName || formUnit}
                        {formQuantity > 0 ? ` - Stock after full receive: ${selectedMaterial.quantity + formQuantity} ${formUnit || selectedMaterial.unitName}` : ""}
                      </p>
                    </div>
                    <Badge variant="success">
                      Total {formatKes((formQuantity || 0) * (formUnitCost || 0))}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <Button type="submit">{editingPo ? "Update Purchase Order" : "Create Purchase Order"}</Button>
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
              {pagedPendingPOs.map((po) => {
                const remaining = po.quantity - (po.quantityReceived || 0);
                const materialForPo = materials.find((material) => material.id === po.materialId);
                const nextReceiveQuantity = receiveQuantities[po.id] ?? remaining;
                return (
                  <div 
                    key={po.id} 
                    className="border rounded-lg px-3 py-3 text-sm cursor-pointer hover:border-emerald-300"
                    onClick={() => setSelectedOrder(po)}
                  >
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{po.materialName}</p>
                          <ChevronRight className="h-3 w-3 text-gray-400" />
                          <Badge variant={po.status === "partial" ? "default" : "warning"}>
                            {po.status === "partial" ? "Partial" : "Waiting"}
                          </Badge>
                          {!materialForPo && (
                            <Badge variant="danger" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Material Missing
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {po.supplierName} - {po.quantityReceived || 0}/{po.quantity} {po.unit} @ {formatKes(po.unitCost)} - Due {new Date(po.expectedDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Current stock: {materialForPo ? `${materialForPo.quantity} ${materialForPo.unitName || po.unit}` : "not linked"} - After this receive: {materialForPo ? `${materialForPo.quantity + nextReceiveQuantity} ${po.unit}` : `${nextReceiveQuantity} ${po.unit}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleEditPo(po); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={(e) => { e.stopPropagation(); handleDeletePo(po); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="number"
                            className="h-8 w-28 text-xs"
                            placeholder={`Max ${remaining}`}
                            max={remaining}
                            min={0}
                            value={receiveQuantities[po.id] ?? ""}
                            onChange={(e) =>
                              setReceiveQuantities((prev) => ({ ...prev, [po.id]: Number(e.target.value) }))
                            }
                          />
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleReceive(po)}
                            disabled={!nextReceiveQuantity || nextReceiveQuantity <= 0 || nextReceiveQuantity > remaining}
                          >
                            Receive Into Stock
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {pendingPageCount > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-xs text-slate-500">
                Showing {pendingPage * PO_PAGE_SIZE + 1}–{Math.min((pendingPage + 1) * PO_PAGE_SIZE, pendingPOs.length)} of {pendingPOs.length}
              </p>
              <div className="flex items-center gap-1">
                <button className="h-7 w-7 rounded border flex items-center justify-center disabled:opacity-40" disabled={pendingPage === 0} onClick={() => setPendingPage((p) => p - 1)}>
                  <ChevronLeft className="h-3 w-3" />
                </button>
                {Array.from({ length: Math.min(pendingPageCount, 5) }, (_, i) => {
                  const p = pendingPageCount <= 5 ? i : Math.max(0, Math.min(pendingPage - 2, pendingPageCount - 5)) + i;
                  return (
                    <button key={p} className={`h-7 w-7 rounded border text-xs ${p === pendingPage ? "bg-slate-900 text-white" : ""}`} onClick={() => setPendingPage(p)}>
                      {p + 1}
                    </button>
                  );
                })}
                <button className="h-7 w-7 rounded border flex items-center justify-center disabled:opacity-40" disabled={pendingPage >= pendingPageCount - 1} onClick={() => setPendingPage((p) => p + 1)}>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
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
              {pagedReceivedPOs.map((po) => (
                <div 
                  key={po.id} 
                  className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm cursor-pointer hover:border-blue-300"
                  onClick={() => setSelectedOrder(po)}
                >
                  <div>
                    <p className="font-medium">{po.materialName} <span className="text-xs text-gray-400">#{po.id?.slice(-8)}</span></p>
                    <p className="text-xs text-gray-500">
                      {po.supplierName} - {po.quantityReceived}/{po.quantity} {po.unit} @ {formatKes(po.unitCost)} - Due {new Date(po.expectedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Received</Badge>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleEditPo(po); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {receivedPageCount > 1 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <p className="text-xs text-slate-500">
                  Showing {receivedPage * PO_PAGE_SIZE + 1}–{Math.min((receivedPage + 1) * PO_PAGE_SIZE, receivedPOs.length)} of {receivedPOs.length}
                </p>
                <div className="flex items-center gap-1">
                  <button className="h-7 w-7 rounded border flex items-center justify-center disabled:opacity-40" disabled={receivedPage === 0} onClick={() => setReceivedPage((p) => p - 1)}>
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  {Array.from({ length: Math.min(receivedPageCount, 5) }, (_, i) => {
                    const p = receivedPageCount <= 5 ? i : Math.max(0, Math.min(receivedPage - 2, receivedPageCount - 5)) + i;
                    return (
                      <button key={p} className={`h-7 w-7 rounded border text-xs ${p === receivedPage ? "bg-slate-900 text-white" : ""}`} onClick={() => setReceivedPage(p)}>
                        {p + 1}
                      </button>
                    );
                  })}
                  <button className="h-7 w-7 rounded border flex items-center justify-center disabled:opacity-40" disabled={receivedPage >= receivedPageCount - 1} onClick={() => setReceivedPage((p) => p + 1)}>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
