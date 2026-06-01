"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
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
  const [smsLoading, setSmsLoading] = useState(false);
  const [delaySmsLoading, setDelaySmsLoading] = useState(false);
  const [expectedReadyDate, setExpectedReadyDate] = useState("");

  useEffect(() => {
    if (!ready || !orderId) {
      return;
    }
    const unsub = listenOrder(businessId, orderId, setOrder);
    const unsubMat = listenMaterials(businessId, setMaterials);
    return () => { unsub(); unsubMat(); };
  }, [businessId, orderId, ready]);

  useEffect(() => {
    if (order?.productionNotes) {
      setProductionNotes(order.productionNotes);
    }
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
    if (!user) return;
    const validRows = usageRows.filter((r) => r.materialId && r.quantityUsed > 0);
    if (validRows.length === 0) {
      toast.error("Add at least one material with quantity");
      return;
    }
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
    } catch {
      toast.error("Could not record material usage");
    }
  };

  const stageIndex = stages.indexOf(order.stage);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{order.orderNumber} - {order.customerName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>{order.stage.replaceAll("_", " ")}</Badge>
            <Badge variant={order.balanceAmount > 0 ? "warning" : "success"}>{order.paymentStatus}</Badge>
            <Badge>Due {order.dueDate}</Badge>
            {order.assignedTailorName && (
              <Badge variant="default">Tailor: {order.assignedTailorName}</Badge>
            )}
          </div>
          <div className="grid gap-2 text-sm">
            <p>Total: {formatKes(order.subtotalAmount)}</p>
            <p>Paid: {formatKes(order.amountPaid)}</p>
            <p>Balance: {formatKes(order.balanceAmount)}</p>
            {order.garments?.map((g, i) => (
              <p key={i} className="text-xs text-slate-500">
                {g.name} x {g.quantity} @ {formatKes(g.agreedPrice)}
              </p>
            ))}
          </div>

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
                      <span className="font-semibold text-slate-700">
                        {usage.quantityUsed} {usage.unit}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Recorded by {usage.recordedByName}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            <Textarea value={fittingNote} onChange={(event) => setFittingNote(event.target.value)} placeholder="Record fitting adjustment" className="mt-3" />
            <Button
              className="mt-2"
              onClick={async () => {
                if (!user || !fittingNote.trim()) {
                  return;
                }
                await addFittingRecord(businessId, orderId, {
                  notes: fittingNote,
                  byUid: user.uid,
                  byName: user.displayName,
                });
                setFittingNote("");
                toast.success("Fitting note added");
              }}
            >
              Save fitting note
            </Button>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Production notes</p>
            <Textarea
              value={productionNotes || order.productionNotes || ""}
              onChange={(event) => setProductionNotes(event.target.value)}
              placeholder="Cutting notes, stitching details, pending blockers..."
            />
            <Button
              className="mt-2"
              onClick={async () => {
                await updateOrderProductionNotes(businessId, orderId, productionNotes);
                toast.success("Production notes saved");
              }}
            >
              Save notes
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Production Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stages.map((stage, i) => (
              <Button
                key={stage}
                variant={order.stage === stage ? "default" : i < stageIndex ? "outline" : "outline"}
                className="w-full justify-start"
                disabled={i < stageIndex || smsLoading}
                onClick={async () => {
                  await updateOrderStage(businessId, orderId, stage);
                  if (user) {
                    if (stage === "delivered") {
                      await notifyOrderCompleted(businessId, order.orderNumber, order.customerName, orderId, user.uid);
                    } else {
                      await notifyOrderStageChanged(businessId, order.orderNumber, stage, orderId, user.uid);
                    }
                  }
                  toast.success("Stage updated");

                  if (stage === "ready_for_pickup" && order.customerPhone && !order.readyPickupSmsSent) {
                    setSmsLoading(true);
                    const businessName = business?.name ?? "Fundi Flow";
                    const customerName = order.customerName || "Customer";
                    const message = `Hello ${customerName},\n\nYour order "${order.orderNumber}" is complete and ready for pickup.\n\nThank you for choosing ${businessName}.`;
                    try {
                      const result = await sendSms(order.customerPhone, message);
                      if (result.success) {
                        await updateOrderSmsFields(businessId, orderId, {
                          readyPickupSmsSent: true,
                          readyPickupSmsSentAt: Timestamp.fromDate(new Date()),
                        });
                        await logSmsEntry(businessId, {
                          orderId,
                          recipient: order.customerPhone,
                          message,
                          type: "ready_for_pickup",
                          status: "success",
                          response: result.response,
                        });
                        toast.success("Pickup SMS sent");
                      } else {
                        await logSmsEntry(businessId, {
                          orderId,
                          recipient: order.customerPhone,
                          message,
                          type: "ready_for_pickup",
                          status: "failed",
                          response: result.error,
                        });
                        toast.warning("Stage updated but SMS failed");
                      }
                    } catch {
                      toast.warning("Stage updated but SMS failed");
                    } finally {
                      setSmsLoading(false);
                    }
                  } else if (stage === "ready_for_pickup" && order.readyPickupSmsSent) {
                    toast.info("Pickup SMS already sent");
                  }
                }}
              >
                {stage.replaceAll("_", " ")}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Record Materials Used</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">
              After finishing the order, record exactly which materials and how much were used.
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
                {row.unit && (
                  <p className="text-xs text-slate-400">Unit: {row.unit}</p>
                )}
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
            <Button size="sm" className="w-full" onClick={handleRecordUsage}>
              Save Material Usage
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delay Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">
              Notify the customer if the order will be delayed.
            </p>
            <Input
              type="date"
              value={expectedReadyDate}
              onChange={(e) => setExpectedReadyDate(e.target.value)}
            />
            <Button
              className="w-full"
              disabled={delaySmsLoading || !expectedReadyDate}
              onClick={async () => {
                if (!expectedReadyDate || !order.customerPhone) {
                  toast.error("Expected date and customer phone required");
                  return;
                }
                setDelaySmsLoading(true);
                const businessName = business?.name ?? "Fundi Flow";
                const customerName = order.customerName || "Customer";
                const formattedDate = new Date(expectedReadyDate).toLocaleDateString("en-KE", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                const message = `Hello ${customerName},\n\nYour order "${order.orderNumber}" has been delayed.\n\nNew expected completion date:\n${formattedDate}\n\nWe apologize for the inconvenience.\n\nThank you for choosing ${businessName}.`;
                try {
                  const result = await sendSms(order.customerPhone, message);
                  if (result.success) {
                    await updateOrderSmsFields(businessId, orderId, {
                      expectedReadyDate: Timestamp.fromDate(new Date(expectedReadyDate)),
                      delayNotificationSentAt: Timestamp.fromDate(new Date()),
                    });
                    await logSmsEntry(businessId, {
                      orderId,
                      recipient: order.customerPhone,
                      message,
                      type: "delay_notification",
                      status: "success",
                      response: result.response,
                    });
                    toast.success("Delay notification sent");
                    setExpectedReadyDate("");
                  } else {
                    await logSmsEntry(businessId, {
                      orderId,
                      recipient: order.customerPhone,
                      message,
                      type: "delay_notification",
                      status: "failed",
                      response: result.error,
                    });
                    toast.warning("Failed to send delay notification");
                  }
                } catch {
                  toast.warning("Failed to send delay notification");
                } finally {
                  setDelaySmsLoading(false);
                }
              }}
            >
              {delaySmsLoading ? "Sending SMS..." : "Send Delay Notification"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
