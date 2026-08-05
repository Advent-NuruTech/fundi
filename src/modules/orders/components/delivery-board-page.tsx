"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Truck, MapPin, Ban } from "lucide-react";
import { toast } from "sonner";
import type { DeliveryStage, Order, DeliveryPartner } from "@/types/domain";
import {
  listenOrders,
  listenDeliveryPartners,
  nextDeliveryStages,
  DELIVERY_STAGE_LABELS,
  DELIVERY_STAGE_COLORS,
} from "@/services/firestore.service";
import { advanceOrderDelivery } from "@/services/delivery.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKes, cn } from "@/lib/utils";

type StageFilter = "all" | DeliveryStage | "cancelled";

const BOARD_FILTERS: { value: StageFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ready_for_dispatch", label: "Ready for Dispatch" },
  { value: "courier_assigned", label: "Courier Assigned" },
  { value: "picked_up", label: "Picked Up" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivery_attempted", label: "Attempted" },
  { value: "pickup_ready", label: "Ready for Pickup" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export function DeliveryBoardPage() {
  const { businessId, ready, user } = useBusinessContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [filter, setFilter] = useState<StageFilter>("all");
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const unsub = listenOrders(businessId, setOrders);
    const unsubPartners = listenDeliveryPartners(businessId, setPartners);
    return () => {
      unsub();
      unsubPartners();
    };
  }, [businessId, ready]);

  const partnerById = useMemo(() => new Map(partners.map((p) => [p.id, p])), [partners]);

  const visibleOrders = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "cancelled") return orders.filter((o) => o.isCancelled);
    return orders.filter((o) => !o.isCancelled && (o.deliveryStage ?? "pending") === filter);
  }, [orders, filter]);

  const counts = useMemo(() => {
    const map = new Map<StageFilter, number>();
    for (const f of BOARD_FILTERS) map.set(f.value, 0);
    for (const o of orders) {
      map.set("all", (map.get("all") ?? 0) + 1);
      if (o.isCancelled) {
        map.set("cancelled", (map.get("cancelled") ?? 0) + 1);
      } else {
        const s = (o.deliveryStage ?? "pending") as StageFilter;
        map.set(s, (map.get(s) ?? 0) + 1);
      }
    }
    return map;
  }, [orders]);

  const handleAdvance = async (order: Order) => {
    const next = nextDeliveryStages(order.deliveryStage ?? "pending", order.deliveryMethod ?? "delivery");
    if (next.length === 0) return;
    setAdvancingId(order.id);
    try {
      const result = await advanceOrderDelivery(businessId, order, {
        stage: next[0],
        byUid: user?.uid,
        byName: user?.displayName,
      });
      if (result.ok && result.smsSent) toast.success(`${order.orderNumber} — updated, SMS sent`);
      else if (result.ok) toast.success(`${order.orderNumber} — moved to ${DELIVERY_STAGE_LABELS[next[0]]}`);
      else toast.error(result.message ?? "Could not update delivery stage");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update delivery stage");
    } finally {
      setAdvancingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="h-6 w-6 text-emerald-600" /> Delivery Board
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Track orders through dispatch, transit and delivery.</p>
        </div>
        <Link href="/settings/delivery">
          <Button variant="outline" size="sm">
            Delivery Settings
          </Button>
        </Link>
      </div>

      {/* Stage filter chips */}
      <div className="flex flex-wrap gap-2">
        {BOARD_FILTERS.map((f) => {
          const count = counts.get(f.value) ?? 0;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                filter === f.value
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px]",
                  filter === f.value ? "bg-white/20" : "bg-slate-100 text-slate-500"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders */}
      <div className="space-y-3">
        {visibleOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Truck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">
                No {filter === "all" ? "" : `${BOARD_FILTERS.find((f) => f.value === filter)?.label.toLowerCase()} `}
                orders{filter === "cancelled" ? " (cancelled)" : ""} right now.
              </p>
            </CardContent>
          </Card>
        ) : (
          visibleOrders.map((order) => {
            const stage: DeliveryStage = order.isCancelled ? "pending" : (order.deliveryStage ?? "pending");
            const next = order.isCancelled ? [] : nextDeliveryStages(stage, order.deliveryMethod ?? "delivery");
            const partner = order.deliveryPartnerId ? partnerById.get(order.deliveryPartnerId) : undefined;
            const deliveryFee = order.deliveryFee ?? 0;
            return (
              <Card key={order.id} className={cn(order.isCancelled && "opacity-70")}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          {order.orderNumber}
                        </Link>
                        <span className="text-sm text-slate-600">{order.customerName}</span>
                        {order.isCancelled ? (
                          <Badge className="bg-rose-600 text-white border-0">
                            <Ban className="h-3 w-3 mr-1" /> Cancelled
                          </Badge>
                        ) : (
                          <Badge className={cn("border-0 text-white", DELIVERY_STAGE_COLORS[stage])}>
                            {DELIVERY_STAGE_LABELS[stage]}
                          </Badge>
                        )}
                        {order.deliveryMethod === "pickup" && !order.isCancelled && (
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Pickup</span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        {order.deliveryMethod === "delivery" && order.deliveryAddress && (
                          <span className="flex items-center gap-1 min-w-0">
                            <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{order.deliveryAddress}</span>
                          </span>
                        )}
                        <span>{order.deliveryPartnerName || (order.deliveryMethod === "delivery" ? "No courier" : "")}</span>
                        {order.deliveryMethod === "delivery" && deliveryFee > 0 && (
                          <span>{formatKes(deliveryFee)} delivery</span>
                        )}
                        <span>
                          Bal: <span className="font-medium text-slate-700">{formatKes(order.balanceAmount)}</span>
                        </span>
                        <span>Due {new Date(order.dueDate).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</span>
                        {order.isCancelled && (
                          <span className="text-rose-500">Cancelled {order.cancelledAt ? new Date(order.cancelledAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : ""}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {next.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={advancingId === order.id}
                          onClick={() => handleAdvance(order)}
                        >
                          {advancingId === order.id
                            ? "Updating…"
                            : `Advance → ${DELIVERY_STAGE_LABELS[next[0]]}`}
                        </Button>
                      )}
                      <Link href={`/orders/${order.id}`}>
                        <Button size="sm" variant="ghost">Open</Button>
                      </Link>
                    </div>
                  </div>

                  {partner && (
                    <p className="mt-2 text-[11px] text-slate-400">
                      Courier: {partner.name} {partner.phone ? `· ${partner.phone}` : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
