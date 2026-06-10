import Link from "next/link";
import {
  CheckCircle2,
  X,
  MessageCircle,
  ArrowRight,
  Scissors,
  Users,
  Package,
  BarChart3,
  Bot,
  Shield,
  Zap,
  HeadphonesIcon,
  Globe,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";

const DEMO_URL =
  "https://wa.me/254142225233?text=Hi%2C%20I'd%20like%20to%20request%20a%20demo%20of%20FundiFlow";

interface Plan {
  id: string;
  name: string;
  swahili: string;
  meaning: string;
  tagline: string;
  monthlyPrice: number;
  installationFee: number;
  highlight: boolean;
  badge?: string;
  color: string;
  accentColor: string;
  iconBg: string;
  description: string;
  features: Array<{ text: string; included: boolean; note?: string }>;
  cta: string;
  ctaHref: string;
}

const PLANS: Plan[] = [
  {
    id: "sindano",
    name: "Sindano",
    swahili: "سِنْدَانُو — The Needle",
    meaning: "Every master tailor starts with a single needle.",
    tagline: "Perfect for solo tailors & small workshops",
    monthlyPrice: 690,
    installationFee: 5075,
    highlight: false,
    color: "border-slate-200",
    accentColor: "text-slate-700",
    iconBg: "bg-slate-100",
    description:
      "Get your tailoring business organised and professional from day one. Sindano gives you the core tools to manage customers, track orders and never miss a payment — without complexity.",
    features: [
      { text: "1 user account (owner only)", included: true },
      { text: "Up to 100 customer records", included: true },
      { text: "Up to 80 active orders per month", included: true },
      { text: "Customer measurements & fitting notes", included: true },
      { text: "Basic production workflow tracking", included: true },
      { text: "Basic inventory tracking (up to 50 items)", included: true },
      { text: "Payment recording (Cash & M-Pesa)", included: true },
      { text: "SMS notifications — 50 per month", included: true },
      { text: "Mobile-optimised dashboard (PWA)", included: true },
      { text: "Offline mode — works without internet", included: true },
      { text: "Email support (48 hr response)", included: true },
      { text: "Full finance dashboard", included: false },
      { text: "Team & role management", included: false },
      { text: "WhatsApp notifications", included: false },
      { text: "Analytics & business reports", included: false },
      { text: "AI Assistant limited access", included: true },
    ],
    cta: "Start with Sindano",
    ctaHref: "/checkout?plan=sindano",
  },
  {
    id: "fundi",
    name: "Fundi",
    swahili: "فُنْدِي — The Craftsman",
    meaning: "The expert who builds something lasting.",
    tagline: "For growing workshops with a team",
    monthlyPrice: 3690,
    installationFee: 28420,
    highlight: true,
    badge: "Most Popular",
    color: "border-emerald-400",
    accentColor: "text-emerald-700",
    iconBg: "bg-emerald-100",
    description:
      "Your workshop is growing and you need real tools. Fundi unlocks the full power of FundiFlow — team management, complete finance visibility, analytics and multi-role access — so you can run a tight, profitable operation.",
    features: [
      { text: "Up to 10 user accounts", included: true },
      { text: "Unlimited customer records", included: true },
      { text: "Unlimited orders", included: true },
      { text: "Full measurements, fittings & style records", included: true },
      { text: "Full production workflow (6 stages)", included: true },
      { text: "Full inventory + purchase orders + suppliers", included: true },
      { text: "Complete finance dashboard", included: true, note: "Owner-controlled visibility" },
      { text: "Expenses, withdrawals, savings & investments", included: true },
      { text: "Weekly, monthly & yearly finance reports", included: true },
      { text: "Payment recording (Cash, M-Pesa, POS)", included: true },
      { text: "SMS notifications — 700 per month", included: true },
      { text: "WhatsApp order notifications", included: true },
      { text: "Analytics — sales trends, popular styles, KPIs", included: true },
      { text: "Role-based team management (6 roles)", included: true },
      { text: "Offline mode — works without internet", included: true },
      { text: "Priority support (12 hr response)", included: true },
      { text: "AI Assistant", included: true },
      { text: "Custom SMS Sender ID additional cost 30200 KES", included: false },
    ],
    cta: "Start with Fundi",
    ctaHref: "/checkout?plan=fundi",
  },
  {
    id: "dhahabu",
    name: "Dhahabu",
    swahili: "ذَهَب Golden Standard",
    meaning: "The pinnacle of craft. The measure of excellence.",
    tagline: "For established tailoring houses & enterprises",
    monthlyPrice: 9990,
    installationFee: 43990,
    highlight: false,
    color: "border-amber-400",
    accentColor: "text-amber-700",
    iconBg: "bg-amber-100",
    description:
      "The complete, unrestricted FundiFlow experience — purpose-built for high-volume tailoring enterprises, multi-location boutiques and fashion houses that demand the best technology, deepest insights and hands-on support.",
    features: [
      { text: "Unlimited user accounts", included: true },
      { text: "Everything in Fundi, fully unlocked", included: true },
      { text: "AI Assistant — full access", included: true },
      { text: "Deep AI business insights & forecasting", included: true },
      { text: "Custom SMS Sender ID (your brand name) additional cost 30200", included: true },
      { text: "Unlimited SMS notifications", included: true },
      { text: "Advanced analytics & profit forecasting", included: true },
      { text: "Multi-location / branch support", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "On-site training & onboarding (Nairobi)", included: true },
      { text: "SLA: 99.9% uptime guarantee", included: true },
      { text: "Priority phone support (2 hr response)", included: true },
      { text: "API access for custom integrations", included: true },
      { text: "White-label option (your own branding)", included: true },
      { text: "Quarterly business review sessions", included: true },
      { text: "Custom feature development (quoted separately)", included: true },
    ],
    cta: "Pay Dhahabu",
    ctaHref: "/checkout?plan=dhahabu",
  },
];

const COMPARISON_ROWS = [
  { feature: "User accounts", sindano: "1", fundi: "Up to 10", dhahabu: "Unlimited" },
  { feature: "Customers", sindano: "Up to 100", fundi: "Unlimited", dhahabu: "Unlimited" },
  { feature: "Orders / month", sindano: "Up to 80", fundi: "Unlimited", dhahabu: "Unlimited" },
  { feature: "Inventory items", sindano: "Up to 50", fundi: "Unlimited", dhahabu: "Unlimited" },
  { feature: "SMS / month", sindano: "50", fundi: "700", dhahabu: "Unlimited" },
  { feature: "Finance dashboard", sindano: "Basic", fundi: "Full", dhahabu: "Full + AI" },
  { feature: "WhatsApp notifications", sindano: "✗", fundi: "✓", dhahabu: "✓" },
  { feature: "Team roles", sindano: "✗", fundi: "6 roles", dhahabu: "6 roles + custom" },
  { feature: "Analytics", sindano: "✗", fundi: "✓", dhahabu: "Advanced + forecasting" },
  { feature: "AI Assistant", sindano: "✓ Limited", fundi: "✓", dhahabu: "✓ Full access" },
  { feature: "Custom SMS Sender ID", sindano: "✗", fundi: "✗", dhahabu: "✗" },
  { feature: "Dedicated account manager", sindano: "✗", fundi: "✗", dhahabu: "✓" },
  { feature: "On-site training", sindano: "✗", fundi: "✗", dhahabu: "✓" },
  { feature: "API access", sindano: "✗", fundi: "✗", dhahabu: "✓" },
  { feature: "Support", sindano: "Email 48hr", fundi: "Priority 12hr", dhahabu: "Phone 2hr" },
  { feature: "Installation fee", sindano: "KES 5,075", fundi: "KES 28,420", dhahabu: "KES 43,990" },
];

const FAQS = [
  {
    q: "What is the installation fee?",
    a: "The installation fee is a one-time setup cost that covers account creation, data migration assistance, initial training and full onboarding support. Sindano: KES 5,075 | Fundi: KES 28,420 | Dhahabu: KES 43,990.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — we offer a guided demo session via Google Meet before you commit. Contact us to schedule your demo and we will walk you through the platform live.",
  },
  {
    q: "Can I upgrade my plan later?",
    a: "Absolutely. You can upgrade from Sindano to Fundi or Dhahabu at any time. We will prorate the monthly cost and handle the migration for you. Downgrading is also available with 30 days notice.",
  },
  {
    q: "Who can see the financial data?",
    a: "Only the owner sees full financial data by default — weekly/monthly earnings, net profit, inventory value, payroll liability and business insights. Owners can selectively grant or revoke access to managers for specific periods.",
  },
  {
    q: "Does it work without internet?",
    a: "Yes. FundiFlow is an offline-first Progressive Web App (PWA). we notice that the offline functionality is not yet working seemlesly, we are still commited to make it work seemless.You can record orders, customers and payments without connectivity. Everything syncs automatically when internet is available.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is encrypted in transit and at rest. Your business data is never shared with third parties.",
  },
  {
    q: "What payment methods do you accept for the subscription?",
    a: "We accept M-Pesa and bank transfer. Monthly subscriptions are billed on your start date each month.The recurring charges are starts after 60 days of your setup. Contact us via WhatsApp to set up your payment.",
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
            <Scissors className="h-4 w-4" />
            Transparent Pricing
          </span>
          <h6 className="mb-2 text-2xl font-black leading-tight sm:text-3xl">
            Simple, honest pricing
            <br className="hidden sm:block" />
            <span className="text-emerald-400">for every tailor</span>
          </h6>
          <p className="mx-auto max-w-xl text-lg text-slate-300">
            Three plans built for every stage of your business. No hidden fees,
            no surprises — just the tools you need at a price that makes sense.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Works offline</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Cancel anytime</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> M-Pesa billing</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Demo available</span>
          </div>
        </div>
      </section>

      {/* ── PLAN CARDS ── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl border bg-white p-8 shadow-sm transition-shadow hover:shadow-md ${plan.color} ${plan.highlight ? "ring-2 ring-emerald-400/40 shadow-lg" : ""}`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-emerald-600 px-4 py-1 text-sm font-bold text-white shadow-sm">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl ${plan.iconBg}`}>
                    <Scissors className={`h-6 w-6 ${plan.accentColor}`} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">{plan.name}</h2>
                  <p className={`text-sm font-semibold ${plan.accentColor}`}>{plan.swahili}</p>
                  <p className="mt-1 text-xs italic text-slate-400">{plan.meaning}</p>
                </div>

                {/* Price */}
                <div className="mb-2">
                  <div className="flex items-end gap-1">
                    <span className="text-sm font-medium text-slate-500">KES</span>
                    <span className="text-5xl font-black text-slate-900">
                      {plan.monthlyPrice.toLocaleString()}
                    </span>
                    <span className="mb-1.5 text-sm text-slate-400">/month</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    + One-time installation fee:{" "}
                    <span className="font-semibold text-slate-700">
                      KES {plan.installationFee.toLocaleString()}
                    </span>
                  </p>
                </div>

                <p className="mb-6 text-sm text-slate-500 italic">{plan.tagline}</p>

                <p className="mb-6 text-sm leading-relaxed text-slate-600">
                  {plan.description}
                </p>

                {/* CTA */}
                <Link
                  href={plan.ctaHref}
                  className={`mb-8 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-all ${
                    plan.id === "dhahabu"
                      ? "bg-amber-500 text-white hover:bg-amber-400"
                      : plan.highlight
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                {/* Features */}
                <div className="flex-1 space-y-2.5">
                  {plan.features.map(({ text, included, note }) => (
                    <div key={text} className="flex items-start gap-2.5">
                      {included ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                      )}
                      <span className={`text-sm ${included ? "text-slate-700" : "text-slate-400"}`}>
                        {text}
                        {note && (
                          <span className="ml-1.5 text-xs text-slate-400">({note})</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INSTALLATION FEE EXPLAINER ── */}
      <section className="bg-amber-50 border-y border-amber-100 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-900">Understanding the Installation Fee</h2>
            <p className="mt-2 text-slate-600">A one-time investment for a smooth, professional start.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { plan: "Sindano", fee: "KES 5,075", includes: ["Remote account setup", "Profile & business configuration", "1-hour onboarding call", "Digital training guide"] },
              { plan: "Fundi", fee: "KES 28,420", includes: ["Full remote setup & configuration", "Data migration assistance", "Team account creation", "3-hour training session (remote)", "30-day post-setup support"] },
              { plan: "Dhahabu", fee: "KES 43,990", includes: ["On-site setup (Nairobi & major towns)", "Full data migration", "Whole-team training workshop", "Custom configuration", "90-day dedicated onboarding support"] },
            ].map(({ plan, fee, includes }) => (
              <div key={plan} className="rounded-2xl bg-white border border-amber-200 p-5 shadow-sm">
                <p className="font-black text-slate-900 text-lg">{plan}</p>
                <p className="text-2xl font-black text-amber-700 mt-1 mb-4">{fee}</p>
                <ul className="space-y-2">
                  {includes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FULL COMPARISON TABLE ── */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">Compare plans side by side</h2>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-4 pl-6 pr-4 text-left font-semibold">Feature</th>
                  <th className="px-4 py-4 text-center font-bold">Sindano</th>
                  <th className="px-4 py-4 text-center font-bold text-emerald-300">Fundi</th>
                  <th className="px-4 py-4 text-center font-bold text-amber-300">Dhahabu</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map(({ feature, sindano, fundi, dhahabu }, i) => (
                  <tr
                    key={feature}
                    className={`border-t border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                  >
                    <td className="py-3 pl-6 pr-4 font-medium text-slate-700">{feature}</td>
                    <td className={`px-4 py-3 text-center ${sindano === "✗" ? "text-slate-300" : "text-slate-600"}`}>{sindano}</td>
                    <td className={`px-4 py-3 text-center font-medium ${fundi === "✗" ? "text-slate-300" : "text-emerald-700"}`}>{fundi}</td>
                    <td className={`px-4 py-3 text-center font-medium ${dhahabu === "✗" ? "text-slate-300" : "text-amber-700"}`}>{dhahabu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FINANCE PRIVACY CALLOUT ── */}
      <section className="bg-slate-900 text-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
          <h2 className="mb-4 text-3xl font-black sm:text-4xl">
            Your finances are <span className="text-emerald-400">private by default</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-300">
            Only the business owner sees weekly and monthly earnings, net profit, inventory value,
            payroll liabilities and AI business insights. Your managers see only what you explicitly allow.
            You are always in control.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 text-sm">
            {[
              { icon: Shield, label: "Owner Only (Default)", desc: "All financial history, profit & loss, inventory value, salary alerts, AI insights" },
              { icon: Users, label: "Managers (Owner-Controlled)", desc: "Today's finance data only. Weekly/monthly history only when owner unlocks it" },
              { icon: Scissors, label: "Other Staff", desc: "No access to finance data unless specifically granted by owner" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-xl bg-slate-800 p-4">
                <Icon className="mb-2 h-5 w-5 text-emerald-400" />
                <p className="font-bold text-white mb-1">{label}</p>
                <p className="text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQs ── */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-2 font-bold text-slate-900">{q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 py-20 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="mb-4 text-4xl font-black sm:text-5xl">
            Ready to get started?
          </h2>
          <p className="mb-8 text-lg text-slate-300">
            Still have questions? Chat with us on WhatsApp — we will help you choose
            the right plan for your business.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/checkout?plan=fundi"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-emerald-400 hover:scale-105"
            >
              Get Started
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
        </div>
      </section>
    </MarketingShell>
  );
}
