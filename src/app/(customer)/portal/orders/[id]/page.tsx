"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  ArrowLeft,
  MessageCircle,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  MapPin,
  Store,
  ExternalLink,
} from "lucide-react";
import { useCustomerPortal } from "@/features/customer-portal/customer-portal-context";
import { getMyPortalOrderById, getMyOrderDocument } from "@/services/customer-portal.service";
import type { PortalOrder } from "@/services/customer-portal.service";
import { OrderTimeline } from "@/modules/globalsell/components/order-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { OrderReceipt } from "@/components/receipt/order-receipt";
import type { Order } from "@/types/domain";
import type { ReceiptBusiness } from "@/lib/receipt";
import { formatKes } from "@/lib/utils";
import { shopUrl } from "@/lib/storefront-url";
import {
  STAGE_LABEL,
  STAGE_ORDER,
  portalStatusColor,
  portalStatusLabel,
  portalPaymentColor,
  portalPaymentLabel,
} from "../../_shared";

export default function PortalOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { customerIds, userId } = useCustomerPortal();
  const [order, setOrder] = useState<PortalOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [document, setDocument] = useState<{ order: Order; business: ReceiptBusiness } | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);

  useEffect(() => {
    getMyPortalOrderById(id, customerIds, userId).then((data) => {
      if (!data) setNotFound(true);
      else setOrder(data);
      setLoading(false);
    });
  }, [id, customerIds, userId]);

  const openDocument = () => {
    setLoadingDocument(true);
    getMyOrderDocument(id).then((data) => {
      setDocument(data);
      setLoadingDocument(false);
    });
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 font-medium">Order not found</p>
        <Link href="/portal/orders" className="text-sm text-emerald-700 mt-2 block hover:underline">
          ← Back to orders
        </Link>
      </div>
    );
  }

  if (order.source === "globalsell") {
    return <GlobalSellOrderDetail order={order} />;
  }

  return (
    <TailoringOrderDetail
      order={order}
      document={document}
      setDocument={setDocument}
      loadingDocument={loadingDocument}
      openDocument={openDocument}
    />
  );
}

function TailoringOrderDetail({
  order,
  document,
  setDocument,
  loadingDocument,
  openDocument,
}: {
  order: PortalOrder;
  document: { order: Order; business: ReceiptBusiness } | null;
  setDocument: (d: { order: Order; business: ReceiptBusiness } | null) => void;
  loadingDocument: boolean;
  openDocument: () => void;
}) {
  const tailoring = order.tailoring!;
  const stageIndex = STAGE_ORDER.indexOf(tailoring.stage);

  return (
    <div className="space-y-4">
      {/* Back */}
      <Link href="/portal/orders" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 -mb-1">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">{order.businessName}</p>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">{order.orderNumber}</h1>
              <p className="text-xs text-slate-400 mt-1">
                Created {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Badge className={portalStatusColor(order)}>{portalStatusLabel(order)}</Badge>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={openDocument} disabled={loadingDocument} className="w-full gap-2">
        {loadingDocument ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        {loadingDocument ? "Preparing document…" : "View invoice / receipt"}
      </Button>

      {/* Stage timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Production Timeline</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="space-y-3">
            {STAGE_ORDER.map((stage, idx) => {
              const done = idx < stageIndex;
              const current = idx === stageIndex;
              const label = current && tailoring.currentStageName ? tailoring.currentStageName : STAGE_LABEL[stage];
              return (
                <div key={stage} className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : current ? (
                    <Loader2 className="h-5 w-5 text-emerald-500 animate-spin shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                  )}
                  <span className={`text-sm ${current ? "font-semibold text-slate-900" : done ? "text-slate-600" : "text-slate-400"}`}>
                    {label}
                    {current && <span className="ml-1.5 text-xs text-emerald-600 font-normal">← current</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Garments */}
      {order.items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Items</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            {order.items.map((g, i) => (
              <div key={i} className="rounded-xl border border-slate-100 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">{g.name}</span>
                  <span className="text-slate-500 text-xs">×{g.quantity}</span>
                </div>
                {(g.includedParts?.length ?? 0) > 0 && (
                  <div className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Included in this price</p>
                    <p className="mt-1 text-xs text-slate-700">{g.includedParts?.map((part) => `${part.quantity}× ${part.name}`).join(" · ")}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Payment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Payment</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Total</span>
            <span className="text-sm font-semibold">{formatKes(order.totalAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Total paid</span>
            <span className="text-sm font-semibold text-emerald-700">{formatKes(order.amountPaid)}</span>
          </div>
          {order.balanceAmount > 0 && (
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-sm font-medium text-rose-700">Balance due</span>
              <span className="text-sm font-bold text-rose-700">{formatKes(order.balanceAmount)}</span>
            </div>
          )}
          <div className="pt-1">
            <Badge className={portalPaymentColor(order)}>
              {portalPaymentLabel(order)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Due date */}
      {order.dueDate && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-slate-600">Due date</span>
            <span className="text-sm font-semibold text-slate-800">
              {new Date(order.dueDate).toLocaleDateString("en-KE", { dateStyle: "medium" })}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Support CTA */}
      <Link href="/portal/support">
        <Button className="w-full gap-2 bg-emerald-700 hover:bg-emerald-800">
          <MessageCircle className="h-4 w-4" />
          Contact Support
        </Button>
      </Link>

      {document && (
        <Dialog open={!!document} onClose={() => setDocument(null)} className="max-w-xl p-0">
          <OrderReceipt order={document.order} business={document.business} onClose={() => setDocument(null)} />
        </Dialog>
      )}
    </div>
  );
}

function GlobalSellOrderDetail({ order }: { order: PortalOrder }) {
  const ecommerce = order.globalsell!;

  return (
    <div className="space-y-4">
      {/* Back */}
      <Link href="/portal/orders" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 -mb-1">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">{order.businessName}</p>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">{order.orderNumber}</h1>
              <p className="text-xs text-slate-400 mt-1">
                Placed {new Date(order.createdAt).toLocaleDateString("en-KE", { dateStyle: "medium" })}
              </p>
            </div>
            <Badge className={portalStatusColor(order)}>{portalStatusLabel(order)}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Track on Global Sell */}
      <Link href={order.trackingUrl ?? shopUrl("track")}>
        <Button className="w-full gap-2 bg-emerald-700 hover:bg-emerald-800">
          <ExternalLink className="h-4 w-4" />
          Track Order on Global Sell
        </Button>
      </Link>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Order Status</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <OrderTimeline order={ecommerce} />
        </CardContent>
      </Card>

      {/* Items */}
      {order.items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Items</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            {order.items.map((g, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{g.name}</span>
                <span className="text-slate-500 text-xs">
                  ×{g.quantity} · {formatKes(g.unitPrice * g.quantity)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Delivery location */}
      {ecommerce.deliveryLocation && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Delivery location</p>
              <p className="text-sm font-medium text-slate-800">{ecommerce.deliveryLocation}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Payment</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Total</span>
            <span className="text-sm font-semibold">{formatKes(order.totalAmount)}</span>
          </div>
          {order.balanceAmount > 0 && (
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-sm font-medium text-rose-700">Balance due</span>
              <span className="text-sm font-bold text-rose-700">{formatKes(order.balanceAmount)}</span>
            </div>
          )}
          <div className="pt-1">
            <Badge className={portalPaymentColor(order)}>
              {portalPaymentLabel(order)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Browse marketplace */}
      <Link href={shopUrl()}>
        <Button variant="outline" className="w-full gap-2">
          <Store className="h-4 w-4" />
          Browse Global Sell Marketplace
        </Button>
      </Link>
    </div>
  );
}
