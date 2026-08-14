"use client";

import { useEffect, useState, useMemo, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Customer, InventoryMaterial, UserProfile, DeliveryPartner, DeliveryMethod, BusinessDeliveryConfig } from "@/types/domain";
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
  listenDeliveryPartners,
  getDeliveryConfig,
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
import {
  SearchableSelect,
  type FilterChip,
  type SearchableOption,
} from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Ruler, Users, Truck } from "lucide-react";
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
  memberCustomerId?: string;
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
  referenceImageFile?: File;
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
  const [representativeId, setRepresentativeId] = useState("");
  const [payerId, setPayerId] = useState("");
  const [memberRows, setMemberRows] = useState<MemberRow[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>([]);
  const [deliveryConfig, setDeliveryConfig] = useState<BusinessDeliveryConfig | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("delivery");
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPartnerId, setDeliveryPartnerId] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const { register, handleSubmit, formState, watch, setValue } = useForm<NewOrderInput, undefined, NewOrderValues>({
    resolver: zodResolver(newOrderSchema),
    defaultValues: { dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10) },
  });

  const selectedCustomerId = watch("customerId");

  const customerOptions = useMemo<SearchableOption[]>(() => {
    return [...customers]
      .sort((a, b) => (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? ""))
      .map((c) => ({
        value: c.id,
        label: `${c.customerType === "group" ? c.organizationName || c.fullName : c.fullName}${
          c.phone ? ` (${c.phone})` : ""
        }`,
        group: c.customerType === "group" ? "Groups" : "Customers",
      }));
  }, [customers]);

  const customerChips: FilterChip[] = [
    { key: "all", label: "All", match: () => true },
    { key: "individual", label: "Customers", match: (o: SearchableOption) => o.group !== "Groups" },
    { key: "group", label: "Groups", match: (o: SearchableOption) => o.group === "Groups" },
  ];
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
  const groupRecipients = useMemo(
    () => (selectedCustomer ? [selectedCustomer, ...groupMembers] : groupMembers),
    [selectedCustomer, groupMembers]
  );

  useEffect(() => {
    if (!ready) return;
    const unsubCustomers = listenCustomers(businessId, setCustomers);
    const unsubMaterials = listenMaterials(businessId, setMaterials);
    const unsubPartners = listenDeliveryPartners(businessId, setDeliveryPartners);
    getDeliveryConfig(businessId).then((config) => {
      if (config) {
        setDeliveryConfig(config);
        setDeliveryMethod(config.defaultMethod ?? "delivery");
        setDeliveryFee(config.defaultDeliveryFee ?? 0);
      }
    }).catch(() => {});
    fetchMembers(businessId).then((rows) => setTailors(rows.filter((member) => member.active !== false)));
    return () => {
      unsubCustomers();
      unsubMaterials();
      unsubPartners();
    };
  }, [businessId, ready]);

  useEffect(() => {
    setMemberRows([]);
    setRepresentativeId("");
    setPayerId("");
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

  const buildItemsPayload = (referenceImageUrls = new Map<string, string>()): OrderItemInput[] =>
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
      referenceImageUrl: referenceImageUrls.get(item.key),
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

  const onSubmit: SubmitHandler<NewOrderValues> = async (values) => {
    if (!user) return;
    const customer = customers.find((entry) => entry.id === values.customerId);
    if (!customer) {
      toast.error("Customer is required");
      return;
    }

    const isGroup = customer.customerType === "group";
    if (items.length === 0) {
      toast.error("Add at least one item to the order");
      return;
    } else if (!validateItems()) {
      return;
    }

    if (isGroup && items.some((item) => !item.memberCustomerId)) {
      toast.error("Choose the member receiving each group-order item");
      return;
    }

    const tailor = tailors.find((entry) => entry.uid === values.assignedTailorId);
    const members = isGroup
      ? groupMembers
          .filter((member) => items.some((item) => item.memberCustomerId === member.id))
          .map((member) => ({
            memberCustomerId: member.id,
            memberName: member.fullName,
            gender: member.gender,
            department: member.department,
            measurements: member.measurements,
            garments: [],
          }))
      : [];
    const representative = groupMembers.find((member) => member.id === representativeId);
    const payer = groupRecipients.find((member) => member.id === payerId);
    const payerName =
      payer?.id === customer.id
        ? customer.organizationName || customer.fullName
        : payer?.fullName;
    const referenceImageUrls = new Map<string, string>();

    try {
      await Promise.all(
        items.filter((item) => item.referenceImageFile).map(async (item) => {
          const meta = await uploadImage({
            file: item.referenceImageFile as File,
            businessId,
            uploadedByUid: user.uid,
            customerId: item.memberCustomerId || customer.id,
          });
          referenceImageUrls.set(item.key, meta.url);
        })
      );
    } catch (error) {
      toast.error(error instanceof Error ? `Could not upload item reference: ${error.message}` : "Could not upload an item reference");
      return;
    }
    const orderItems = buildItemsPayload(referenceImageUrls).map((item, index) => {
      const recipient = items[index].memberCustomerId
        ? groupRecipients.find((member) => member.id === items[index].memberCustomerId)
        : undefined;
      return {
        ...item,
        memberCustomerId: recipient?.id,
        memberName: recipient
          ? recipient.id === customer.id
            ? recipient.organizationName || recipient.fullName
            : recipient.fullName
          : undefined,
      };
    });

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
          items: orderItems,
          measurementsSnapshot: customer.measurements,
          designNotes: values.designNotes,
          fabricSelections: [],
          dueDate: values.dueDate,
          subtotalAmount: itemSubtotal,
          isGroupOrder: isGroup,
          members,
          representativeCustomerId: representative?.id,
          representativeName: representative?.fullName,
          representativePhone: representative?.phone,
          representativeEmail: representative?.email,
          payerCustomerId: payer?.id ?? (isGroup ? customer.id : undefined),
          payerName: payerName ?? (isGroup ? customer.organizationName || customer.fullName : undefined),
          payerPhone: payer?.phone,
          deliveryMethod,
          deliveryFee: deliveryMethod === "delivery" ? Number(deliveryFee) || 0 : 0,
          deliveryAddress: deliveryMethod === "delivery" ? deliveryAddress.trim() || undefined : undefined,
          deliveryPartnerId: deliveryMethod === "delivery" && deliveryPartnerId ? deliveryPartnerId : undefined,
          deliveryPartnerName:
            deliveryMethod === "delivery" && deliveryPartnerId
              ? deliveryPartners.find((p) => p.id === deliveryPartnerId)?.name ?? undefined
              : undefined,
          deliveryNotes: deliveryNotes.trim() || undefined,
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

      const communicationContact = representative ?? customer;
      if (communicationContact.phone && trackingToken) {
        const origin = window.location.origin;
        const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
        const greetName = isGroup
          ? communicationContact.fullName.split(" ")[0]
          : customer.fullName.split(" ")[0];
        const bizName = business?.name ?? "our workshop";
        const trackingLine = isLocalhost ? "" : `\nTrack your order online:\n${origin}/auth/customer-login\n`;
        let message = `Hello ${greetName},\n\nYour order ${orderNumber} has been created at ${bizName}.${trackingLine}\nThank you.`;

        let onboardingIncluded = false;
        const messagingInfo = await getCustomerMessagingInfo(businessId, communicationContact.id).catch(() => null);
        if (messagingInfo && !messagingInfo.portalOnboardingSent) {
          message = appendPortalOnboarding(message, {
            email: messagingInfo.email ?? undefined,
            phone: messagingInfo.phone,
          });
          onboardingIncluded = true;
        }

        const smsResult = await sendSms(communicationContact.phone, message);
        if (smsResult.success) {
          if (onboardingIncluded) {
            await markPortalOnboardingSent(businessId, communicationContact.id).catch(() => {});
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
            {items.length > 0 && (
              <Badge variant="default" className="normal-case">
                {itemTypeCount(items)}
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-slate-500">Choose the customer first, then add only the items they need. Each item carries its own production details and reference image.</p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Label>Customer</Label>
              <SearchableSelect
                options={customerOptions}
                value={selectedCustomerId ?? ""}
                onChange={(v) => setValue("customerId", v, { shouldValidate: true })}
                placeholder="Search by name or phone…"
                chips={customerChips}
                maxResults={150}
                className="w-full"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Recent customers appear first. Use the search box or the Customers / Groups filters to find anyone.
              </p>
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

      {isGroupOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Group order roles</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <p className="md:col-span-2 text-sm text-slate-500">
              Members receive the garments. A representative receives communication, and a payer is responsible for payment. The last two are optional and do not need to receive an item.
            </p>
            <div>
              <Label>Representative for communication (optional)</Label>
              <Select value={representativeId} onChange={(e) => setRepresentativeId(e.target.value)}>
                <option value="">Use the group contact</option>
                {groupMembers.map((member) => <option key={member.id} value={member.id}>{member.fullName}{member.phone ? ` (${member.phone})` : ""}</option>)}
              </Select>
            </div>
            <div>
              <Label>Payer — who is paying? (optional)</Label>
              <Select value={payerId} onChange={(e) => setPayerId(e.target.value)}>
                <option value="">
                  {selectedCustomer?.organizationName || selectedCustomer?.fullName || "The group account"} pays
                </option>
                {representativeId && <option value={representativeId}>Same as representative</option>}
                {groupRecipients
                  .filter((member) => member.id !== representativeId && member.id !== selectedCustomer?.id)
                  .map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
              </Select>
              <p className="mt-1 text-xs text-slate-500">
                The invoice stays on the group account. Pick a member here when they will pay individually
                instead of the group — the receipt will read &quot;Paid by [member name]&quot;.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {true && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              {isGroupOrder ? "Assign items to members" : "Order Items"}
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
                  {isGroupOrder && (
                    <div>
                      <Label>Receiving member</Label>
                      <Select
                        value={item.memberCustomerId ?? ""}
                        onChange={(e) => updateItem(item.key, { memberCustomerId: e.target.value })}
                      >
                        <option value="">Select who receives this item</option>
                        {groupRecipients.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.id === selectedCustomer?.id
                              ? `${member.organizationName || member.fullName} (group account)`
                              : member.fullName}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
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
                <div className="mt-3">
                  <Label>Reference image (optional)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && !file.type.startsWith("image/")) {
                        toast.error("Please choose an image file");
                        e.target.value = "";
                        return;
                      }
                      if (file && file.size > 10 * 1024 * 1024) {
                        toast.error("Image must be 10MB or smaller");
                        e.target.value = "";
                        return;
                      }
                      updateItem(item.key, { referenceImageFile: file });
                    }}
                  />
                  {item.referenceImageFile && <p className="mt-1 text-xs text-slate-500">{item.referenceImageFile.name}</p>}
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

      {false && isGroupOrder && (
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Delivery
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>How will the customer get this order?</Label>
            <Select
              value={deliveryMethod}
              onChange={(e) => {
                const next = e.target.value as DeliveryMethod;
                setDeliveryMethod(next);
                if (next === "pickup") {
                  setDeliveryFee(0);
                  setDeliveryAddress("");
                  setDeliveryPartnerId("");
                }
              }}
            >
              <option value="delivery">Courier delivery</option>
              <option value="pickup">Customer pickup</option>
            </Select>
            <p className="mt-1.5 text-xs text-slate-500">
              {deliveryMethod === "pickup"
                ? "No delivery fee is charged and none appears on the receipt."
                : "A separate delivery fee line is added to the order and receipt."}
            </p>
          </div>
          {deliveryMethod === "delivery" && (
            <>
              <div>
                <Label>Delivery fee (KES)</Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  placeholder={deliveryConfig?.defaultDeliveryFee ? String(deliveryConfig.defaultDeliveryFee) : "0"}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Delivery address</Label>
                <Textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. Plot 12, Moi Avenue, Nairobi"
                />
              </div>
              <div>
                <Label>Assign courier</Label>
                <Select value={deliveryPartnerId} onChange={(e) => setDeliveryPartnerId(e.target.value)}>
                  <option value="">Assign later</option>
                  {deliveryPartners
                    .filter((p) => p.isActive)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.company ? ` — ${p.company}` : ""}
                        {p.phone ? ` (${p.phone})` : ""}
                      </option>
                    ))}
                </Select>
                {deliveryPartners.filter((p) => p.isActive).length === 0 && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    No couriers yet — assign one later from the order or Delivery settings.
                  </p>
                )}
              </div>
              <div>
                <Label>Delivery notes (optional)</Label>
                <Input
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Call customer on arrival"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-20 -mx-4 -mb-4 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
        <div className="min-w-0 text-left sm:text-right">
          <p className="text-lg font-semibold text-slate-900">
            Total: {formatKes(itemSubtotal + (deliveryMethod === "delivery" ? Number(deliveryFee) || 0 : 0))}
          </p>
          {deliveryMethod === "delivery" && Number(deliveryFee) > 0 && (
            <p className="text-xs text-slate-500">
              includes {formatKes(Number(deliveryFee))} delivery fee
            </p>
          )}
        </div>
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={formState.isSubmitting}
          className="shrink-0"
        >
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
