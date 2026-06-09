"use client";

import { useState } from "react";
import {
  Scissors,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  BarChart3,
  DollarSign,
  Globe,
  Star,
  Search,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ORDERS = [
  { id: "ON-001", customer: "Wanjiku Kamau", garment: "Wedding Suit (3-piece)", status: "Stitching", due: "Jun 14", amount: "8,500", tailor: "James M." },
  { id: "ON-002", customer: "Ali Hassan", garment: "Traditional Kanzu × 2", status: "Cutting", due: "Jun 12", amount: "2,400", tailor: "Sarah W." },
  { id: "ON-003", customer: "Grace Muthoni", garment: "Corporate Dress", status: "Ready", due: "Jun 10", amount: "4,200", tailor: "James M." },
  { id: "ON-004", customer: "David Ochieng", garment: "School Uniforms × 8", status: "Finishing", due: "Jun 15", amount: "12,000", tailor: "Tom O." },
  { id: "ON-005", customer: "Amina Yusuf", garment: "Bridesmaid Gowns × 4", status: "Stitching", due: "Jun 20", amount: "16,800", tailor: "Sarah W." },
  { id: "ON-006", customer: "Peter Njoroge", garment: "Suit Alterations", status: "Delivered", due: "Jun 8", amount: "1,500", tailor: "Tom O." },
];

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  "New Order": { bg: "bg-blue-100", text: "text-blue-700" },
  Cutting: { bg: "bg-violet-100", text: "text-violet-700" },
  Stitching: { bg: "bg-amber-100", text: "text-amber-700" },
  Fitting: { bg: "bg-orange-100", text: "text-orange-700" },
  Finishing: { bg: "bg-teal-100", text: "text-teal-700" },
  Ready: { bg: "bg-emerald-100", text: "text-emerald-700" },
  Delivered: { bg: "bg-slate-100", text: "text-slate-600" },
};

const MOCK_MONTHS = [
  { month: "Jan", amount: 85000 },
  { month: "Feb", amount: 92000 },
  { month: "Mar", amount: 118000 },
  { month: "Apr", amount: 97000 },
  { month: "May", amount: 131000 },
  { month: "Jun", amount: 142600 },
];

const MOCK_INVENTORY = [
  { name: "Black Suiting Fabric", stock: 8.5, unit: "m", min: 10, pct: 55, low: true },
  { name: "Navy Blue Linen", stock: 15.0, unit: "m", min: 5, pct: 100, low: false },
  { name: "White Cotton Poplin", stock: 2.5, unit: "m", min: 5, pct: 35, low: true },
  { name: "Red Satin", stock: 22.0, unit: "m", min: 8, pct: 100, low: false },
  { name: "Sewing Thread (Black)", stock: 340, unit: "pcs", min: 100, pct: 100, low: false },
  { name: "30 cm Zippers", stock: 45, unit: "pcs", min: 50, pct: 60, low: true },
];

const MOCK_CUSTOMERS = [
  { name: "Wanjiku Kamau", phone: "0712 345 678", measurements: 'Chest 38″ · Waist 32″ · Hips 42″', orders: 12, lastOrder: "Jun 10" },
  { name: "Ali Hassan", phone: "0723 456 789", measurements: 'Chest 42″ · Waist 36″', orders: 5, lastOrder: "Jun 12" },
  { name: "Grace Muthoni", phone: "0734 567 890", measurements: 'Bust 36″ · Waist 28″ · Hips 40″', orders: 8, lastOrder: "Jun 8" },
  { name: "David Ochieng", phone: "0745 678 901", measurements: 'Chest 44″ · Waist 38″', orders: 3, lastOrder: "Jun 5" },
  { name: "Amina Yusuf", phone: "0756 789 012", measurements: 'Bust 34″ · Waist 26″ · Hips 38″', orders: 7, lastOrder: "Jun 14" },
];

