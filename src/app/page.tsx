"use client";

import Link from "next/link";
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import {
  Scissors,
  Users,
  Package,
  BarChart3,
  MessageCircle,
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
  Bot,
  Sparkles,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
// TODO: re-enable the public chatbot widget when ready
// import { PublicChatWidget } from "@/modules/ai/components/public-chat-widget";
import { useRef } from "react";
import type { ReactNode } from "react";

// ─── Animation Variants ───────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

const fadeInDown = {
  hidden: { opacity: 0, y: -30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
};

const fadeInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE },
  },
};

// ─── Wrapper Components ───────────────────────────────────────────────────────

function AnimatedSection({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "scale";
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { margin: "-80px", once: true, amount: 0.15 });
  const variants =
    direction === "left"
      ? fadeInLeft
      : direction === "right"
        ? fadeInRight
        : direction === "scale"
          ? scaleIn
          : direction === "down"
            ? fadeInDown
            : fadeInUp;

  return (
    <motion.div
      ref={sectionRef}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={variants}
      transition={{ delay, ...variants.visible.transition }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { margin: "-60px", once: true, amount: 0.1 });
  return (
    <motion.div
      ref={containerRef}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerChild({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const counterRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(counterRef, { once: true, margin: "-50px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 40, stiffness: 80 });
  const displayValue = useTransform(springValue, (v) => `${prefix}${Math.round(v).toLocaleString()}${suffix}`);

  if (inView) {
    motionValue.set(value);
  }

  return (
    <motion.span ref={counterRef}>
      {displayValue}
    </motion.span>
  );
}

// ─── Floating Badge Animation ─────────────────────────────────────────────────

function FloatingBadge({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: EASE }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      {children}
    </motion.span>
  );
}

// ─── Magnetic Button Effect ───────────────────────────────────────────────────

function MagneticButton({ children, className = "", ...props }: any) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.15);
    y.set((e.clientY - centerY) * 0.15);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      className={className}
      {...props}
    >
      {children}
    </motion.a>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

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
    title: "Fabric Inventory",
    desc: "Track fabrics, zippers, buttons and threads in real time. Instant low-stock alerts before you disappoint a customer.",
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
    desc: "List your products on the global tailoring marketplace. Sell retail or wholesale to customers and businesses worldwide.",
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
    desc: "Register your tailoring business, add team members with the right roles and set up your inventory. Takes less than 15 minutes.",
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
    role: "Sole Tailor",
    quote:
      "Before FundiFlow I was losing track of measurements and customers were upset. Now everything is in my phone. My orders are up 40% this year.",
    stars: 5,
  },
  {
    name: "Kevin Otieno",
    role: "Workshop Owner, 8 Tailors",
    quote:
      "The finance dashboard alone is worth every shilling. I finally know exactly how much profit I make each week.",
    stars: 5,
  },
  {
    name: "Fatuma Abdi",
    role: "Boutique Owner",
    quote:
      "The SMS notifications are a game changer. Customers know when their clothes are ready without me calling. So professional.",
    stars: 5,
  },
];

const PIPELINE_STEPS = [
  { label: "New Order", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { label: "Cutting", color: "bg-violet-100 text-violet-700 border-violet-200" },
  { label: "Stitching", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { label: "Fitting", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { label: "Finishing", color: "bg-teal-100 text-teal-700 border-teal-200" },
  { label: "Ready for Pickup", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { label: "Delivered", color: "bg-slate-100 text-slate-700 border-slate-200" },
];

const BADGE_TAGS = [
  "Customer Records",
  "Measurements & Fittings",
  "Production Workflow",
  "Fabric Inventory",
  "Finance Dashboard",
  "Team Management",
  "SMS Notifications",
  "Business Insights",
  "Global Sell Marketplace",
  "POS & Payments",
];

const MARKETPLACE_PRODUCTS = [
  { name: "Men's 3-Piece Suit", store: "Smart Fabrics", price: "6,500", rating: 4.8, color: "bg-slate-700", badge: null },
  { name: "School Uniform Set", store: "Prestige Tailors", price: "1,800", rating: 4.6, color: "bg-blue-700", badge: "Bestseller" },
  { name: "Ladies Office Dress", store: "Elegant Stitch", price: "3,200", rating: 4.9, color: "bg-rose-600", badge: null },
  { name: "Traditional Kanzu", store: "Coastal Threads", price: "2,400", rating: 4.7, color: "bg-amber-700", badge: null },
  { name: "Kids Party Dress", store: "Little Angels", price: "2,800", rating: 4.5, color: "bg-pink-500", badge: null },
  { name: "Bridal Gown", store: "Wedding Belle", price: "18,500", rating: 5.0, color: "bg-emerald-800", badge: "Premium" },
];

const PRICING_PLANS = [
  { name: "Sindano", swahili: "The Needle", price: "690", color: "border-slate-200", badge: null },
  { name: "Fundi", swahili: "The Craftsman", price: "3,690", color: "border-emerald-400 ring-2 ring-emerald-400/30", badge: "Most Popular" },
  { name: "Dhahabu", swahili: "Golden Standard", price: "9,990", color: "border-slate-200", badge: null },
];

// ─── Hero Dashboard with Animations ───────────────────────────────────────────

function HeroDashboard() {
  const miniOrders = [
    { id: "ON-001", customer: "Wanjiku Kamau", status: "Stitching", color: "bg-amber-100 text-amber-700" },
    { id: "ON-002", customer: "Ali Hassan", status: "Cutting", color: "bg-violet-100 text-violet-700" },
    { id: "ON-003", customer: "Grace Muthoni", status: "Ready", color: "bg-emerald-100 text-emerald-700" },
    { id: "ON-004", customer: "David Ochieng", status: "Finishing", color: "bg-teal-100 text-teal-700" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
      className="relative hidden lg:block"
    >
      <motion.div
        className="absolute -inset-6 rounded-3xl bg-emerald-500/10 blur-2xl"
        animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-800 shadow-2xl"
        whileHover={{ y: -4, transition: { duration: 0.3 } }}
      >
        <div className="flex items-center gap-3 bg-slate-700 px-4 py-2.5">
          <div className="flex shrink-0 gap-1.5">
            <motion.div
              className="h-2.5 w-2.5 rounded-full bg-red-400/90"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="h-2.5 w-2.5 rounded-full bg-yellow-400/90"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="h-2.5 w-2.5 rounded-full bg-green-400/90"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
          </div>
          <div className="flex-1 rounded-md bg-slate-600 px-3 py-1 text-center text-xs text-slate-400">
            🔒 www.fundiflow.com/dashboard
          </div>
        </div>

        <div className="flex" style={{ height: "400px" }}>
          <div className="flex w-11 shrink-0 flex-col items-center gap-1.5 bg-slate-900 py-4">
            <div className="mb-2.5 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600">
              <Scissors className="h-3.5 w-3.5 text-white" />
            </div>
            {[LayoutDashboard, ShoppingCart, Users, Package, DollarSign, BarChart3, Globe].map((Icon, i) => (
              <motion.div
                key={i}
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  i === 0 ? "bg-emerald-600" : "text-slate-500"
                }`}
                whileHover={{ scale: 1.15, backgroundColor: "rgba(5, 150, 105, 0.3)" }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Icon className="h-3.5 w-3.5 text-slate-300" />
              </motion.div>
            ))}
          </div>

          <div className="flex-1 overflow-hidden bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Smart Fabrics Ltd</p>
                <p className="text-[10px] text-slate-400">Dashboard · June 2026</p>
              </div>
              <div className="flex items-center gap-1.5">
                <motion.div
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-[10px] font-semibold text-emerald-600">Live</span>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              {[
                { label: "Revenue", value: "KES 142K", sub: "+8.8%" },
                { label: "Active Orders", value: "23", sub: "47 total" },
                { label: "Customers", value: "186", sub: "4 new today" },
                { label: "Low Stock", value: "3 items", sub: "reorder now" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                  className="rounded-xl border border-slate-200 bg-white p-2"
                  whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                >
                  <p className="text-[9px] text-slate-400">{s.label}</p>
                  <p className="text-xs font-black text-slate-900">{s.value}</p>
                  <p className="text-[9px] font-medium text-emerald-600">{s.sub}</p>
                </motion.div>
              ))}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5">
                <p className="text-[10px] font-semibold text-slate-600">Recent Orders</p>
              </div>
              {miniOrders.map((o, i) => (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.12, duration: 0.4 }}
                  className="flex items-center gap-2 border-b border-slate-100 px-3 py-1.5 last:border-0"
                  whileHover={{ backgroundColor: "rgba(241,245,249,1)" }}
                >
                  <span className="w-12 shrink-0 font-mono text-[10px] text-slate-500">{o.id}</span>
                  <span className="flex-1 truncate text-[10px] font-medium text-slate-800">{o.customer}</span>
                  <motion.span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${o.color}`}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                  >
                    {o.status}
                  </motion.span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Marketplace Preview with Animations ──────────────────────────────────────

function MarketplacePreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, ease: EASE }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
    >
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600">
          <Globe className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Global Sell</p>
          <p className="text-xs text-slate-400">by FundiFlow</p>
        </div>
        <div className="ml-auto flex gap-2 text-xs">
          {["All", "Retail", "Wholesale"].map((tab) => (
            <motion.span
              key={tab}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 cursor-pointer"
              whileHover={{ backgroundColor: "#ecfdf5", borderColor: "#6ee7b7" }}
            >
              {tab}
            </motion.span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 p-4">
        {MARKETPLACE_PRODUCTS.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
            whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0,0,0,0.1)", transition: { duration: 0.25 } }}
          >
            <div className={`relative h-20 ${p.color}`}>
              {p.badge && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1, type: "spring", stiffness: 200 }}
                  className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-slate-800"
                >
                  {p.badge}
                </motion.span>
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
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Scroll Progress Bar ──────────────────────────────────────────────────────

function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 origin-left z-50"
    />
  );
}

// ─── Parallax Background ──────────────────────────────────────────────────────

function ParallaxHeroBg() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 600], [0, -100]);
  const y2 = useTransform(scrollY, [0, 600], [0, -50]);

  return (
    <>
      <motion.div
        style={{ y: y1 }}
        className="absolute top-20 left-10 h-72 w-72 rounded-full bg-emerald-500/5 blur-3xl"
      />
      <motion.div
        style={{ y: y2 }}
        className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-teal-500/5 blur-3xl"
      />
    </>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <MarketingShell>
      <ScrollProgressBar />
      {/* TODO: re-enable when the public chatbot widget is ready */}
      {/* <PublicChatWidget /> */}

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white">
        <ParallaxHeroBg />
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
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE }}
                className="mb-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl"
              >
                The Complete{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  Tailoring
                </span>{" "}
                Business OS
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
                className="mb-4 text-lg leading-relaxed text-slate-300"
              >
                Manage customers, measurements, orders, inventory, finances, staff and communications from{" "}
                <span className="font-semibold text-white">one connected platform.</span>{" "}
                Built for tailors, fashion designers and garment businesses.
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
                className="mb-8 flex items-center gap-2 text-sm font-medium text-emerald-300"
              >
                <motion.span
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Globe className="h-4 w-4" />
                </motion.span>
                <strong className="text-white">Global Sell</strong> — dedicated tailoring marketplace, built in.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
                className="flex flex-col items-start gap-4 sm:flex-row"
              >
                <MagneticButton
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400"
                >
                  Get Started Free Trial
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </motion.span>
                </MagneticButton>
                <MagneticButton
                  href={DEMO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  <MessageCircle className="h-5 w-5" />
                  Request a Demo
                </MagneticButton>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="mt-8 flex flex-wrap gap-5 text-sm text-slate-400"
              >
                {[
                  { Icon: Smartphone, text: "Works Offline" },
                  { Icon: MessageCircle, text: "SMS & WhatsApp" },
                  { Icon: Shield, text: "Secure & Private" },
                  { Icon: Zap, text: "Instant Setup" },
                ].map(({ Icon, text }) => (
                  <motion.div
                    key={text}
                    className="flex items-center gap-2"
                    whileHover={{ scale: 1.05, color: "#10b981" }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Icon className="h-4 w-4 text-emerald-400" />
                    {text}
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <HeroDashboard />
          </div>

          {/* Feature Badge Tags with Stagger */}
          <StaggerContainer className="mt-12 flex flex-wrap justify-center gap-2.5">
            {BADGE_TAGS.map((f) => (
              <StaggerChild key={f}>
                <span className="rounded-full border border-slate-700 bg-slate-800/60 px-4 py-1.5 text-sm font-medium text-slate-300 inline-block">
                  {f}
                </span>
              </StaggerChild>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="border-y border-emerald-100 bg-emerald-50 py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left"
          >
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
          </motion.div>
        </div>
      </section>

      {/* Tailoring Focus / Features */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <AnimatedSection>
              <span className="mb-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
                Tailoring-Specific Features
              </span>
            </AnimatedSection>
            <AnimatedSection delay={0.1}>
              <h2 className="text-4xl font-black text-slate-900 sm:text-5xl">
                Everything a tailor needs
              </h2>
            </AnimatedSection>
            <AnimatedSection delay={0.2}>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
                From measurements to delivery — FundiFlow is built specifically for the tailoring industry.
              </p>
            </AnimatedSection>
          </div>

          <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <StaggerChild key={title}>
                <motion.div
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                >
                  <motion.div
                    className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${color}`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <Icon className="h-6 w-6" />
                  </motion.div>
                  <h3 className="mb-2 text-lg font-bold text-slate-900">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
                </motion.div>
              </StaggerChild>
            ))}

            <StaggerChild>
              <motion.div
                className="group relative col-span-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950 p-6 text-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md sm:col-span-2 lg:col-span-1 lg:col-start-3"
                whileHover={{ y: -6 }}
              >
                <motion.div
                  className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-emerald-500/10"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="relative">
                  <motion.div
                    className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/20"
                    animate={{ rotate: [0, 5, 0, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Lightbulb className="h-6 w-6 text-amber-300" />
                  </motion.div>
                  <span className="mb-2 inline-block rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
                    Built In — Business Insights
                  </span>
                  <h3 className="mb-2 text-lg font-bold">Smart Business Insights</h3>
                  <p className="text-sm leading-relaxed text-slate-300">
                    Your data, turned into clear recommendations — revenue trends, best-selling styles and stock reorder alerts surfaced automatically, the moment they matter.
                  </p>
                </div>
              </motion.div>
            </StaggerChild>
          </StaggerContainer>
        </div>
      </section>

      {/* Order Pipeline */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AnimatedSection>
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">
                Track every order, every step of the way
              </h2>
              <p className="mt-3 text-slate-500">
                From first measurement to final delivery — full visibility across your production pipeline.
              </p>
            </div>
          </AnimatedSection>

          <StaggerContainer className="flex flex-wrap items-center justify-center gap-2">
            {PIPELINE_STEPS.map(({ label, color }, i, arr) => (
              <StaggerChild key={label} className="flex items-center gap-2">
                <motion.div
                  className={`rounded-full border px-5 py-2 text-sm font-semibold ${color}`}
                  whileHover={{ scale: 1.08, y: -3 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {label}
                </motion.div>
                {i < arr.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.3 + i * 0.15, duration: 0.3 }}
                    className="origin-left"
                  >
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </motion.div>
                )}
              </StaggerChild>
            ))}
          </StaggerContainer>

          <StaggerContainer className="mt-10 grid gap-4 sm:grid-cols-3">
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
              <StaggerChild key={o.id}>
                <motion.div
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  whileHover={{ y: -4, boxShadow: "0 12px 30px rgba(0,0,0,0.08)" }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-semibold text-slate-500">{o.id}</p>
                      <p className="text-sm font-bold text-slate-900">{o.customer}</p>
                      <p className="text-xs text-slate-500">{o.garment}</p>
                    </div>
                    <motion.span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${o.statusColor}`}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    >
                      {o.status}
                    </motion.span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span>👔 {o.tailor}</span>
                    <span>📅 Due {o.due}</span>
                    <span className="font-semibold text-slate-900">{o.amount}</span>
                  </div>
                </motion.div>
              </StaggerChild>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Global Sell Marketplace */}
      <section className="overflow-hidden bg-gradient-to-br from-emerald-950 to-slate-900 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <AnimatedSection direction="left">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
                  <motion.span
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  >
                    <Globe className="h-4 w-4" />
                  </motion.span>
                  Global Sell — Built-in Marketplace
                </div>
              </AnimatedSection>

              <AnimatedSection direction="left" delay={0.1}>
                <h2 className="mb-4 text-4xl font-black leading-tight sm:text-5xl">
                  Your workshop.{" "}
                  <span className="text-emerald-400">Online.</span>
                  <br />
                  Worldwide.
                </h2>
              </AnimatedSection>

              <AnimatedSection direction="left" delay={0.2}>
                <p className="mb-6 text-lg leading-relaxed text-slate-300">
                  <strong className="text-white">Global Sell</strong> is FundiFlow's built-in B2C and B2B marketplace — purpose-built for tailoring businesses. Set up your verified seller store, list your products, and start reaching customers and wholesale buyers across the globe.
                </p>
              </AnimatedSection>

              <StaggerContainer className="mb-8 grid gap-6 sm:grid-cols-2">
                <StaggerChild>
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
                      ].map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </StaggerChild>

                <StaggerChild>
                  <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20">
                        <ShoppingCart className="h-4 w-4 text-blue-400" />
                      </div>
                      <p className="font-semibold text-white">For Buyers</p>
                    </div>
                    <ul className="space-y-1.5 text-sm text-slate-300">
                      {[
                        "Browse verified tailors worldwide",
                        "Retail & Wholesale channels",
                        "Product variants (size, colour, etc.)",
                        "Secure cart & checkout",
                        "Real-time order tracking",
                      ].map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </StaggerChild>
              </StaggerContainer>

              <AnimatedSection direction="left" delay={0.3}>
                <div className="flex flex-wrap gap-3">
                  <MagneticButton
                      //have disabled link to global seel for now untill thre are goods there. link href="/globalsell"
                    href="#"
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-400"
                  >
                    <Globe className="h-4 w-4" />
                    Shop the Marketplace
                  </MagneticButton>
                  <MagneticButton
                  //href="/register"
                    href="#"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                  >
                    <Store className="h-4 w-4" />
                    Start Selling
                  </MagneticButton>
                </div>
              </AnimatedSection>
            </div>

            <AnimatedSection direction="right" delay={0.2}>
              <MarketplacePreview />
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Business Insights & AI Assistant */}
      <section className="overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Business Insights */}
          <div className="mb-16">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <AnimatedSection direction="left">
                  <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
                    <Lightbulb className="h-3.5 w-3.5" /> Built-In Business Insights
                  </span>
                  <h2 className="mb-4 text-4xl font-black leading-tight sm:text-5xl">
                    Decisions backed by{" "}
                    <span className="text-amber-300">your own numbers</span>
                  </h2>
                  <p className="mb-8 text-lg leading-relaxed text-slate-300">
                    FundiFlow reads the data you already capture — orders, payments, stock and staff activity — and turns it into clear, actionable insights for your business.
                  </p>
                </AnimatedSection>

                <StaggerContainer className="space-y-3">
                  {INSIGHTS_FEATURES.map((f) => (
                    <StaggerChild key={f}>
                      <motion.div
                        className="flex items-start gap-3 text-sm"
                        whileHover={{ x: 8, transition: { duration: 0.2 } }}
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <span className="text-slate-300">{f}</span>
                      </motion.div>
                    </StaggerChild>
                  ))}
                </StaggerContainer>
              </div>

              <AnimatedSection direction="right" delay={0.2}>
                <motion.div
                  className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 backdrop-blur-sm"
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/20">
                      <Lightbulb className="h-4 w-4 text-amber-300" />
                    </div>
                    <span className="font-semibold text-white">This Week's Insights</span>
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
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.15, duration: 0.5 }}
                        className="rounded-2xl bg-slate-700 px-4 py-3 text-sm text-slate-200"
                        whileHover={{ scale: 1.02, backgroundColor: "rgba(51,65,85,1)" }}
                      >
                        <span className={`mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${m.tagColor}`}>
                          {m.tag}
                        </span>
                        <p>{m.msg}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatedSection>
            </div>
          </div>

          {/* AI Assistant */}
          <div className="border-t border-slate-700/50 pt-16">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <AnimatedSection direction="right">
                <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 backdrop-blur-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <motion.div
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-400/20"
                      animate={{ boxShadow: ["0 0 0px rgba(168,85,247,0)", "0 0 20px rgba(168,85,247,0.3)", "0 0 0px rgba(168,85,247,0)"] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <Bot className="h-4 w-4 text-purple-300" />
                    </motion.div>
                    <span className="font-semibold text-white">Your AI Assistant</span>
                    <span className="ml-auto rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
                      Always available
                    </span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { icon: Sparkles, text: "I notice you have 5 orders due this week and your team is at 80% capacity. Would you like me to recommend which orders to prioritize?" },
                      { icon: Sparkles, text: "Your most profitable service is custom tailoring at KES 12,500 average. Consider promoting this service to boost margins." },
                    ].map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
                        className="rounded-2xl bg-slate-700 px-4 py-3 text-sm text-slate-200"
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="mb-1.5 flex items-center gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20">
                            <Sparkles className="h-3 w-3 text-purple-300" />
                          </div>
                          <span className="text-xs text-purple-300 font-semibold">AI Assistant</span>
                        </div>
                        <p>{msg.text}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </AnimatedSection>

              <AnimatedSection direction="left" delay={0.1}>
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-purple-300">
                  <Bot className="h-3.5 w-3.5" /> Personal AI Assistant
                </span>
                <h2 className="mb-4 text-4xl font-black leading-tight sm:text-5xl">
                  Your AI-Powered{" "}
                  <span className="text-purple-300">Business Coach</span>
                </h2>
                <p className="mb-8 text-lg leading-relaxed text-slate-300">
                  FundiFlow's AI assistant analyzes your business data to provide personalized recommendations, answer questions about your performance, and surface opportunities you might have missed.
                </p>
                <StaggerContainer className="space-y-3">
                  {[
                    "Analyze revenue trends and identify growth opportunities",
                    "Detect operational bottlenecks before they impact delivery",
                    "Suggest optimal staffing levels based on order volume",
                    "Recommend product mix adjustments for better profitability",
                    "Answer questions about your business performance instantly",
                  ].map((f) => (
                    <StaggerChild key={f}>
                      <motion.div
                        className="flex items-start gap-3 text-sm"
                        whileHover={{ x: 8, transition: { duration: 0.2 } }}
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                        <span className="text-slate-300">{f}</span>
                      </motion.div>
                    </StaggerChild>
                  ))}
                </StaggerContainer>
              </AnimatedSection>
            </div>
          </div>

          {/* Automated SMS */}
          <div className="mt-16 border-t border-slate-700/50 pt-16">
            <AnimatedSection>
              <div className="mb-10 text-center">
                <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-300">
                  <MessageCircle className="h-3.5 w-3.5" /> Automated SMS
                </span>
                <h3 className="text-2xl font-bold text-white sm:text-3xl">
                  Keep customers informed with <span className="text-blue-300">automated SMS</span>
                </h3>
                <p className="mt-2 text-slate-400">One-way notifications · Order updates · Sent automatically</p>
              </div>
            </AnimatedSection>

            <StaggerContainer className="grid gap-6 md:grid-cols-2">
              <StaggerChild>
                <motion.div
                  className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 backdrop-blur-sm"
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-400/20">
                      <MessageCircle className="h-4 w-4 text-blue-300" />
                    </div>
                    <span className="font-semibold text-white">Delay Alert</span>
                  </div>
                  <motion.div
                    className="rounded-2xl bg-slate-700 px-4 py-3 text-sm text-slate-200"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <div className="mb-1 text-xs text-slate-400">📱 OUTGOING SMS</div>
                    "Good afternoon Calvince Njia, your order #ON005 (10 white shirts, 20 black trousers) has been delayed. New completion date: Monday, 8 June 2026. We apologise for the inconvenience."
                  </motion.div>
                </motion.div>
              </StaggerChild>

              <StaggerChild>
                <motion.div
                  className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 backdrop-blur-sm"
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-400/20">
                      <MessageCircle className="h-4 w-4 text-green-300" />
                    </div>
                    <span className="font-semibold text-white">Ready for Pickup</span>
                  </div>
                  <motion.div
                    className="rounded-2xl bg-slate-700 px-4 py-3 text-sm text-slate-200"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    <div className="mb-1 text-xs text-slate-400">📱 OUTGOING SMS</div>
                    "Good afternoon Calvince Njia, your order #ON005 is complete and ready for pickup. Thank you for choosing Smart Fabrics Ltd."
                  </motion.div>
                </motion.div>
              </StaggerChild>
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AnimatedSection>
            <div className="mb-14 text-center">
              <span className="mb-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600">
                How It Works
              </span>
              <h2 className="text-4xl font-black text-slate-900 sm:text-5xl">
                Up and running in one day
              </h2>
            </div>
          </AnimatedSection>

          <StaggerContainer className="grid gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <StaggerChild key={step}>
                <motion.div className="text-center">
                  <motion.div
                    className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-black text-white shadow-lg shadow-emerald-600/20"
                    whileHover={{ scale: 1.1, rotate: 5, transition: { type: "spring", stiffness: 200 } }}
                  >
                    {step}
                  </motion.div>
                  <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
                </motion.div>
              </StaggerChild>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Role-Based Access */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <AnimatedSection direction="left">
                <span className="mb-3 inline-block rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600">
                  Team Management
                </span>
                <h2 className="mb-4 text-4xl font-black text-slate-900 sm:text-5xl">
                  The right access for every role
                </h2>
                <p className="mb-6 text-lg text-slate-500">
                  From solo tailors to large workshops with 50+ staff — FundiFlow's role-based access ensures everyone sees exactly what they need, nothing more.
                </p>
                <p className="text-sm text-slate-500">
                  <strong className="text-slate-900">Owner privacy built in.</strong>{" "}
                  Financial earnings, profit data and business insights are private to you by default.
                </p>
              </AnimatedSection>
            </div>

            <AnimatedSection direction="right" delay={0.2}>
              <motion.div
                className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
                whileHover={{ y: -4, boxShadow: "0 12px 30px rgba(0,0,0,0.06)" }}
                transition={{ duration: 0.3 }}
              >
                {ROLES.map(({ role, access }, i) => (
                  <motion.div
                    key={role}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className={`flex items-start justify-between gap-4 rounded-xl px-4 py-3 ${i === 0 ? "bg-emerald-50" : ""}`}
                    whileHover={{ backgroundColor: i === 0 ? "#ecfdf5" : "#f8fafc" }}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        className={`h-2 w-2 rounded-full ${i === 0 ? "bg-emerald-500" : "bg-slate-300"}`}
                        animate={i === 0 ? { scale: [1, 1.3, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <span className={`text-sm font-semibold ${i === 0 ? "text-emerald-800" : "text-slate-700"}`}>
                        {role}
                      </span>
                    </div>
                    <span className="text-right text-xs text-slate-500">{access}</span>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AnimatedSection>
            <div className="mb-14 text-center">
              <h2 className="text-4xl font-black text-slate-900 sm:text-5xl">
                Trusted by tailors worldwide
              </h2>
              <p className="mt-3 text-slate-500">
                Real businesses. Real results. Hear from tailors who transformed their operations with FundiFlow.
              </p>
            </div>
          </AnimatedSection>

          <StaggerContainer className="grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map(({ name, role, quote, stars }) => (
              <StaggerChild key={name}>
                <motion.div
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  whileHover={{ y: -6, boxShadow: "0 16px 40px rgba(0,0,0,0.08)" }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="mb-3 flex gap-0.5"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                  >
                    {Array.from({ length: stars }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0, rotate: -180 }}
                        whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
                      >
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      </motion.div>
                    ))}
                  </motion.div>
                  <p className="mb-5 text-sm leading-relaxed text-slate-600">"{quote}"</p>
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700"
                      whileHover={{ scale: 1.15 }}
                    >
                      {name[0]}
                    </motion.div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{name}</p>
                      <p className="text-xs text-slate-500">{role}</p>
                    </div>
                  </div>
                </motion.div>
              </StaggerChild>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <AnimatedSection>
            <span className="mb-3 inline-block rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600">
              Pricing
            </span>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <h2 className="mb-4 text-4xl font-black text-slate-900 sm:text-5xl">
              Simple, honest pricing
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <p className="mx-auto mb-10 max-w-lg text-lg text-slate-500">
              Three plans built for every stage of your tailoring journey — from solo needle to full enterprise workshop.
            </p>
          </AnimatedSection>

          <StaggerContainer className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            {PRICING_PLANS.map(({ name, swahili, price, color, badge }) => (
              <StaggerChild key={name}>
                <motion.div
                  className={`relative rounded-2xl border bg-white p-6 shadow-sm ${color}`}
                  whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3 } }}
                >
                  {badge && (
                    <motion.span
                      initial={{ opacity: 0, y: -10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white"
                    >
                      {badge}
                    </motion.span>
                  )}
                  <p className="text-lg font-black text-slate-900">{name}</p>
                  <p className="mb-4 text-xs text-slate-400">{swahili}</p>
                  <p className="text-3xl font-black text-slate-900">
                    KES {price}
                    <span className="text-sm font-normal text-slate-400">/mo</span>
                  </p>
                </motion.div>
              </StaggerChild>
            ))}
          </StaggerContainer>

          <AnimatedSection delay={0.4}>
            <div className="mt-8">
              <MagneticButton
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-4 text-base font-bold text-white transition-all hover:bg-slate-800"
              >
                See Full Pricing Details
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="h-5 w-5" />
                </motion.span>
              </MagneticButton>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* PWA / Offline Strip */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <StaggerContainer className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Smartphone, title: "Works Offline", desc: "No internet? No problem. FundiFlow syncs in the background and works fully offline on any device." },
              { icon: Clock, title: "Real-Time Sync", desc: "All your data syncs instantly across devices. Your tailor updates an order — you see it immediately." },
              { icon: TrendingUp, title: "Grows With You", desc: "Start solo and scale to 50+ staff. FundiFlow's plans and features grow as your business grows." },
            ].map(({ icon: Icon, title, desc }) => (
              <StaggerChild key={title}>
                <motion.div
                  className="flex gap-4"
                  whileHover={{ x: 6, transition: { duration: 0.2 } }}
                >
                  <motion.div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <Icon className="h-5 w-5 text-emerald-700" />
                  </motion.div>
                  <div>
                    <h3 className="mb-1 font-bold text-slate-900">{title}</h3>
                    <p className="text-sm text-slate-500">{desc}</p>
                  </div>
                </motion.div>
              </StaggerChild>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 py-24 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <AnimatedSection>
            <h2 className="mb-4 text-5xl font-black leading-tight sm:text-6xl">
              Work Smart.{" "}
              <span className="text-emerald-400">Deliver Perfect.</span>
              <br />
              <span className="text-amber-300">Grow Faster.</span>
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <p className="mx-auto mb-10 max-w-lg text-lg text-slate-300">
              Technology built for modern tailoring businesses. Join the tailors already running their operations with FundiFlow.
            </p>
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <MagneticButton
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-400"
              >
                Get Started Today
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="h-5 w-5" />
                </motion.span>
              </MagneticButton>
              <MagneticButton
                href={DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <MessageCircle className="h-5 w-5" />
                Request a Demo
              </MagneticButton>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.3}>
            <p className="mt-6 text-sm text-slate-500">
              📞 0142 225 233 · ✉️ adventnurutech@gmail.com
            </p>
          </AnimatedSection>
        </div>
      </section>
    </MarketingShell>
  );
}
