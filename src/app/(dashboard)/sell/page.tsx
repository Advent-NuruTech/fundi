"use client";

import Link from "next/link";
import {
  Package,
  ShoppingCart,
  Globe,
  Settings,
  Plus,
  ArrowRight,
  TrendingUp,
  Bell,
  Store,
} from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { useBusinessType } from "@/hooks/useBusinessType";
import { useSellerOrders } from "@/modules/globalsell/hooks/use-my-orders";
import { useMyProducts } from "@/modules/globalsell/hooks/use-my-products";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/modules/globalsell/components/order-status-badge";
import { formatKes } from "@/lib/utils";

export default function SellOverviewPage() {
  const { user, business } = useAuth();
  const sellCategory = useBusinessType();
  const businessId = user?.businessId ?? "";
  const { products, store, loading: productsLoading } = useMyProducts(
    businessId,
    business?.name ?? ""
  );
  const { orders, unreadCount, loading: ordersLoading } = useSellerOrders(businessId);

  const publishedCount = products.filter((p) => p.status === "published").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled" && o.status !== "rejected")
    .reduce((n, o) => n + o.total, 0);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Global Sell</h1>
            {sellCategory && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <span>{sellCategory.emoji}</span>
                {sellCategory.label}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {store ? `Your store: ${store.storeName}` : "Manage your marketplace store"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/globalsell" target="_blank">
            <Button variant="outline" size="sm" className="gap-2">
              <Globe className="h-4 w-4" />
              View Marketplace
            </Button>
          </Link>
          <Link href="/sell/products/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <Package className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Published</p>
                <p className="text-xl font-bold text-slate-900">{publishedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <ShoppingCart className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Pending Orders</p>
                <p className="text-xl font-bold text-slate-900">{pendingOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Orders</p>
                <p className="text-xl font-bold text-slate-900">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Revenue</p>
                <p className="text-sm font-bold text-slate-900">{formatKes(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store setup CTA if no store */}
      {!store && !productsLoading && (
        <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-6 text-center">
          <Store className="mx-auto h-10 w-10 text-emerald-400 mb-3" />
          <h3 className="text-base font-semibold text-emerald-900">Set up your store</h3>
          <p className="mt-1 text-sm text-emerald-700">
            Configure your store name, logo, and notification settings
          </p>
          <Link href="/sell/settings">
            <Button size="sm" className="mt-3">
              Set Up Store
            </Button>
          </Link>
        </div>
      )}

      {/* Notification alert */}
      {unreadCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Bell className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              You have {unreadCount} unread order notification{unreadCount !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/sell/orders">
            <Button size="sm" variant="outline">View Orders</Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Link href="/sell/orders" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="py-8 text-center text-sm text-slate-400">Loading…</div>
            ) : recentOrders.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No orders yet. Add products to start selling!
              </div>
            ) : (
              <div>
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/sell/orders/${order.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        #{order.orderNumber}
                      </p>
                      <p className="text-xs text-slate-500">{order.buyerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatKes(order.total)}
                      </p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Quick Actions</h3>
          {[
            {
              label: "Add New Product",
              href: "/sell/products/new",
              icon: Plus,
              desc: "List a new product on the marketplace",
            },
            {
              label: "Manage Products",
              href: "/sell/products",
              icon: Package,
              desc: `${products.length} product${products.length !== 1 ? "s" : ""} in your store`,
            },
            {
              label: "View All Orders",
              href: "/sell/orders",
              icon: ShoppingCart,
              desc: `${pendingOrders} pending confirmation`,
            },
            {
              label: "Store Settings",
              href: "/sell/settings",
              icon: Settings,
              desc: "Update SMS, logo, and store info",
            },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-300 hover:bg-emerald-50 transition group">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-emerald-100 transition">
                    <Icon className="h-4.5 w-4.5 text-slate-600 group-hover:text-emerald-600 transition" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{action.label}</p>
                    <p className="text-xs text-slate-500">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
