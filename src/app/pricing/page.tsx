import { Suspense } from "react";
import Link from "next/link";
import {
  Users,
  ShoppingBag,
  Ruler,
  Layers,
  Boxes,
  Wallet,
  LineChart,
  Globe,
  WifiOff,
  BarChart3,
  TrendingUp,
  Store,
  Bot,
  MessageSquare,
  MessageCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { getFreeTrialEnabled } from "@/lib/billing/free-trial-flag";
import { getEffectivePlanConfigs, type PlanConfigsMap } from "@/lib/billing/dynamic-config";
import { formatKes } from "@/lib/billing/fees";
import { getActiveSmsPacks } from "@/lib/sms/config-store";
import { getActiveCreditPacks } from "@/lib/ai-billing/config-store";
import { PricingClient } from "./pricing-client";

export const dynamic = "force-dynamic";

const DEMO_URL =
  "https://wa.me/254142225233?text=Hi%2C%20I'd%20like%20to%20request%20a%20demo%20of%20FundiFlow";

const TRIAL_FAQ = {
  q: "Is there a free trial?",
  a: "Yes — every plan starts with a 14-day free trial, with no card required. You pick the plan you want to try and get full access to it, so the data and workflow you set up carry over exactly when you continue. We remind you 5 days before it ends, and you only pay if you choose to keep using FundiFlow.",
};

const FAQS = [
  {
    q: "What happens after the first two introductory months?",
    a: "Nothing needs your attention. Your plan continues automatically at the standard monthly rate, and we'll remind you before it happens. You can switch plans or billing periods at any time — the choice is always yours.",
  },
  {
    q: "How does annual billing actually save me money?",
    a: "You pay for 10 months and receive 12 — two full months free on every plan. That's a saving of about 17%, applied instantly. No rebates to chase and no coupons: just a lower price for choosing to stay for the year.",
  },
  TRIAL_FAQ,
  {
    q: "What exactly is an AI Credit?",
    a: "An AI Credit is how we measure AI usage so pricing stays simple. Most everyday questions — like \"summarise today's sales\" — cost 1 credit, while deeper analysis such as profit reviews or six-month forecasts costs 2–5. Every plan includes a monthly allowance, and you can add more any time.",
  },
  {
    q: "What is an SMS credit, and how much do they cost?",
    a: "Every SMS pack is priced per SMS — the more you buy, the less each one costs. Every plan includes a monthly SMS bundle, and when you need more, top-ups start small and scale up. You only ever pay for what you use. (Live pack prices are loaded here automatically.)",
  },
  {
    q: "What happens if my business grows beyond my plan's capacity?",
    a: "First, congratulations — that's the best problem to have. You'll receive clear prompts as you approach a limit, and you can upgrade to a larger plan or simply purchase more SMS, AI Credits, storage or listings. Nothing is ever deleted, and your business never stops growing.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes, at any time. Upgrade to a larger plan whenever you're ready and we'll handle the transition. You can also move between monthly and annual billing, and downgrade when your needs change.",
  },
  {
    q: "Does it really work without internet?",
    a: "Yes. FundiFlow is an offline-first Progressive Web App. You can record orders, customers and payments without connectivity — on a phone, tablet or computer — and everything syncs automatically the moment you're back online.",
  },
  {
    q: "Who can see my financial data?",
    a: "You decide. By default, only the business owner sees full financial data. You can grant managers access to today's numbers or unlock history selectively. Your money is your business.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. Your data is encrypted in transit and at rest, and every business's data is fully isolated from every other. Your records are never shared with third parties.",
  },
  {
    q: "How do I pay?",
    a: "Through our secure payment gateway — M-Pesa, card or bank transfer. Choose what works for you, and your subscription renews automatically so you never have to remember.",
  },
];

const INCLUDED_FEATURES = [
  { icon: Users, title: "Customer Management", desc: "Profiles, measurements and complete order history, forever in one place." },
  { icon: ShoppingBag, title: "Orders", desc: "Create, track and deliver work with confidence — from first intake to final handover." },
  { icon: Ruler, title: "Measurements", desc: "Record every measurement accurately, so nothing is ever misremembered." },
  { icon: Layers, title: "Production", desc: "Move work through every stage of your workflow with full visibility." },
  { icon: Boxes, title: "Inventory", desc: "Track every fabric, accessory and material with confidence — and never run out of what sells." },
  { icon: Wallet, title: "Payments", desc: "Record cash, M-Pesa and card payments, and always know who has paid." },
  { icon: LineChart, title: "Finance", desc: "See your earnings, expenses and profit clearly, without waiting for month end." },
  { icon: Globe, title: "Customer Portal", desc: "Let customers check order status and payments themselves — on every plan." },
  { icon: WifiOff, title: "Offline Mode", desc: "Keep working when the internet doesn't. Everything syncs automatically." },
  { icon: BarChart3, title: "Reports", desc: "Daily, weekly, monthly and yearly numbers that tell you how you're doing." },
  { icon: TrendingUp, title: "Analytics", desc: "Spot trends, best sellers and areas to improve — before they become problems." },
  { icon: Store, title: "Marketplace", desc: "List your work on the Global Sell marketplace and reach buyers worldwide." },
  { icon: Bot, title: "AI Assistant", desc: "Ask your business anything and get clear, honest answers in seconds." },
  { icon: MessageSquare, title: "SMS", desc: "Keep customers informed with automatic, professional SMS notifications." },
  { icon: MessageCircle, title: "WhatsApp", desc: "Reach customers where they already are, automatically." },
];

const AI_CREDIT_EXAMPLES = [
  { task: "Summarise today's sales", cost: "1 credit" },
  { task: "Write an SMS to customers", cost: "1 credit" },
  { task: "Analyse this month's profit", cost: "2 credits" },
  { task: "Forecast the next six months", cost: "5 credits" },
];

// Fallbacks only — the real packs come from the DB and these are ignored once
// the sms_packs / ai_credit_packs tables are populated (see migration 0050).
const FALLBACK_AI_TOP_UPS = [
  { credits: 100, priceKes: 900 },
  { credits: 500, priceKes: 4000 },
  { credits: 1000, priceKes: 7500 },
  { credits: 5000, priceKes: 35000 },
];

const FALLBACK_SMS_BUNDLES = [
  { units: 100, priceKes: 300 },
  { units: 500, priceKes: 1400 },
  { units: 1000, priceKes: 2500 },
  { units: 5000, priceKes: 11250 },
];

/** Lowest per-SMS rate across the active packs, or null when there are none. */
function cheapestPerSms(packs: { units: number; priceKes: number }[]): number | null {
  const rates = packs
    .map((p) => p.priceKes / p.units)
    .sort((a, b) => a - b);
  return rates[0] ?? null;
}

const REFERRAL_REWARDS = [
  { event: "Successful paying referral", reward: "KES 500 wallet credits" },
  { event: "New customer joins through your referral", reward: "KES 300 welcome credits" },
  { event: "5 referrals", reward: "KES 1,000 bonus" },
  { event: "10 referrals", reward: "KES 2,500 bonus" },
  { event: "25 referrals", reward: "KES 7,500 bonus" },
  { event: "50 referrals", reward: "KES 20,000 bonus" },
];

export default async function PricingPage() {
  const freeTrialEnabled = await getFreeTrialEnabled();

  const [smsPacks, aiPacks, planConfigs] = await Promise.all([
    getActiveSmsPacks(),
    getActiveCreditPacks(),
    getEffectivePlanConfigs(),
  ]);

  const aiTopUps = (aiPacks.length > 0 ? aiPacks : FALLBACK_AI_TOP_UPS).map((p) => ({
    credits: p.credits.toLocaleString("en-KE"),
    price: formatKes(p.priceKes),
  }));

  const smsBundles = (smsPacks.length > 0 ? smsPacks : FALLBACK_SMS_BUNDLES).map((p) => ({
    sms: p.units.toLocaleString("en-KE"),
    price: formatKes(p.priceKes),
  }));

  const perSms = cheapestPerSms(smsPacks);

  const smsFaq = {
    q: "What is an SMS credit, and how much do they cost?",
    a: buildSmsFaqAnswer(smsPacks, planConfigs),
  };

  const baseFAQs = freeTrialEnabled ? FAQS : FAQS.filter((f) => f !== TRIAL_FAQ);
  const visibleFAQs = baseFAQs.map((f) =>
    f.q === smsFaq.q ? smsFaq : f,
  );

  return (
    <MarketingShell>
      {/* Hero + offer + toggle + cards + comparison (interactive) */}
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        }
      >
        <PricingClient freeTrialEnabled={freeTrialEnabled} />
      </Suspense>

      {/* ── EVERYTHING INCLUDED ── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Everything included
            </span>
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">
              One platform. The entire business.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-500">
              There is no watered-down version of FundiFlow. Every customer, every order and
              every shilling is managed in the same powerful platform — whatever plan you choose.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {INCLUDED_FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
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
        </div>
      </section>

      {/* ── AI CREDITS ── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 py-20 text-white sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
                <Bot className="h-3.5 w-3.5" /> AI Assistant
              </span>
              <h2 className="mb-4 text-3xl font-black leading-tight sm:text-4xl">
                Your business, <span className="text-amber-300">answered.</span>
              </h2>
              <p className="mb-4 leading-relaxed text-slate-300">
                The AI Assistant reads your own data — orders, sales, stock and payments — and
                turns it into clear answers and honest advice. Different questions take
                different amounts of work, so we simplified it:{" "}
                <strong className="text-white">one business question is roughly one AI Credit.</strong>
              </p>
              <p className="text-sm leading-relaxed text-slate-400">
                You never need to understand tokens or models. You simply ask — and every plan
                includes a generous monthly allowance of credits to get started.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 backdrop-blur-sm">
              <p className="mb-4 text-sm font-bold text-white">What an AI Credit can do</p>
              <div className="space-y-3">
                {AI_CREDIT_EXAMPLES.map((ex) => (
                  <div
                    key={ex.task}
                    className="flex items-center justify-between rounded-xl bg-slate-700/60 px-4 py-3"
                  >
                    <span className="text-sm text-slate-200">{ex.task}</span>
                    <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                      {ex.cost}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-14">
            <h3 className="mb-5 text-center text-xl font-black text-white">
              Need more? Top up any time — no contract, no waiting
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {aiTopUps.map((t) => (
                <div
                  key={t.credits}
                  className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 text-center"
                >
                  <p className="text-2xl font-black text-white">{t.credits}</p>
                  <p className="text-xs text-slate-400">credits</p>
                  <p className="mt-2 text-sm font-bold text-emerald-400">{t.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SMS CREDITS ── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <h3 className="mb-4 text-xl font-black text-slate-900">Top up in simple bundles</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {smsBundles.map((b) => (
                  <div
                    key={b.sms}
                    className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm"
                  >
                    <p className="text-2xl font-black text-slate-900">{b.sms}</p>
                    <p className="text-xs text-slate-400">SMS</p>
                    <p className="mt-2 text-sm font-bold text-emerald-700">{b.price}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Simple. Transparent. You always know what you&apos;re paying for.
              </p>
            </div>

            <div className="order-1 lg:order-2">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
                <MessageSquare className="h-3.5 w-3.5" /> SMS
              </span>
              <h2 className="mb-4 text-3xl font-black text-slate-900 sm:text-4xl">
                Professional communication, automatically.
              </h2>
              <p className="mb-4 leading-relaxed text-slate-600">
                Every plan includes a monthly SMS allowance so your customers always know what
                is happening with their orders — ready for pickup, delayed, needs a fitting. It
                keeps your business looking professional and your phone from ringing off the
                hook.
              </p>
              <p className="text-sm leading-relaxed text-slate-500">
                {perSms != null && (
                  <>
                    Every SMS pack is priced per SMS — the more you buy, the less each one costs,{" "}
                    from <strong className="text-slate-800">{formatKes(perSms)}</strong>.{" "}
                  </>
                )}
                Every plan&apos;s included bundle is built around a realistic month of work. When
                you need more, buy exactly what you need — no contracts, no expiry pressure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── REFERRAL REWARDS ── */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <span className="mb-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-700">
              Referral rewards
            </span>
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">
              Grow with the people you trust
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-500">
              The best recommendation a business can get is another business. When you refer
              FundiFlow to someone who subscribes, we reward you — and them.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-4 pl-6 pr-4 text-left font-semibold">When</th>
                  <th className="px-4 py-4 text-right font-semibold">Reward</th>
                </tr>
              </thead>
              <tbody>
                {REFERRAL_REWARDS.map((r, i) => (
                  <tr
                    key={r.event}
                    className={cn_row(i)}
                  >
                    <td className="py-3.5 pl-6 pr-4 font-medium text-slate-700">{r.event}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-700">{r.reward}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/register" className="font-bold text-emerald-700 underline underline-offset-2 hover:text-emerald-600">
              Start referring →
            </Link>
          </p>
        </div>
      </section>

      {/* ── FAQs ── */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Questions
            </span>
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">
              Everything you&apos;re wondering, answered
            </h2>
          </div>
          <div className="space-y-4">
            {visibleFAQs.map(({ q, a }) => (
              <div key={q} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-2 font-bold text-slate-900">{q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 py-20 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Sparkles className="mx-auto mb-5 h-10 w-10 text-emerald-400" />
          <h2 className="mb-4 text-4xl font-black sm:text-5xl">
            Your best work deserves better management.
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-slate-300">
            You already have the skill. FundiFlow gives you the system — customers, orders,
            production, inventory, finance and communication, working together in one place,
            even offline. Most businesses see the difference in their very first week.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-emerald-400"
            >
              Start {freeTrialEnabled ? "your free trial" : "now"}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              <MessageCircle className="h-5 w-5" />
              Request a demo
            </a>
          </div>
          {freeTrialEnabled && (
            <p className="mt-6 text-sm text-slate-400">
              14-day free trial · No card required · Cancel anytime
            </p>
          )}
        </div>
      </section>
    </MarketingShell>
  );
}

// Local helper (kept small so this server page stays readable).
function cn_row(i: number) {
  return i % 2 === 0 ? "border-t border-slate-100 bg-white" : "border-t border-slate-100 bg-slate-50";
}

/** FAQ answer built from the live DB packs + effective plan allowances. */
function buildSmsFaqAnswer(
  smsPacks: { units: number; priceKes: number }[],
  plans: PlanConfigsMap,
): string {
  const perSms = cheapestPerSms(smsPacks);
  const cheapest = [...smsPacks].sort((a, b) => a.priceKes - b.priceKes)[0];

  const allowances = Object.values(plans)
    .map((p) => p.limits.smsPerMonth ?? null)
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b);
  const minAllowance = allowances[0];
  const maxAllowance = allowances[allowances.length - 1];

  const parts: string[] = [];
  if (perSms != null) {
    parts.push(`Each SMS costs from ${formatKes(perSms)}, depending on the bundle you pick.`);
  }
  if (minAllowance != null && maxAllowance != null) {
    parts.push(
      `Every plan includes a monthly bundle — from ${minAllowance.toLocaleString("en-KE")} to ${maxAllowance.toLocaleString("en-KE")} SMS —`,
    );
  } else {
    parts.push("Every plan includes a monthly SMS bundle,");
  }
  if (cheapest) {
    parts.push(
      `and when you need more, top-ups start at just ${formatKes(cheapest.priceKes)} for ${cheapest.units.toLocaleString("en-KE")} SMS.`,
    );
  } else {
    parts.push("and you can add more any time.");
  }
  parts.push("You only ever pay for what you use.");
  return parts.join(" ");
}
