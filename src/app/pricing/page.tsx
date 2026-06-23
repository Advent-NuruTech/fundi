import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, MessageCircle, ArrowRight, Users, Shield } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PricingClient } from "./pricing-client";

const DEMO_URL =
  "https://wa.me/254142225233?text=Hi%2C%20I'd%20like%20to%20request%20a%20demo%20of%20FundiFlow";

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
    q: "Can I run more than one branch?",
    a: "Yes. Sindano runs a single outlet, Fundi supports up to 4 branches and Dhahabu up to 9 — each branch keeps its own stock, sales, customers and finance, fully separate. Need more than 9? Contact sales for a custom plan with unlimited branches.",
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
    a: "Yes. FundiFlow is an offline-first Progressive Web App (PWA). You can record sales, customers and payments without connectivity, and everything syncs automatically when internet is available.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is encrypted in transit and at rest, and every business is fully isolated. Your business data is never shared with third parties.",
  },
  {
    q: "What payment methods do you accept for the subscription?",
    a: "We accept M-Pesa and bank transfer. Recurring charges start 60 days after your setup. Contact us via WhatsApp to set up your payment.",
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      {/* Hero + category picker + plan cards + comparison table (interactive) */}
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        }
      >
        <PricingClient />
      </Suspense>

      {/* ── INSTALLATION FEE EXPLAINER ── */}
      <section className="border-y border-amber-100 bg-amber-50 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-black text-slate-900">Understanding the Installation Fee</h2>
            <p className="mt-2 text-slate-600">A one-time investment for a smooth, professional start.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { plan: "Sindano", fee: "KES 5,075", includes: ["Remote account setup", "Profile & business configuration", "1-hour onboarding call", "Digital training guide"] },
              { plan: "Fundi", fee: "KES 28,420", includes: ["Full remote setup & configuration", "Data migration assistance", "Team account creation", "3-hour training session (remote)", "30-day post-setup support"] },
              { plan: "Dhahabu", fee: "KES 43,990", includes: ["On-site setup (Nairobi & major towns)", "Full data migration", "Whole-team training workshop", "Custom configuration", "90-day dedicated onboarding support"] },
            ].map(({ plan, fee, includes }) => (
              <div key={plan} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                <p className="text-lg font-black text-slate-900">{plan}</p>
                <p className="mb-4 mt-1 text-2xl font-black text-amber-700">{fee}</p>
                <ul className="space-y-2">
                  {includes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINANCE PRIVACY CALLOUT ── */}
      <section className="bg-slate-900 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Shield className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
          <h2 className="mb-4 text-3xl font-black sm:text-4xl">
            Your finances are <span className="text-emerald-400">private by default</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-300">
            Only the business owner sees weekly and monthly earnings, net profit, inventory value,
            payroll liabilities and AI business insights. Your managers see only what you explicitly allow.
            You are always in control.
          </p>
          <div className="mt-8 grid gap-4 text-sm sm:grid-cols-3">
            {[
              { icon: Shield, label: "Owner Only (Default)", desc: "All financial history, profit & loss, inventory value, salary alerts, AI insights" },
              { icon: Users, label: "Managers (Owner-Controlled)", desc: "Today's finance data only. Weekly/monthly history only when owner unlocks it" },
              { icon: Users, label: "Other Staff", desc: "No access to finance data unless specifically granted by owner" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-xl bg-slate-800 p-4">
                <Icon className="mb-2 h-5 w-5 text-emerald-400" />
                <p className="mb-1 font-bold text-white">{label}</p>
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
          <h2 className="mb-4 text-4xl font-black sm:text-5xl">Ready to get started?</h2>
          <p className="mb-8 text-lg text-slate-300">
            Still have questions? Chat with us on WhatsApp — we will help you choose
            the right plan for your business.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-emerald-400"
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
