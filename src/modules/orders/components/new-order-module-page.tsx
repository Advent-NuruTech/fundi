"use client";

import { useEffect, useState, useMemo, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Customer, InventoryMaterial, UserProfile } from "@/types/domain";
import type { OrderItemType } from "@/types/domain";
import type { OrderItemInput } from "@/services/firestore.service";
import { newOrderSchema, type NewOrderInput, type NewOrderValues } from "@/schemas/order.schema";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { useAuth } from "@/features/auth/components/auth-context";
import {
  appendOrderImageId,
  createOrder,
  fetchMembers,
  listenCustomers,
  listenMaterials,
} from "@/services/firestore.service";
import { uploadImage } from "@/services/cloudinary/upload.service";
import { notifyNewOrder } from "@/services/notification-catalog";
import { sendSms } from "@/lib/sms/sendSms";
import { appendPortalOnboarding } from "@/lib/customer-portal";
import {
  getCustomerMessagingInfo,
  markPortalOnboardingSent,
} from "@/services/customer-portal.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Ruler, Users } from "lucide-react";
import { formatKes } from "@/lib/utils";

const ITEM_TYPE_LABELS: Record<OrderItemType, string> = {
  tailored: "Tailored",
  ready_made: "Ready-made",
  alteration: "Alteration",
  material: "Material Sale",
  service: "Service",
};

const STANDARD_MEASUREMENTS = [
  "bust",
  "waist",
  "hips",
  "shoulder",
  "sleeve",
  "length",
  "inseam",
  "neck",
  "thigh",
] as const;

interface MeasurementRow {
  name: string;
  value: string;
}

interface DraftOrderItem {
  key: string;
  itemType: OrderItemType;
  inventoryItemId?: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  costPrice: number;
  discount: number;
  sku?: string;
  categoryName?: string;
  size?: string;
  color?: string;
  brand?: string;
  styleNotes: string;
  assignedTailorId?: string;
  captureMeasurements: boolean;
  measurements: MeasurementRow[];
}

interface MemberRowGarment {
  name: string;
  quantity: number;
  agreedPrice: number;
  styleNotes?: string;
}

interface MemberRow {
  memberCustomerId: string;
  garments: MemberRowGarment[];
}

function newDraftItem(key: string, itemType: OrderItemType): DraftOrderItem {
  return {
    key,
    itemType,
    name: "",
    quantity: 1,
    unit: "pcs",
    unitPrice: 0,
    costPrice: 0,
    discount: 0,
    styleNotes: "",
    assignedTailorId: "",
    captureMeasurements: false,
    measurements: [],
  };
}

function newKey(prefix = "item"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildMeasurements(rows: MeasurementRow[]): Record<string, unknown> | undefined {
  const values = rows
    .filter((r) => r.name.trim() && r.value.trim() !== "" && !Number.isNaN(Number(r.value)))
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.name.trim()] = Number(r.value);
      return acc;
    }, {});
  return Object.keys(values).length > 0 ? values : undefined;
}

