import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Landmark,
  LayoutDashboard,
  MessageSquare,
  Package,
  Receipt,
  Scissors,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Users,
} from "lucide-react";

import { ManualHeader, Note } from "@/modules/manual/components/manual-ui";

const guideCards = [
  {
    title: "Customers",
    description: "Add individuals, create group accounts, add members, understand balances, and use every customer filter.",
    href: "/manual/customers",
    action: "Read customer guide",
    icon: Users,
  },
  {
    title: "Orders",
    description: "Create individual or group orders, price every item type, add measurements, arrange delivery, and manage production.",
    href: "/manual/orders",
    action: "Read complete order guide",
    icon: ClipboardList,
  },
  {
    title: "Inventory",
    description: "Set up materials and ready-made stock, manage suppliers and purchase orders, receive deliveries, and monitor stock movement and consumption.",
    href: "/manual/inventory",
    action: "Read inventory guide",
    icon: Boxes,
  },
] as const;

const appMap = [
  { label: "Dashboard", href: "/dashboard", purpose: "Daily business totals, urgent work, and shortcuts.", icon: LayoutDashboard },
  { label: "Finance", href: "/finance", purpose: "Income, expenses, savings, investments, and reports.", icon: Landmark },
  { label: "Customers", href: "/customers", purpose: "Customer records, groups, members, measurements, balances, and history.", icon: Users, guide: "/manual/customers" },
  { label: "Orders", href: "/orders", purpose: "New, active, delivered, and cancelled customer orders.", icon: ShoppingBag, guide: "/manual/orders" },
  { label: "Production", href: "/production", purpose: "Track the workshop queue and each production stage.", icon: Scissors },
  { label: "Delivery", href: "/delivery", purpose: "Pickup and courier progress, handover, and delivery completion.", icon: Truck },
  { label: "Inventory", href: "/inventory", purpose: "Materials, ready-made stock, movements, suppliers, and purchasing.", icon: Boxes, guide: "/manual/inventory" },
  { label: "Payments", href: "/payments", purpose: "Record and review money received against orders.", icon: CreditCard },
  { label: "Analytics", href: "/analytics", purpose: "Business performance and trend reports.", icon: BarChart3 },
  { label: "Employees", href: "/employees", purpose: "Staff records, roles, and assignments.", icon: Building2 },
  { label: "Messages", href: "/messages", purpose: "Customer communication and message history.", icon: MessageSquare },
  { label: "Global Sell", href: "/sell", purpose: "Publish products and manage online marketplace sales.", icon: Store },
  { label: "Settings", href: "/settings", purpose: "Business profile and operating preferences.", icon: Settings },
  { label: "Permissions", href: "/settings/role-permissions", purpose: "Choose what each employee role can view or change.", icon: ShieldCheck },
  { label: "Billing", href: "/settings/billing", purpose: "Plan, subscription, invoices, and billing details for owners.", icon: Receipt },
  { label: "Usage & Top-ups", href: "/settings/usage", purpose: "Plan usage and available top-up balances for owners.", icon: Package },
] as const;

export default function ManualHomePage() {
  return (
    <div className="space-y-6 pb-10">
      <ManualHeader
        eyebrow="FundiFlow Manual"
        title="Use FundiFlow without guessing"
        description="This manual is connected to the real pages in your account. Start with Customers before Orders so names, phone numbers, measurements, group members, and billing responsibility are correct from the beginning."
      />

      <Note>
        <strong>Recommended order:</strong> set up suppliers and inventory materials before selling stock or recording material use on an order. Save the customer before creating their order, then manage production and delivery from the saved order. The guides below explain each workflow; the app map keeps every FundiFlow tab one click away.
      </Note>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-950">Available guides</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {guideCards.map((guide) => {
            const Icon = guide.icon;
            return (
              <Link
                key={guide.href}
                href={guide.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-950">{guide.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{guide.description}</p>
                <p className="mt-4 flex items-center gap-1 text-sm font-bold text-emerald-700">
                  {guide.action}
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="app-map" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-950">Where every FundiFlow tab goes</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Use this as the navigation index. Open goes to the live page. Guide appears where a full manual section is ready.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {appMap.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.href} className="grid gap-3 py-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  {item.label}
                </div>
                <p className="text-sm leading-5 text-slate-600">{item.purpose}</p>
                <div className="flex gap-3 text-sm">
                  {"guide" in item ? <Link href={item.guide} className="font-bold text-emerald-700 hover:underline">Guide</Link> : null}
                  <Link href={item.href} className="font-semibold text-slate-700 hover:text-emerald-700 hover:underline">Open</Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
