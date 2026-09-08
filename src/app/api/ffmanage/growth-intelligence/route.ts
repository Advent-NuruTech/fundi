import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin/validate";
import { getAIAnalytics, getActiveAIConfig } from "@/lib/ai-billing";
import type {
  GrowthFeatureSignal,
  GrowthIntelligenceReport,
  GrowthRecommendation,
} from "@/types/growth-intelligence";

export const dynamic = "force-dynamic";

const FEATURES: Record<string, string> = {
  dashboard: "Dashboard",
  ai_advisor: "Private AI Advisor",
  finance: "Finance",
  customers: "Customers",
  orders: "Orders",
  production: "Production",
  delivery: "Delivery",
  inventory: "Inventory",
  payments: "Payments",
  analytics: "Analytics",
  employees: "Employees",
  messages: "Messages",
  global_sell: "Global Sell",
  branches: "Branches",
  settings: "Settings",
  manual: "Manual",
};

function recommendationForTheme(theme: string, count: number): GrowthRecommendation {
  const normalized = theme.toLowerCase();
  if (normalized.includes("inventory") || normalized.includes("stock")) {
    return {
      id: "support-inventory",
      title: "Validate a one-tap smart reorder plan",
      kind: "product",
      evidence: `${count} support tickets in this window relate to inventory or stock.`,
      expectedImpact: "Fewer stock-outs and less cash tied up in slow-moving material.",
      effort: "Medium",
      expectedRoi: "High if the flow reduces emergency purchasing and increases weekly inventory use.",
      confidence: count >= 10 ? "High" : "Medium",
      nextStep: "Prototype a reorder review that uses sales demand, current stock and supplier lead time; test it with 10 businesses.",
    };
  }
  if (normalized.includes("order") || normalized.includes("delivery")) {
    return {
      id: "support-fulfilment",
      title: "Build a proactive delay command centre",
      kind: "experience",
      evidence: `${count} support tickets relate to orders or delivery.`,
      expectedImpact: "Faster exception handling, fewer missed promises and less owner follow-up work.",
      effort: "Medium",
      expectedRoi: "High through retention and lower support volume.",
      confidence: count >= 10 ? "High" : "Medium",
      nextStep: "Test one queue combining overdue work, blocked stages and unsent customer updates.",
    };
  }
  if (normalized.includes("billing") || normalized.includes("payment")) {
    return {
      id: "support-billing",
      title: "Simplify billing recovery and payment visibility",
      kind: "revenue",
      evidence: `${count} support tickets relate to billing or payments.`,
      expectedImpact: "Higher successful renewals and fewer avoidable billing contacts.",
      effort: "Low",
      expectedRoi: "High because the change protects recurring revenue directly.",
      confidence: count >= 10 ? "High" : "Medium",
      nextStep: "Add a payment-health card with the exact failure reason and one recovery action.",
    };
  }
  return {
    id: `support-${normalized.replace(/[^a-z0-9]+/g, "-")}`,
    title: `Investigate the ${theme} support journey`,
    kind: "experience",
    evidence: `${count} support tickets are grouped under ${theme}.`,
    expectedImpact: "Lower user effort and fewer repeat support contacts.",
    effort: "Low",
    expectedRoi: "Validate with ticket deflection and task completion rate.",
    confidence: count >= 10 ? "High" : "Medium",
    nextStep: "Review an anonymised sample, identify the repeated step, then test one guided fix.",
  };
}

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.platformRole !== "owner" && admin.platformRole !== "super_admin") {
    return NextResponse.json({ error: "Platform owner access required" }, { status: 403 });
  }

  const url = new URL(request.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? 30), 7), 90);
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);

  const [featureResult, feedbackResult, businessResult, subscriptionResult, supportResult, aiConfig, aiAnalytics] =
    await Promise.all([
      admin.db.from("platform_feature_daily").select("event_date, feature_key, event_count, business_count").gte("event_date", since),
      admin.db.from("platform_ai_feedback_daily").select("positive_count, negative_count").gte("event_date", since),
      admin.db.from("businesses").select("id", { count: "exact", head: true }),
      admin.db.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trialing"]),
      admin.db.from("support_tickets").select("category").gte("created_at", `${since}T00:00:00.000Z`).limit(10000),
      getActiveAIConfig(admin.db),
      getAIAnalytics(admin.db, days).catch(() => null),
    ]);

  const totalBusinesses = businessResult.count ?? 0;
  const byFeature = new Map<string, { events: number; businessDays: number }>();
  for (const row of featureResult.data ?? []) {
    const key = String(row.feature_key);
    const current = byFeature.get(key) ?? { events: 0, businessDays: 0 };
    current.events += Number(row.event_count ?? 0);
    current.businessDays += Number(row.business_count ?? 0);
    byFeature.set(key, current);
  }

  const features: GrowthFeatureSignal[] = Object.entries(FEATURES).map(([key, label]) => {
    const value = byFeature.get(key) ?? { events: 0, businessDays: 0 };
    const averageDailyBusinesses = value.businessDays / days;
    const adoptionPercent = totalBusinesses > 0 ? (averageDailyBusinesses / totalBusinesses) * 100 : 0;
    const repeatUse = value.businessDays > 0 ? value.events / value.businessDays : 0;
    const status: GrowthFeatureSignal["status"] = value.events === 0
      ? "collecting"
      : adoptionPercent >= 25
        ? "strong"
        : adoptionPercent >= 8
          ? "watch"
          : "dormant";
    return { key, label, events: value.events, averageDailyBusinesses, repeatUse, adoptionPercent, status };
  });

  const observedFeatures = features.filter((feature) => feature.events > 0);
  const strongestFeatures = [...observedFeatures]
    .sort((a, b) => (b.adoptionPercent + b.repeatUse) - (a.adoptionPercent + a.repeatUse))
    .slice(0, 5);
  const dormantFeatures = [...observedFeatures]
    .filter((feature) => feature.status === "dormant")
    .sort((a, b) => a.adoptionPercent - b.adoptionPercent)
    .slice(0, 5);

  const feedback = (feedbackResult.data ?? []).reduce(
    (acc, row) => ({
      positive: acc.positive + Number(row.positive_count ?? 0),
      negative: acc.negative + Number(row.negative_count ?? 0),
    }),
    { positive: 0, negative: 0 }
  );
  const feedbackResponses = feedback.positive + feedback.negative;
  const aiHelpfulnessPercent = feedbackResponses > 0 ? (feedback.positive / feedbackResponses) * 100 : null;

  const supportCounts = new Map<string, number>();
  for (const row of supportResult.data ?? []) {
    const label = String(row.category ?? "General").trim() || "General";
    supportCounts.set(label, (supportCounts.get(label) ?? 0) + 1);
  }
  const supportThemes = [...supportCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const recommendations: GrowthRecommendation[] = [];
  if (aiHelpfulnessPercent !== null && aiHelpfulnessPercent < 80) {
    recommendations.push({
      id: "ai-helpfulness",
      title: "Raise advisor answer quality before increasing exposure",
      kind: "reliability",
      evidence: `Users rated ${aiHelpfulnessPercent.toFixed(0)}% of ${feedbackResponses} AI answers as helpful.`,
      expectedImpact: "Higher daily trust, repeat use and paid AI-credit retention.",
      effort: "Medium",
      expectedRoi: "High if helpfulness passes 85% without materially increasing cost per answer.",
      confidence: feedbackResponses >= 30 ? "High" : "Medium",
      nextStep: "Review only anonymised failure reasons, create an evaluation set and test prompt/context changes against it.",
    });
  }
  if (dormantFeatures[0]) {
    const feature = dormantFeatures[0];
    recommendations.push({
      id: `dormant-${feature.key}`,
      title: `Fix discovery before adding more to ${feature.label}`,
      kind: "experience",
      evidence: `${feature.label} reaches about ${feature.adoptionPercent.toFixed(1)}% of businesses per day in this window.`,
      expectedImpact: "More value from an existing feature without increasing product complexity.",
      effort: "Low",
      expectedRoi: "High if contextual entry points increase completed workflows.",
      confidence: feature.events >= 20 ? "High" : "Medium",
      nextStep: `Run a two-week test with one contextual ${feature.label} shortcut and measure completed actions, not clicks.`,
    });
  }
  if (supportThemes[0]) recommendations.push(recommendationForTheme(supportThemes[0].label, supportThemes[0].count));
  if (aiAnalytics && aiAnalytics.summary.grossMarginPercent < 150) {
    recommendations.push({
      id: "ai-economics",
      title: "Protect the 150% AI cost-markup target",
      kind: "revenue",
      evidence: `Current AI provider-cost markup is ${aiAnalytics.summary.grossMarginPercent.toFixed(1)}% against a 150% target.`,
      expectedImpact: "Sustainable AI usage as volume grows without quietly subsidising heavy users.",
      effort: "Low",
      expectedRoi: "Immediate improvement in AI unit economics after pricing takes effect.",
      confidence: aiAnalytics.summary.requestCount >= 100 ? "High" : "Medium",
      nextStep: "Refresh the exchange rate, verify provider prices, then adjust credit value or model routing and monitor the portfolio—not individual requests.",
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      id: "daily-briefing",
      title: "Validate a proactive owner morning brief",
      kind: "product",
      evidence: "No critical quality, support or unit-economics signal is dominant in this window.",
      expectedImpact: "A repeatable daily habit built around deadlines, cash, stock and one growth action.",
      effort: "Medium",
      expectedRoi: "Measure seven-day retention and actions completed from the brief.",
      confidence: "Medium",
      nextStep: "Offer an opt-in brief to 20 active owners and compare weekly return rate with a control group.",
    });
  }

  const trackedBusinessDailyAverage = strongestFeatures.length
    ? Math.max(...features.map((feature) => feature.averageDailyBusinesses))
    : 0;
  const currentMarkup = aiAnalytics?.summary.grossMarginPercent ?? 0;
  const targetMarkup = Math.max(150, aiConfig.config.margin.targetGrossMarginPercent);

  const report: GrowthIntelligenceReport = {
    generatedAt: new Date().toISOString(),
    windowDays: days,
    privacy: {
      mode: "aggregated_only",
      tenantContentAccessed: false,
      description: "Recommendations use anonymous daily counters, feedback totals, support categories and AI unit economics. Tenant records and conversation content are excluded.",
    },
    summary: {
      totalBusinesses,
      activeSubscriptions: subscriptionResult.count ?? 0,
      trackedBusinessDailyAverage,
      aiHelpfulnessPercent,
      feedbackResponses,
      aiCostMarkupPercent: currentMarkup,
      aiTargetMarkupPercent: targetMarkup,
      aiMarkupOnTarget: currentMarkup >= targetMarkup,
    },
    features,
    strongestFeatures,
    dormantFeatures,
    supportThemes,
    recommendations: recommendations.slice(0, 5),
  };

  return NextResponse.json(report);
}
