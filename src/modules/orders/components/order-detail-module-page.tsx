"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import type { Order } from "@/types/domain";
import { listenOrder, updateOrderStage, addFittingRecord, updateOrderProductionNotes } from "@/services/firestore.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatKes } from "@/lib/utils";

const stages: Order["stage"][] = [
  "cutting",
  "stitching",
  "fitting",
  "finishing",
  "ready_for_pickup",
  "delivered",
];

export function OrderDetailModulePage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { businessId, user, ready } = useBusinessContext();
  const [order, setOrder] = useState<Order | null>(null);
  const [fittingNote, setFittingNote] = useState("");
  const [productionNotes, setProductionNotes] = useState("");

  useEffect(() => {
    if (!ready || !orderId) {
      return;
    }
    return listenOrder(businessId, orderId, setOrder);
  }, [businessId, orderId, ready]);

  useEffect(() => {
    if (order?.productionNotes) {
      setProductionNotes(order.productionNotes);
    }
  }, [order?.productionNotes]);

  if (!order) {
    return <div className="text-sm text-slate-500">Order not found.</div>;
  }

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
          </div>
          <div className="grid gap-2 text-sm">
            <p>Total: {formatKes(order.subtotalAmount)}</p>
            <p>Paid: {formatKes(order.amountPaid)}</p>
            <p>Balance: {formatKes(order.balanceAmount)}</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Linked Materials</p>
            <div className="space-y-2">
              {order.fabricSelections.map((fabric, index) => (
                <div key={`${fabric.materialName}-${index}`} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <p>{fabric.materialName} - {fabric.metersRequired}m</p>
                  {fabric.materialId && (
                    <Link className="text-xs font-medium text-emerald-700" href={`/inventory/materials/${fabric.materialId}`}>
                      View material details
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
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
      <Card>
        <CardHeader>
          <CardTitle>Production Stage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stages.map((stage) => (
            <Button
              key={stage}
              variant={order.stage === stage ? "default" : "outline"}
              className="w-full justify-start"
              onClick={async () => {
                await updateOrderStage(businessId, orderId, stage);
                toast.success("Stage updated");
              }}
            >
              {stage.replaceAll("_", " ")}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
