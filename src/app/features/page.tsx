import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  Boxes,
  Building2,
  CheckCircle2,
  FileText,
  Globe,
  MessageCircle,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Users,
  WifiOff,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata = {
  title: "Features | FundiFlow",
  description:
    "Explore FundiFlow's current tools for customers, tailoring orders, production, delivery, inventory, finance, customer accounts, Global Sell, teams, AI and offline work.",
};

const DEMO_URL =
  "https://wa.me/254142225233?text=Hi%2C%20I'd%20like%20to%20request%20a%20demo%20of%20FundiFlow";

type FeatureGroup = {
  icon: LucideIcon;
  title: string;
  summary: string;
  accent: string;
  items: string[];
};

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    icon: Users,
    title: "Customers & measurements",
    summary: "Keep the full customer relationship in one reliable record.",
    accent: "bg-emerald-100 text-emerald-700",
    items: [
      "Customer profiles, contacts and complete order history",
      "Reusable body measurements and fitting notes",
      "Style references, preferences and customer groups",
      "Outstanding balances visible alongside each customer",
    ],
  },
  {
    icon: ShoppingBag,
    title: "Orders & production",
    summary: "Move every garment from intake to completion without losing the thread.",
    accent: "bg-violet-100 text-violet-700",
    items: [
      "Detailed garments, quantities, prices, deposits and due dates",
      "Tailor assignments and configurable workflow stages",
      "Production overview and visual Kanban board",
      "Notes, fittings, activity history and order documents",
    ],
  },
  {
    icon: Truck,
    title: "Delivery & tracking",
    summary: "Know what is ready, what is late and what has reached the customer.",
    accent: "bg-blue-100 text-blue-700",
    items: [
      "Delivery board for ready and dispatched orders",
      "Pickup and delivery status updates",
      "Public tracking links customers can open without calling",
      "Due-date visibility across the workshop",
    ],
  },
  {
    icon: Boxes,
    title: "Inventory & purchasing",
    summary: "Control materials from supplier order through production use.",
    accent: "bg-amber-100 text-amber-700",
    items: [
      "Fabric, trim and accessory stock records",
      "Stock movements and low-stock alerts",
      "Supplier directory and purchase orders",
      "Fabric consumption tracking by production work",
    ],
  },
  {
    icon: ReceiptText,
    title: "Payments & documents",
    summary: "Keep every payment tied to the right order and balance.",
    accent: "bg-rose-100 text-rose-700",
    items: [
      "Cash, M-Pesa, card and other payment records",
      "Deposits, part-payments and outstanding balances",
      "Numbered invoices and payment receipts",
      "Print-ready documents with business branding",
    ],
  },
  {
    icon: BarChart3,
    title: "Finance & reporting",
    summary: "See the movement of every shilling, not only the sales total.",
    accent: "bg-cyan-100 text-cyan-700",
    items: [
      "Revenue, transaction and profitability dashboards",
      "Expenses, withdrawals, investments and savings",
      "Daily, weekly, monthly and yearly reports",
      "Performance trends and downloadable report data",
    ],
  },
  {
    icon: PackageCheck,
    title: "Customer account",
    summary: "Give customers one login for their workshop and marketplace activity.",
    accent: "bg-teal-100 text-teal-700",
    items: [
      "Active, delivered and outstanding-balance views",
      "Order details, progress and payment history",
      "Orders from multiple FundiFlow businesses in one account",
      "Marketplace purchases, profile and support access",
    ],
  },
  {
    icon: Store,
    title: "Global Sell & storefronts",
    summary: "Turn the workshop catalogue into an online selling channel.",
    accent: "bg-fuchsia-100 text-fuchsia-700",
    items: [
      "Public store page with a shareable business handle",
      "Retail and wholesale product listings",
      "Sizes, colours, materials and other product variants",
      "Cart, checkout, seller order management and buyer tracking",
    ],
  },
  {
    icon: Building2,
    title: "Teams, roles & branches",
    summary: "Scale access and operations without giving everyone the same keys.",
    accent: "bg-indigo-100 text-indigo-700",
    items: [
      "Owner, manager, tailor, cashier and inventory roles",
      "Custom role permissions for sensitive areas",
      "Separate branch stock, orders, customers and finance",
      "Business and branch switching from one workspace",
    ],
  },
  {
    icon: Bot,
    title: "AI & business insights",
    summary: "Turn operational data into answers and next actions.",
    accent: "bg-purple-100 text-purple-700",
    items: [
      "Ask questions about orders, sales, stock and payments",
      "Business, production, inventory and finance guidance",
      "Suggested prompts for common management decisions",
      "Usage controls through monthly AI Credits and top-ups",
    ],
  },
  {
    icon: Bell,
    title: "Communication",
    summary: "Keep customers informed using messages connected to their work.",
    accent: "bg-orange-100 text-orange-700",
    items: [
      "Automatic SMS allowances included by plan",
      "Order and marketplace notifications",
      "WhatsApp notification tools on supported plans",
      "In-app messages and notification centre for the team",
    ],
  },
  {
    icon: WifiOff,
    title: "Offline-first & secure",
    summary: "Keep working through unreliable connectivity, on the device you have.",
    accent: "bg-slate-200 text-slate-700",
    items: [
      "Installable Progressive Web App for phone, tablet and computer",
      "Offline records queued for automatic synchronisation",
      "Visible sync and connection status",
      "Business-isolated data and role-based access controls",
    ],
  },
];

const PRODUCT_FLOW = [
  { icon: FileText, label: "Capture", text: "Customer, measurements and order" },
  { icon: Boxes, label: "Prepare", text: "Materials, supplier and production" },
  { icon: PackageCheck, label: "Complete", text: "Fitting, invoice and payment" },
  { icon: Globe, label: "Deliver & grow", text: "Tracking, portal, reports and selling" },
];

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" /> Current FundiFlow features
          </span>
          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            One connected system from the first measurement to the final payment.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
            FundiFlow now connects workshop operations, customer service, finance and online
            selling. Capture the work once, then let the same record move through production,
            delivery, payment, reporting and the customer account.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-7 py-3.5 font-bold text-white shadow-lg shadow-emerald-500/25 transition-colors hover:bg-emerald-400"
            >
              Start free trial <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 font-bold text-white transition-colors hover:bg-white/20"
            >
              Compare plans
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-emerald-100 bg-emerald-50 py-8">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {PRODUCT_FLOW.map(({ icon: Icon, label, text }, index) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 font-black text-emerald-700">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  {index + 1}. {label}
                </p>
                <p className="text-sm text-slate-600">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              Full product overview
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-5xl">
              Built around how a tailoring business actually runs
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Core records stay connected across the platform. Advanced capacity and selected
              tools vary by plan; the pricing page shows the exact allowance for each plan.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {FEATURE_GROUPS.map(({ icon: Icon, title, summary, accent, items }) => (
              <article
                key={title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
              >
                <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{summary}</p>
                <ul className="mt-5 space-y-3">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid items-center gap-10 rounded-3xl bg-slate-900 p-8 text-white sm:p-12 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-300">
                <ShieldCheck className="h-5 w-5" /> Plan-aware and ready to scale
              </div>
              <h2 className="text-3xl font-black sm:text-4xl">See FundiFlow on your own workflow.</h2>
              <p className="mt-3 max-w-2xl text-slate-300">
                Tell us how your workshop runs and we&apos;ll show you the customer, production,
                finance and selling tools that fit it best.
              </p>
            </div>
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 font-bold text-white transition-colors hover:bg-emerald-400"
            >
              <MessageCircle className="h-5 w-5" /> Request a demo
            </a>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
