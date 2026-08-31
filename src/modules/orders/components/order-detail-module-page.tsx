"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronDown, ChevronUp, Edit2, Save, X, Plus, Trash2,
  ImageIcon, Package, Scissors, User, FileText, Layers,
  CheckCircle2, Circle, Clock, ArrowLeft, Phone, Mail,
  ClipboardList, Shirt, AlertTriangle, Receipt as ReceiptIcon,
  Truck, MapPin, RotateCcw, Ban, Banknote,
} from "lucide-react";
import type {
  Order, Customer, InventoryMaterial, OrderGarmentItem, OrderItem, OrderItemType, ProductionStageConfig,
  DeliveryPartner, BusinessDeliveryConfig, DeliveryStage, OrderReturn, ReturnStatus, UserProfile,
} from "@/types/domain";
import {
  listenOrder, listenCustomer, listenCustomers,
  addFittingRecord, updateOrderProductionNotes, recordMaterialUsage,
  listenMaterials, updateOrderSmsFields, logSmsEntry,
  updateOrderDetails, updateOrderGarments, ORDER_TYPE_LABELS,
  listenProductionStages, listenDeliveryPartners, getDeliveryConfig, DEFAULT_RETURN_REASONS,
  listenOrderReturns, createOrderReturn, updateOrderReturnStatus, deleteOrderReturn,
  cancelOrder, nextDeliveryStages, DELIVERY_STAGE_LABELS, DELIVERY_STAGE_COLORS, updateOrderItem, fetchMembers,
} from "@/services/firestore.service";
import { advanceOrderDelivery } from "@/services/delivery.service";
import { RETURN_STATUS_LABELS, type RefundStatus } from "@/types/domain";
import { notifyMaterialsConsumed } from "@/services/notification-catalog";
import { advanceOrderStage, prepareMessageWithOnboarding } from "@/services/order-progress.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { useAuth } from "@/features/auth/components/auth-context";
import { sendSms } from "@/lib/sms/sendSms";
import {
  markPortalOnboardingSent,
} from "@/services/customer-portal.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import { Dialog } from "@/components/ui/dialog";
import { OrderReceipt } from "@/components/receipt/order-receipt";
import { formatKes, cn } from "@/lib/utils";
import { uploadImage } from "@/services/cloudinary/upload.service";

// ─── helpers ──────────────────────────────────────────────────────────────────

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function orderLabel(order: Order): string {
  const first = order.items?.[0]?.inventoryItemName || order.garments?.[0]?.name;
  return first ? `${first} - ${order.orderNumber}` : order.orderNumber;
}

const ITEM_TYPE_LABELS: Record<OrderItemType, string> = {
  tailored: "Tailored",
  ready_made: "Ready-made",
  alteration: "Alteration",
  material: "Material",
  service: "Service",
};

const ITEM_TYPE_BADGE: Record<OrderItemType, string> = {
  tailored: "bg-indigo-100 text-indigo-700",
  ready_made: "bg-emerald-100 text-emerald-700",
  alteration: "bg-amber-100 text-amber-800",
  material: "bg-sky-100 text-sky-700",
  service: "bg-violet-100 text-violet-700",
};

function stageColor(key: string) {
  const map: Record<string, string> = {
    cutting:          "bg-slate-500",
    stitching:        "bg-blue-500",
    fitting:          "bg-indigo-500",
    finishing:        "bg-violet-500",
    ready_for_pickup: "bg-emerald-500",
    delivered:        "bg-green-600",
  };
  return map[key] ?? "bg-slate-400";
}

const COURIER_FLOW_UI: DeliveryStage[] = [
  "ready_for_dispatch",
  "courier_assigned",
  "picked_up",
  "in_transit",
  "delivery_attempted",
  "delivered",
];

const PICKUP_FLOW_UI: DeliveryStage[] = ["pickup_ready", "picked_by_customer"];

// ─── collapsible section ───────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
}

