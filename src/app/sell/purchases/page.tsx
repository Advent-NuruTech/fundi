"use client";

import Link from "next/link";
import { ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { useBuyerOrders } from "@/modules/globalsell/hooks/use-my-orders";
import { OrderStatusBadge, PaymentStatusBadge } from "@/modules/globalsell/components/order-status-badge";
import { OrderTimeline } from "@/modules/globalsell/components/order-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKes } from "@/lib/utils";

export default function MyPurchasesPage() {
  const { user } = useAuth();
  const businessId = user?.businessId ?? "";
  const { orders, loading } = useBuyerOrders(businessId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Purchases</h1>
        <p className="text-sm text-slate-500">
          Orders you have placed on the marketplace
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border-2 border-dashed border-slate-200">
          <ShoppingBag className="h-14 w-14 text-slate-200 mb-4" />
          <h3 className="text-base font-semibold text-slate-600">No purchases yet</h3>
          <p className="text-sm text-slate-400 mt-1">
            Browse the marketplace and place your first order
          </p>
          <Link href="/globalsell">
            <button className="mt-4 flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition">
              Browse Marketplace
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span>#{order.orderNumber}</span>
                    <OrderStatusBadge status={order.status} />
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </div>
                  <span className="text-base font-bold">{formatKes(order.total)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Items */}
                <div className="space-y-1">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-700">
                        {item.productName}
                        {item.variantName && (
                          <span className="text-slate-400"> ({item.variantName})</span>
                        )}
                        {" ×"}
                        {item.quantity}
                      </span>
                      <span className="font-medium text-slate-900">
                        {formatKes(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Store + date */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                  <span>
                    {order.store?.storeName ?? "Unknown Store"}
                  </span>
                  <span>
                    {new Date(order.createdAt).toLocaleDateString("en-KE")}
                  </span>
                </div>

                {/* Timeline */}
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium text-emerald-600 hover:underline list-none">
                    View Progress →
                  </summary>
                  <div className="mt-3">
                    <OrderTimeline order={order} />
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
