"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import type { Order, InventoryMaterial } from "@/types/domain";
import {
  listenOrder,
  updateOrderStage,
  addFittingRecord,
  updateOrderProductionNotes,
  recordMaterialUsage,
  listenMaterials,
  updateOrderSmsFields,
  logSmsEntry,
} from "@/services/firestore.service";
import { notifyOrderStageChanged, notifyOrderCompleted, notifyMaterialsConsumed } from "@/services/notification-catalog";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { useAuth } from "@/features/auth/components/auth-context";
import { sendSms } from "@/lib/sms/sendSms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import { formatKes } from "@/lib/utils";

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function orderLabel(order: Order): string {
  const firstGarment = order.garments?.[0]?.name;
  return firstGarment ? `${firstGarment} - ${order.orderNumber}` : order.orderNumber;
}

const stages: Order["stage"][] = [
  "cutting",
  "stitching",
  "fitting",
  "finishing",
  "ready_for_pickup",
  "delivered",
];

interface UsageRow {
  materialId: string;
  materialName: string;
  quantityUsed: number;
  unit: string;
}

export function OrderDetailModulePage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { businessId, user, ready } = useBusinessContext();
  const { business } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);
  const [fittingNote, setFittingNote] = useState("");
  const [productionNotes, setProductionNotes] = useState("");
  const [usageRows, setUsageRows] = useState<UsageRow[]>([{ materialId: "", materialName: "", quantityUsed: 0, unit: "" }]);
  const [recordingUsage, setRecordingUsage] = useState(false);
  const [savingFitting, setSavingFitting] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [stageLoading, setStageLoading] = useState<string | null>(null);
  const [delaySmsLoading, setDelaySmsLoading] = useState(false);
  const [expectedReadyDate, setExpectedReadyDate] = useState("");
  const [delayReason, setDelayReason] = useState("");

  useEffect(() => {
    if (!ready || !orderId) return;
    const unsub = listenOrder(businessId, orderId, setOrder);
    const unsubMat = listenMaterials(businessId, setMaterials);
    return () => { unsub(); unsubMat(); };
  }, [businessId, orderId, ready]);

  useEffect(() => {
    if (order?.productionNotes) setProductionNotes(order.productionNotes);
  }, [order?.productionNotes]);

  if (!order) {
    return <div className="text-sm text-slate-500">Order not found.</div>;
  }

  const materialOptions: SearchableOption[] = materials.map((m) => ({
    value: m.id,
    label: `${m.name} (${m.quantity} ${m.unitName} available)`,
  }));

  const updateUsageRow = (index: number, field: keyof UsageRow, value: string | number) => {
    const updated = [...usageRows];
    if (field === "materialId") {
      const mat = materials.find((m) => m.id === value);
      updated[index].materialId = value as string;
      updated[index].materialName = mat?.name ?? "";
      updated[index].unit = mat?.unitName ?? "";
    } else if (field === "quantityUsed") {
      updated[index].quantityUsed = value as number;
    }
    setUsageRows(updated);
  };

  const addUsageRow = () => {
    setUsageRows([...usageRows, { materialId: "", materialName: "", quantityUsed: 0, unit: "" }]);
  };

  const removeUsageRow = (index: number) => {
    if (usageRows.length === 1) return;
    setUsageRows(usageRows.filter((_, i) => i !== index));
  };

  const handleRecordUsage = async () => {
    if (!user || recordingUsage) return;
    const validRows = usageRows.filter((r) => r.materialId && r.quantityUsed > 0);
    if (validRows.length === 0) {
      toast.error("Add at least one material with quantity");
      return;
    }
    setRecordingUsage(true);
    try {
      await recordMaterialUsage(
        businessId,
        orderId,
        validRows.map((r) => ({
          materialId: r.materialId,
          materialName: r.materialName,
          quantityUsed: r.quantityUsed,
          unit: r.unit,
          recordedByUid: user.uid,
          recordedByName: user.displayName,
        })),
        { uid: user.uid, name: user.displayName }
      );
      await notifyMaterialsConsumed(businessId, order.orderNumber, orderId, user.uid);
      setUsageRows([{ materialId: "", materialName: "", quantityUsed: 0, unit: "" }]);
      toast.success("Material usage recorded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record material usage");
    } finally {
      setRecordingUsage(false);
    }
  };

  const handleStageChange = async (stage: Order["stage"]) => {
    if (stageLoading) return;
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

      // Auto-send pickup SMS when order reaches ready_for_pickup
      if (stage === "ready_for_pickup" && order.customerPhone && !order.readyPickupSmsSent) {
        const sender = business?.smsSenderId || undefined;
        const customerName = order.customerName || "Customer";
        const message = `${timeGreeting()} ${customerName},\n\nYour order "${orderLabel(order)}" is complete and ready for pickup within our working hours.\n\nThank you for choosing ${business?.name || "us"}.`;
        try {
          const result = await sendSms(order.customerPhone, message, sender);
          if (result.success) {
            await updateOrderSmsFields(businessId, orderId, {
              readyPickupSmsSent: true,
              readyPickupSmsSentAt: new Date().toISOString(),
            });
            await logSmsEntry(businessId, {
              orderId,
              recipient: order.customerPhone,
              message,
              type: "ready_for_pickup",
              status: "success",
              response: result.response,
            });
            toast.success("Pickup SMS sent to customer");
          } else {
            await logSmsEntry(businessId, { orderId, recipient: order.customerPhone, message, type: "ready_for_pickup", status: "failed", response: result.error });
            toast.warning("Stage updated — SMS failed: " + result.error);
          }
        } catch {
          toast.warning("Stage updated but SMS failed");
        }
      }
    } catch {
      toast.error("Could not update stage");
    } finally {
      setStageLoading(null);
    }
  };

  const handleDelaySms = async () => {
    if (!expectedReadyDate || !order.customerPhone || delaySmsLoading) {
      if (!expectedReadyDate) toast.error("Select the expected ready date");
      return;
    }
    setDelaySmsLoading(true);
    const businessName = business?.name ?? "FundiFlow";
    const customerName = order.customerName || "Customer";
    const formattedDate = new Date(expectedReadyDate).toLocaleDateString("en-KE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const reasonLine = delayReason.trim() ? `\nReason: ${delayReason.trim()}\n` : "";
    const message = `${timeGreeting()} ${customerName},\n\nYour order "${orderLabel(order)}" has been delayed.\n${reasonLine}\nNew expected completion date:\n${formattedDate}\n\nWe apologize for the inconvenience.\n\nThank you for choosing ${businessName}.`;
    try {
      const result = await sendSms(order.customerPhone, message);
      if (result.success) {
        await updateOrderSmsFields(businessId, orderId, {
          expectedReadyDate: new Date(expectedReadyDate).toISOString(),
          delayNotificationSentAt: new Date().toISOString(),
          delayReason: delayReason.trim() || null,
        });
        await logSmsEntry(businessId, { orderId, recipient: order.customerPhone, message, type: "delay_notification", status: "success", response: result.response });
        toast.success("Delay notification sent");
        setExpectedReadyDate("");
        setDelayReason("");
      } else {
        await logSmsEntry(businessId, { orderId, recipient: order.customerPhone, message, type: "delay_notification", status: "failed", response: result.error });
        toast.warning("Failed to send delay notification");
      }
    } catch {
      toast.warning("Failed to send delay notification");
    } finally {
      setDelaySmsLoading(false);
    }
  };

  const stageIndex = stages.indexOf(order.stage);
  const orderImages: string[] = (order as Order & { imageUrls?: string[] }).imageUrls ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{order.orderNumber} — {order.customerName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge>{order.stage.replaceAll("_", " ")}</Badge>
            <Badge variant={order.balanceAmount > 0 ? "warning" : "success"}>{order.paymentStatus}</Badge>
            <Badge>Due {order.dueDate}</Badge>
            {order.assignedTailorName && <Badge variant="default">Tailor: {order.assignedTailorName}</Badge>}
          </div>

          <div className="grid gap-1 text-sm">
            <p>Total: <span className="font-semibold">{formatKes(order.subtotalAmount)}</span></p>
            <p>Paid: <span className="font-semibold text-emerald-600">{formatKes(order.amountPaid)}</span></p>
            <p>Balance: <span className={`font-semibold ${order.balanceAmount > 0 ? "text-rose-600" : "text-slate-500"}`}>{formatKes(order.balanceAmount)}</span></p>
            {order.garments?.map((g, i) => (
              <p key={i} className="text-xs text-slate-500">
                {g.name} × {g.quantity} @ {formatKes(g.agreedPrice)}
              </p>
            ))}
          </div>

          {/* Order reference images */}
          {orderImages.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Reference Images</p>
              <div className="flex flex-wrap gap-3">
                {orderImages.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Order reference ${i + 1}`}
                      className="h-32 w-auto rounded-xl object-contain border border-slate-200 bg-slate-50"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Materials used */}
          {order.materialUsage && order.materialUsage.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Materials Used</p>
              <div className="space-y-2">
                {order.materialUsage.map((usage, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <Link className="font-medium text-emerald-700 hover:text-emerald-600" href={`/inventory/materials/${usage.materialId}`}>
                        {usage.materialName}
                      </Link>
                      <span className="font-semibold text-slate-700">{usage.quantityUsed} {usage.unit}</span>
                    </div>
                    <p className="text-xs text-slate-400">Recorded by {usage.recordedByName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fittings */}
          <div>
            <p className="mb-2 text-sm font-medium">Fittings / adjustments</p>
            <div className="space-y-2">
              {order.fittingRecords?.map((record, index) => (
                <div key={index} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <p>{record.notes}</p>
                  <p className="text-xs text-slate-500">{record.byName}</p>
                </div>
              ))}
            </div>
            <Textarea
              value={fittingNote}
              onChange={(e) => setFittingNote(e.target.value)}
              placeholder="Record fitting adjustment"
              className="mt-3"
            />
            <Button
              className="mt-2"
              disabled={savingFitting || !fittingNote.trim()}
              onClick={async () => {
                if (!user) return;
                setSavingFitting(true);
                try {
                  await addFittingRecord(businessId, orderId, {
                    notes: fittingNote,
                    byUid: user.uid,
                    byName: user.displayName,
                  });
                  setFittingNote("");
                  toast.success("Fitting note added");
                } catch {
                  toast.error("Could not save fitting note");
                } finally {
                  setSavingFitting(false);
                }
              }}
            >
              {savingFitting ? "Saving..." : "Save fitting note"}
            </Button>
          </div>

          {/* Production notes */}
          <div>
            <p className="mb-2 text-sm font-medium">Production notes</p>
            <Textarea
              value={productionNotes}
              onChange={(e) => setProductionNotes(e.target.value)}
              placeholder="Cutting notes, stitching details, pending blockers..."
            />
            <Button
              className="mt-2"
              disabled={savingNotes}
              onClick={async () => {
                setSavingNotes(true);
                try {
                  await updateOrderProductionNotes(businessId, orderId, productionNotes);
                  toast.success("Production notes saved");
                } finally {
                  setSavingNotes(false);
                }
              }}
            >
              {savingNotes ? "Saving..." : "Save notes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {/* Production stage */}
        <Card>
          <CardHeader>
            <CardTitle>Production Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stages.map((stage, i) => (
              <Button
                key={stage}
                variant={order.stage === stage ? "default" : "outline"}
                className={`w-full justify-start ${i < stageIndex ? "opacity-50 line-through" : ""}`}
                disabled={i < stageIndex || stageLoading !== null}
                onClick={() => handleStageChange(stage)}
              >
                {stageLoading === stage ? "Updating..." : stage.replaceAll("_", " ")}
                {stage === "ready_for_pickup" && order.customerPhone && !order.readyPickupSmsSent && (
                  <span className="ml-auto text-xs opacity-60">+ SMS</span>
                )}
              </Button>
            ))}
            {order.readyPickupSmsSent && (
              <p className="text-xs text-slate-400 text-center pt-1">Pickup SMS sent ✓</p>
            )}
          </CardContent>
        </Card>

        {/* Record materials used */}
        <Card>
          <CardHeader>
            <CardTitle>Record Materials Used</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">
              Record which materials and quantities were consumed for this order.
            </p>
            {usageRows.map((row, index) => (
              <div key={index} className="grid gap-2 rounded-xl border p-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <SearchableSelect
                      options={materialOptions}
                      value={row.materialId}
                      onChange={(v) => updateUsageRow(index, "materialId", v)}
                      placeholder="Select material"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Qty"
                      value={row.quantityUsed || ""}
                      onChange={(e) => updateUsageRow(index, "quantityUsed", Number(e.target.value))}
                    />
                  </div>
                </div>
                {row.unit && <p className="text-xs text-slate-400">Unit: {row.unit}</p>}
                {usageRows.length > 1 && (
                  <Button size="sm" variant="ghost" className="text-xs text-rose-500" onClick={() => removeUsageRow(index)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button size="sm" variant="outline" className="w-full" onClick={addUsageRow}>
              Add another material
            </Button>
            <Button size="sm" className="w-full" disabled={recordingUsage} onClick={handleRecordUsage}>
              {recordingUsage ? "Saving..." : "Save Material Usage"}
            </Button>
          </CardContent>
        </Card>

        {/* Delay notification */}
        <Card>
          <CardHeader>
            <CardTitle>Delay Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">
              Notify the customer if the order will be delayed. SMS is sent immediately on click.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">New expected ready date</label>
              <Input
                type="date"
                value={expectedReadyDate}
                onChange={(e) => setExpectedReadyDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Reason (optional)</label>
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
              {delaySmsLoading ? "Sending SMS..." : "Send Delay Notification"}
            </Button>
            {order.delayNotificationSentAt && (
              <p className="text-xs text-slate-400 text-center">
                Last sent: {new Date(order.delayNotificationSentAt).toLocaleString("en-KE")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
