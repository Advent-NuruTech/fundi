"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, X, Pencil, Trash2, Upload, SlidersHorizontal, ChevronLeft, ChevronRight, MinusCircle, PlusCircle, Sparkles } from "lucide-react";
import {
  createMaterial, updateMaterial, deleteMaterial,
  createUnit, createCategory, updateCategory, deleteCategory,
  listenUnits, listenCategories, adjustMaterialStock,
} from "@/services/firestore.service";
import { uploadImage } from "@/services/cloudinary/upload.service";
import { notifyMaterialAdded } from "@/services/notification-catalog";
import { generateSku } from "@/lib/utils";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import type { InventoryMaterial, Supplier, DbUnit, DbCategory, FabricMeta, MaterialImage, InventoryItemType } from "@/types/domain";

const PAGE_SIZE = 10;

const ITEM_TYPE_OPTIONS: SearchableOption[] = [
  { value: "fabric", label: "Fabric" },
  { value: "ready_made", label: "Ready-Made" },
  { value: "material", label: "Material" },
  { value: "accessory", label: "Accessory" },
  { value: "consumable", label: "Consumable" },
  { value: "other", label: "Other" },
];

const toNum = (v: number | undefined): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

interface MaterialForm {
  name: string;
  itemType: InventoryItemType;
  sku: string;
  categoryId: string;
  unitId: string;
  supplierId: string;
  quantity: number;
  reorderLevel: number;
  averageUnitCost: number;
  sellingPrice?: number;
  wholesalePrice?: number;
  minimumSellingPrice?: number;
  color: string;
  size: string;
  brand: string;
  gsm: string;
  rollLength: string;
  pattern: string;
  composition: string;
}

interface AdjustForm {
  adjustment: number;
  reason: string;
}

