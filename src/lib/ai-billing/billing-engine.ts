import type {
  AIBillingRecord,
  AIChargeBreakdown,
  AICostBreakdown,
  AIProviderConfig,
  AIProviderUsage,
  AIExchangeRateProviderId,
} from "@/types/ai-billing";
import { getAdapter } from "./providers/registry";
import { convertToKes, roundMoney } from "./formulas";

/**
 * THE BILLING ENGINE — its only job is the REAL provider cost.
 *
 * 1. Reads actual provider usage.
 * 2. Computes the exact provider cost (USD) via the provider adapter.
 * 3. Converts that cost into local currency using the ACTIVE exchange rate.
 * 4. Produces the cost half of an immutable billing record.
 *
 * The Billing Engine NEVER decides customer pricing. It does not know about
 * margins, credit values or feature policies — those belong to the Pricing
 * Engine.
 */
export interface BillingEngineInput {
  usage: AIProviderUsage;
  providerConfig: AIProviderConfig;
  exchangeRate: number;
  exchangeSource: AIExchangeRateProviderId;
}

export function runBillingEngine(input: BillingEngineInput): AICostBreakdown {
  const adapter = getAdapter(input.providerConfig);
  const providerCostUsdValue = roundMoney(
    adapter.calculateCost(input.usage, input.providerConfig),
    8
  );
  const costKes = convertToKes(providerCostUsdValue, input.exchangeRate);
  return {
    providerCostUsd: providerCostUsdValue,
    exchangeRate: input.exchangeRate,
    exchangeSource: input.exchangeSource,
    costKes,
  };
}

export interface BillingRecordDraft {
  businessId: string;
  userId: string | null;
  idempotencyKey: string;
  requestId: string;
  feature: string;
  featureCategory: string | null;
  provider: string;
  model: string;
  usage: AIProviderUsage;
  cost: AICostBreakdown;
  charge: AIChargeBreakdown;
  balanceAfter: number | null;
  latencyMs: number | null;
  configVersion: number;
  metadata: Record<string, unknown>;
}

export function toBillingRecord(draft: BillingRecordDraft, now = new Date().toISOString()): AIBillingRecord {
  return {
    id: "",
    idempotencyKey: draft.idempotencyKey,
    requestId: draft.requestId,
    businessId: draft.businessId,
    userId: draft.userId,
    provider: draft.provider,
    model: draft.model,
    feature: draft.feature,
    featureCategory: draft.featureCategory,
    inputTokens: draft.usage.inputTokens,
    cachedInputTokens: draft.usage.cachedInputTokens,
    outputTokens: draft.usage.outputTokens,
    reasoningTokens: draft.usage.reasoningTokens,
    imageTokens: draft.usage.imageTokens,
    audioTokens: draft.usage.audioTokens,
    providerCostUsd: draft.cost.providerCostUsd,
    exchangeRate: draft.cost.exchangeRate,
    exchangeSource: draft.cost.exchangeSource,
    costKes: draft.cost.costKes,
    revenueMultiplier: draft.charge.revenueMultiplier,
    revenueKes: draft.charge.revenueKes,
    creditValueKes: draft.charge.creditValueKes,
    roundingMode: draft.charge.roundingMode,
    creditsCharged: draft.charge.creditsCharged,
    minimumCredits: draft.charge.minimumCredits,
    balanceAfter: draft.balanceAfter,
    latencyMs: draft.latencyMs,
    configVersion: draft.configVersion,
    status: "charged",
    metadata: draft.metadata,
    createdAt: now,
  };
}
