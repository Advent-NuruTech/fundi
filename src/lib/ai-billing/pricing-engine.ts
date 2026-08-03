import type {
  AIChargeBreakdown,
  AICreditConfig,
  AIFeatureCategory,
  AIFeaturePolicies,
  AIMarginConfig,
} from "@/types/ai-billing";
import { buildChargeBreakdown, roundMoney } from "./formulas";

/**
 * THE PRICING ENGINE — its only job is the COMMERCIAL rules.
 *
 * 1. Applies the configured portfolio gross margin.
 * 2. Converts revenue into AI Credits using the configured credit value.
 * 3. Applies the minimum-credit rule and rounding mode.
 * 4. Resolves the feature → category policy.
 *
 * The Pricing Engine NEVER calculates provider cost. It only receives the
 * provider cost (in KES) from the Billing Engine and turns it into a customer
 * charge.
 */
export interface PricingEngineInput {
  costKes: number;
  margin: AIMarginConfig;
  credit: AICreditConfig;
  feature: string;
  featurePolicies: AIFeaturePolicies;
  featureCategories: AIFeatureCategory[];
}

export interface PricingEngineResult {
  charge: AIChargeBreakdown;
  featureCategory: AIFeatureCategory | null;
  /** True when the computed charge exceeds the category's configured cap. */
  maxCreditsExceeded: boolean;
}

export function runPricingEngine(input: PricingEngineInput): PricingEngineResult {
  const charge = buildChargeBreakdown(input.costKes, input.margin, input.credit);
  const categoryId = input.featurePolicies[input.feature] ?? null;
  const featureCategory =
    input.featureCategories.find((c) => c.id === categoryId) ?? null;

  const maxCreditsExceeded =
    featureCategory !== null && charge.creditsCharged > featureCategory.maxCredits;

  return { charge, featureCategory, maxCreditsExceeded };
}

/**
 * A cheap pre-execution estimate of how many credits a request might cost, so
 * the engine can reject requests that clearly cannot be afforded BEFORE calling
 * a provider (which costs money). This is a guard only — the exact charge is
 * always recomputed from real usage after the call.
 */
export function estimateCredits(input: {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  providerConfigPricing: {
    input: number;
    cachedInput: number;
    output: number;
  };
  exchangeRate: number;
  margin: AIMarginConfig;
  credit: AICreditConfig;
}): number {
  const inputCost = (input.estimatedInputTokens * input.providerConfigPricing.input) / 1_000_000;
  const outputCost = (input.estimatedOutputTokens * input.providerConfigPricing.output) / 1_000_000;
  const costKes = roundMoney((inputCost + outputCost) * input.exchangeRate, 4);
  const revenueKes = roundMoney(costKes * (1 + input.margin.targetGrossMarginPercent / 100), 4);
  const raw = input.credit.valueKes > 0 ? revenueKes / input.credit.valueKes : 0;
  const rounded = Math.ceil(raw);
  return Math.max(input.credit.minimumCredits, rounded);
}
