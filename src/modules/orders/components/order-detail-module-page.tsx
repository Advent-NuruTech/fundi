"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown, ChevronUp, Edit2, Save, X, Plus, Trash2,
  ImageIcon, Package, Scissors, User, FileText, Layers,
  CheckCircle2, Circle, Clock, ArrowLeft, Phone, Mail,
  ClipboardList, Shirt, AlertTriangle, Receipt as ReceiptIcon,
} from "lucide-react";
import type { Order, Customer, InventoryMaterial, OrderGarmentItem, OrderItemType } from "@/types/domain";
import {
  listenOrder, listenCustomer, updateOrderStage,
  addFittingRecord, updateOrderProductionNotes, recordMaterialUsage,
  listenMaterials, updateOrderSmsFields, logSmsEntry,
  updateOrderDetails, updateOrderGarments, ORDER_TYPE_LABELS,
} from "@/services/firestore.service";
import { notifyOrderStageChanged, notifyOrderCompleted, notifyMaterialsConsumed } from "@/services/notification-catalog";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { useAuth } from "@/features/auth/components/auth-context";
import { sendSms } from "@/lib/sms/sendSms";
import { appendPortalOnboarding } from "@/lib/customer-portal";
import {
  getCustomerMessagingInfo,
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

const STAGES: Array<{ key: Order["stage"]; label: string }> = [
  { key: "cutting",          label: "Cutting" },
  { key: "stitching",        label: "Stitching" },
  { key: "fitting",          label: "Fitting" },
  { key: "finishing",        label: "Finishing" },
  { key: "ready_for_pickup", label: "Ready for Pickup" },
  { key: "delivered",        label: "Delivered" },
];

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

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Order edit mode
  const [editingDetails, setEditingDetails] = useState(false);
  const [editGarments, setEditGarments] = useState<OrderGarmentItem[]>([]);
  const [editDueDate, setEditDueDate] = useState("");
  const [editDesignNotes, setEditDesignNotes] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

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

  // Receipt
  const [showReceipt, setShowReceipt] = useState(false);

  // Delay SMS
  const [delaySmsLoading, setDelaySmsLoading] = useState(false);
  const [expectedReadyDate, setExpectedReadyDate] = useState("");
  const [delayReason, setDelayReason] = useState("");

  // Subscriptions
  useEffect(() => {
    if (!ready || !orderId) return;
    const unsub = listenOrder(businessId, orderId, setOrder);
    const unsubMat = listenMaterials(businessId, setMaterials);
    return () => { unsub(); unsubMat(); };
  }, [businessId, orderId, ready]);

  useEffect(() => {
    if (!ready || !order?.customerId || !businessId) return;
    const unsub = listenCustomer(businessId, order.customerId, setCustomer);
    return () => unsub();
  }, [businessId, order?.customerId, ready]);

  // Sync production notes from order
  useEffect(() => {
    if (order?.productionNotes != null) setProductionNotes(order.productionNotes);
  }, [order?.productionNotes]);

  // Enter edit mode – prime state from current order
  const startEditing = useCallback(() => {
    if (!order) return;
    setEditGarments(order.garments.map((g) => ({ ...g })));
    setEditDueDate(order.dueDate);
    setEditDesignNotes(order.designNotes ?? "");
    setEditingDetails(true);
  }, [order]);

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleSaveDetails = async () => {
    if (!order || savingDetails) return;
    const validGarments = editGarments.filter((g) => g.name.trim());
    if (validGarments.length === 0) {
      toast.error("At least one garment is required");
      return;
    }
    setSavingDetails(true);
    try {
      await updateOrderGarments(businessId, orderId, validGarments);
      await updateOrderDetails(businessId, orderId, {
        dueDate: editDueDate || order.dueDate,
        designNotes: editDesignNotes,
      });
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

  // Appends the Customer Portal onboarding block when this is the FIRST
  // notification ever sent to the customer (login id + default password).
  const prepareMessageWithOnboarding = async (baseMessage: string) => {
    if (!order) return { message: baseMessage, onboardingIncluded: false, customerId: "" };
    const messagingInfo = await getCustomerMessagingInfo(businessId, order.customerId).catch(() => null);
    if (messagingInfo && !messagingInfo.portalOnboardingSent) {
      return {
        message: appendPortalOnboarding(baseMessage, {
          email: messagingInfo.email ?? undefined,
          phone: messagingInfo.phone,
        }),
        onboardingIncluded: true,
        customerId: messagingInfo.id,
      };
    }
    return { message: baseMessage, onboardingIncluded: false, customerId: order.customerId };
  };

  const handleStageChange = async (stage: Order["stage"]) => {
    if (!order || stageLoading) return;
    setStageLoading(stage);
    try {
      await updateOrderStage(businessId, orderId, stage);
      if (user) {
        if (stage === "delivered") {
          await notifyOrderCompleted(businessId, order.orderNumber, order.customerName, orderId, user.uid);
        } else {
          await notifyOrderStageChanged(businessId, order.orderNumber, stage, orderId, user.uid);
        }
      }
      toast.success("Stage updated");

      // Send pickup SMS — no sender param (same as delay SMS which works)
      if (stage === "ready_for_pickup" && order.customerPhone && !order.readyPickupSmsSent) {
        const name = order.customerName || "Customer";
        const baseMessage = `${timeGreeting()} ${name},\n\nYour order "${orderLabel(order)}" is complete and ready for pickup within our working hours.\n\nThank you for choosing ${business?.name || "us"}.`;
        try {
          const { message, onboardingIncluded, customerId } = await prepareMessageWithOnboarding(baseMessage);
          const result = await sendSms(order.customerPhone, message);
          if (result.success) {
            await updateOrderSmsFields(businessId, orderId, {
              readyPickupSmsSent: true,
              readyPickupSmsSentAt: new Date().toISOString(),
            });
            await logSmsEntry(businessId, {
              orderId, recipient: order.customerPhone, message,
              type: "ready_for_pickup", status: "success", response: result.response,
            });
            if (onboardingIncluded) {
              await markPortalOnboardingSent(businessId, customerId).catch(() => {});
            }
            toast.success("Pickup SMS sent to customer");
          } else {
            await logSmsEntry(businessId, {
              orderId, recipient: order.customerPhone, message,
              type: "ready_for_pickup", status: "failed", response: result.error,
            });
            toast.warning("Stage updated — SMS failed: " + result.error);
          }
        } catch {
          toast.warning("Stage updated but SMS could not be sent");
        }
      }
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
      const { message, onboardingIncluded, customerId } = await prepareMessageWithOnboarding(baseMessage);
      const result = await sendSms(order.customerPhone, message);
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
  const stageIndex = STAGES.findIndex((s) => s.key === order.stage);
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

      {/* Printable receipt */}
      {showReceipt && business && (
        <Dialog open={showReceipt} onClose={() => setShowReceipt(false)} className="max-w-xl p-0">
          <OrderReceipt order={order} business={business} onClose={() => setShowReceipt(false)} />
        </Dialog>
      )}

      <div className="space-y-4 pb-10">
        {/* ── Page Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <a href="/orders" className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Orders
              </a>
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
              Receipt
            </button>
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
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Payment</p>
                      <p className="text-sm text-slate-700">
                        Paid: <span className="font-semibold text-emerald-600">{formatKes(order.amountPaid)}</span>
                        {order.balanceAmount > 0 && (
                          <> · Balance: <span className="font-semibold text-rose-600">{formatKes(order.balanceAmount)}</span></>
                        )}
                      </p>
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
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <p className="font-semibold text-slate-700 text-sm">{formatKes(item.unitPrice)}</p>
                              {item.quantity > 1 && (
                                <p className="text-[11px] text-slate-400">{formatKes(item.totalAmount)} total</p>
                              )}
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
                  </div>

                  {/* Editable garments */}
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
                {STAGES.map((s, i) => {
                  const isCurrent = order.stage === s.key;
                  const isDone = i < stageIndex;
                  const isFuture = i > stageIndex;
                  return (
                    <button
                      key={s.key}
                      disabled={isDone || stageLoading !== null}
                      onClick={() => !isDone && handleStageChange(s.key)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                        isCurrent
                          ? cn("text-white shadow-sm", stageColor(s.key))
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
                        {stageLoading === s.key ? "Updating…" : s.label}
                      </span>
                      {s.key === "ready_for_pickup" && order.customerPhone && !order.readyPickupSmsSent && !isDone && (
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
