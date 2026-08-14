"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, Search, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { useSellerOrders } from "@/modules/globalsell/hooks/use-my-orders";
import { OrderStatusBadge, PaymentStatusBadge } from "@/modules/globalsell/components/order-status-badge";
import { Card } from "@/components/ui/card";
import { formatKes } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { EcommerceOrderStatus } from "@/types/ecommerce";

const STATUS_FILTERS: { value: EcommerceOrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function SellerOrdersPage() {
  const { user } = useAuth();
  const businessId = user?.businessId ?? "";
  const { orders, loading } = useSellerOrders(businessId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EcommerceOrderStatus | "all">("all");

  const filtered = orders.filter((o) => {
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesSearch =
      !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.buyerName.toLowerCase().includes(search.toLowerCase()) ||
      o.buyerPhone.includes(search);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Incoming Orders</h1>
        <p className="text-sm text-slate-500">{orders.length} total orders from customers</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search orders, names, phones…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                statusFilter === f.value
                  ? "border-emerald-500 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingCart className="h-14 w-14 text-slate-200 mb-4" />
          <h3 className="text-base font-semibold text-slate-600">
            {search || statusFilter !== "all" ? "No orders match your search" : "No orders yet"}
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Orders will appear here when customers purchase your products
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => (
            <Link key={order.id} href={`/sell/orders/${order.id}`}>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-300 hover:bg-slate-50 transition">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      #{order.orderNumber}
                    </p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{order.buyerName}</p>
                  <p className="text-xs text-slate-400">{order.buyerPhone}</p>
                  {order.items && order.items.length > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""}:{" "}
                      {order.items
                        .slice(0, 2)
                        .map((i) => `${i.productName} ×${i.quantity}`)
                        .join(", ")}
                      {order.items.length > 2 && "…"}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-base font-bold text-slate-900">
                    {formatKes(order.total)}
                  </p>
                  <PaymentStatusBadge status={order.paymentStatus} />
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(order.createdAt).toLocaleDateString("en-KE")}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
