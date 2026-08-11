"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Package, Loader2 } from "lucide-react";
import { trackOrderByNumberAndPhone } from "@/services/ecommerce.service";
import { OrderTimeline } from "@/modules/globalsell/components/order-timeline";
import { OrderStatusBadge, PaymentStatusBadge } from "@/modules/globalsell/components/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKes } from "@/lib/utils";
import type { EcommerceOrder } from "@/types/ecommerce";

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get("order") ?? "");
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<EcommerceOrder | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function handleTrack(orderToTrack?: string, phoneToTrack?: string) {
    const orderNo = (orderToTrack ?? orderNumber).trim();
    const phoneNo = (phoneToTrack ?? phone).trim();
    if (!orderNo || !phoneNo) return;
    setLoading(true);
    setNotFound(false);
    try {
      const result = await trackOrderByNumberAndPhone(orderNo, phoneNo);
      if (result) {
        setOrder(result);
        setNotFound(false);
      } else {
        setOrder(null);
        setNotFound(true);
      }
    } catch {
      setOrder(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  // Deep links from the customer portal carry ?order=&phone= so the tracking
  // portal resolves the order immediately without the customer re-typing it.
  useEffect(() => {
    const orderParam = searchParams.get("order")?.trim();
    const phoneParam = searchParams.get("phone")?.trim();
    if (orderParam && phoneParam) {
      handleTrack(orderParam, phoneParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Track Your Order</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter your order number and phone number to track your order
        </p>
      </div>

      {/* Search form */}
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={(e) => { e.preventDefault(); handleTrack(); }} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Order Number
              </label>
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="GS-XXXXXX-YYYY"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Phone Number
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712 345 678"
                type="tel"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !orderNumber.trim() || !phone.trim()}
              className="w-full gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Track Order
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Not found */}
      {notFound && (
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <Package className="h-12 w-12 text-slate-200" />
          <p className="text-sm font-medium text-slate-600">Order not found</p>
          <p className="text-xs text-slate-400">
            Check your order number and phone number and try again
          </p>
        </div>
      )}

      {/* Order details */}
      {order && (
        <div className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Order #{order.orderNumber}</span>
                <OrderStatusBadge status={order.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Buyer</p>
                  <p className="font-medium text-slate-900">{order.buyerName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="font-medium text-slate-900">{formatKes(order.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Payment</p>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="font-medium text-slate-900">
                    {new Date(order.createdAt).toLocaleDateString("en-KE")}
                  </p>
                </div>
                {order.deliveryLocation && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Delivery Location</p>
                    <p className="font-medium text-slate-900">{order.deliveryLocation}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              {order.items && order.items.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Items
                  </p>
                  <div className="space-y-1.5">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-slate-700">
                          {item.productName}
                          {item.variantName && (
                            <span className="text-slate-400"> ({item.variantName})</span>
                          )}
                          {" "}<span className="text-slate-400">×{item.quantity}</span>
                        </span>
                        <span className="font-medium">{formatKes(item.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle>Order Status</CardTitle></CardHeader>
            <CardContent>
              <OrderTimeline order={order} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
