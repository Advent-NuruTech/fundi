"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { getMyOrderById } from "@/services/customer-portal.service";
import type { CustomerSafeOrder } from "@/services/customer-portal.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKes } from "@/lib/utils";
import { STAGE_LABEL, STAGE_COLOR, PAYMENT_COLOR, PAYMENT_LABEL, STAGE_ORDER } from "../../_shared";

export default function PortalOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<CustomerSafeOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getMyOrderById(id).then((data) => {
      if (!data) setNotFound(true);
      else setOrder(data);
      setLoading(false);
    });
  }, [id]);

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

  const stageIndex = STAGE_ORDER.indexOf(order.stage);

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
            <Badge className={STAGE_COLOR[order.stage]}>{STAGE_LABEL[order.stage]}</Badge>
          </div>
        </CardContent>
      </Card>

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
                    {STAGE_LABEL[stage]}
                    {current && <span className="ml-1.5 text-xs text-emerald-600 font-normal">← current</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Garments */}
      {order.garments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Items</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            {order.garments.map((g, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{g.name}</span>
                <span className="text-slate-500 text-xs">×{g.quantity}</span>
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
            <span className="text-sm font-semibold">{formatKes(order.subtotalAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Paid</span>
            <span className="text-sm font-semibold text-emerald-700">{formatKes(order.amountPaid)}</span>
          </div>
          {order.balanceAmount > 0 && (
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-sm font-medium text-rose-700">Balance due</span>
              <span className="text-sm font-bold text-rose-700">{formatKes(order.balanceAmount)}</span>
            </div>
          )}
          <div className="pt-1">
            <Badge className={PAYMENT_COLOR[order.paymentStatus]}>
              {PAYMENT_LABEL[order.paymentStatus]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Due date */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <span className="text-sm text-slate-600">Due date</span>
          <span className="text-sm font-semibold text-slate-800">
            {new Date(order.dueDate).toLocaleDateString("en-KE", { dateStyle: "medium" })}
          </span>
        </CardContent>
      </Card>

      {/* Images */}
      {(order.imageUrls?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Photos</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-3 gap-2">
              {order.imageUrls!.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`Order photo ${i + 1}`} className="rounded-lg aspect-square object-cover w-full border hover:opacity-90 transition-opacity" />
                </a>
              ))}
            </div>
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
    </div>
  );
}
