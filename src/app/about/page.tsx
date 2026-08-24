import Link from "next/link";
import {
  Scissors,
  Users,
  ShoppingBag,
  Boxes,
  LineChart,
  Globe,
  Bot,
  MessageCircle,
  ArrowRight,
  WifiOff,
  Sparkles,
  Truck,
  ReceiptText,
  Building2,
  PackageCheck,
  Bell,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { getFreeTrialEnabled } from "@/lib/billing/free-trial-flag";

export const metadata = {
  title: "About FundiFlow",
  description:
    "FundiFlow connects customers, tailoring orders, production, delivery, inventory, payments, finance, customer accounts, teams and online selling in one platform.",
};

const DEMO_URL =
  "https://wa.me/254142225233?text=Hi%2C%20I'd%20like%20to%20request%20a%20demo%20of%20FundiFlow";

const WHAT_IT_MANAGES = [
  { icon: Users, title: "Customers & Measurements", desc: "Profiles, fitting notes, preferences, groups and complete order history in one record." },
  { icon: ShoppingBag, title: "Orders & Production", desc: "Track garments, assignments and every configurable workflow stage from intake to completion." },
  { icon: Truck, title: "Delivery & Tracking", desc: "Manage ready and dispatched work, due dates and public customer tracking links." },
  { icon: Boxes, title: "Inventory & Purchasing", desc: "Materials, stock movements, low-stock alerts, suppliers, purchase orders and consumption." },
  { icon: ReceiptText, title: "Payments & Documents", desc: "Deposits, part-payments, balances, numbered invoices and printable payment receipts." },
  { icon: LineChart, title: "Complete Finance", desc: "Revenue, expenses, withdrawals, savings, investments, transactions and reports." },
  { icon: Building2, title: "Teams & Branches", desc: "Role permissions plus separate stock, customers, orders and finance for each branch." },
  { icon: PackageCheck, title: "Customer Accounts", desc: "Customers see workshop and marketplace orders, payments, balances and support in one login." },
  { icon: Globe, title: "Global Sell", desc: "Public storefronts, retail and wholesale listings, variants, checkout and order fulfilment." },
  { icon: Bot, title: "AI & Insights", desc: "Ask questions about your orders, sales, payments and stock using your own business data." },
  { icon: Bell, title: "Communication", desc: "SMS allowances, supported WhatsApp tools, in-app messages and team notifications." },
  { icon: WifiOff, title: "Offline-first PWA", desc: "Install FundiFlow on your device and keep working through unreliable connectivity." },
];

const BUILT_FOR = [
  "Solo tailors",
  "Fashion designers",
  "Dressmakers",
  "Uniform manufacturers",
  "Fashion workshops",
  "Tailor shops",
  "Fashion houses",
  "Multi-branch businesses",
];

export default async function AboutPage() {
  const freeTrialEnabled = await getFreeTrialEnabled();
  return (
    <MarketingShell>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
            <Sparkles className="h-4 w-4" />
            About FundiFlow
          </span>
          <h1 className="mb-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            The complete operating system for{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              tailoring and fashion
            </span>{" "}
            businesses.
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-300">
            FundiFlow exists to give tailoring and fashion businesses the connected tools that
            larger enterprises take for granted — without the complexity or the need to become
            a software expert. Orders, workshop operations, money and customer service move
            together instead of living in separate notebooks and apps.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400"
            >
              Start {freeTrialEnabled ? "your free trial" : "now"}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              <MessageCircle className="h-5 w-5" />
              Request a demo
            </a>
          </div>
        </div>
      </section>

      {/* ── WHY ── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <span className="mb-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Why we built it
            </span>
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">
              The businesses that clothe our communities deserve modern tools
            </h2>
          </div>
          <div className="space-y-5 text-lg leading-relaxed text-slate-600">
            <p>
              We built FundiFlow because we believe the people who make, measure, cut, stitch
              and deliver deserve better. A tailor who runs a one-person shop should be able to
              manage customers, orders and money as confidently as a fashion house with thirty
              employees and fifteen branches.
            </p>
            <p>
              So we built a platform that works for both. It starts simple, grows with you, and
              never asks you to re-learn your own business. From a single needle to a full
              fashion house — the system is the same.
            </p>
          </div>
        </div>
      </section>

      {/* ── WHAT IT MANAGES ── */}
      <section className="bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
              One platform
            </span>
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">
              Everything, connected
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-500">
              From the first customer measurement to delivery, receipt and repeat order,
              FundiFlow keeps the work and the numbers connected.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {WHAT_IT_MANAGES.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={`${title}-${i}`}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 font-bold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/features"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            >
              View the complete feature list <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── BUILT FOR ── */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
                <Scissors className="h-3.5 w-3.5" /> Built for the craft
              </span>
              <h2 className="mb-4 text-3xl font-black text-slate-900 sm:text-4xl">
                Made for every stage of the craft
              </h2>
              <p className="leading-relaxed text-slate-600">
                FundiFlow is designed for the people who make, measure, cut, stitch and deliver.
                No matter where you start, the platform grows with you — from a single needle to
                a full fashion house.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BUILT_FOR.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                    <Scissors className="h-4 w-4 text-emerald-600" />
                  </span>
                  <span className="font-semibold text-slate-800">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── OFFLINE-FIRST ── */}
      <section className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <WifiOff className="mx-auto mb-5 h-10 w-10 text-emerald-400" />
          <h2 className="mb-4 text-3xl font-black sm:text-4xl">
            Works where you work
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-300">
            FundiFlow is a Progressive Web App built to work{" "}
            <strong className="text-white">offline-first</strong>. It runs on your phone, tablet
            or computer, and it keeps working even when the internet doesn&apos;t. Every order
            you record offline syncs automatically the moment you&apos;re back online — because in
            this business, work doesn&apos;t wait for a signal.
          </p>
        </div>
      </section>

      {/* ── OUR PROMISE + CTA ── */}
      <section className="py-20 text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-4 text-3xl font-black text-slate-900 sm:text-4xl">Our promise</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-slate-600">
            We don&apos;t sell software for the sake of selling software. We measure our success the
            same way you do — in better-managed businesses, more on-time deliveries, and owners
            who finally understand their own numbers.
          </p>
          <p className="mb-10 text-lg font-semibold text-emerald-700">
            Trusted tools. Honest pricing. Built for the craft.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-emerald-500"
            >
              Start {freeTrialEnabled ? "your free trial" : "now"}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-8 py-4 text-base font-bold text-slate-800 transition-all hover:bg-slate-50"
            >
              <MessageCircle className="h-5 w-5" />
              Request a demo
            </a>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