const MOCK_PRODUCTS = [
  { name: "Men's 3-Piece Suit", store: "Smart Fabrics", price: "6,500", rating: 4.8, reviews: 24, color: "bg-slate-700", badge: null },
  { name: "School Uniform Set", store: "Prestige Tailors", price: "1,800", rating: 4.6, reviews: 156, color: "bg-blue-700", badge: "Bestseller" },
  { name: "Ladies Office Dress", store: "Elegant Stitch", price: "3,200", rating: 4.9, reviews: 38, color: "bg-rose-600", badge: null },
  { name: "Traditional Kanzu", store: "Coastal Threads", price: "2,400", rating: 4.7, reviews: 67, color: "bg-amber-700", badge: null },
  { name: "Kids Party Dress", store: "Little Angels", price: "2,800", rating: 4.5, reviews: 19, color: "bg-pink-500", badge: null },
  { name: "Bridal Gown", store: "Wedding Belle", price: "18,500", rating: 5.0, reviews: 12, color: "bg-emerald-800", badge: "Premium" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { bg: "bg-slate-100", text: "text-slate-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      {status}
    </span>
  );
}

function OrdersTab() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-400">
          <Search className="h-3.5 w-3.5" />
          <span>Search orders…</span>
        </div>
        <div className="flex gap-1.5">
          {["All", "Active", "Ready", "Delivered"].map((f, i) => (
            <span
              key={f}
              className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium ${
                i === 0
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-500">Order #</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-500">Customer</th>
              <th className="hidden px-3 py-2 text-left font-semibold text-slate-500 md:table-cell">Garment</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-500">Status</th>
              <th className="hidden px-3 py-2 text-left font-semibold text-slate-500 lg:table-cell">Tailor</th>
              <th className="hidden px-3 py-2 text-left font-semibold text-slate-500 sm:table-cell">Due</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-500">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_ORDERS.map((o) => (
              <tr key={o.id} className="transition-colors hover:bg-slate-50">
                <td className="px-3 py-2.5 font-mono font-semibold text-slate-700">{o.id}</td>
                <td className="px-3 py-2.5 font-medium text-slate-800">{o.customer}</td>
                <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{o.garment}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={o.status} />
                </td>
                <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{o.tailor}</td>
                <td className="hidden px-3 py-2.5 text-slate-500 sm:table-cell">{o.due}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-slate-900">KES {o.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Showing 6 of 47 orders</span>
        <button className="flex items-center gap-1 font-medium text-emerald-600 hover:text-emerald-500">
          View all orders <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function FinanceTab() {
  const maxAmt = Math.max(...MOCK_MONTHS.map((m) => m.amount));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Monthly Revenue", value: "142,600", sub: "+8.8% vs May", up: true },
          { label: "Outstanding", value: "34,800", sub: "6 customers", up: false },
          { label: "Total Orders", value: "47", sub: "23 active", up: true },
          { label: "Avg Order Value", value: "3,034", sub: "This month", up: true },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] text-slate-500">{c.label}</p>
            <p className="mt-0.5 text-base font-black text-slate-900">KES {c.value}</p>
            <p className={`mt-0.5 flex items-center gap-1 text-[11px] font-medium ${c.up ? "text-emerald-600" : "text-amber-600"}`}>
              {c.up ? <TrendingUp className="h-3 w-3" /> : null}
              {c.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700">Monthly Revenue — 2026</p>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
            KES 666,200 YTD
          </span>
        </div>
        <div className="flex h-28 items-end gap-2">
          {MOCK_MONTHS.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-slate-500">
                {(m.amount / 1000).toFixed(0)}K
              </span>
              <div
                className="w-full rounded-t-lg bg-emerald-500 transition-all hover:bg-emerald-400"
                style={{ height: `${(m.amount / maxAmt) * 80}%` }}
              />
              <span className="text-[10px] text-slate-400">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
          Outstanding Payments
        </div>
        {[
          { name: "Wanjiku Kamau", amount: "8,500", due: "Jun 14", days: 4 },
          { name: "Ali Hassan", amount: "2,400", due: "Jun 12", days: 2 },
          { name: "Amina Yusuf", amount: "16,800", due: "Jun 20", days: 10 },
        ].map((r) => (
          <div key={r.name} className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 last:border-0">
            <div>
              <p className="text-xs font-semibold text-slate-800">{r.name}</p>
              <p className="text-[11px] text-slate-400">Due {r.due} · {r.days} days left</p>
            </div>
            <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
              KES {r.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InventoryTab() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Materials", value: "24", color: "text-slate-900" },
          { label: "Low Stock", value: "3", color: "text-amber-600" },
          { label: "Out of Stock", value: "1", color: "text-red-600" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
            <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[1fr_80px_80px_96px_72px] border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
          <span>Material</span>
          <span className="text-right">In Stock</span>
          <span className="text-right">Minimum</span>
          <span className="pl-2">Level</span>
          <span>Status</span>
        </div>
        {MOCK_INVENTORY.map((item) => (
          <div key={item.name} className="grid grid-cols-[1fr_80px_80px_96px_72px] items-center border-b border-slate-100 px-3 py-2.5 text-xs last:border-0">
            <span className="font-medium text-slate-800">{item.name}</span>
            <span className="text-right text-slate-600">{item.stock} {item.unit}</span>
            <span className="text-right text-slate-400">{item.min} {item.unit}</span>
            <div className="pl-2">
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${item.low ? "bg-amber-400" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(item.pct, 100)}%` }}
                />
              </div>
            </div>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.low ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
              {item.low ? "⚠ Low" : "✓ Good"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomersTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-400">
        <Search className="h-3.5 w-3.5" />
        <span>Search customers…</span>
      </div>
      <div className="space-y-2">
        {MOCK_CUSTOMERS.map((c) => (
          <div
            key={c.name}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              {c.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                <span className="text-xs text-slate-400">{c.phone}</span>
              </div>
              <p className="truncate text-[11px] text-slate-500">{c.measurements}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-semibold text-slate-700">{c.orders} orders</p>
              <p className="text-[11px] text-slate-400">Last: {c.lastOrder}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketplaceTab() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-400">
          <Search className="h-3.5 w-3.5" />
          <span>Search marketplace…</span>
        </div>
        <div className="flex gap-1.5">
          {["All", "Retail", "Wholesale"].map((t, i) => (
            <span
              key={t}
              className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium ${
                i === 0
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MOCK_PRODUCTS.map((p) => (
          <div
            key={p.name}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md"
          >
            <div className={`relative h-24 ${p.color}`}>
              {p.badge && (
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-800">
                  {p.badge}
                </span>
              )}
            </div>
            <div className="p-2.5">
              <p className="line-clamp-1 text-xs font-semibold text-slate-900">{p.name}</p>
              <p className="text-[10px] text-slate-400">{p.store}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-sm font-black text-slate-900">KES {p.price}</p>
                <div className="flex items-center gap-0.5 text-[10px] text-amber-500">
                  <Star className="h-3 w-3 fill-amber-400" />
                  <span className="font-medium">{p.rating}</span>
                  <span className="text-slate-400">({p.reviews})</span>
                </div>
              </div>
              <button className="mt-2 w-full rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500">
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

type TabId = "orders" | "finance" | "inventory" | "customers" | "marketplace";

const TABS: { id: TabId; label: string }[] = [
  { id: "orders", label: "Orders" },
  { id: "finance", label: "Finance" },
  { id: "inventory", label: "Inventory" },
  { id: "customers", label: "Customers" },
  { id: "marketplace", label: "Marketplace" },
];

const SIDEBAR_ITEMS = [
  { Icon: LayoutDashboard, label: "Dashboard", active: false },
  { Icon: ShoppingCart, label: "Orders", active: true },
  { Icon: Users, label: "Customers", active: false },
  { Icon: Package, label: "Inventory", active: false },
  { Icon: DollarSign, label: "Finance", active: false },
  { Icon: BarChart3, label: "Analytics", active: false },
  { Icon: Globe, label: "Marketplace", active: false },
];

export function DashboardPreview({ defaultTab = "orders" }: { defaultTab?: TabId }) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-100 px-4 py-2.5">
        <div className="flex shrink-0 gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-center text-xs text-slate-400">
          🔒 app.fundiflow.co.ke/dashboard
        </div>
      </div>

      {/* App layout */}
      <div className="flex" style={{ height: "540px" }}>
        {/* Sidebar */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-1.5 bg-slate-900 py-4">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <Scissors className="h-4 w-4 text-white" />
          </div>
          {SIDEBAR_ITEMS.map(({ Icon, label }) => (
            <button
              key={label}
              title={label}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
            <div>
              <p className="text-sm font-bold text-slate-900">Smart Fabrics Ltd</p>
              <p className="text-xs text-slate-400">Nairobi, Kenya · June 2026</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-600">Live</span>
              <div className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                KO
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex shrink-0 gap-0.5 border-b border-slate-100 bg-white px-4 pt-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`rounded-t-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === t.id
                    ? "border border-b-0 border-slate-200 bg-slate-50 text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
            {activeTab === "orders" && <OrdersTab />}
            {activeTab === "finance" && <FinanceTab />}
            {activeTab === "inventory" && <InventoryTab />}
            {activeTab === "customers" && <CustomersTab />}
            {activeTab === "marketplace" && <MarketplaceTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
