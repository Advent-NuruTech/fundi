import type { AIProviderUsage, AICostBreakdown, AIChargeBreakdown } from "@/types/ai-billing";

export const TOKENS_PER_MILLION = 1_000_000;

export function roundMoney(value: number, fractionDigits = 6): number {
  const factor = 10 ** fractionDigits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function roundCredits(value: number, mode: "ceil" | "round" | "floor"): number {
  switch (mode) {
    case "ceil":
      return Math.ceil(value);
    case "floor":
      return Math.floor(value);
    case "round":
      return Math.round(value);
  }
}

export function revenueMultiplierForMargin(targetGrossMarginPercent: number): number {
  return 1 + targetGrossMarginPercent / 100;
}

export function costForTokens(tokenCount: number, pricePerMillion: number): number {
  if (tokenCount <= 0 || pricePerMillion <= 0) return 0;
  return (tokenCount * pricePerMillion) / TOKENS_PER_MILLION;
}

export function providerCostUsd(usage: AIProviderUsage, pricing: {
  input: number;
  cachedInput: number;
  output: number;
  reasoning: number;
  image: number;
  audio: number;
}): number {
  return roundMoney(
    costForTokens(usage.inputTokens, pricing.input) +
      costForTokens(usage.cachedInputTokens, pricing.cachedInput) +
      costForTokens(usage.outputTokens, pricing.output) +
      costForTokens(usage.reasoningTokens, pricing.reasoning) +
      costForTokens(usage.imageTokens, pricing.image) +
      costForTokens(usage.audioTokens, pricing.audio)
  );
}

export function convertToKes(providerCostUsdValue: number, exchangeRate: number): number {
  return roundMoney(providerCostUsdValue * exchangeRate, 4);
}

export function buildCostBreakdown(usage: AIProviderUsage, pricing: {
  input: number;
  cachedInput: number;
  output: number;
  reasoning: number;
  image: number;
  audio: number;
}, exchangeRate: number, exchangeSource: AICostBreakdown["exchangeSource"]): AICostBreakdown {
  const usd = providerCostUsd(usage, pricing);
  const kes = convertToKes(usd, exchangeRate);
  return { providerCostUsd: usd, exchangeRate, exchangeSource, costKes: kes };
}

export function buildChargeBreakdown(costKes: number, margin: {
  targetGrossMarginPercent: number;
}, credit: {
  valueKes: number;
  roundingMode: "ceil" | "round" | "floor";
  minimumCredits: number;
}): AIChargeBreakdown {
  const revenueMultiplier = revenueMultiplierForMargin(margin.targetGrossMarginPercent);
  const revenueKes = roundMoney(costKes * revenueMultiplier, 4);
  const rawCredits = credit.valueKes > 0 ? revenueKes / credit.valueKes : 0;
  const rounded = roundCredits(rawCredits, credit.roundingMode);
  const creditsCharged = Math.max(credit.minimumCredits, rounded);
  return {
    revenueMultiplier,
    revenueKes,
    creditValueKes: credit.valueKes,
    roundingMode: credit.roundingMode,
    rawCredits,
    minimumCredits: credit.minimumCredits,
    creditsCharged,
  };
}

export function portfolioMargin(totalRevenue: number, totalProviderCost: number): number {
  if (totalProviderCost <= 0) return 0;
  return roundMoney(((totalRevenue - totalProviderCost) / totalProviderCost) * 100, 2);
}
