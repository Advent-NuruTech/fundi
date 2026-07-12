import Link from "next/link";
import {
  Scissors,
  Users,
  Package,
  BarChart3,
  MessageCircle,
  MessageSquare,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Smartphone,
  TrendingUp,
  Clock,
  Shield,
  Star,
  Zap,
  Ruler,
  Bell,
  Globe,
  Store,
  ShoppingCart,
  LayoutDashboard,
  DollarSign,
  MapPin,
  Truck,
  Tag,
  PackageCheck,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";

const DEMO_URL =
  "https://wa.me/254142225233?text=Hi%2C%20I'd%20like%20to%20request%20a%20demo%20of%20FundiFlow";

const FEATURES = [
  {
    icon: Users,
    color: "bg-emerald-100 text-emerald-700",
    title: "Customer Records",
    desc: "Save every customer's details, body measurements, style preferences and full order history. Never dig through notebooks again.",
  },
  {
    icon: Package,
    color: "bg-blue-100 text-blue-700",
    title: "Material Inventory",
    desc: "Track fabrics, trims and accessories in real time. Instant low-stock alerts before you disappoint a customer.",
  },
  {
    icon: Ruler,
    color: "bg-violet-100 text-violet-700",
    title: "Order Management",
    desc: "Track every order from first measurement through cutting, stitching, fitting, finishing and delivery. Every stage logged.",
  },
  {
    icon: Bell,
    color: "bg-amber-100 text-amber-700",
    title: "Smart Notifications",
    desc: "Auto-send SMS and WhatsApp when an order is ready, delayed or needs fitting. Keep customers informed without lifting a finger.",
  },
  {
    icon: BarChart3,
    color: "bg-rose-100 text-rose-700",
    title: "Business Reports",
    desc: "Daily, weekly, monthly and yearly earnings, expenses, profit margins and best-selling styles — at a glance.",
  },
  {
    icon: Globe,
    color: "bg-teal-100 text-teal-700",
    title: "Global Sell Marketplace",
    desc: "List your products on Kenya's tailoring marketplace. Sell retail or wholesale to customers and businesses nationwide.",
  },
];

const INSIGHTS_FEATURES = [
  "Performance summaries tailored to your shop",
  "Customer preference and repeat-order recommendations",
  "Stock reorder alerts before you run out",
  "Productivity trends based on your order patterns",
  "Clear answers to your key business questions",
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Set Up Your Workshop",
    desc: "Register your business, add team members with the right roles and set up your inventory. Takes less than 15 minutes.",
  },
  {
    step: "02",
    title: "Start Taking Orders",
    desc: "Create customer profiles, capture measurements, assign tailors and track every garment through your production pipeline.",
  },
  {
    step: "03",
    title: "Watch Your Business Grow",
    desc: "Use the finance dashboard and built-in business insights to make smarter decisions, reduce waste and grow revenue month over month.",
  },
];

const ROLES = [
  { role: "Owner", access: "Full visibility — finances, staff, reports, insights" },
  { role: "Manager", access: "Operations & team management (finance access owner-controlled)" },
  { role: "Tailor", access: "Assigned orders and production workflow" },
  { role: "Receptionist", access: "Customer intake and order creation" },
  { role: "Cashier", access: "Payments and POS" },
  { role: "Inventory Manager", access: "Stock and purchase orders" },
];

const TESTIMONIALS = [
  {
    name: "Mama Wanjiku",
    role: "Sole tailor, Nairobi",
    quote:
      "Before FundiFlow I was losing track of measurements and customers were upset. Now everything is in my phone. My orders are up 40% this year.",
    stars: 5,
  },
  {
    name: "Kevin Otieno",
    role: "Workshop owner, 8 tailors",
    quote:
      "The finance dashboard alone is worth every shilling. I finally know exactly how much profit I make each week. My manager only sees what I allow.",
    stars: 5,
  },
  {
    name: "Fatuma Abdi",
    role: "Boutique owner, Mombasa",
    quote:
      "The SMS notifications are a game changer. Customers know when their clothes are ready without me calling. So professional.",
    stars: 5,
  },
];