function Section({ title, icon, count, defaultOpen = true, children, action }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2.5 text-left min-w-0"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
            {icon}
          </span>
          <span className="font-semibold text-slate-800 text-sm sm:text-base truncate">{title}</span>
          {count != null && (
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 shrink-0">
              {count}
            </span>
          )}
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── image lightbox ────────────────────────────────────────────────────────────

function ImageLightbox({
  images, index, onClose, onNavigate,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate((index - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") onNavigate((index + 1) % images.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, images.length, onClose, onNavigate]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center max-w-3xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={images[index]}
          alt={`Reference image ${index + 1}`}
          className="max-h-[75vh] w-auto rounded-xl object-contain"
        />
        {images.length > 1 && (
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={() => onNavigate((index - 1 + images.length) % images.length)}
              className="rounded-lg bg-white/15 px-4 py-2 text-white hover:bg-white/25 transition-colors"
            >
              ←
            </button>
            <span className="text-white/80 text-sm tabular-nums">
              {index + 1} / {images.length}
            </span>
            <button
              onClick={() => onNavigate((index + 1) % images.length)}
              className="rounded-lg bg-white/15 px-4 py-2 text-white hover:bg-white/25 transition-colors"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── usage row type ────────────────────────────────────────────────────────────

interface UsageRow {
  materialId: string;
  materialName: string;
  quantityUsed: number;
  unit: string;
}

// ─── main component ────────────────────────────────────────────────────────────

export function OrderDetailModulePage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { businessId, user, ready } = useBusinessContext();
  const { business } = useAuth();

  // Data
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tailors, setTailors] = useState<UserProfile[]>([]);

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Order edit mode
  const [editingDetails, setEditingDetails] = useState(false);
  const [editGarments, setEditGarments] = useState<OrderGarmentItem[]>([]);
  const [editDueDate, setEditDueDate] = useState("");
  const [editDesignNotes, setEditDesignNotes] = useState("");
  const [editTailorId, setEditTailorId] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  // A line item can be inspected and edited independently of the master order.
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [itemDraft, setItemDraft] = useState<Partial<OrderItem>>({});
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [itemImagePreview, setItemImagePreview] = useState<string | null>(null);
  const [itemLightboxUrl, setItemLightboxUrl] = useState<string | null>(null);
  const [savingItem, setSavingItem] = useState(false);

  // Fitting
  const [showFittingForm, setShowFittingForm] = useState(false);
  const [fittingNote, setFittingNote] = useState("");
  const [savingFitting, setSavingFitting] = useState(false);

  // Production notes
  const [productionNotes, setProductionNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Material usage form
  const [showUsageForm, setShowUsageForm] = useState(false);
  const [usageRows, setUsageRows] = useState<UsageRow[]>([
    { materialId: "", materialName: "", quantityUsed: 0, unit: "" },
  ]);
  const [recordingUsage, setRecordingUsage] = useState(false);

  // Stage
  const [stageLoading, setStageLoading] = useState<string | null>(null);
  const [stages, setStages] = useState<ProductionStageConfig[]>([]);

  // Receipt
  const [showReceipt, setShowReceipt] = useState(false);

  // Delay SMS
  const [delaySmsLoading, setDelaySmsLoading] = useState(false);
  const [expectedReadyDate, setExpectedReadyDate] = useState("");
  const [delayReason, setDelayReason] = useState("");

  // Delivery
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>([]);
  const [deliveryConfig, setDeliveryConfig] = useState<BusinessDeliveryConfig | null>(null);
  const [deliveryAdvancing, setDeliveryAdvancing] = useState(false);
  const [deliveryPartnerId, setDeliveryPartnerId] = useState(order?.deliveryPartnerId ?? "");
  const [deliveryNotes, setDeliveryNotes] = useState(order?.deliveryNotes ?? "");

  // Returns & alterations
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [returnCharge, setReturnCharge] = useState(0);
  const [returnExpectedDate, setReturnExpectedDate] = useState("");
  const [creatingReturn, setCreatingReturn] = useState(false);
  const [advancingReturnId, setAdvancingReturnId] = useState<string | null>(null);

  // Cancellation
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNotes, setCancelNotes] = useState("");
  const [cancelRefundStatus, setCancelRefundStatus] = useState<RefundStatus>("none");
  const [cancelRefundAmount, setCancelRefundAmount] = useState(0);
  const [cancelFee, setCancelFee] = useState(0);
  const [cancelling, setCancelling] = useState(false);

  // Subscriptions
  useEffect(() => {
    if (!ready || !orderId) return;
    const unsub = listenOrder(businessId, orderId, setOrder);
    const unsubCustomers = listenCustomers(businessId, setCustomers);
    const unsubMat = listenMaterials(businessId, setMaterials);
    const unsubStages = listenProductionStages(businessId, setStages);
    const unsubPartners = listenDeliveryPartners(businessId, setDeliveryPartners);
    const unsubReturns = listenOrderReturns(businessId, (rows) =>
      setReturns(rows.filter((r) => r.orderId === orderId))
    );
    fetchMembers(businessId).then((rows) => setTailors(rows.filter((member) => member.active !== false))).catch(() => {});
    return () => { unsub(); unsubCustomers(); unsubMat(); unsubStages(); unsubPartners(); unsubReturns(); };
  }, [businessId, orderId, ready]);

  useEffect(() => {
    if (!ready || !businessId) return;
    getDeliveryConfig(businessId).then(setDeliveryConfig).catch(() => {});
  }, [businessId, ready]);

  useEffect(() => {
    if (!ready || !order?.customerId || !businessId) return;
    const unsub = listenCustomer(businessId, order.customerId, setCustomer);
    return () => unsub();
  }, [businessId, order?.customerId, ready]);

  // Sync production notes from order
  useEffect(() => {
    if (order?.productionNotes != null) setProductionNotes(order.productionNotes);
  }, [order?.productionNotes]);

  // Sync delivery fields from order
  useEffect(() => {
    if (order?.deliveryPartnerId != null) setDeliveryPartnerId(order.deliveryPartnerId);
    if (order?.deliveryNotes != null) setDeliveryNotes(order.deliveryNotes);
  }, [order?.deliveryPartnerId, order?.deliveryNotes]);

  // Enter edit mode – prime state from current order
  const startEditing = useCallback(() => {
    if (!order) return;
    setEditGarments(order.garments.map((g) => ({ ...g })));
    setEditDueDate(order.dueDate);
    setEditDesignNotes(order.designNotes ?? "");
    setEditTailorId(order.assignedTailorId ?? "");
    setEditingDetails(true);
  }, [order]);

  const openItemEditor = (item: OrderItem) => {
    setEditingItem(item);
    setItemDraft({ ...item });
    setItemImageFile(null);
    if (itemImagePreview) URL.revokeObjectURL(itemImagePreview);
    setItemImagePreview(null);
  };

  const saveItem = async () => {
    if (!editingItem || !order || !user || savingItem) return;
    if (!itemDraft.inventoryItemName?.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (!Number(itemDraft.quantity) || Number(itemDraft.quantity) < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    if (itemDraft.includedParts?.some((part) => !part.name.trim())) {
      toast.error("Every included piece needs a name");
      return;
    }
    setSavingItem(true);
    try {
      let referenceImageUrl = itemDraft.referenceImageUrl;
      if (itemImageFile) {
        const image = await uploadImage({
          file: itemImageFile,
          businessId,
          uploadedByUid: user.uid,
          orderId: order.id,
          customerId: itemDraft.memberCustomerId || order.customerId,
        });
        referenceImageUrl = image.url;
      }
      const recipient = customers.find((entry) => entry.id === itemDraft.memberCustomerId);
      const recipientName = recipient
        ? recipient.id === order.customerId
          ? recipient.organizationName || recipient.fullName
          : recipient.fullName
        : undefined;
      await updateOrderItem(businessId, order.id, editingItem.id, {
        itemType: itemDraft.itemType,
        inventoryItemName: itemDraft.inventoryItemName?.trim(),
        sku: itemDraft.sku?.trim() || undefined,
        categoryName: itemDraft.categoryName?.trim() || undefined,
        size: itemDraft.size?.trim() || undefined,
        color: itemDraft.color?.trim() || undefined,
        brand: itemDraft.brand?.trim() || undefined,
        quantity: Number(itemDraft.quantity),
        unit: itemDraft.unit || "pcs",
        unitPrice: Number(itemDraft.unitPrice) || 0,
        costPrice: Number(itemDraft.costPrice) || 0,
        discount: Number(itemDraft.discount) || 0,
        includedParts: (itemDraft.includedParts ?? []).map((part) => ({
          ...part,
          name: part.name.trim(),
          quantity: Math.max(1, Number(part.quantity) || 1),
          notes: part.notes?.trim() || undefined,
        })),
        measurements: itemDraft.measurements ?? undefined,
        styleNotes: itemDraft.styleNotes?.trim() || undefined,
        notes: itemDraft.notes?.trim() || undefined,
        assignedTailorId: itemDraft.assignedTailorId || undefined,
        assignedTailorName: itemDraft.assignedTailorName || undefined,
        readyDate: itemDraft.readyDate || undefined,
        status: itemDraft.status || undefined,
        memberCustomerId: recipient?.id,
        memberName: recipientName,
        referenceImageUrl: referenceImageUrl || null,
      });
      toast.success("Item updated");
      setEditingItem(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update item");
    } finally {
      setSavingItem(false);
    }
  };

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleSaveDetails = async () => {
    if (!order || savingDetails) return;
    const hasItems = (order.items?.length ?? 0) > 0;
    const validGarments = editGarments.filter((g) => g.name.trim());
    if (!hasItems && validGarments.length === 0) {
      toast.error("At least one garment is required");
      return;
    }
    const tailor = tailors.find((t) => t.uid === editTailorId);
    setSavingDetails(true);
    try {
      await updateOrderDetails(businessId, orderId, {
        dueDate: editDueDate || order.dueDate,
        designNotes: editDesignNotes,
        assignedTailorId: editTailorId || undefined,
        assignedTailorName: tailor?.displayName,
      });
      if (!hasItems) {
        await updateOrderGarments(businessId, orderId, validGarments);
      }
      toast.success("Order details updated");
      setEditingDetails(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setSavingDetails(false);
    }
  };

  const updateGarmentField = (
    index: number,
    field: keyof OrderGarmentItem,
    value: string | number
  ) => {
    const updated = [...editGarments];
    updated[index] = { ...updated[index], [field]: value };
    setEditGarments(updated);
  };

  const handleStageChange = async (stageId: string) => {
    if (!order || stageLoading) return;
    setStageLoading(stageId);
    try {
      const result = await advanceOrderStage(businessId, order, stageId, {
        actorUid: user?.uid,
        businessName: business?.name,
      });
      if (!result.ok) {
        toast.error(result.message ?? "Could not update stage");
        return;
      }
      toast.success("Stage updated");
      if (result.smsSent) toast.success("SMS sent to customer");
    } catch {
      toast.error("Could not update stage");
    } finally {
      setStageLoading(null);
    }
  };

  const handleDelaySms = async () => {
    if (!order || !expectedReadyDate || !order.customerPhone || delaySmsLoading) {
      if (!expectedReadyDate) toast.error("Select the expected ready date");
      return;
    }
    setDelaySmsLoading(true);
    const formattedDate = new Date(expectedReadyDate).toLocaleDateString("en-KE", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const reasonLine = delayReason.trim() ? `\nReason: ${delayReason.trim()}\n` : "";
    const baseMessage = `${timeGreeting()} ${order.customerName || "Customer"},\n\nYour order "${orderLabel(order)}" has been delayed.\n${reasonLine}\nNew expected completion date:\n${formattedDate}\n\nWe apologize for the inconvenience.\n\nThank you for choosing ${business?.name ?? "us"}.`;
    try {
      const { message, onboardingIncluded, customerId } = await prepareMessageWithOnboarding(businessId, order, baseMessage);
      const result = await sendSms(order.customerPhone, message, undefined, businessId);
      if (result.success) {
        await updateOrderSmsFields(businessId, orderId, {
          expectedReadyDate: new Date(expectedReadyDate).toISOString(),
          delayNotificationSentAt: new Date().toISOString(),
          delayReason: delayReason.trim() || null,
        });
        await logSmsEntry(businessId, {
          orderId, recipient: order.customerPhone, message,
          type: "delay_notification", status: "success", response: result.response,
        });
        if (onboardingIncluded) {
          await markPortalOnboardingSent(businessId, customerId).catch(() => {});
        }
        toast.success("Delay notification sent");
        setExpectedReadyDate("");
        setDelayReason("");
      } else {
        await logSmsEntry(businessId, {
          orderId, recipient: order.customerPhone, message,
          type: "delay_notification", status: "failed", response: result.error,
        });
        toast.warning("Failed to send delay notification");
      }
    } catch {
      toast.warning("Failed to send delay notification");
    } finally {
      setDelaySmsLoading(false);
    }
  };

  const handleSaveFitting = async () => {
    if (!user || !fittingNote.trim() || savingFitting) return;
    setSavingFitting(true);
    try {
      await addFittingRecord(businessId, orderId, {
        notes: fittingNote,
        byUid: user.uid,
        byName: user.displayName,
      });
      setFittingNote("");
      setShowFittingForm(false);
      toast.success("Fitting note added");
    } catch {
      toast.error("Could not save fitting note");
    } finally {
      setSavingFitting(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateOrderProductionNotes(businessId, orderId, productionNotes);
      toast.success("Production notes saved");
    } finally {
      setSavingNotes(false);
    }
  };

  const updateUsageRow = (index: number, field: keyof UsageRow, value: string | number) => {
    const updated = [...usageRows];
    if (field === "materialId") {
      const mat = materials.find((m) => m.id === value);
      updated[index] = {
        ...updated[index],
        materialId: value as string,
        materialName: mat?.name ?? "",
        unit: mat?.unitName ?? "",
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setUsageRows(updated);
  };

  const handleRecordUsage = async () => {
    if (!user || recordingUsage) return;
    const valid = usageRows.filter((r) => r.materialId && r.quantityUsed > 0);
    if (valid.length === 0) {
      toast.error("Add at least one material with quantity");
      return;
    }
    setRecordingUsage(true);
    try {
      await recordMaterialUsage(
        businessId, orderId,
        valid.map((r) => ({
          materialId: r.materialId, materialName: r.materialName,
          quantityUsed: r.quantityUsed, unit: r.unit,
          recordedByUid: user.uid, recordedByName: user.displayName,
        })),
        { uid: user.uid, name: user.displayName }
      );
      if (order) await notifyMaterialsConsumed(businessId, order.orderNumber, orderId, user.uid);
      setUsageRows([{ materialId: "", materialName: "", quantityUsed: 0, unit: "" }]);
      setShowUsageForm(false);
      toast.success("Material usage recorded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record material usage");
    } finally {
      setRecordingUsage(false);
    }
  };

  // ── delivery / returns / cancellation handlers ───────────────────────────────

  const handleSaveDeliveryDetails = async () => {
    if (!order || !deliveryConfig) return;
    setDeliveryAdvancing(true);
    try {
      await updateOrderDetails(businessId, orderId, {
        deliveryMethod: order.deliveryMethod ?? "delivery",
        deliveryFee: order.deliveryMethod === "delivery" ? (order.deliveryFee ?? 0) : 0,
        deliveryAddress: order.deliveryAddress ?? "",
        deliveryPartnerId,
        deliveryPartnerName: deliveryPartners.find((p) => p.id === deliveryPartnerId)?.name ?? "",
        deliveryNotes,
      });
      toast.success("Delivery details updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update delivery details");
    } finally {
      setDeliveryAdvancing(false);
    }
  };

  const handleAdvanceDelivery = async (target: DeliveryStage) => {
    if (!order || deliveryAdvancing) return;
    setDeliveryAdvancing(true);
    try {
      const result = await advanceOrderDelivery(businessId, order, { stage: target });
      if (result.ok && result.smsSent) toast.success("Stage updated — customer notified via SMS");
      else if (result.ok) toast.success("Delivery stage updated");
      else toast.error(result.message ?? "Could not update delivery stage");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update delivery stage");
    } finally {
      setDeliveryAdvancing(false);
    }
  };

  const handleCreateReturn = async () => {
    if (!order || !user || creatingReturn) return;
    if (!returnReason.trim()) {
      toast.error("Choose a return reason");
      return;
    }
    if (order.deliveryStage !== "delivered" && order.deliveryStage !== "picked_by_customer") {
      toast.error("Only delivered orders can be returned");
      return;
    }
    const reason = DEFAULT_RETURN_REASONS.find((r) => r.key === returnReason);
    setCreatingReturn(true);
    try {
      await createOrderReturn(businessId, orderId, {
        reason: returnReason,
        reasonLabel: reason?.label ?? returnReason,
        notes: returnNotes,
        additionalCharge: returnCharge || 0,
        expectedCompletionDate: returnExpectedDate || null,
        handledByUid: user.uid,
        handledByName: user.displayName || "Staff",
      });
      setShowReturnForm(false);
      setReturnReason("");
      setReturnNotes("");
      setReturnCharge(0);
      setReturnExpectedDate("");
      toast.success("Return initiated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not initiate return");
    } finally {
      setCreatingReturn(false);
    }
  };

  const handleAdvanceReturn = async (returnId: string, status: ReturnStatus) => {
    if (!order || advancingReturnId) return;
    setAdvancingReturnId(returnId);
    try {
      await updateOrderReturnStatus(businessId, orderId, returnId, status);
      toast.success("Return status updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update return status");
    } finally {
      setAdvancingReturnId(null);
    }
  };

  const handleDeleteReturn = async (returnId: string) => {
    if (!order) return;
    try {
      await deleteOrderReturn(businessId, orderId, returnId);
      toast.success("Return removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove return");
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !user || cancelling) return;
    if (!cancelReason.trim()) {
      toast.error("Reason is required to cancel");
      return;
    }
    setCancelling(true);
    try {
      await cancelOrder(businessId, orderId, {
        reason: cancelReason,
        reasonLabel: cancelReason,
        notes: cancelNotes,
        cancelledBy: "customer",
        actorUid: user.uid,
        actorName: user.displayName || "Staff",
        refundStatus: cancelRefundStatus,
        refundAmount: cancelRefundStatus === "none" ? 0 : cancelRefundAmount || order.amountPaid,
        cancellationFee: cancelFee || 0,
      });
      setShowCancelDialog(false);
      setCancelReason("");
      setCancelNotes("");
      setCancelRefundStatus("none");
      setCancelRefundAmount(0);
      setCancelFee(0);
      toast.success("Order cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel order");
    } finally {
      setCancelling(false);
    }
  };

  // ── render guards ────────────────────────────────────────────────────────────

  if (!ready || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600 mb-4" />
        <p className="text-sm text-slate-500">Loading order…</p>
      </div>
    );
  }

  // ── derived values ───────────────────────────────────────────────────────────

  const orderImages: string[] = order.imageUrls ?? [];
  const activeStages = stages.filter((s) => s.isActive);
  const currentStageId =
    order.currentStageId ??
    activeStages.find((s) => s.name.trim().toLowerCase() === order.stage.replaceAll("_", " "))?.id ??
    (order.stage === "delivered"
      ? activeStages.find((s) => s.milestone === "delivered")?.id
      : order.stage === "ready_for_pickup"
      ? activeStages.find((s) => s.milestone === "ready_for_pickup")?.id
      : undefined);
  const completedStageIds = new Set(order.completedStageIds ?? []);
  const materialOptions: SearchableOption[] = materials.map((m) => ({
    value: m.id,
    label: `${m.name} (${m.quantity} ${m.unitName} avail.)`,
  }));

  const paymentBadgeVariant =
    order.paymentStatus === "paid" ? "success" :
    order.paymentStatus === "partial" ? "warning" : "danger";

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Image lightbox */}
      {lightboxIndex !== null && orderImages.length > 0 && (
        <ImageLightbox
          images={orderImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
      {itemLightboxUrl && (
        <ImageLightbox
          images={[itemLightboxUrl]}
          index={0}
          onClose={() => setItemLightboxUrl(null)}
          onNavigate={() => {}}
        />
      )}

      {/* Printable receipt */}
      <Dialog open={Boolean(editingItem)} onClose={() => !savingItem && setEditingItem(null)} title="Edit order item" className="max-w-2xl">
        {editingItem && (
          <div className="space-y-4 p-5">
            <p className="text-sm text-slate-500">Changes here affect only this item. Its recipient, price, notes and reference image are independent of the rest of the order.</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Item type</label>
                <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={itemDraft.itemType ?? "tailored"} onChange={(e) => setItemDraft((draft) => ({ ...draft, itemType: e.target.value as OrderItemType }))}>
                  {Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              {order?.isGroupOrder && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Receiving person / account</label>
                  <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={itemDraft.memberCustomerId ?? ""} onChange={(e) => setItemDraft((draft) => ({ ...draft, memberCustomerId: e.target.value || undefined }))}>
                    <option value="">Choose recipient</option>
                    {customers.filter((entry) => entry.id === order.customerId || entry.parentCustomerId === order.customerId).map((entry) => <option key={entry.id} value={entry.id}>{entry.id === order.customerId ? `${entry.organizationName || entry.fullName} (group account)` : entry.fullName}</option>)}
                  </select>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Item name</label>
                <Input value={itemDraft.inventoryItemName ?? ""} onChange={(e) => setItemDraft((draft) => ({ ...draft, inventoryItemName: e.target.value }))} />
              </div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">SKU</label><Input value={itemDraft.sku ?? ""} onChange={(e) => setItemDraft((draft) => ({ ...draft, sku: e.target.value }))} /></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Category</label><Input value={itemDraft.categoryName ?? ""} onChange={(e) => setItemDraft((draft) => ({ ...draft, categoryName: e.target.value }))} /></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Size</label><Input value={itemDraft.size ?? ""} onChange={(e) => setItemDraft((draft) => ({ ...draft, size: e.target.value }))} /></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Color</label><Input value={itemDraft.color ?? ""} onChange={(e) => setItemDraft((draft) => ({ ...draft, color: e.target.value }))} /></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Brand</label><Input value={itemDraft.brand ?? ""} onChange={(e) => setItemDraft((draft) => ({ ...draft, brand: e.target.value }))} /></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Quantity</label><Input type="number" min={1} value={itemDraft.quantity ?? 1} onChange={(e) => setItemDraft((draft) => ({ ...draft, quantity: Number(e.target.value) }))} /></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Unit</label><Input value={itemDraft.unit ?? "pcs"} onChange={(e) => setItemDraft((draft) => ({ ...draft, unit: e.target.value }))} /></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Unit price (KES)</label><Input type="number" min={0} value={itemDraft.unitPrice ?? 0} onChange={(e) => setItemDraft((draft) => ({ ...draft, unitPrice: Number(e.target.value) }))} /></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Cost price (KES)</label><Input type="number" min={0} value={itemDraft.costPrice ?? 0} onChange={(e) => setItemDraft((draft) => ({ ...draft, costPrice: Number(e.target.value) }))} /></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Discount (KES)</label><Input type="number" min={0} value={itemDraft.discount ?? 0} onChange={(e) => setItemDraft((draft) => ({ ...draft, discount: Number(e.target.value) }))} /></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Ready date</label><Input type="date" value={itemDraft.readyDate?.slice(0, 10) ?? ""} onChange={(e) => setItemDraft((draft) => ({ ...draft, readyDate: e.target.value }))} /></div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Assigned tailor</label>
                <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={itemDraft.assignedTailorId ?? ""} onChange={(e) => { const id = e.target.value; const tailor = tailors.find((t) => t.uid === id); setItemDraft((draft) => ({ ...draft, assignedTailorId: id || undefined, assignedTailorName: tailor?.displayName || undefined })); }}>
                  <option value="">Unassigned</option>
                  {tailors.map((tailor) => <option key={tailor.uid} value={tailor.uid}>{tailor.displayName}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
                <Input value={itemDraft.status ?? ""} onChange={(e) => setItemDraft((draft) => ({ ...draft, status: e.target.value }))} placeholder="e.g. active" />
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <Layers className="h-4 w-4 text-emerald-700" /> Included pieces
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">Non-priced pieces inside this package/set.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItemDraft((draft) => ({
                    ...draft,
                    includedParts: [...(draft.includedParts ?? []), { id: crypto.randomUUID(), name: "", quantity: 1 }],
                  }))}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add piece
                </Button>
              </div>
              {(itemDraft.includedParts?.length ?? 0) === 0 ? (
                <p className="mt-3 text-xs text-slate-500">No included pieces. This is a normal single item.</p>
              ) : (
                <div className="mt-3 grid gap-2">
                  {itemDraft.includedParts?.map((part) => (
                    <div key={part.id} className="grid gap-2 rounded-lg border border-emerald-100 bg-white p-2 sm:grid-cols-[minmax(0,1fr)_80px_minmax(0,1fr)_40px] sm:items-center">
                      <Input value={part.name} placeholder="Piece name" onChange={(e) => setItemDraft((draft) => ({ ...draft, includedParts: draft.includedParts?.map((entry) => entry.id === part.id ? { ...entry, name: e.target.value } : entry) }))} />
                      <Input type="number" min={1} value={part.quantity} aria-label="Quantity per set" onChange={(e) => setItemDraft((draft) => ({ ...draft, includedParts: draft.includedParts?.map((entry) => entry.id === part.id ? { ...entry, quantity: Number(e.target.value) } : entry) }))} />
                      <Input value={part.notes ?? ""} placeholder="Details (optional)" onChange={(e) => setItemDraft((draft) => ({ ...draft, includedParts: draft.includedParts?.map((entry) => entry.id === part.id ? { ...entry, notes: e.target.value } : entry) }))} />
                      <Button type="button" variant="outline" size="icon" aria-label={`Remove ${part.name || "piece"}`} onClick={() => setItemDraft((draft) => ({ ...draft, includedParts: draft.includedParts?.filter((entry) => entry.id !== part.id) }))}>
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div><label className="mb-1 block text-xs font-medium text-slate-600">Measurements (cm — one "key: value" per line)</label><Textarea rows={3} value={Object.entries(itemDraft.measurements ?? {}).map(([k, v]) => `${k}: ${String(v)}`).join("\n")} onChange={(e) => { const parsed: Record<string, number> = {}; for (const line of e.target.value.split("\n")) { const [k, v] = line.split(":"); if (k?.trim() && v !== undefined) { const num = Number(v.trim()); if (!Number.isNaN(num)) parsed[k.trim()] = num; } } setItemDraft((draft) => ({ ...draft, measurements: Object.keys(parsed).length > 0 ? parsed : undefined })); }} /></div>
            <div><label className="mb-1 block text-xs font-medium text-slate-600">Style details</label><Textarea rows={3} value={itemDraft.styleNotes ?? ""} onChange={(e) => setItemDraft((draft) => ({ ...draft, styleNotes: e.target.value }))} /></div>
            <div><label className="mb-1 block text-xs font-medium text-slate-600">Internal notes</label><Textarea rows={2} value={itemDraft.notes ?? ""} onChange={(e) => setItemDraft((draft) => ({ ...draft, notes: e.target.value }))} /></div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Reference image</label>
              {(itemImagePreview || itemDraft.referenceImageUrl) ? (
                <button
                  type="button"
                  onClick={() => setItemLightboxUrl(itemImagePreview || itemDraft.referenceImageUrl!)}
                  className="group relative mb-2 block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 hover:border-emerald-400 transition-colors"
                >
                  <img
                    src={itemImagePreview || itemDraft.referenceImageUrl!}
                    alt="Item reference"
                    className="mx-auto max-h-64 w-full object-contain"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
                    <span className="scale-0 group-hover:scale-100 transition-transform duration-200 text-white font-medium text-xs bg-black/60 px-2 py-1 rounded-md">View</span>
                  </div>
                </button>
              ) : (
                <p className="mb-2 text-xs text-slate-400">No image attached.</p>
              )}
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  className="flex-1"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (itemImagePreview) URL.revokeObjectURL(itemImagePreview);
                    setItemImagePreview(file ? URL.createObjectURL(file) : null);
                    setItemImageFile(file);
                  }}
                />
                {itemDraft.referenceImageUrl && (
                  <button type="button" onClick={() => setItemDraft((draft) => ({ ...draft, referenceImageUrl: null }))} className="text-rose-600 hover:underline text-xs">Remove image</button>
                )}
              </div>
              {itemImageFile && <p className="mt-1 text-xs text-slate-500">New: {itemImageFile.name}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="outline" disabled={savingItem} onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button disabled={savingItem} onClick={saveItem}><Save className="mr-1.5 h-4 w-4" />{savingItem ? "Saving…" : "Save item"}</Button>
            </div>
          </div>
        )}
      </Dialog>

      {showReceipt && business && (
        <Dialog open={showReceipt} onClose={() => setShowReceipt(false)} className="max-w-xl p-0">
          <OrderReceipt order={order} business={business} onClose={() => setShowReceipt(false)} />
        </Dialog>
      )}

      {/* Start return dialog */}
      {showReturnForm && (
        <Dialog open={showReturnForm} onClose={() => setShowReturnForm(false)} className="max-w-lg">
          <div className="p-5 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Start Return</h3>
              <p className="text-sm text-slate-500 mt-0.5">Begin an alteration / remake cycle on this delivered order.</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Reason</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select a reason…</option>
                {DEFAULT_RETURN_REASONS.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Notes</label>
              <Textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                rows={2}
                placeholder="What needs fixing? Any customer context…"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Additional Charge (KES)</label>
                <Input
                  type="number"
                  min={0}
                  value={returnCharge || ""}
                  onChange={(e) => setReturnCharge(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Expected Ready Date</label>
                <Input
                  type="date"
                  value={returnExpectedDate}
                  onChange={(e) => setReturnExpectedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" disabled={creatingReturn} onClick={handleCreateReturn}>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                {creatingReturn ? "Starting…" : "Start Return"}
              </Button>
              <Button variant="outline" onClick={() => setShowReturnForm(false)} disabled={creatingReturn}>
                <X className="h-4 w-4 mr-1.5" /> Cancel
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Cancel order dialog */}
      {showCancelDialog && (
        <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)} className="max-w-lg">
          <div className="p-5 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Cancel Order {order.orderNumber}</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                The order is never deleted. A cancellation record is kept for audit.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Reason *</label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer changed their mind"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Notes</label>
              <Textarea
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                rows={2}
                placeholder="Additional context…"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Refund</label>
              <div className="flex gap-2">
                {(["none", "pending", "refunded"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setCancelRefundStatus(s)}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors",
                      cancelRefundStatus === s
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    {s === "none" ? "No refund" : s === "pending" ? "Refund pending" : "Refunded"}
                  </button>
                ))}
              </div>
            </div>

            {cancelRefundStatus !== "none" && (
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Refund Amount (KES)</label>
                <Input
                  type="number"
                  min={0}
                  value={cancelRefundAmount || ""}
                  onChange={(e) => setCancelRefundAmount(Number(e.target.value))}
                  placeholder={String(order.amountPaid)}
                />
                <p className="text-[11px] text-slate-400 mt-1">Paid so far: {formatKes(order.amountPaid)}</p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Cancellation Fee (KES)</label>
              <Input
                type="number"
                min={0}
                value={cancelFee || ""}
                onChange={(e) => setCancelFee(Number(e.target.value))}
                placeholder="0"
              />
              <p className="text-[11px] text-slate-400 mt-1">If charged, the fee becomes the new outstanding balance.</p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" variant="danger" disabled={cancelling} onClick={handleCancelOrder}>
                <Ban className="h-4 w-4 mr-1.5" />
                {cancelling ? "Cancelling…" : "Cancel Order"}
              </Button>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={cancelling}>
                <X className="h-4 w-4 mr-1.5" /> Keep Order
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      <div className="space-y-4 pb-10">
        {/* ── Page Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href="/orders" className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Orders
              </Link>
              <span>/</span>
              <span className="text-slate-700 font-medium truncate">{order.orderNumber}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
              {order.customerName}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Order {order.orderNumber}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowReceipt(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#16265c] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0f1c46]"
            >
              <ReceiptIcon className="h-3.5 w-3.5" />
              Invoice / Receipt
            </button>
            {!order.isCancelled && order.deliveryStage !== "delivered" && order.deliveryStage !== "picked_by_customer" && (
              <button
                onClick={() => setShowCancelDialog(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <Ban className="h-3.5 w-3.5" />
                Cancel Order
              </button>
            )}
            {order.isCancelled && (
              <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                <Ban className="h-3 w-3 mr-1" /> Cancelled
              </span>
            )}
            <Badge className={cn("capitalize text-white border-0", stageColor(order.stage))}>
              {order.stage.replaceAll("_", " ")}
            </Badge>
            <Badge variant={paymentBadgeVariant as "success" | "warning" | "danger"} className="capitalize">
              {order.paymentStatus.replaceAll("_", " ")}
            </Badge>
            {order.balanceAmount > 0 && (
              <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-600">
                Bal: {formatKes(order.balanceAmount)}
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              Due {new Date(order.dueDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* ── Main Layout ── */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* LEFT COLUMN */}
          <div className="space-y-4 lg:col-span-2">

            {/* ORDER DETAILS */}
            <Section
              title="Order Details"
              icon={<Shirt className="h-4 w-4" />}
              action={
                !editingDetails ? (
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                ) : null
              }
            >
              {!editingDetails ? (
                /* ── View mode ── */
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Due Date</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(order.dueDate).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    {order.assignedTailorName && (
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Assigned Tailor</p>
                        <p className="text-sm font-semibold text-slate-800">{order.assignedTailorName}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Amount</p>
                      <p className="text-lg font-bold text-slate-900">{formatKes(order.subtotalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Payment progress</p>
                      <p className="text-sm text-slate-700">
                        Total paid: <span className="font-semibold text-emerald-600">{formatKes(order.amountPaid)}</span>
                        {order.balanceAmount > 0 && (
                          <> · Balance: <span className="font-semibold text-rose-600">{formatKes(order.balanceAmount)}</span></>
                        )}
                      </p>
                      {order.payerName && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                          <Banknote className="h-3.5 w-3.5 text-slate-400" />
                          Paid by:{" "}
                          {order.payerCustomerId && order.payerCustomerId !== order.customerId ? (
                            <Link href={`/customers/${order.payerCustomerId}`} className="font-medium text-emerald-700 hover:underline">
                              {order.payerName}
                            </Link>
                          ) : (
                            <span className="font-medium text-slate-800">{order.payerName}</span>
                          )}
                        </p>
                      )}
                      {order.isGroupOrder && order.representativeName && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          Representative:{" "}
                          {order.representativeCustomerId ? (
                            <Link href={`/customers/${order.representativeCustomerId}`} className="font-medium text-emerald-700 hover:underline">
                              {order.representativeName}
                            </Link>
                          ) : (
                            <span className="font-medium text-slate-800">{order.representativeName}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order items */}
                  {(order.items && order.items.length > 0) ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Order Items</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {ORDER_TYPE_LABELS[order.orderType || "tailoring"]}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-start justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <p className="font-medium text-slate-800 text-sm">
                                  {item.inventoryItemName || "Untitled item"} <span className="text-slate-400">× {item.quantity}</span>
                                </p>
                                <Badge variant="default" className={cn("text-[10px]", ITEM_TYPE_BADGE[item.itemType])}>
                                  {ITEM_TYPE_LABELS[item.itemType]}
                                </Badge>
                                {item.sku && <span className="text-[11px] font-mono text-slate-400">{item.sku}</span>}
                              </div>
                              {(item.size || item.color || item.brand) && (
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {[item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`, item.brand && `Brand: ${item.brand}`].filter(Boolean).join(" · ")}
                                </p>
                              )}
                              {(item.includedParts?.length ?? 0) > 0 && (
                                <div className="mt-2 rounded-lg border border-emerald-100 bg-white px-2.5 py-2">
                                  <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                                    <Layers className="h-3 w-3" /> Included in this price
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {item.includedParts?.map((part) => (
                                      <span key={part.id} className="rounded-md bg-emerald-50 px-2 py-1 text-xs text-slate-700" title={part.notes}>
                                        {part.quantity}× {part.name}{part.notes ? ` · ${part.notes}` : ""}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {item.measurements && Object.keys(item.measurements).length > 0 && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {Object.entries(item.measurements).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                {item.stage && (
                                  <span className="flex items-center gap-1 text-[11px] text-slate-500 capitalize">
                                    <span className={cn("h-1.5 w-1.5 rounded-full", stageColor(item.stage))} />
                                    {item.stage.replace(/_/g, " ")}
                                  </span>
                                )}
                                {item.deliveryStatus && (
                                  <span className="flex items-center gap-1 text-[11px] text-slate-500 capitalize">
                                    <Package className="h-3 w-3" /> {item.deliveryStatus.replace(/_/g, " ")}
                                  </span>
                                )}
                                {item.assignedTailorName && (
                                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                    <User className="h-3 w-3" /> {item.assignedTailorName}
                                  </span>
                                )}
                                {item.memberCustomerId && (
                                  <Link
                                    href={`/customers/${item.memberCustomerId}`}
                                    className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline"
                                  >
                                    <User className="h-3 w-3" /> Recipient: {item.memberName || "View profile"}
                                  </Link>
                                )}
                              </div>
                              {item.referenceImageUrl && (
                                <button
                                  onClick={() => setItemLightboxUrl(item.referenceImageUrl!)}
                                  className="group mt-2 block w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:border-emerald-400 transition-colors"
                                >
                                  <img
                                    src={item.referenceImageUrl}
                                    alt={`${item.inventoryItemName || "Item"} reference`}
                                    className="h-12 w-16 object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                </button>
                              )}
                            </div>
                            <div className="flex shrink-0 items-start gap-2 ml-3">
                              <div className="text-right">
                              <p className="font-semibold text-slate-700 text-sm">{formatKes(item.unitPrice)}</p>
                              {item.quantity > 1 && (
                                <p className="text-[11px] text-slate-400">{formatKes(item.totalAmount)} total</p>
                              )}
                              </div>
                              <button onClick={() => openItemEditor(item)} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-emerald-300 hover:text-emerald-700" aria-label={`Edit ${item.inventoryItemName || "item"}`}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Garments</p>
                      <div className="space-y-2">
                        {order.garments.map((g, i) => (
                          <div key={i} className="flex items-start justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-800 text-sm">{g.name} <span className="text-slate-400">× {g.quantity}</span></p>
                              {g.styleNotes && <p className="text-xs text-slate-500 mt-0.5">{g.styleNotes}</p>}
                            </div>
                            <p className="font-semibold text-slate-700 text-sm ml-3 shrink-0">{formatKes(g.agreedPrice)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Design notes */}
                  {order.designNotes && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Design Notes</p>
                      <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5 whitespace-pre-line">
                        {order.designNotes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Edit mode ── */
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Due Date</label>
                      <Input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Assigned tailor</label>
                      <select
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                        value={editTailorId}
                        onChange={(e) => setEditTailorId(e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {tailors.map((tailor) => (
                          <option key={tailor.uid} value={tailor.uid}>{tailor.displayName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(order.items?.length ?? 0) === 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-2">Garments</p>
                      <div className="space-y-2">
                        {editGarments.map((g, i) => (
                          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <Input
                                  placeholder="Garment name"
                                  value={g.name}
                                  onChange={(e) => updateGarmentField(i, "name", e.target.value)}
                                />
                              </div>
                              <Input
                                type="number"
                                placeholder="Qty"
                                min={1}
                                value={g.quantity}
                                onChange={(e) => updateGarmentField(i, "quantity", Number(e.target.value))}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                placeholder="Price (KES)"
                                step="0.01"
                                value={g.agreedPrice || ""}
                                onChange={(e) => updateGarmentField(i, "agreedPrice", Number(e.target.value))}
                              />
                              <Input
                                placeholder="Style notes (optional)"
                                value={g.styleNotes ?? ""}
                                onChange={(e) => updateGarmentField(i, "styleNotes", e.target.value)}
                              />
                            </div>
                            {editGarments.length > 1 && (
                              <button
                                onClick={() => setEditGarments(editGarments.filter((_, idx) => idx !== i))}
                                className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Remove garment
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full"
                        onClick={() => setEditGarments([...editGarments, { name: "", quantity: 1, agreedPrice: 0 }])}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add garment
                      </Button>
                    </div>
                  )}

                  {(order.items?.length ?? 0) > 0 && (
                    <p className="text-xs text-slate-500 rounded-xl bg-slate-50 px-3 py-2.5">
                      Line items are edited independently — use the edit button next to each item in the list below.
                    </p>
                  )}

                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Design Notes</label>
                    <Textarea
                      placeholder="Design instructions, style details..."
                      value={editDesignNotes}
                      onChange={(e) => setEditDesignNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      className="flex-1"
                      disabled={savingDetails}
                      onClick={handleSaveDetails}
                    >
                      <Save className="h-4 w-4 mr-1.5" />
                      {savingDetails ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingDetails(false)}
                      disabled={savingDetails}
                    >
                      <X className="h-4 w-4 mr-1.5" /> Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Section>

            {/* DELIVERY */}
            <Section
              title="Delivery"
              icon={<Truck className="h-4 w-4" />}
              count={order.deliveryTimeline?.length ?? 0}
              defaultOpen
            >
              {order.isCancelled ? (
                <p className="text-sm text-slate-500">This order was cancelled.</p>
              ) : (
                <div className="space-y-4">
                  {/* fulfilment summary */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Fulfilment</p>
                      {order.deliveryMethod === "delivery" ? (
                        <p className="text-sm font-semibold text-slate-800">
                          Home Delivery
                          {order.deliveryFee ? ` · ${formatKes(order.deliveryFee)}` : " · Free"}
                        </p>
                      ) : (
                        <p className="text-sm font-semibold text-slate-800">Customer Pickup</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Courier / Partner</p>
                      <p className="text-sm text-slate-700">
                        {order.deliveryPartnerName || (order.deliveryMethod === "delivery" ? "Not assigned" : "—")}
                      </p>
                    </div>
                  </div>

                  {order.deliveryMethod === "delivery" && order.deliveryAddress && (
                    <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                      <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-600">{order.deliveryAddress}</p>
                    </div>
                  )}

                  {/* stage progress */}
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Progress</p>
                    <div className="space-y-1.5">
                      {(order.deliveryMethod === "delivery" ? COURIER_FLOW_UI : PICKUP_FLOW_UI).map((s) => {
                        const idx = (order.deliveryMethod === "delivery" ? COURIER_FLOW_UI : PICKUP_FLOW_UI).indexOf(s);
                        const currentIdx = (order.deliveryMethod === "delivery" ? COURIER_FLOW_UI : PICKUP_FLOW_UI).indexOf(order.deliveryStage ?? "pending");
                        const isDone = order.deliveryStage === s || (currentIdx > idx && currentIdx !== -1);
                        const isCurrent = order.deliveryStage === s;
                        const next = nextDeliveryStages(order.deliveryStage ?? "pending", order.deliveryMethod ?? "delivery");
                        return (
                          <div key={s} className="flex items-center gap-2">
                            <span className={cn("h-2 w-2 rounded-full shrink-0", isDone ? DELIVERY_STAGE_COLORS[s] : "bg-slate-200")} />
                            <span className={cn("text-sm flex-1", isCurrent ? "font-semibold text-slate-900" : isDone ? "text-slate-700" : "text-slate-400")}>
                              {DELIVERY_STAGE_LABELS[s]}
                            </span>
                            {isCurrent && next.length > 0 && (
                              <button
                                onClick={() => handleAdvanceDelivery(next[0])}
                                disabled={deliveryAdvancing}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                              >
                                {deliveryAdvancing ? "Updating…" : `Move to ${DELIVERY_STAGE_LABELS[next[0]]}`}
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {(order.deliveryStage === "delivered" || order.deliveryStage === "picked_by_customer") && (
                        <p className="text-xs text-emerald-600 font-medium mt-1">
                          ✓ Delivered {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* assign partner + notes */}
                  {order.deliveryMethod === "delivery" && (
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Assign Courier / Partner</label>
                        <SearchableSelect
                          options={deliveryPartners
                            .filter((p) => p.isActive)
                            .map((p) => ({ value: p.id, label: p.name }))}
                          value={deliveryPartnerId}
                          onChange={setDeliveryPartnerId}
                          placeholder="Select partner"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Delivery Notes</label>
                        <Textarea
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          rows={2}
                          placeholder="Handover instructions, gate access, preferred time…"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deliveryAdvancing}
                        onClick={handleSaveDeliveryDetails}
                      >
                        <Save className="h-3.5 w-3.5 mr-1.5" /> Save Delivery Details
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* RETURNS & ALTERATIONS */}
            <Section
              title="Returns & Alterations"
              icon={<RotateCcw className="h-4 w-4" />}
              count={returns.length}
            >
              <div className="space-y-3">
                {(order.deliveryStage === "delivered" || order.deliveryStage === "picked_by_customer") && !order.isCancelled && (
                  <Button size="sm" onClick={() => setShowReturnForm(true)}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Start Return
                  </Button>
                )}

                {returns.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {order.deliveryStage === "delivered" || order.deliveryStage === "picked_by_customer"
                      ? "No returns yet. Return the order to start an alteration or remake cycle."
                      : "Returns are available once the order is delivered."}
                  </p>
                ) : (
                  returns.map((r) => (
                    <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{r.reasonLabel || r.reason}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(r.returnedAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                            {r.handledByName ? ` · by ${r.handledByName}` : ""}
                          </p>
                        </div>
                        <Badge className={cn("text-[10px] capitalize border-0", r.status === "completed" ? "bg-green-600" : r.status === "returned" ? "bg-amber-500" : "bg-sky-500")}>
                          {RETURN_STATUS_LABELS[r.status]}
                        </Badge>
                      </div>

                      {r.notes && <p className="text-sm text-slate-600 whitespace-pre-line bg-slate-50 rounded-lg px-2.5 py-1.5">{r.notes}</p>}

                      {r.additionalCharge > 0 && (
                        <p className="text-xs text-slate-600">Additional charge: <span className="font-semibold text-slate-800">{formatKes(r.additionalCharge)}</span></p>
                      )}
                      {r.expectedCompletionDate && (
                        <p className="text-xs text-slate-500">Expected ready: {new Date(r.expectedCompletionDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</p>
                      )}

                      {r.status !== "completed" && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={advancingReturnId === r.id}
                            onClick={() => handleAdvanceReturn(r.id, "inspection")}
                          >
                            Inspect
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={advancingReturnId === r.id}
                            onClick={() => handleAdvanceReturn(r.id, "alteration")}
                          >
                            Alter / Remake
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={advancingReturnId === r.id}
                            onClick={() => handleAdvanceReturn(r.id, "quality_check")}
                          >
                            Quality Check
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={advancingReturnId === r.id}
                            onClick={() => handleAdvanceReturn(r.id, "ready_for_pickup")}
                          >
                            Ready
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={advancingReturnId === r.id}
                            onClick={() => handleAdvanceReturn(r.id, "completed")}
                          >
                            Completed
                          </Button>
                          <button
                            onClick={() => handleDeleteReturn(r.id)}
                            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                            title="Remove return"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Section>

            {/* CUSTOMER INFO */}
            <Section title="Customer" icon={<User className="h-4 w-4" />}>
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Name</p>
                    <p className="text-sm font-semibold text-slate-800">{order.customerName}</p>
                  </div>
                  {order.customerPhone && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Phone</p>
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {order.customerPhone}
                      </a>
                    </div>
                  )}
                  {customer?.email && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Email</p>
                      <a
                        href={`mailto:${customer.email}`}
                        className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {customer.email}
                      </a>
                    </div>
                  )}
                </div>

                {customer?.preferences && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Preferences</p>
                    <p className="text-sm text-slate-700 bg-emerald-50 rounded-xl px-3 py-2.5 whitespace-pre-line border border-emerald-100">
                      {customer.preferences}
                    </p>
                  </div>
                )}

                {customer?.notes && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-sm text-slate-700 bg-amber-50 rounded-xl px-3 py-2.5 whitespace-pre-line border border-amber-100">
                      {customer.notes}
                    </p>
                  </div>
                )}

                {customer && (
                  <a
                    href={`/customers/${customer.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
                  >
                    View full customer profile →
                  </a>
                )}
              </div>
            </Section>

            {/* REFERENCE IMAGES */}
            {orderImages.length > 0 && (
              <Section
                title="Reference Images"
                icon={<ImageIcon className="h-4 w-4" />}
                count={orderImages.length}
                defaultOpen
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {orderImages.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxIndex(i)}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 hover:border-emerald-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                    >
                      <img
                        src={url}
                        alt={`Reference ${i + 1}`}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
                        <span className="scale-0 group-hover:scale-100 transition-transform duration-200 text-white font-medium text-xs bg-black/60 px-2 py-1 rounded-md">
                          View
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {/* FABRIC SELECTIONS */}
            {order.fabricSelections && order.fabricSelections.length > 0 && (
              <Section
                title="Fabric Selections"
                icon={<Layers className="h-4 w-4" />}
                count={order.fabricSelections.length}
                defaultOpen
              >
                <div className="space-y-2">
                  {order.fabricSelections.map((fab, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{fab.materialName}</p>
                        {fab.color && <p className="text-xs text-slate-500">Color: {fab.color}</p>}
                      </div>
                      <p className="text-sm font-semibold text-slate-700 shrink-0">{fab.metersRequired} m</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* FITTINGS */}
            <Section
              title="Fittings & Adjustments"
              icon={<Scissors className="h-4 w-4" />}
              count={order.fittingRecords?.length ?? 0}
            >
              <div className="space-y-3">
                {(order.fittingRecords?.length ?? 0) === 0 && (
                  <p className="text-sm text-slate-400 text-center py-3">No fitting records yet.</p>
                )}
                {order.fittingRecords?.map((record, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-sm text-slate-800 whitespace-pre-line">{record.notes}</p>
                    {record.adjustmentSummary && (
                      <p className="text-xs text-slate-500 mt-1 italic">{record.adjustmentSummary}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-slate-400">{record.byName}</p>
                      {record.date && (
                        <p className="text-xs text-slate-400">
                          {new Date(record.date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {showFittingForm ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                    <Textarea
                      placeholder="Fitting notes — what was adjusted, measurements taken, feedback..."
                      value={fittingNote}
                      onChange={(e) => setFittingNote(e.target.value)}
                      rows={3}
                      className="bg-white"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={savingFitting || !fittingNote.trim()}
                        onClick={handleSaveFitting}
                      >
                        {savingFitting ? "Saving…" : "Save Note"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setShowFittingForm(false); setFittingNote(""); }}
                        disabled={savingFitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowFittingForm(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Fitting Note
                  </Button>
                )}
              </div>
            </Section>

            {/* PRODUCTION NOTES */}
            <Section
              title="Production Notes"
              icon={<ClipboardList className="h-4 w-4" />}
              defaultOpen={!!order.productionNotes}
            >
              <div className="space-y-2">
                <Textarea
                  placeholder="Cutting notes, stitching details, pending blockers, special instructions..."
                  value={productionNotes}
                  onChange={(e) => setProductionNotes(e.target.value)}
                  rows={4}
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={savingNotes}
                  onClick={handleSaveNotes}
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {savingNotes ? "Saving…" : "Save Notes"}
                </Button>
              </div>
            </Section>

            {/* MATERIALS USED */}
            <Section
              title="Materials Used"
              icon={<Package className="h-4 w-4" />}
              count={order.materialUsage?.length ?? 0}
              defaultOpen={(order.materialUsage?.length ?? 0) > 0}
            >
              <div className="space-y-3">
                {(order.materialUsage?.length ?? 0) === 0 && !showUsageForm && (
                  <p className="text-sm text-slate-400 text-center py-2">No materials recorded yet.</p>
                )}

                {(order.materialUsage?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    {order.materialUsage.map((usage, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 truncate">{usage.materialName}</p>
                          <p className="text-xs text-slate-400">By {usage.recordedByName}</p>
                        </div>
                        <p className="text-sm font-bold text-emerald-700 ml-3 shrink-0">
                          {usage.quantityUsed} {usage.unit}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {showUsageForm ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-3">
                    <p className="text-xs font-medium text-slate-600">Record materials consumed for this order</p>
                    {usageRows.map((row, index) => (
                      <div key={index} className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <SearchableSelect
                              options={materialOptions}
                              value={row.materialId}
                              onChange={(v) => updateUsageRow(index, "materialId", v)}
                              placeholder="Select material"
                            />
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Qty"
                            value={row.quantityUsed || ""}
                            onChange={(e) => updateUsageRow(index, "quantityUsed", Number(e.target.value))}
                          />
                        </div>
                        {row.unit && (
                          <p className="text-xs text-slate-400">Unit: {row.unit}</p>
                        )}
                        {usageRows.length > 1 && (
                          <button
                            onClick={() => setUsageRows(usageRows.filter((_, i) => i !== index))}
                            className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => setUsageRows([...usageRows, { materialId: "", materialName: "", quantityUsed: 0, unit: "" }])}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add material
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={recordingUsage}
                        onClick={handleRecordUsage}
                      >
                        {recordingUsage ? "Saving…" : "Save Usage"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setShowUsageForm(false); setUsageRows([{ materialId: "", materialName: "", quantityUsed: 0, unit: "" }]); }}
                        disabled={recordingUsage}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowUsageForm(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Record Material Usage
                  </Button>
                )}
              </div>
            </Section>
          </div>

          {/* RIGHT COLUMN — sticky sidebar on desktop */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">

            {/* PRODUCTION STAGE */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50">
                  <FileText className="h-4 w-4 text-slate-500" />
                </span>
                Production Stage
              </h3>
              <div className="space-y-1">
                {activeStages.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">
                    No production stages configured.
                  </p>
                )}
                {activeStages.map((s) => {
                  const isCurrent = s.id === currentStageId;
                  const isDone = completedStageIds.has(s.id);
                  return (
                    <button
                      key={s.id}
                      disabled={isDone || isCurrent || stageLoading !== null}
                      onClick={() => !isDone && !isCurrent && handleStageChange(s.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                        isCurrent
                          ? cn("text-white shadow-sm", s.color ?? stageColor(order.stage))
                          : isDone
                          ? "text-slate-400 cursor-default"
                          : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : isCurrent ? (
                        <div className="h-4 w-4 shrink-0 rounded-full bg-white/30 flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-white" />
                        </div>
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                      )}
                      <span className={isDone ? "line-through" : ""}>
                        {stageLoading === s.id ? "Updating…" : s.name}
                      </span>
                      {s.milestone === "ready_for_pickup" && order.customerPhone && !order.readyPickupSmsSent && !isDone && !isCurrent && (
                        <span className="ml-auto text-[10px] font-normal opacity-60 shrink-0">
                          + SMS
                        </span>
                      )}
                      {s.notifyCustomer && s.milestone !== "ready_for_pickup" && !isDone && !isCurrent && (
                        <span className="ml-auto text-[10px] font-normal opacity-60 shrink-0">
                          + SMS
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {order.readyPickupSmsSent && (
                <p className="text-xs text-emerald-600 text-center mt-3 font-medium">
                  ✓ Pickup SMS sent to customer
                </p>
              )}
            </div>

            {/* DELAY NOTIFICATION */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </span>
                Delay Notification
              </h3>
              <p className="text-xs text-slate-500 mb-3 ml-10">
                Notify the customer via SMS if the order will be delayed.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">New expected ready date</label>
                  <Input
                    type="date"
                    value={expectedReadyDate}
                    onChange={(e) => setExpectedReadyDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Reason <span className="text-slate-400 font-normal">(optional)</span></label>
                  <Textarea
                    placeholder="e.g. fabric delivery delay, machine repair..."
                    value={delayReason}
                    onChange={(e) => setDelayReason(e.target.value)}
                    rows={2}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={delaySmsLoading || order.deliveryStatus === "picked" || !expectedReadyDate}
                  onClick={handleDelaySms}
                >
                  <Clock className="h-4 w-4 mr-1.5" />
                  {delaySmsLoading ? "Sending SMS…" : "Send Delay Notification"}
                </Button>
                {order.delayNotificationSentAt && (
                  <p className="text-xs text-slate-400 text-center">
                    Last sent: {new Date(order.delayNotificationSentAt).toLocaleString("en-KE")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