export function NewOrderModulePage() {
  const router = useRouter();
  const { businessId, user, ready } = useBusinessContext();
  const { business } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);
  const [tailors, setTailors] = useState<UserProfile[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [items, setItems] = useState<DraftOrderItem[]>([]);
  const [memberRows, setMemberRows] = useState<MemberRow[]>([]);

  const { register, handleSubmit, formState, watch } = useForm<NewOrderInput, undefined, NewOrderValues>({
    resolver: zodResolver(newOrderSchema),
    defaultValues: { dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10) },
  });

  const selectedCustomerId = watch("customerId");
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );
  const isGroupOrder = selectedCustomer?.customerType === "group";
  const orderTailorId = watch("assignedTailorId");

  const groupMembers = useMemo(() => {
    if (!selectedCustomerId) return [] as Customer[];
    return customers.filter((c) => c.parentCustomerId === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  useEffect(() => {
    if (!ready) return;
    const unsubCustomers = listenCustomers(businessId, setCustomers);
    const unsubMaterials = listenMaterials(businessId, setMaterials);
    fetchMembers(businessId).then((rows) => setTailors(rows.filter((member) => member.active !== false)));
    return () => {
      unsubCustomers();
      unsubMaterials();
    };
  }, [businessId, ready]);

  useEffect(() => {
    setMemberRows([]);
    if (selectedCustomer?.customerType === "group") {
      setItems([]);
    }
  }, [selectedCustomerId, selectedCustomer?.customerType]);

  // Inventory pickers, driven by the item type.
  const stockByType = useMemo(() => {
    const saleable = materials.filter((m) => (m.sellingPrice ?? 0) > 0 || m.quantity > 0);
    return {
      ready_made: materials.filter((m) => m.itemType === "ready_made"),
      material: saleable.filter((m) => m.itemType !== "ready_made"),
      alteration: materials.filter((m) => m.itemType === "ready_made" || (m.sellingPrice ?? 0) > 0),
    };
  }, [materials]);

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      event.target.value = "";
      setImageFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be 10MB or smaller");
      event.target.value = "";
      setImageFile(null);
      return;
    }
    setImageFile(file);
  };

  const addItem = (itemType: OrderItemType) => {
    const item = newDraftItem(newKey(), itemType);
    if (itemType === "tailored" || itemType === "alteration") {
      item.captureMeasurements = itemType === "tailored";
      item.assignedTailorId = orderTailorId ?? "";
      if (item.captureMeasurements) {
        item.measurements = STANDARD_MEASUREMENTS.map((name) => ({ name, value: "" }));
      }
    }
    setItems((prev) => [...prev, item]);
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const updateItem = (key: string, patch: Partial<DraftOrderItem>) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  };

  const selectInventoryItem = (key: string, materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (!material) return;
    setItems((prev) =>
      prev.map((i) =>
        i.key === key
          ? {
              ...i,
              inventoryItemId: material.id,
              name: material.name,
              unit: material.unitName || i.unit,
              unitPrice: Number(material.sellingPrice ?? 0),
              costPrice: Number(material.averageUnitCost ?? 0),
              sku: material.sku,
              categoryName: material.categoryName,
              size: material.size,
              color: material.color,
              brand: material.brand,
              quantity: 1,
            }
          : i
      )
    );
  };

  const setMeasurement = (key: string, index: number, field: keyof MeasurementRow, value: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.key !== key) return i;
        const measurements = i.measurements.map((m, mi) => (mi === index ? { ...m, [field]: value } : m));
        return { ...i, measurements };
      })
    );
  };

  const addMeasurementRow = (key: string) => {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, measurements: [...i.measurements, { name: "", value: "" }] } : i))
    );
  };

  const removeMeasurementRow = (key: string, index: number) => {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, measurements: i.measurements.filter((_, mi) => mi !== index) } : i))
    );
  };

  const itemSubtotal = useMemo(
    () =>
      items.reduce(
        (sum, i) =>
          sum + Math.max(0, (Number(i.unitPrice) || 0) * (Number(i.quantity) || 0) - (Number(i.discount) || 0)),
        0
      ),
    [items]
  );

  const memberSubtotal = useMemo(
    () =>
      memberRows.reduce(
        (sum, r) =>
          sum +
          r.garments.reduce((s, g) => s + (Number(g.agreedPrice) || 0) * (Number(g.quantity) || 0), 0),
        0
      ),
    [memberRows]
  );

  const stockOf = (inventoryItemId: string): InventoryMaterial | undefined =>
    materials.find((m) => m.id === inventoryItemId);

  const validateItems = (): boolean => {
    for (const item of items) {
      if (!item.name.trim()) {
        toast.error("Every order item needs a name or product");
        return false;
      }
      if (!Number(item.quantity) || Number(item.quantity) < 1) {
        toast.error(`"${item.name}" needs a quantity of at least 1`);
        return false;
      }
      if ((item.itemType === "ready_made" || item.itemType === "material") && item.inventoryItemId) {
        const stock = Number(stockOf(item.inventoryItemId)?.quantity ?? 0);
        if (Number(item.quantity) > stock) {
          toast.error(`Not enough stock for "${item.name}" — available ${stock} ${item.unit}`);
          return false;
        }
      }
    }
    return true;
  };

  const buildItemsPayload = (): OrderItemInput[] =>
    items.map((item) => ({
      itemType: item.itemType,
      inventoryItemId: item.inventoryItemId || undefined,
      inventoryItemName: item.name,
      sku: item.sku || undefined,
      categoryName: item.categoryName || undefined,
      size: item.size || undefined,
      color: item.color || undefined,
      brand: item.brand || undefined,
      quantity: Number(item.quantity),
      unit: item.unit || "pcs",
      unitPrice: Number(item.unitPrice) || 0,
      costPrice: Number(item.costPrice) || 0,
      discount: Number(item.discount) || 0,
      measurements: item.captureMeasurements ? buildMeasurements(item.measurements) : undefined,
      styleNotes: item.styleNotes.trim() || undefined,
      assignedTailorId: item.assignedTailorId || undefined,
      assignedTailorName: tailors.find((t) => t.uid === item.assignedTailorId)?.displayName,
      status: "active",
    })) as OrderItemInput[];

  const toggleMember = (memberCustomerId: string) => {
    setMemberRows((prev) => {
      if (prev.some((r) => r.memberCustomerId === memberCustomerId)) {
        return prev.filter((r) => r.memberCustomerId !== memberCustomerId);
      }
      return [
        ...prev,
        { memberCustomerId, garments: [{ name: "", quantity: 1, agreedPrice: 0 }] },
      ];
    });
  };

  const updateMemberGarment = (
    memberIndex: number,
    garmentIndex: number,
    field: keyof MemberRowGarment,
    value: string | number
  ) => {
    setMemberRows((prev) => {
      const next = prev.map((r, mi) => (mi === memberIndex ? { ...r } : r));
      next[memberIndex].garments[garmentIndex] = {
        ...next[memberIndex].garments[garmentIndex],
        [field]: value,
      };
      return next;
    });
  };

  const addMemberGarment = (memberIndex: number) => {
    setMemberRows((prev) =>
      prev.map((r, mi) =>
        mi === memberIndex
          ? { ...r, garments: [...r.garments, { name: "", quantity: 1, agreedPrice: 0 }] }
          : r
      )
    );
  };

  const removeMemberGarment = (memberIndex: number, garmentIndex: number) => {
    setMemberRows((prev) =>
      prev.map((r, mi) =>
        mi === memberIndex
          ? { ...r, garments: r.garments.filter((_, gi) => gi !== garmentIndex) }
          : r
      )
    );
  };

  const validRows = (
    rows: MemberRow[],
    allCustomers: Customer[]
  ): Array<{
    memberCustomerId: string;
    memberName: string;
    gender?: string;
    department?: string;
    measurements?: Record<string, unknown>;
    garments: MemberRowGarment[];
  }> =>
    rows
      .filter((r) => r.garments.some((g) => g.name.trim()))
      .map((r) => {
        const member = allCustomers.find((c) => c.id === r.memberCustomerId);
        return {
          memberCustomerId: r.memberCustomerId,
          memberName: member?.fullName ?? "",
          gender: member?.gender,
          department: member?.department,
          measurements: member?.measurements ?? {},
          garments: r.garments
            .filter((g) => g.name.trim())
            .map((g) => ({ ...g, name: g.name.trim(), styleNotes: g.styleNotes || undefined })),
        };
      });

  const onSubmit: SubmitHandler<NewOrderValues> = async (values) => {
    if (!user) return;
    const customer = customers.find((entry) => entry.id === values.customerId);
    if (!customer) {
      toast.error("Customer is required");
      return;
    }

    const isGroup = customer.customerType === "group";
    if (isGroup) {
      const valid = memberRows.filter((r) => r.garments.some((g) => g.name.trim()));
      if (valid.length === 0) {
        toast.error("Add at least one member with a garment");
        return;
      }
      for (const r of valid) {
        const hasInvalid = r.garments.some(
          (g) => g.name.trim() && (!Number(g.quantity) || Number(g.quantity) < 1)
        );
        if (hasInvalid) {
          toast.error("Each garment needs a quantity of at least 1");
          return;
        }
      }
    } else if (items.length === 0) {
      toast.error("Add at least one item to the order");
      return;
    } else if (!validateItems()) {
      return;
    }

    const tailor = tailors.find((entry) => entry.uid === values.assignedTailorId);
    const members = isGroup ? validRows(memberRows, customers) : [];

    try {
      const { id: orderId, orderNumber, trackingToken } = await createOrder(
        businessId,
        {
          businessId,
          customerId: customer.id,
          customerName: isGroup
            ? customer.organizationName || customer.fullName
            : customer.fullName,
          customerPhone: customer.phone,
          assignedTailorId: tailor?.uid,
          assignedTailorName: tailor?.displayName,
          garments: isGroup ? [] : [],
          items: isGroup ? [] : buildItemsPayload(),
          measurementsSnapshot: customer.measurements,
          designNotes: values.designNotes,
          fabricSelections: [],
          dueDate: values.dueDate,
          subtotalAmount: isGroup ? memberSubtotal : itemSubtotal,
          isGroupOrder: isGroup,
          members,
        },
        Number(values.depositAmount) || 0,
        {
          uid: user.uid,
          name: user.displayName,
        }
      );

      if (imageFile) {
        try {
          const meta = await uploadImage({
            file: imageFile,
            businessId,
            uploadedByUid: user.uid,
            orderId,
            customerId: customer.id,
          });
          await appendOrderImageId(businessId, orderId, meta.id);
        } catch (error) {
          toast.error(error instanceof Error ? `Order created but image upload failed: ${error.message}` : "Order created but image upload failed");
        }
      }
      await notifyNewOrder(businessId, orderNumber, customer.fullName, orderId, user.uid);

      if (customer.phone && trackingToken) {
        const origin = window.location.origin;
        const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
        const greetName = isGroup
          ? (customer.contactPerson || customer.organizationName || customer.fullName).split(" ")[0]
          : customer.fullName.split(" ")[0];
        const bizName = business?.name ?? "our workshop";
        const trackingLine = isLocalhost ? "" : `\nTrack your order online:\n${origin}/auth/customer-login\n`;
        let message = `Hello ${greetName},\n\nYour order ${orderNumber} has been created at ${bizName}.${trackingLine}\nThank you.`;

        let onboardingIncluded = false;
        const messagingInfo = await getCustomerMessagingInfo(businessId, customer.id).catch(() => null);
        if (messagingInfo && !messagingInfo.portalOnboardingSent) {
          message = appendPortalOnboarding(message, {
            email: messagingInfo.email ?? undefined,
            phone: messagingInfo.phone,
          });
          onboardingIncluded = true;
        }

        const smsResult = await sendSms(customer.phone, message);
        if (smsResult.success) {
          if (onboardingIncluded) {
            await markPortalOnboardingSent(businessId, customer.id).catch(() => {});
          }
        } else {
          console.warn("Order creation SMS failed:", smsResult.error);
        }
      }

      toast.success(isGroup ? "Group order created" : "Order created");
      router.push(`/orders/${orderId}`);
    } catch {
      toast.error("Could not create order");
    }
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            New Order
            {!isGroupOrder && items.length > 0 && (
              <Badge variant="default" className="normal-case">
                {itemTypeCount(items)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Label>Customer</Label>
              <Select {...register("customerId")}>
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customerType === "group"
                      ? `${customer.organizationName || customer.fullName} (Group)`
                      : customer.fullName}{" "}
                    ({customer.phone})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Assigned tailor</Label>
              <Select {...register("assignedTailorId")}>
                <option value="">Unassigned</option>
                {tailors.map((tailor) => (
                  <option key={tailor.uid} value={tailor.uid}>{tailor.displayName}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" {...register("dueDate")} />
            </div>
            <div>
              <Label>Deposit</Label>
              <Input type="number" min={0} step="any" {...register("depositAmount")} />
            </div>
            <div className="md:col-span-2">
              <Label>Design / style notes</Label>
              <Textarea {...register("designNotes")} />
            </div>
            <div className="md:col-span-2">
              <Label>Order reference image (optional)</Label>
              <Input type="file" accept="image/*" onChange={handleImageSelect} />
            </div>
          </form>
        </CardContent>
      </Card>

      {!isGroupOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              Order Items
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ITEM_TYPE_LABELS) as OrderItemType[]).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addItem(type)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {ITEM_TYPE_LABELS[type]}
                  </Button>
                ))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {items.length === 0 && (
              <p className="text-sm text-slate-500">
                Add line items — you can mix a tailored suit, ready-made t-shirts,
                fabric by the meter and accessories in one order.
              </p>
            )}

            {items.map((item) => (
              <div key={item.key} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.itemType === "tailored" || item.itemType === "alteration" ? "warning" : "success"}>
                      {ITEM_TYPE_LABELS[item.itemType]}
                    </Badge>
                    {item.inventoryItemId && (
                      <Badge variant="default">{item.sku || "Stock item"}</Badge>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => removeItem(item.key)}>
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {item.itemType !== "ready_made" && item.itemType !== "material" ? (
                    <div>
                      <Label>{item.itemType === "service" ? "Service name" : "Item / garment name"}</Label>
                      <Input
                        value={item.name}
                        placeholder={item.itemType === "service" ? "e.g. Embroidery, Printing" : "e.g. Suit, Trouser"}
                        onChange={(e) => updateItem(item.key, { name: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div>
                      <Label>Product from inventory</Label>
                      <Select
                        value={item.inventoryItemId ?? ""}
                        onChange={(e) => selectInventoryItem(item.key, e.target.value)}
                      >
                        <option value="">Select product</option>
                        {(item.itemType === "ready_made"
                          ? stockByType.ready_made
                          : stockByType.material
                        ).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}{m.sku ? ` (${m.sku})` : ""} — Stock {m.quantity} {m.unitName} — {formatKes(Number(m.sellingPrice) || 0)}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      step="any"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.key, { quantity: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Unit price (KES)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.key, { unitPrice: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Discount (KES)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={item.discount}
                      onChange={(e) => updateItem(item.key, { discount: Number(e.target.value) })}
                    />
                  </div>

                  {(item.itemType === "tailored" || item.itemType === "alteration") && (
                    <div>
                      <Label>Assigned tailor</Label>
                      <Select
                        value={item.assignedTailorId ?? ""}
                        onChange={(e) => updateItem(item.key, { assignedTailorId: e.target.value })}
                      >
                        <option value="">Unassigned</option>
                        {tailors.map((tailor) => (
                          <option key={tailor.uid} value={tailor.uid}>{tailor.displayName}</option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>

                {(item.itemType === "tailored" || item.itemType === "alteration") && (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateItem(item.key, {
                          captureMeasurements: !item.captureMeasurements,
                          measurements: !item.captureMeasurements
                            ? (item.measurements.length > 0
                                ? item.measurements
                                : STANDARD_MEASUREMENTS.map((name) => ({ name, value: "" })))
                            : item.measurements,
                        })
                      }
                    >
                      <Ruler className="mr-1 h-3.5 w-3.5" />
                      {item.captureMeasurements ? "Hide measurements" : "Add measurements"}
                    </Button>

                    {item.captureMeasurements && (
                      <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-3">
                        {item.measurements.map((row, mi) => (
                          <div key={mi} className="flex items-center gap-2">
                            <Input
                              value={row.name}
                              placeholder="Field"
                              onChange={(e) => setMeasurement(item.key, mi, "name", e.target.value)}
                            />
                            <Input
                              type="number"
                              step="any"
                              value={row.value}
                              placeholder="cm"
                              onChange={(e) => setMeasurement(item.key, mi, "value", e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeMeasurementRow(item.key, mi)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => addMeasurementRow(item.key)}>
                          <Plus className="mr-1 h-3.5 w-3.5" /> Add field
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3">
                  <Label>Notes / style details</Label>
                  <Input
                    value={item.styleNotes}
                    placeholder="e.g. short sleeves, 2 pockets"
                    onChange={(e) => updateItem(item.key, { styleNotes: e.target.value })}
                  />
                </div>

                <p className="mt-3 text-right text-sm font-medium text-slate-700">
                  Line total:{" "}
                  {formatKes(
                    Math.max(
                      0,
                      (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0) - (Number(item.discount) || 0)
                    )
                  )}
                </p>
              </div>
            ))}

            {items.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <p className="text-sm font-medium text-slate-700">
                  {items.length} item{items.length > 1 ? "s" : ""}
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  Subtotal: {formatKes(itemSubtotal)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isGroupOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Group order members
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-slate-500">
              Add each member and the garments they need. Every member gets their own
              production stage.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {groupMembers.map((member) => {
                const included = memberRows.some((r) => r.memberCustomerId === member.id);
                const rowIndex = memberRows.findIndex((r) => r.memberCustomerId === member.id);
                return (
                  <div key={member.id} className="rounded-xl border border-slate-200 p-4">
                    <button
                      type="button"
                      onClick={() => toggleMember(member.id)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <span className="font-medium">{member.fullName}</span>
                      <Badge variant={included ? "success" : "default"}>
                        {included ? "Added" : "Add"}
                      </Badge>
                    </button>
                    {included && (
                      <div className="mt-3 grid gap-2">
                        {memberRows[rowIndex].garments.map((garment, gi) => (
                          <div key={gi} className="grid grid-cols-[1fr_70px_110px_40px] items-center gap-2">
                            <Input
                              value={garment.name}
                              placeholder="Garment"
                              onChange={(e) => updateMemberGarment(rowIndex, gi, "name", e.target.value)}
                            />
                            <Input
                              type="number"
                              min={1}
                              value={garment.quantity}
                              onChange={(e) => updateMemberGarment(rowIndex, gi, "quantity", Number(e.target.value))}
                            />
                            <Input
                              type="number"
                              min={0}
                              value={garment.agreedPrice}
                              placeholder="Price"
                              onChange={(e) => updateMemberGarment(rowIndex, gi, "agreedPrice", Number(e.target.value))}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeMemberGarment(rowIndex, gi)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => addMemberGarment(rowIndex)}>
                          <Plus className="mr-1 h-3.5 w-3.5" /> Add garment
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {memberRows.length > 0 && (
              <p className="text-right text-lg font-semibold text-slate-900">
                Subtotal: {formatKes(memberSubtotal)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end gap-3">
        <p className="text-lg font-semibold text-slate-900">
          Total: {formatKes(isGroupOrder ? memberSubtotal : itemSubtotal)}
        </p>
        <Button onClick={handleSubmit(onSubmit)} disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Saving..." : "Create order"}
        </Button>
      </div>
    </div>
  );
}

function itemTypeCount(items: DraftOrderItem[]): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(ITEM_TYPE_LABELS[item.itemType], (counts.get(ITEM_TYPE_LABELS[item.itemType]) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => `${count} ${label}${count > 1 ? "s" : ""}`)
    .join(" · ");
}
