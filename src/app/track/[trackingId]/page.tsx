"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  MapPin,
  Phone,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import type { ProductionStage, PaymentStatus } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKes } from "@/lib/utils";
import { STAGE_LABEL, STAGE_COLOR, PAYMENT_COLOR, PAYMENT_LABEL, STAGE_ORDER } from "@/app/(customer)/portal/_shared";

interface TrackingData {
  id: string;
  trackingToken: string;
  orderNumber: string;
  businessName: string;
  businessPhone?: string;
  businessLocation?: string;
  customerName: string;
  stage: ProductionStage;
  paymentStatus: PaymentStatus;
  dueDate: string;
  subtotalAmount: number;
  amountPaid: number;
  balanceAmount: number;
  garments: Array<{ name: string; quantity: number }>;
  createdAt: string;
  updatedAt: string;
  imageUrls?: string[];
}

export default function PublicTrackingPage({ params }: { params: Promise<{ trackingId: string }> }) {
  const { trackingId } = use(params);
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/track/${trackingId}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d: TrackingData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [trackingId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center gap-4">
        <AlertCircle className="h-14 w-14 text-slate-300" />
        <div>
          <p className="text-lg font-semibold text-slate-700">Order not found</p>
          <p className="text-sm text-slate-400 mt-1">
            The tracking link may be invalid or expired.
          </p>
        </div>
        <Link href="/portal">
          <Button variant="outline">Go to My Orders</Button>
        </Link>
      </div>
    );
  }

  const stageIndex = STAGE_ORDER.indexOf(data.stage);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-slate-50">
      {/* Header */}
      <div className="bg-emerald-700 text-white px-4 pt-8 pb-6">
        <div className="mx-auto max-w-lg">
          <p className="text-emerald-200 text-xs uppercase tracking-wider mb-1">{data.businessName}</p>
          <h1 className="text-2xl font-bold">{data.orderNumber}</h1>
          <p className="text-emerald-100 text-sm mt-1">Hello, {data.customerName.split(" ")[0]}</p>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
        {/* Current status */}
        <Card className="border-emerald-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Current status</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{STAGE_LABEL[data.stage]}</p>
            </div>
            <Badge className={STAGE_COLOR[data.stage]}>{STAGE_LABEL[data.stage]}</Badge>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Order Timeline</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            {STAGE_ORDER.map((stage, idx) => {
              const done = idx < stageIndex;
              const current = idx === stageIndex;
              return (
                <div key={stage} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    ) : current ? (
                      <Loader2 className="h-5 w-5 text-emerald-500 animate-spin shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${current ? "text-slate-900" : done ? "text-slate-600" : "text-slate-400"}`}>
                      {STAGE_LABEL[stage]}
                    </p>
                    {current && (
                      <p className="text-xs text-emerald-600 mt-0.5">In progress</p>
                    )}
                    {done && (
                      <p className="text-xs text-slate-400 mt-0.5">Completed</p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Items */}
        {data.garments.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Your Order</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              {data.garments.map((g, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{g.name}</span>
                  <span className="text-slate-500 text-xs">×{g.quantity}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total</span>
                  <span className="font-semibold">{formatKes(data.subtotalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Payment Status</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Paid</span>
              <span className="font-semibold text-emerald-700">{formatKes(data.amountPaid)}</span>
            </div>
            {data.balanceAmount > 0 && (
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-medium text-rose-700">Balance due</span>
                <span className="font-bold text-rose-700">{formatKes(data.balanceAmount)}</span>
              </div>
            )}
            <div className="pt-1">
              <Badge className={PAYMENT_COLOR[data.paymentStatus]}>
                {PAYMENT_LABEL[data.paymentStatus]}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Due date */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-slate-600">Expected due date</span>
            <span className="text-sm font-semibold">
              {new Date(data.dueDate).toLocaleDateString("en-KE", { dateStyle: "medium" })}
            </span>
          </CardContent>
        </Card>

        {/* Business contact */}
        {(data.businessPhone || data.businessLocation) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{data.businessName}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              {data.businessPhone && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a href={`tel:${data.businessPhone}`} className="hover:underline">
                    {data.businessPhone}
                  </a>
                </div>
              )}
              {data.businessLocation && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {data.businessLocation}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Images */}
        {(data.imageUrls?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Photos</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-3 gap-2">
                {data.imageUrls!.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="rounded-lg aspect-square object-cover w-full border hover:opacity-90 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Support / portal CTA */}
        <div className="space-y-2 pb-4">
          <Link href="/portal/support">
            <Button variant="outline" className="w-full gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <MessageCircle className="h-4 w-4" />
              Contact support
            </Button>
          </Link>
          <Link href="/portal">
            <Button variant="ghost" className="w-full text-slate-500 text-sm">
              View all my orders
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
