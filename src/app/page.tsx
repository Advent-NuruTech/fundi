import Link from "next/link";
import {
  Scissors,
  Users,
  Package,
  BarChart3,
  MessageCircle,
  MessageSquare,
  Bot,
  CheckCircle2,
  ArrowRight,
  Smartphone,
  TrendingUp,
  Clock,
  Shield,
  Star,
  Zap,
  Ruler,
  ShoppingBag,
  Bell,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";

const DEMO_URL =
  "https://wa.me/254142225233?text=Hi%2C%20I'd%20like%20to%20request%20a%20demo%20of%20FundiFlow";

const FEATURES = [
  {
    icon: Users,
    color: "bg-emerald-100 text-emerald-700",
    title: "Customer Records",
    desc: "Save every customer's details, photos, body measurements, style preferences and order history in one place. Never search through notebooks again.",
  },
  {
    icon: Package,
    color: "bg-blue-100 text-blue-700",
    title: "Material Inventory",
    desc: "Track fabrics, trims, accessories and stock levels in real time. Get instant alerts when materials run low so you never disappoint a customer.",
  },
  {
    icon: Ruler,
    color: "bg-violet-100 text-violet-700",
    title: "Order Management",
    desc: "Track every order from the first measurement through cutting, stitching, fitting, finishing, right to delivery. Every stage logged and visible.",
  },
  {
    icon: Bell,
    color: "bg-amber-100 text-amber-700",
    title: "Smart Notifications",
    desc: "Automatically send SMS and WhatsApp updates when an order is ready for pickup, delayed, or needs fitting. Keep customers informed without lifting a finger.",
  },
  {
    icon: BarChart3,
    color: "bg-rose-100 text-rose-700",
    title: "Business Reports",
    desc: "See daily, weekly, monthly and yearly earnings, expenses, profit margins, best-selling styles and peak periods at a glance. Data that drives decisions.",
  },
];

const AI_FEATURES = [
  "Intelligent business insights tailored to your shop",
  "Customer preference recommendations",
  "Stock reorder suggestions before you run out",
  "Productivity tips based on your order patterns",
  "Instant answers to your business questions",
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Set Up Your Workshop",
    desc: "Register your business, add your team members with the right roles, and set up your inventory. Takes less than 15 minutes.",
  },
  {
    step: "02",
    title: "Start Taking Orders",
    desc: "Create customer profiles, capture measurements, assign tailors, and track every garment through your production pipeline.",
  },
  {
    step: "03",
    title: "Watch Your Business Grow",
    desc: "Use the finance dashboard and AI insights to make smarter decisions, reduce waste, and grow your revenue month over month.",
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

export default function HomePage() {
  return (
    <MarketingShell>
      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white">
        {/* Background texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/40" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
              <Scissors className="h-4 w-4" />
              Smart Systems. Tailored for Success.
            </div>

            {/* Headline */}
            <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              The Complete{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Tailor
              </span>{" "}
              <br className="hidden sm:block" />
              Operating System
            </h1>

            {/* Sub-headline */}
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
              Manage customers, measurements, orders, staff, finances, reports
              and communications from{" "}
              <span className="font-semibold text-white">
                one intelligent platform.
              </span>{" "}
              Built specifically for Kenyan tailoring businesses.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/30 hover:scale-105"
              >
                Get Started Free
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

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-400" />
                Works Offline
              </div>
              <div className="h-1 w-1 rounded-full bg-slate-600" />
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                SMS &amp; WhatsApp
              </div>
              <div className="h-1 w-1 rounded-full bg-slate-600" />
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                Secure &amp; Private
              </div>
              <div className="h-1 w-1 rounded-full bg-slate-600" />
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                Instant Setup
              </div>
            </div>
          </div>

          {/* Hero feature pills */}
          <div className="mt-16 flex flex-wrap justify-center gap-3">
            {[
              "Customer Records",
              "Measurements & Fittings",
              "Production Workflow",
              "Inventory Tracking",
              "Finance Dashboard",
              "Team Management",
              "SMS Notifications",
              "AI Assistant",
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
          BUILT FOR TAILORS STRIP
      ══════════════════════════════════════════════ */}
      <section className="border-b border-t border-emerald-100 bg-emerald-50 py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm font-semibold text-emerald-800">
              Built for Tailors. Designed for Growth.
            </p>
            <p className="text-sm text-emerald-700">
              Plans starting at{" "}
              <strong>KES 690 / month</strong> — Installation from KES 5,000
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
          FEATURES
      ══════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600">
              Everything You Need
            </span>
            <h2 className="text-4xl font-black text-slate-900 sm:text-5xl">
              One platform. Every part
              <br className="hidden sm:block" /> of your business.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
              Stop juggling notebooks, spreadsheets and phone messages. FundiFlow
              brings your entire tailoring operation into one clean, fast app.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
              >
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${color}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}

            {/* AI Assistant card - spans 2 cols on lg */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950 p-6 text-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md sm:col-span-2 lg:col-span-1">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-emerald-500/10" />
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/20">
                  <Bot className="h-6 w-6 text-amber-300" />
                </div>
                <span className="mb-2 inline-block rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
                  New — AI Assistant
                </span>
                <h3 className="mb-2 text-lg font-bold">AI Business Insights</h3>
                <p className="text-sm leading-relaxed text-slate-300">
                  Get intelligent recommendations, stock suggestions and instant
                  answers powered by AI. Your smart business partner, always
                  available.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          ORDER STATUSES (visual strip)
      ══════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">
              Track every order, every step of the way
            </h2>
            <p className="mt-3 text-slate-500">
              From the first measurement to the final delivery — full visibility
              across your entire production pipeline.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { label: "New Order", color: "bg-blue-100 text-blue-700 border-blue-200" },
              { label: "Cutting", color: "bg-violet-100 text-violet-700 border-violet-200" },
              { label: "Stitching", color: "bg-amber-100 text-amber-700 border-amber-200" },
              { label: "Fitting", color: "bg-orange-100 text-orange-700 border-orange-200" },
              { label: "Finishing", color: "bg-teal-100 text-teal-700 border-teal-200" },
              { label: "Ready for Pickup", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
              { label: "Delivered", color: "bg-slate-100 text-slate-700 border-slate-200" },
            ].map(({ label, color }) => (
              <div
                key={label}
                className={`rounded-full border px-5 py-2 text-sm font-semibold ${color}`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

     {/* ══════════════════════════════════════════════
          AI ASSISTANT & SMS COMMUNICATIONS
      ══════════════════════════════════════════════ */}
      <section className="overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          
          {/* AI Assistant Section - First */}
          <div className="mb-20">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
                  <Bot className="h-3.5 w-3.5" /> New — AI Assistant
                </span>
                <h2 className="mb-4 text-4xl font-black leading-tight sm:text-5xl">
                  Your intelligent{" "}
                  <span className="text-amber-300">business partner</span>
                </h2>
                <p className="mb-8 text-lg leading-relaxed text-slate-300">
                  FundiFlow's AI assistant analyses your business data and gives
                  you actionable insights, recommendations and answers — all
                  personalised to your workshop.
                </p>
                <ul className="space-y-3">
                  {AI_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative">
                <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 backdrop-blur-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-400/20 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-amber-300" />
                    </div>
                    <span className="font-semibold text-white">AI Assistant</span>
                    <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                      Interactive
                    </span>
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        type: "ai",
                        msg: "Your revenue is up 23% vs last month. Your best-selling style is the 3-piece suit. You have 3 low-stock fabrics — reorder now?",
                      },
                      { type: "user", msg: "Yes, which fabrics should I reorder?" },
                      {
                        type: "ai",
                        msg: "I recommend: Black Suiting (2.5m remaining), Navy Linen (1m), and White Cotton Poplin (0.5m). Based on your orders this month you'll need at least 12m of each.",
                      },
                    ].map((m, i) => (
                      <div
                        key={i}
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                          m.type === "ai"
                            ? "bg-slate-700 text-slate-200"
                            : "ml-auto bg-emerald-600 text-white"
                        }`}
                      >
                        {m.msg}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-right text-xs text-slate-400">
                    💬 Two-way conversation • Ask follow-up questions
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SMS Communications Section - Separate with divider */}
          <div className="border-t border-slate-700/50 pt-16">
            <div className="mb-10 text-center">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-300">
                <MessageSquare className="h-3.5 w-3.5" /> Automated SMS
              </span>
              <h3 className="text-2xl font-bold text-white sm:text-3xl">
                Keep customers informed with<span className="text-blue-300"> automated SMS</span>
              </h3>
              <p className="mt-2 text-slate-400">
                One-way notifications • Order updates • No AI confusion
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* SMS Card 1 - Delay Notification */}
              <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 backdrop-blur-sm transition hover:border-slate-600">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-400/20 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-blue-300" />
                  </div>
                  <span className="font-semibold text-white">Order Update</span>
                  <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                    Delay Alert
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl bg-slate-700 px-4 py-3 text-sm text-slate-200">
                    <div className="mb-1 text-xs text-slate-400">📱 OUTGOING SMS</div>
                    "Good afternoon Calvince Njia, your order #ON005 (10 white shirts, 20 black trousers) has been delayed. New completion date: Monday, 8 June 2026. We apologise for the inconvenience. — Smart Fabrics Ltd"
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>Automatically triggered when order status changes to 'delayed'</span>
                  </div>
                </div>
              </div>

              {/* SMS Card 2 - Completion Notification */}
              <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 backdrop-blur-sm transition hover:border-slate-600">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-green-400/20 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-green-300" />
                  </div>
                  <span className="font-semibold text-white">Order Update</span>
                  <span className="ml-auto rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                    Ready for Pickup
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl bg-slate-700 px-4 py-3 text-sm text-slate-200">
                    <div className="mb-1 text-xs text-slate-400">📱 OUTGOING SMS</div>
                    "Good afternoon Calvince Njia, your order #ON005 (10 white shirts, 20 black trousers) is complete and ready for pickup. Thank you for choosing Smart Fabrics Ltd."
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>Automatically sent when order status changes to 'completed'</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SMS vs AI Clarification Box */}
            <div className="mt-8 rounded-xl bg-slate-800/40 p-4 border border-slate-700/50">
              <div className="flex flex-wrap gap-6 justify-center text-sm">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-amber-300" />
                  <span className="text-slate-300">AI Assistant:</span>
                  <span className="text-slate-400">Two-way chat • Answers questions • Gives insights</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-300" />
                  <span className="text-slate-300">SMS Alerts:</span>
                  <span className="text-slate-400">One-way notifications • Order updates only • No AI</span>
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
                From solo tailors to large workshops with 20+ staff — FundiFlow's
                role-based access ensures everyone sees exactly what they need,
                nothing more.
              </p>
              <p className="text-sm text-slate-500">
                <strong className="text-slate-900">Owner privacy built in.</strong>{" "}
                Financial earnings, profit data and business insights are private
                to you by default. You decide what your manager can see and when.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              {ROLES.map(({ role, access }, i) => (
                <div
                  key={role}
                  className={`flex items-start justify-between gap-4 rounded-xl px-4 py-3 ${i === 0 ? "bg-emerald-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        i === 0 ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    <span
                      className={`text-sm font-semibold ${i === 0 ? "text-emerald-800" : "text-slate-700"}`}
                    >
                      {role}
                    </span>
                  </div>
                  <span className="text-right text-xs text-slate-500">
                    {access}
                  </span>
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
              Real businesses. Real results. Hear from tailors who transformed
              their operations with FundiFlow.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map(({ name, role, quote, stars }) => (
              <div
                key={name}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="mb-5 text-sm leading-relaxed text-slate-600">
                  &quot;{quote}&quot;
                </p>
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
          <span className="mb-3 inline-block rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600">
            Pricing
          </span>
          <h2 className="mb-4 text-4xl font-black text-slate-900 sm:text-5xl">
            Simple, honest pricing
          </h2>
          <p className="mx-auto mb-10 max-w-lg text-lg text-slate-500">
            Three plans built for every stage of your tailoring journey — from
            solo needle to full enterprise workshop.
          </p>
          <div className="grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
            {[
              { name: "Sindano", swahili: "The Needle", price: "690", color: "border-slate-200" },
              { name: "Fundi", swahili: "The Craftsman", price: "3,690", color: "border-emerald-400 ring-2 ring-emerald-400/30", badge: "Most Popular" },
              { name: "Dhahabu", swahili: "Golden Standard", price: "9,990", color: "border-slate-200" },
            ].map(({ name, swahili, price, color, badge }) => (
              <div
                key={name}
                className={`relative rounded-2xl border bg-white p-6 shadow-sm ${color}`}
              >
                {badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white">
                    {badge}
                  </span>
                )}
                <p className="text-lg font-black text-slate-900">{name}</p>
                <p className="text-xs text-slate-400 mb-4">{swahili}</p>
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
          OFFLINE + PWA
      ══════════════════════════════════════════════ */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Smartphone, title: "Works Offline", desc: "No internet? No problem. FundiFlow syncs in the background and works fully offline on any device." },
              { icon: Clock, title: "Real-Time Sync", desc: "All your data syncs instantly across devices. Your tailor updates an order — you see it immediately." },
              { icon: TrendingUp, title: "Grows With You", desc: "Start solo and scale to 50+ staff. FundiFlow's plans and features grow as your business grows." },
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
            Technology built specifically for modern tailoring businesses. Join
            the tailors already running their workshops with FundiFlow.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-400 hover:scale-105"
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