export function MaterialsSection({
  materials,
  suppliers,
}: {
  materials: InventoryMaterial[];
  suppliers: Supplier[];
}) {
  const { businessId, user } = useBusinessContext();
  const [units, setUnits] = useState<DbUnit[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [editingMaterial, setEditingMaterial] = useState<InventoryMaterial | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<MaterialImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>([]);
  const [catManageOpen, setCatManageOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DbCategory | null>(null);
  const [catEditName, setCatEditName] = useState("");
  const [catSearch, setCatSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Search + pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  // Inline stock adjustment
  const [adjustingMaterial, setAdjustingMaterial] = useState<InventoryMaterial | null>(null);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const adjustForm = useForm<AdjustForm>({ defaultValues: { adjustment: 0, reason: "" } });

  useEffect(() => {
    const unsubUnits = listenUnits(businessId, setUnits);
    const unsubCats = listenCategories(businessId, setCategories);
    return () => { unsubUnits(); unsubCats(); };
  }, [businessId]);

  const { register, handleSubmit, reset, setValue, watch } = useForm<MaterialForm>({
    defaultValues: {
      itemType: "fabric",
      sku: "",
      categoryId: "",
      unitId: "",
      supplierId: "",
      quantity: 0,
      reorderLevel: 0,
      averageUnitCost: 0,
      sellingPrice: undefined,
      wholesalePrice: undefined,
      minimumSellingPrice: undefined,
      color: "",
      size: "",
      brand: "",
      gsm: "",
      rollLength: "",
      pattern: "",
      composition: "",
    },
  });

  const categoryId = watch("categoryId");
  const unitId = watch("unitId");
  const supplierId = watch("supplierId");
  const name = watch("name");
  const sku = watch("sku");
  const itemType = watch("itemType");

  useEffect(() => {
    if (name && name.trim() && !sku?.trim()) {
      setValue("sku", generateSku(name.trim()), { shouldValidate: false });
    }
  }, [name, sku, setValue]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of materials) {
      counts[m.categoryId] = (counts[m.categoryId] || 0) + 1;
    }
    return counts;
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    let result = selectedCategoryId
      ? materials.filter((m) => m.categoryId === selectedCategoryId)
      : materials;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name?.toLowerCase().includes(q) ||
          m.categoryName?.toLowerCase().includes(q) ||
          m.unitName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [materials, selectedCategoryId, searchQuery]);

  const pageCount = Math.ceil(filteredMaterials.length / PAGE_SIZE);
  const pagedMaterials = filteredMaterials.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filter/search changes
  useEffect(() => { setPage(0); }, [selectedCategoryId, searchQuery]);

  const unitOptions: SearchableOption[] = units.map((u) => ({ value: u.id, label: u.name }));
  const categoryOptions: SearchableOption[] = categories.map((c) => ({ value: c.id, label: c.name }));
  const supplierOptions: SearchableOption[] = suppliers.map((s) => ({ value: s.id, label: s.name }));

  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(catSearch.toLowerCase()));
  }, [categories, catSearch]);

  const resetForm = () => {
    reset({
      itemType: "fabric",
      sku: "",
      categoryId: selectedCategoryId || "",
      unitId: "",
      supplierId: "",
      quantity: 0,
      reorderLevel: 0,
      averageUnitCost: 0,
      sellingPrice: undefined,
      wholesalePrice: undefined,
      minimumSellingPrice: undefined,
      color: "",
      size: "",
      brand: "",
      gsm: "",
      rollLength: "",
      pattern: "",
      composition: "",
    });
    setEditingMaterial(null);
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
    setCustomFields([]);
  };

  const populateForm = (mat: InventoryMaterial) => {
    setEditingMaterial(mat);
    setValue("name", mat.name);
    setValue("itemType", mat.itemType || "fabric");
    setValue("sku", mat.sku || "");
    setValue("categoryId", mat.categoryId);
    setValue("unitId", mat.unitId);
    setValue("supplierId", mat.supplierId || "");
    setValue("quantity", mat.quantity);
    setValue("reorderLevel", mat.reorderLevel);
    setValue("averageUnitCost", mat.averageUnitCost);
    setValue("sellingPrice", mat.sellingPrice ?? undefined);
    setValue("wholesalePrice", mat.wholesalePrice ?? undefined);
    setValue("minimumSellingPrice", mat.minimumSellingPrice ?? undefined);
    setValue("color", mat.color || mat.fabricMeta?.color || "");
    setValue("size", mat.size || "");
    setValue("brand", mat.brand || "");
    if (mat.fabricMeta) {
      setValue("gsm", mat.fabricMeta.gsm?.toString() || "");
      setValue("rollLength", mat.fabricMeta.rollLength?.toString() || "");
      setValue("pattern", mat.fabricMeta.pattern || "");
      setValue("composition", mat.fabricMeta.composition || "");
    }
    if (mat.images && mat.images.length > 0) {
      setExistingImages(mat.images);
    } else if (mat.imageUrl) {
      setExistingImages([{ url: mat.imageUrl, publicId: mat.imagePublicId || "" }]);
    }
    if (mat.fabricMeta?.customFields) {
      setCustomFields(mat.fabricMeta.customFields.map((f) => ({ key: f.key, value: String(f.value) })));
    }
    setShowForm(true);
  };

  const handleImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeNewImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingImage = async (index: number) => {
    const img = existingImages[index];
    if (img.publicId) {
      try {
        await fetch("/api/cloudinary/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: img.publicId }),
        });
      } catch { /* ignore */ }
    }
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const saveMaterial = handleSubmit(async (values) => {
    if (!values.name.trim()) { toast.error("Enter a material name"); return; }
    const cat = categories.find((c) => c.id === values.categoryId);
    const unit = units.find((u) => u.id === values.unitId);
    if (!cat) { toast.error("Select a category"); return; }
    if (!unit) { toast.error("Select a unit"); return; }

    setUploading(true);
    try {
      let allImages: MaterialImage[] = [...existingImages];

      if (imageFiles.length > 0 && user) {
        for (const file of imageFiles) {
          try {
            const uploaded = await uploadImage({ file, businessId, uploadedByUid: user.uid });
            allImages.push({ url: uploaded.url, publicId: uploaded.publicId });
          } catch (err) {
            console.error("Image upload failed:", err);
            toast.error(`Failed to upload "${file.name}" — skipping`);
          }
        }
      }

      const imageUrl = allImages[0]?.url || "";
      const imagePublicId = allImages[0]?.publicId || "";

      const fabricMeta: FabricMeta | undefined =
        values.itemType === "fabric" &&
        (values.color || values.gsm || values.rollLength || values.pattern || values.composition || customFields.length > 0)
          ? {
              color: values.color || undefined,
              gsm: values.gsm ? Number(values.gsm) : undefined,
              rollLength: values.rollLength ? Number(values.rollLength) : undefined,
              pattern: values.pattern || undefined,
              composition: values.composition || undefined,
              customFields: customFields.filter((f) => f.key.trim()).map((f) => ({
                key: f.key,
                value: isNaN(Number(f.value)) ? f.value : Number(f.value),
              })),
            }
          : undefined;

      if (editingMaterial) {
        await updateMaterial(businessId, editingMaterial.id, {
          name: values.name.trim(),
          itemType: values.itemType,
          sku: (values.sku || generateSku(values.name)).trim(),
          categoryId: values.categoryId,
          categoryName: cat.name,
          unitId: values.unitId,
          unitName: unit.name,
          quantity: values.quantity,
          reorderLevel: values.reorderLevel,
          averageUnitCost: values.averageUnitCost,
          sellingPrice: toNum(values.sellingPrice),
          wholesalePrice: toNum(values.wholesalePrice),
          minimumSellingPrice: toNum(values.minimumSellingPrice),
          size: values.size || undefined,
          color: values.color || undefined,
          brand: values.brand || undefined,
          supplierId: values.supplierId || undefined,
          imageUrl: imageUrl || undefined,
          imagePublicId: imagePublicId || undefined,
          images: allImages.length > 0 ? allImages : undefined,
          fabricMeta,
        });
        toast.success("Material updated");
      } else {
        await createMaterial(businessId, {
          businessId,
          name: values.name.trim(),
          itemType: values.itemType,
          sku: (values.sku || generateSku(values.name)).trim(),
          categoryId: values.categoryId,
          categoryName: cat.name,
          unitId: values.unitId,
          unitName: unit.name,
          quantity: values.quantity,
          reorderLevel: values.reorderLevel,
          averageUnitCost: values.averageUnitCost,
          sellingPrice: toNum(values.sellingPrice),
          wholesalePrice: toNum(values.wholesalePrice),
          minimumSellingPrice: toNum(values.minimumSellingPrice),
          size: values.size || undefined,
          color: values.color || undefined,
          brand: values.brand || undefined,
          supplierId: values.supplierId || undefined,
          imageUrl: imageUrl || undefined,
          imagePublicId: imagePublicId || undefined,
          images: allImages.length > 0 ? allImages : undefined,
          fabricMeta,
        });
        if (user) {
          await notifyMaterialAdded(businessId, values.name.trim(), "", user.uid);
        }
        toast.success("Material added");
      }
      resetForm();
      setShowForm(false);
    } catch {
      toast.error(editingMaterial ? "Could not update material" : "Could not add material");
    } finally {
      setUploading(false);
    }
  });

  const handleDelete = async (mat: InventoryMaterial) => {
    if (!confirm(`Delete "${mat.name}"? This cannot be undone.`)) return;
    try {
      const allImgs = mat.images || (mat.imagePublicId ? [{ url: mat.imageUrl || "", publicId: mat.imagePublicId }] : []);
      for (const img of allImgs) {
        if (img.publicId) {
          try {
            await fetch("/api/cloudinary/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicId: img.publicId }),
            });
          } catch { /* ignore */ }
        }
      }
      await deleteMaterial(businessId, mat.id);
      toast.success("Material deleted");
    } catch {
      toast.error("Could not delete material");
    }
  };

  const handleCreateCategory = async (label: string) => {
    const id = await createCategory(businessId, label);
    setValue("categoryId", id);
    toast.success(`Category "${label}" created`);
  };

  const handleSaveCategoryEdit = async () => {
    if (!editingCategory || !catEditName.trim()) return;
    try {
      await updateCategory(businessId, editingCategory.id, catEditName.trim());
      setEditingCategory(null);
      setCatEditName("");
      toast.success("Category updated");
    } catch {
      toast.error("Could not update category");
    }
  };

  const handleDeleteCategory = async (cat: DbCategory) => {
    const count = categoryCounts[cat.id] || 0;
    if (count > 0) {
      toast.error(`Cannot delete "${cat.name}": ${count} material(s) use this category`);
      return;
    }
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await deleteCategory(businessId, cat.id);
      toast.success("Category deleted");
    } catch {
      toast.error("Could not delete category");
    }
  };

  const addCustomField = () => setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  const removeCustomField = (i: number) => setCustomFields((prev) => prev.filter((_, idx) => idx !== i));
  const updateCustomField = (i: number, field: "key" | "value", val: string) =>
    setCustomFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, [field]: val } : f)));

  const openAdjust = (mat: InventoryMaterial) => {
    if (adjustingMaterial?.id === mat.id) {
      setAdjustingMaterial(null);
      return;
    }
    adjustForm.reset({ adjustment: 0, reason: "" });
    setAdjustingMaterial(mat);
  };

  const submitAdjustment = adjustForm.handleSubmit(async (values) => {
    if (!adjustingMaterial || !user) return;
    if (values.adjustment === 0) { toast.error("Enter a non-zero adjustment amount"); return; }
    if (!values.reason.trim()) { toast.error("Enter a reason for the adjustment"); return; }
    setAdjustSubmitting(true);
    try {
      await adjustMaterialStock(businessId, {
        materialId: adjustingMaterial.id,
        materialName: adjustingMaterial.name,
        adjustment: values.adjustment,
        unit: adjustingMaterial.unitName,
        reason: values.reason.trim(),
        actorUid: user.uid,
        actorName: (user as any).displayName || "Staff",
      });
      toast.success(
        `Stock ${values.adjustment > 0 ? "increased" : "decreased"} by ${Math.abs(values.adjustment)} ${adjustingMaterial.unitName}`
      );
      setAdjustingMaterial(null);
    } catch {
      toast.error("Could not record stock adjustment");
    } finally {
      setAdjustSubmitting(false);
    }
  });

  const firstImageUrl = (mat: InventoryMaterial): string | undefined => {
    if (mat.images && mat.images.length > 0) return mat.images[0].url;
    if (mat.imageUrl) return mat.imageUrl;
    return undefined;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CardTitle>Materials</CardTitle>
            <Badge variant="default" className="rounded-full">{materials.length} total</Badge>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? "Close Form" : editingMaterial ? "Edit" : "Add Material"}
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Category filter tabs */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
            <Button
              variant={selectedCategoryId === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategoryId("")}
            >
              All ({materials.length})
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategoryId === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                {cat.name} ({categoryCounts[cat.id] || 0})
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setCatManageOpen(!catManageOpen)} className="ml-auto">
              <SlidersHorizontal className="h-3 w-3 mr-1" /> Manage Categories
            </Button>
          </div>

          {catManageOpen && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input placeholder="Search categories..." value={catSearch} onChange={(e) => setCatSearch(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={() => { setShowNewCategoryInput(!showNewCategoryInput); setNewCategoryName(""); setEditingCategory(null); }}>
                  <Plus className="h-4 w-4 mr-1" /> New
                </Button>
              </div>
              {showNewCategoryInput && (
                <div className="flex items-center gap-2">
                  <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name" className="flex-1" autoFocus />
                  <Button size="sm" onClick={async () => {
                    if (!newCategoryName.trim()) return;
                    await handleCreateCategory(newCategoryName.trim());
                    setNewCategoryName(""); setShowNewCategoryInput(false);
                  }}>Create</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowNewCategoryInput(false); setNewCategoryName(""); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {editingCategory && (
                <div className="flex items-center gap-2">
                  <Input value={catEditName} onChange={(e) => setCatEditName(e.target.value)} placeholder="Category name" className="flex-1" autoFocus />
                  <Button size="sm" onClick={handleSaveCategoryEdit}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingCategory(null)}><X className="h-4 w-4" /></Button>
                </div>
              )}
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                    <span>{cat.name} <span className="text-xs text-slate-400">({categoryCounts[cat.id] || 0})</span></span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingCategory(cat); setCatEditName(cat.name); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteCategory(cat)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showForm && (
            <form className="grid gap-4 md:grid-cols-2 border-t pt-4" onSubmit={saveMaterial}>
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs text-slate-500">Item type</p>
                  <SearchableSelect
                    options={ITEM_TYPE_OPTIONS} value={itemType} onChange={(v) => setValue("itemType", v as InventoryItemType)}
                    placeholder="Select item type"
                  />
                </div>
                <Input placeholder="Material name *" {...register("name", { required: true })} />
                <div className="flex items-center gap-2">
                  <Input placeholder="SKU" {...register("sku")} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Auto-generate from name"
                    onClick={() => setValue("sku", generateSku((name || "").trim() || ""))}
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-500">Category</p>
                  <SearchableSelect options={categoryOptions} value={categoryId} onChange={(v) => setValue("categoryId", v)} placeholder="Select or create category" onCreate={handleCreateCategory} />
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-500">Unit</p>
                  <SearchableSelect
                    options={unitOptions} value={unitId} onChange={(v) => setValue("unitId", v)}
                    placeholder="Select or create unit"
                    onCreate={async (label) => { const id = await createUnit(businessId, label); setValue("unitId", id); toast.success(`Unit "${label}" created`); }}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-500">Supplier (optional)</p>
                  <SearchableSelect options={supplierOptions} value={supplierId} onChange={(v) => setValue("supplierId", v)} placeholder="Select supplier" />
                </div>
                <Input type="number" placeholder="Quantity" {...register("quantity", { valueAsNumber: true })} />
                <Input type="number" placeholder="Reorder level" {...register("reorderLevel", { valueAsNumber: true })} />
                <Input type="number" step="0.01" placeholder="Cost price per item (KES)" {...register("averageUnitCost", { valueAsNumber: true })} />
              </div>

              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs text-slate-500">Images (optional) — first image shown in listing as cover</p>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 w-fit">
                    <Upload className="h-4 w-4" />
                    Add Images
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagesSelect} />
                  </label>
                  {(existingImages.length > 0 || imagePreviews.length > 0) && (
                    <div className="flex gap-2 overflow-x-auto py-2" style={{ scrollbarWidth: "thin" }}>
                      {existingImages.map((img, i) => (
                        <div key={`e${i}`} className="relative shrink-0">
                          <img src={img.url} alt="" className="h-16 w-16 rounded-lg object-contain border" />
                          {i === 0 && <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-emerald-600 text-white rounded-b-lg">Cover</span>}
                          <button type="button" onClick={() => removeExistingImage(i)} className="absolute -right-1 -top-1 rounded-full bg-red-500 text-white p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {imagePreviews.map((preview, i) => (
                        <div key={`n${i}`} className="relative shrink-0">
                          <img src={preview} alt="" className="h-16 w-16 rounded-lg object-contain border" />
                          {existingImages.length === 0 && i === 0 && <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-emerald-600 text-white rounded-b-lg">Cover</span>}
                          <button type="button" onClick={() => removeNewImage(i)} className="absolute -right-1 -top-1 rounded-full bg-red-500 text-white p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sales Pricing</p>
                  <Input type="number" step="0.01" placeholder="Selling price (KES)" {...register("sellingPrice", { valueAsNumber: true })} />
                  <Input type="number" step="0.01" placeholder="Wholesale price (KES)" {...register("wholesalePrice", { valueAsNumber: true })} />
                  <Input type="number" step="0.01" placeholder="Minimum selling price (KES)" {...register("minimumSellingPrice", { valueAsNumber: true })} />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Attributes</p>
                  <Input placeholder="Color" {...register("color")} />
                  <Input placeholder="Size" {...register("size")} />
                  <Input placeholder="Brand" {...register("brand")} />
                </div>

                {itemType === "fabric" && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Fabric Details</p>
                    <Input type="number" placeholder="GSM" {...register("gsm", { valueAsNumber: true })} />
                    <Input type="number" step="0.1" placeholder="Roll length (m)" {...register("rollLength", { valueAsNumber: true })} />
                    <Input placeholder="Pattern" {...register("pattern")} />
                    <Input placeholder="Composition (e.g. 100% Cotton)" {...register("composition")} />
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Custom Fields</p>
                    <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={addCustomField}>
                      <Plus className="h-3 w-3 mr-1" /> Add field
                    </Button>
                  </div>
                  {customFields.map((field, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input placeholder="Field name" value={field.key} onChange={(e) => updateCustomField(i, "key", e.target.value)} className="flex-1" />
                      <Input placeholder="Value" value={field.value} onChange={(e) => updateCustomField(i, "value", e.target.value)} className="flex-1" />
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeCustomField(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button type="submit" disabled={uploading}>
                  {uploading ? "Uploading..." : editingMaterial ? "Update material" : "Add material"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Materials list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle>
            {selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId)?.name || "Materials" : "All Materials"}{" "}
            <span className="text-slate-400 font-normal text-base">({filteredMaterials.length})</span>
          </CardTitle>
          <Input
            placeholder="Search by name, category, unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-[260px]"
          />
        </CardHeader>
        <CardContent className="space-y-2">
          {pagedMaterials.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              {searchQuery ? "No materials match your search." : "No materials found."}
            </p>
          ) : (
            <>
              {pagedMaterials.map((m) => (
                <div key={m.id}>
                  <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition hover:border-emerald-200 hover:bg-emerald-50">
                    <Link href={`/inventory/materials/${m.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        {firstImageUrl(m) ? (
                          <img src={firstImageUrl(m)} alt="" className="h-10 w-10 rounded-lg object-cover border border-slate-100 shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-slate-100 shrink-0 flex items-center justify-center">
                            <span className="text-xs text-slate-400">{m.name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{m.name}</p>
                          <p className="text-xs text-slate-500">{m.categoryName} · KES {m.averageUnitCost.toFixed(2)}/{m.unitName}{m.sku ? ` · ${m.sku}` : ""}</p>
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant={m.quantity <= 0 ? "danger" : m.quantity <= m.reorderLevel ? "warning" : "success"}>
                        {m.quantity} {m.unitName}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                        title="Adjust stock"
                        onClick={(e) => { e.preventDefault(); openAdjust(m); }}
                      >
                        <SlidersHorizontal className="h-3 w-3 mr-1" />
                        Adjust
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.preventDefault(); populateForm(m); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={(e) => { e.preventDefault(); handleDelete(m); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Inline stock adjustment panel */}
                  {adjustingMaterial?.id === m.id && (
                    <div className="mx-1 rounded-b-xl border border-t-0 border-emerald-200 bg-emerald-50 px-4 py-3">
                      <p className="text-xs font-semibold text-emerald-800 mb-2">
                        Adjust Stock — {m.name} (Current: {m.quantity} {m.unitName})
                      </p>
                      <form className="flex flex-wrap items-end gap-3" onSubmit={submitAdjustment}>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500">Quantity Change</label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="rounded border border-slate-200 bg-white p-1 hover:bg-slate-50"
                              onClick={() => adjustForm.setValue("adjustment", (adjustForm.getValues("adjustment") || 0) - 1)}
                            >
                              <MinusCircle className="h-4 w-4 text-red-500" />
                            </button>
                            <Input
                              type="number"
                              step="any"
                              className="w-24 text-center"
                              placeholder="e.g. +5 or -3"
                              {...adjustForm.register("adjustment", { valueAsNumber: true, required: true })}
                            />
                            <button
                              type="button"
                              className="rounded border border-slate-200 bg-white p-1 hover:bg-slate-50"
                              onClick={() => adjustForm.setValue("adjustment", (adjustForm.getValues("adjustment") || 0) + 1)}
                            >
                              <PlusCircle className="h-4 w-4 text-emerald-500" />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400">Positive = add stock, negative = remove</p>
                        </div>
                        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                          <label className="text-xs text-slate-500">Reason *</label>
                          <Input placeholder="e.g. Stock count correction, damage..." {...adjustForm.register("reason", { required: true })} />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={adjustSubmitting}>
                            {adjustSubmitting ? "Saving..." : "Record"}
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setAdjustingMaterial(null)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              ))}

              {/* Pagination */}
              {pageCount > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-xs text-slate-500">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredMaterials.length)} of {filteredMaterials.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                      const p = pageCount <= 5 ? i : Math.max(0, Math.min(page - 2, pageCount - 5)) + i;
                      return (
                        <Button
                          key={p}
                          variant={p === page ? "default" : "outline"}
                          size="sm"
                          className="h-7 w-7 p-0 text-xs"
                          onClick={() => setPage(p)}
                        >
                          {p + 1}
                        </Button>
                      );
                    })}
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