// Static mini dashboard for hero — no client state needed
function HeroDashboard() {
  const miniOrders = [
    { id: "ON-001", customer: "Wanjiku Kamau", status: "Stitching", color: "bg-amber-100 text-amber-700" },
    { id: "ON-002", customer: "Ali Hassan", status: "Cutting", color: "bg-violet-100 text-violet-700" },
    { id: "ON-003", customer: "Grace Muthoni", status: "Ready", color: "bg-emerald-100 text-emerald-700" },
    { id: "ON-004", customer: "David Ochieng", status: "Finishing", color: "bg-teal-100 text-teal-700" },
  ];

  return (
    <div className="relative hidden lg:block">
      {/* Ambient glow */}
      <div className="absolute -inset-6 rounded-3xl bg-emerald-500/10 blur-2xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-800 shadow-2xl">
        {/* Browser bar */}
        <div className="flex items-center gap-3 bg-slate-700 px-4 py-2.5">
          <div className="flex shrink-0 gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/90" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400/90" />
          </div>
          <div className="flex-1 rounded-md bg-slate-600 px-3 py-1 text-center text-xs text-slate-400">
            🔒 www.fundiflow.co.ke/dashboard
          </div>
        </div>

        {/* App */}
        <div className="flex" style={{ height: "400px" }}>
          {/* Mini sidebar */}
          <div className="flex w-11 shrink-0 flex-col items-center gap-1.5 bg-slate-900 py-4">
            <div className="mb-2.5 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600">
              <Scissors className="h-3.5 w-3.5 text-white" />
            </div>
            {[LayoutDashboard, ShoppingCart, Users, Package, DollarSign, BarChart3, Globe].map((Icon, i) => (
              <div
                key={i}
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  i === 0 ? "bg-emerald-600" : "text-slate-500"
                }`}
              >
                <Icon className="h-3.5 w-3.5 text-slate-300" />
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="flex-1 overflow-hidden bg-slate-50 p-3">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Smart Fabrics Ltd</p>
                <p className="text-[10px] text-slate-400">Dashboard · June 2026</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-[10px] font-semibold text-emerald-600">Live</span>
              </div>
            </div>

            {/* Stat cards */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              {[
                { label: "Revenue", value: "KES 142K", sub: "+8.8%" },
                { label: "Active Orders", value: "23", sub: "47 total" },
                { label: "Customers", value: "186", sub: "4 new today" },
                { label: "Low Stock", value: "3 items", sub: "reorder now" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-2">
                  <p className="text-[9px] text-slate-400">{s.label}</p>
                  <p className="text-xs font-black text-slate-900">{s.value}</p>
                  <p className="text-[9px] font-medium text-emerald-600">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Mini orders table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5">
                <p className="text-[10px] font-semibold text-slate-600">Recent Orders</p>
              </div>
              {miniOrders.map((o) => (
                <div key={o.id} className="flex items-center gap-2 border-b border-slate-100 px-3 py-1.5 last:border-0">
                  <span className="w-12 shrink-0 font-mono text-[10px] text-slate-500">{o.id}</span>
                  <span className="flex-1 truncate text-[10px] font-medium text-slate-800">{o.customer}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${o.color}`}>
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Static marketplace mini-preview for the GlobalSell section
function MarketplacePreview() {
  const products = [
    { name: "Men's 3-Piece Suit", store: "Smart Fabrics", price: "6,500", rating: 4.8, color: "bg-slate-700", badge: null },
    { name: "School Uniform Set", store: "Prestige Tailors", price: "1,800", rating: 4.6, color: "bg-blue-700", badge: "Bestseller" },
    { name: "Ladies Office Dress", store: "Elegant Stitch", price: "3,200", rating: 4.9, color: "bg-rose-600", badge: null },
    { name: "Traditional Kanzu", store: "Coastal Threads", price: "2,400", rating: 4.7, color: "bg-amber-700", badge: null },
    { name: "Kids Party Dress", store: "Little Angels", price: "2,800", rating: 4.5, color: "bg-pink-500", badge: null },
    { name: "Bridal Gown", store: "Wedding Belle", price: "18,500", rating: 5.0, color: "bg-emerald-800", badge: "Premium" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      {/* Marketplace header */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600">
          <Globe className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Global Sell</p>
          <p className="text-xs text-slate-400">by FundiFlow</p>
        </div>
        <div className="ml-auto flex gap-2 text-xs">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">All</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">Retail</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">Wholesale</span>
        </div>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {products.map((p) => (
          <div key={p.name} className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
            <div className={`relative h-20 ${p.color}`}>
              {p.badge && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-slate-800">
                  {p.badge}
                </span>
              )}
            </div>
            <div className="p-2">
              <p className="line-clamp-1 text-[11px] font-semibold text-slate-900">{p.name}</p>
              <p className="text-[10px] text-slate-400">{p.store}</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs font-black text-slate-900">KES {p.price}</p>
                <div className="flex items-center gap-0.5 text-[9px] text-amber-500">
                  <Star className="h-2.5 w-2.5 fill-amber-400" />
                  <span>{p.rating}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <MarketingShell>
      {/* ══════════════════════════════════════════════
          HERO — split layout with live dashboard preview
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white">
        {/* Dot-grid texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/40" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left — copy */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
                <Scissors className="h-4 w-4" />
                Built for Kenyan Tailors & Fashion Designers
              </div>

              <h1 className="mb-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                The Complete{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  Tailoring
                </span>{" "}
                Business OS
              </h1>

              <p className="mb-4 text-lg leading-relaxed text-slate-300">
                Manage customer measurements, fabric inventory, production workflow, finances, staff and communications from{" "}
                <span className="font-semibold text-white">one connected platform.</span>{" "}
                Built specifically for Kenyan tailors, fashion designers, and garment manufacturers.
              </p>

              <p className="mb-8 flex items-center gap-2 text-sm font-medium text-emerald-300">
                <Globe className="h-4 w-4" />
                <strong className="text-white">Global Sell</strong> — Kenya&apos;s dedicated tailoring marketplace, built-in.
              </p>

              <div className="flex flex-col items-start gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 hover:bg-emerald-400"
                >
                  Get Started Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href={DEMO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  <MessageCircle className="h-5 w-5" />
                  Request a Demo
                </a>
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-slate-400">
                {[
                  { Icon: Smartphone, text: "Works Offline" },
                  { Icon: MessageCircle, text: "SMS & WhatsApp" },
                  { Icon: Shield, text: "Secure & Private" },
                  { Icon: Zap, text: "Instant Setup" },
                ].map(({ Icon, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-emerald-400" />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — live dashboard preview */}
            <HeroDashboard />
          </div>

          {/* Feature pills */}
          <div className="mt-12 flex flex-wrap justify-center gap-2.5">
            {[
              "Customer Records",
              "Measurements & Fittings",
              "Production Workflow",
              "Fabric & Material Tracking",
              "Finance Dashboard",
              "Team Management",
              "SMS Notifications",
              "Business Insights",
              "Global Sell Marketplace",
              "POS & Payments",
            ].map((f) => (
              <span
                key={f}
                className="rounded-full border border-slate-700 bg-slate-800/60 px-4 py-1.5 text-sm font-medium text-slate-300"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TRUST STRIP
      ══════════════════════════════════════════════ */}
      <section className="border-y border-emerald-100 bg-emerald-50 py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm font-semibold text-emerald-800">
              Built for Tailors. Designed for Growth.
            </p>
            <p className="text-sm text-emerald-700">
              Plans starting at <strong>KES 690 / month</strong> — Installation from KES 5,000
            </p>
            <Link
              href="/pricing"
              className="text-sm font-bold text-emerald-700 underline underline-offset-2 hover:text-emerald-600"
            >
              View all plans →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TAILORING & FASHION FOCUSED INDUSTRIES
      ══════════════════════════════════════════════ */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Made for Tailoring Professionals
            </span>
            <h2 className="text-4xl font-black text-slate-900 sm:text-5xl">
              Every part of your <span className="text-emerald-600">tailoring business</span> covered
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
              Whether you're a solo tailor, a boutique dressmaker, or a large garment manufacturer — FundiFlow adapts to how you work.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { emoji: "✂️", title: "Solo Tailors", desc: "Manage your customers, measurements, and orders in one place. Never lose a fitting date or customer preference again." },
              { emoji: "👗", title: "Fashion Designers", desc: "Track designs, fabric sourcing, sample production, and customer orders from concept to delivery. Build your brand with confidence." },
              { emoji: "🏭", title: "Garment Manufacturers", desc: "Manage bulk production runs, material sourcing, quality control, and delivery schedules. Scale your operations seamlessly." },
              { emoji: "👔", title: "Bespoke & Formal Wear", desc: "Perfect for wedding suits, corporate wear, and custom designs. Track every measurement and fitting with precision." },
              { emoji: "👘", title: "Cultural & Traditional Wear", desc: "Manage orders for traditional attire, Kanzu, Kitenge, and cultural garments. Preserve craftsmanship with digital precision." },
              { emoji: "🏪", title: "Boutique & Retail", desc: "Sell ready-to-wear garments alongside your custom designs. Manage inventory, sales, and customer loyalty all in one place." },
            ].map(({ emoji, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                  {emoji}
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          LIVE PRODUCT TOUR — interactive dashboard
      ══════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Live Product Tour
            </span>
            <h2 className="text-4xl font-black text-slate-900 sm:text-5xl">
              This isn&apos;t a mockup.
              <br className="hidden sm:block" />
              <span className="text-emerald-600"> This is your future dashboard.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
               Click through the tabs to explore Orders, Finance, Inventory, Customers and the Global Sell Marketplace.
            </p>
          </div>

          <DashboardPreview />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FEATURES GRID
      ══════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600">
              Everything You Need
            </span>
            <h2 className="text-4xl font-black text-slate-900 sm:text-5xl">
              One platform. Every part
              <br className="hidden sm:block" /> of your tailoring business.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
              Stop juggling notebooks, spreadsheets and phone messages. FundiFlow brings your entire tailoring operation into one clean, fast app.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}

            {/* Business Insights card */}
            <div className="group relative col-span-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950 p-6 text-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md sm:col-span-2 lg:col-span-1 lg:col-start-3">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-emerald-500/10" />
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/20">
                  <Lightbulb className="h-6 w-6 text-amber-300" />
                </div>
                <span className="mb-2 inline-block rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
                  Built In — Business Insights
                </span>
                <h3 className="mb-2 text-lg font-bold">Smart Business Insights</h3>
                <p className="text-sm leading-relaxed text-slate-300">
                  Your tailoring data, turned into clear recommendations — revenue trends, best-selling styles and fabric reorder alerts surfaced automatically, the moment they matter.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TAILORING ORDER PIPELINE — visual workflow strip
      ══════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">
              Track every garment, every step of the way
            </h2>
            <p className="mt-3 text-slate-500">
              From first measurement to final delivery — full visibility across your tailoring production pipeline.
            </p>
          </div>

          {/* Pipeline with arrows */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { label: "New Order", color: "bg-blue-100 text-blue-700 border-blue-200" },
              { label: "Cutting", color: "bg-violet-100 text-violet-700 border-violet-200" },
              { label: "Stitching", color: "bg-amber-100 text-amber-700 border-amber-200" },
              { label: "Fitting", color: "bg-orange-100 text-orange-700 border-orange-200" },
              { label: "Finishing", color: "bg-teal-100 text-teal-700 border-teal-200" },
              { label: "Ready for Pickup", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
              { label: "Delivered", color: "bg-slate-100 text-slate-700 border-slate-200" },
            ].map(({ label, color }, i, arr) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`rounded-full border px-5 py-2 text-sm font-semibold ${color}`}>
                  {label}
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                )}
              </div>
            ))}
          </div>

          {/* Mini order cards */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                id: "ON-001",
                customer: "Wanjiku Kamau",
                garment: "Wedding Suit (3-piece)",
                status: "Stitching",
                statusColor: "bg-amber-100 text-amber-700",
                amount: "KES 8,500",
                due: "Jun 14",
                tailor: "James M.",
              },
              {
                id: "ON-004",
                customer: "David Ochieng",
                garment: "School Uniforms × 8",
                status: "Finishing",
                statusColor: "bg-teal-100 text-teal-700",
                amount: "KES 12,000",
                due: "Jun 15",
                tailor: "Tom O.",
              },
              {
                id: "ON-003",
                customer: "Grace Muthoni",
                garment: "Corporate Dress",
                status: "Ready for Pickup",
                statusColor: "bg-emerald-100 text-emerald-700",
                amount: "KES 4,200",
                due: "Jun 10",
                tailor: "James M.",
              },
            ].map((o) => (
              <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-semibold text-slate-500">{o.id}</p>
                    <p className="text-sm font-bold text-slate-900">{o.customer}</p>
                    <p className="text-xs text-slate-500">{o.garment}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${o.statusColor}`}>
                    {o.status}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>👔 {o.tailor}</span>
                  <span>📅 Due {o.due}</span>
                  <span className="font-semibold text-slate-900">{o.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          GLOBAL SELL — dedicated marketplace section
      ══════════════════════════════════════════════ */}
      <section className="overflow-hidden bg-gradient-to-br from-emerald-950 to-slate-900 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left — explanation */}
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
                <Globe className="h-4 w-4" />
                Global Sell — Built-in Marketplace for Tailors
              </div>

              <h2 className="mb-4 text-4xl font-black leading-tight sm:text-5xl">
                Your workshop.{" "}
                <span className="text-emerald-400">Online.</span>
                <br />
                Nationwide.
              </h2>

              <p className="mb-6 text-lg leading-relaxed text-slate-300">
                <strong className="text-white">Global Sell</strong> is FundiFlow&apos;s built-in B2C and B2B marketplace — purpose-built for Kenyan tailoring businesses. Set up your verified seller store, list your garments and fabrics, and start reaching customers and wholesale buyers across Kenya. No extra tools, no separate accounts.
              </p>

              <div className="mb-8 grid gap-6 sm:grid-cols-2">
                {/* For Sellers */}
                <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/20">
                      <Store className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="font-semibold text-white">For Sellers</p>
                  </div>
                  <ul className="space-y-1.5 text-sm text-slate-300">
                    {[
                      "Verified seller profile & store page",
                      "Retail & Wholesale product listings",
                      "Variant builder (Size, Color, Material)",
                      "Automatic SMS order notifications",
                      "Full order management dashboard",
                      "Cloudinary image hosting built-in",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* For Buyers */}
                <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20">
                      <ShoppingCart className="h-4 w-4 text-blue-400" />
                    </div>
                    <p className="font-semibold text-white">For Buyers</p>
                  </div>
                  <ul className="space-y-1.5 text-sm text-slate-300">
                    {[
                      "Browse verified Kenyan tailors",
                      "Retail & Wholesale channels",
                      "Product variants (size, colour, etc.)",
                      "Secure cart & checkout",
                      "Real-time order tracking",
                      "M-Pesa & bank payment options",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* How the order flow works */}
              <div className="mb-8 rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Order Flow</p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {[
                    { icon: ShoppingCart, label: "Buyer Orders" },
                    { icon: Bell, label: "SMS Notification" },
                    { icon: PackageCheck, label: "Seller Confirms" },
                    { icon: Truck, label: "Packed & Shipped" },
                    { icon: MapPin, label: "Delivered" },
                  ].map(({ icon: Icon, label }, i, arr) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-700 px-3 py-1.5">
                        <Icon className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-slate-300">{label}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/globalsell"
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-400 hover:scale-105"
                >
                  <Globe className="h-4 w-4" />
                  Shop the Marketplace
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  <Store className="h-4 w-4" />
                  Start Selling
                </Link>
              </div>
            </div>

            {/* Right — marketplace preview */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-emerald-500/10 blur-2xl" />
              <div className="relative">
                <MarketplacePreview />
                <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
                  {[
                    { icon: Tag, label: "Retail & Wholesale" },
                    { icon: Shield, label: "Verified Sellers" },
                    { icon: Truck, label: "Nationwide Delivery" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-300">
                      <Icon className="h-3.5 w-3.5 text-emerald-400" />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          BUSINESS INSIGHTS & SMS COMMUNICATIONS
      ══════════════════════════════════════════════ */}
      <section className="overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Business Insights Section */}
          <div className="mb-20">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
                  <Lightbulb className="h-3.5 w-3.5" /> Built-In Business Insights
                </span>
                <h2 className="mb-4 text-4xl font-black leading-tight sm:text-5xl">
                  Decisions backed by{" "}
                  <span className="text-amber-300">your own numbers</span>
                </h2>
                <p className="mb-8 text-lg leading-relaxed text-slate-300">
                  FundiFlow reads the data you already capture — orders, payments, fabric inventory and staff activity — and turns it into clear, actionable insights for your tailoring business. No spreadsheets, no guesswork.
                </p>
                <ul className="space-y-3">
                  {INSIGHTS_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/20">
                    <Lightbulb className="h-4 w-4 text-amber-300" />
                  </div>
                  <span className="font-semibold text-white">This Week&apos;s Insights</span>
                  <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                    Updated daily
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { tag: "Revenue", tagColor: "bg-emerald-500/20 text-emerald-300", msg: "Revenue is up 23% vs last month. Your best-selling style is the 3-piece suit." },
                    { tag: "Stock Alert", tagColor: "bg-amber-500/20 text-amber-300", msg: "3 fabrics are running low: Black Suiting (2.5m), Navy Linen (1m), White Cotton Poplin (0.5m)." },
                    { tag: "Reorder", tagColor: "bg-blue-500/20 text-blue-300", msg: "Based on this month's orders, reorder at least 12m of each to avoid delays next week." },
                  ].map((m, i) => (
                    <div key={i} className="rounded-2xl bg-slate-700 px-4 py-3 text-sm text-slate-200">
                      <span className={`mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${m.tagColor}`}>
                        {m.tag}
                      </span>
                      <p>{m.msg}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-right text-xs text-slate-400">
                  📊 Surfaced automatically from your live tailoring data
                </div>
              </div>
            </div>
          </div>

          {/* SMS Section */}
          <div className="border-t border-slate-700/50 pt-16">
            <div className="mb-10 text-center">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-300">
                <MessageSquare className="h-3.5 w-3.5" /> Automated SMS
              </span>
              <h3 className="text-2xl font-bold text-white sm:text-3xl">
                Keep customers informed with <span className="text-blue-300">automated SMS</span>
              </h3>
              <p className="mt-2 text-slate-400">One-way notifications · Order updates · Sent automatically</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 backdrop-blur-sm transition hover:border-slate-600">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-400/20">
                    <MessageSquare className="h-4 w-4 text-blue-300" />
                  </div>
                  <span className="font-semibold text-white">Order Update</span>
                  <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">Delay Alert</span>
                </div>
                <div className="rounded-2xl bg-slate-700 px-4 py-3 text-sm text-slate-200">
                  <div className="mb-1 text-xs text-slate-400">📱 OUTGOING SMS</div>
                  &quot;Good afternoon Calvince Njia, your order #ON005 (10 white shirts, 20 black trousers) has been delayed. New completion date: Monday, 8 June 2026. We apologise for the inconvenience. — Smart Fabrics Ltd&quot;
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  Automatically triggered when order status changes to &apos;delayed&apos;
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 backdrop-blur-sm transition hover:border-slate-600">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-400/20">
                    <MessageSquare className="h-4 w-4 text-green-300" />
                  </div>
                  <span className="font-semibold text-white">Order Update</span>
                  <span className="ml-auto rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">Ready for Pickup</span>
                </div>
                <div className="rounded-2xl bg-slate-700 px-4 py-3 text-sm text-slate-200">
                  <div className="mb-1 text-xs text-slate-400">📱 OUTGOING SMS</div>
                  &quot;Good afternoon Calvince Njia, your order #ON005 (10 white shirts, 20 black trousers) is complete and ready for pickup. Thank you for choosing Smart Fabrics Ltd.&quot;
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  Automatically sent when order status changes to &apos;completed&apos;
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-300" />
                  <span className="text-slate-300">Business Insights:</span>
                  <span className="text-slate-400">Trends · Recommendations · Stock alerts from your tailoring data</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-300" />
                  <span className="text-slate-300">SMS Alerts:</span>
                  <span className="text-slate-400">One-way notifications · Order updates · Sent automatically</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600">
              How It Works
            </span>
            <h2 className="text-4xl font-black text-slate-900 sm:text-5xl">
              Up and running in one day
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-black text-white shadow-lg shadow-emerald-600/20">
                  {step}
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          ROLE-BASED ACCESS
      ══════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-3 inline-block rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600">
                Team Management
              </span>
              <h2 className="mb-4 text-4xl font-black text-slate-900 sm:text-5xl">
                The right access for every role
              </h2>
              <p className="mb-6 text-lg text-slate-500">
                From solo tailors to large tailoring workshops with 50+ staff — FundiFlow&apos;s role-based access ensures everyone sees exactly what they need, nothing more.
              </p>
              <p className="text-sm text-slate-500">
                <strong className="text-slate-900">Owner privacy built in.</strong>{" "}
                Financial earnings, profit data and business insights are private to you by default. You decide what your manager can see and when.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              {ROLES.map(({ role, access }, i) => (
                <div
                  key={role}
                  className={`flex items-start justify-between gap-4 rounded-xl px-4 py-3 ${i === 0 ? "bg-emerald-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${i === 0 ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span className={`text-sm font-semibold ${i === 0 ? "text-emerald-800" : "text-slate-700"}`}>
                      {role}
                    </span>
                  </div>
                  <span className="text-right text-xs text-slate-500">{access}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <h2 className="text-4xl font-black text-slate-900 sm:text-5xl">
              Trusted by Kenyan tailors
            </h2>
            <p className="mt-3 text-slate-500">
              Real tailoring businesses. Real results. Hear from tailors who transformed their operations with FundiFlow.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map(({ name, role, quote, stars }) => (
              <div key={name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mb-5 text-sm leading-relaxed text-slate-600">&quot;{quote}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{name}</p>
                    <p className="text-xs text-slate-500">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          PRICING TEASER
      ══════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <span className="mb-3 inline-block rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600">
            Pricing
          </span>
          <h2 className="mb-4 text-4xl font-black text-slate-900 sm:text-5xl">
            Simple, honest pricing for tailors
          </h2>
          <p className="mx-auto mb-10 max-w-lg text-lg text-slate-500">
            Three plans built for every stage of your tailoring journey — from solo needle to full enterprise workshop.
          </p>
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            {[
              { name: "Sindano", swahili: "The Needle", price: "690", color: "border-slate-200", badge: null },
              { name: "Fundi", swahili: "The Craftsman", price: "3,690", color: "border-emerald-400 ring-2 ring-emerald-400/30", badge: "Most Popular" },
              { name: "Dhahabu", swahili: "Golden Standard", price: "9,990", color: "border-slate-200", badge: null },
            ].map(({ name, swahili, price, color, badge }) => (
              <div key={name} className={`relative rounded-2xl border bg-white p-6 shadow-sm ${color}`}>
                {badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white">
                    {badge}
                  </span>
                )}
                <p className="text-lg font-black text-slate-900">{name}</p>
                <p className="mb-4 text-xs text-slate-400">{swahili}</p>
                <p className="text-3xl font-black text-slate-900">
                  KES {price}
                  <span className="text-sm font-normal text-slate-400">/mo</span>
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-4 text-base font-bold text-white transition-all hover:bg-slate-800"
            >
              See Full Pricing Details
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          PWA / OFFLINE STRIP
      ══════════════════════════════════════════════ */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Smartphone, title: "Works Offline", desc: "No internet? No problem. FundiFlow syncs in the background and works fully offline on any device." },
              { icon: Clock, title: "Real-Time Sync", desc: "All your tailoring data syncs instantly across devices. Your tailor updates an order — you see it immediately." },
              { icon: TrendingUp, title: "Grows With You", desc: "Start solo and scale to 50+ staff. FundiFlow's plans and features grow as your tailoring business grows." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                  <Icon className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="mb-1 font-bold text-slate-900">{title}</h3>
                  <p className="text-sm text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 py-24 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="mb-4 text-5xl font-black leading-tight sm:text-6xl">
            Work Smart.{" "}
            <span className="text-emerald-400">Deliver Perfect.</span>
            <br />
            <span className="text-amber-300">Grow Faster.</span>
          </h2>
          <p className="mx-auto mb-10 max-w-lg text-lg text-slate-300">
            Technology built for modern tailoring businesses. Join the tailors, fashion designers, and garment manufacturers already running their operations with FundiFlow.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 hover:bg-emerald-400"
            >
              Get Started Today
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              <MessageCircle className="h-5 w-5" />
              Request a Demo
            </a>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            📞 0142 225 233 &nbsp;·&nbsp; ✉️ adventnurutech@gmail.com
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}