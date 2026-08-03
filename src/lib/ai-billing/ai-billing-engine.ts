import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AIBillingResult,
  AIBillingConfig,
  AIBillableRequest,
} from "@/types/ai-billing";
import { getActiveAIConfig } from "./config-store";
import { getCurrentRate } from "./exchange-rate";
import { runBillingEngine } from "./billing-engine";
import { runPricingEngine, estimateCredits } from "./pricing-engine";
import { toBillingRecord } from "./billing-engine";
import { deductAICredits, validateAICreditAvailability } from "./wallet-service";
import { writeBillingRecord } from "./records";
import { getAdapter } from "./providers/registry";
import { InsufficientAICreditsError } from "./wallet-service";

export class ConfigError extends Error {}

export class NoActiveExchangeRateError extends Error {
  constructor() {
    super("No active USD→KES exchange rate is configured. The Super Admin must set one in the AI Billing module.");
    this.name = "NoActiveExchangeRateError";
  }
}

function resolveProvider(config: AIBillingConfig, requestedProvider?: string) {
  const id = requestedProvider && requestedProvider.length > 0 ? requestedProvider : config.activeProvider;
  const providerConfig = config.providers[id];
  if (!providerConfig) {
    throw new ConfigError(`Provider "${id}" is not configured.`);
  }
  if (!providerConfig.enabled) {
    throw new ConfigError(`Provider "${id}" is disabled by configuration.`);
  }
  return providerConfig;
}

export class AIBillingEngine {
  constructor(private readonly db: SupabaseClient) {}

  /**
   * Cheap pre-flight check. Never deducts anything — it only makes sure a
   * request is likely affordable BEFORE we spend money calling a provider.
   */
  async validateBeforeExecution(input: {
    businessId: string;
    feature: string;
    estimatedInputTokens?: number;
    estimatedOutputTokens?: number;
  }): Promise<void> {
    const { config } = await getActiveAIConfig(this.db);
    const provider = resolveProvider(config);
    const rate = await getCurrentRate(config.exchangeRateProvider.active, this.db);
    if (!rate) throw new NoActiveExchangeRateError();

    const estimated = estimateCredits({
      estimatedInputTokens: input.estimatedInputTokens ?? 200,
      estimatedOutputTokens: input.estimatedOutputTokens ?? 200,
      providerConfigPricing: provider.pricing,
      exchangeRate: rate.rate,
      margin: config.margin,
      credit: config.credit,
    });
    await validateAICreditAvailability(this.db, input.businessId, Math.min(estimated, 1_000_000));
  }

  /**
   * The complete AI request lifecycle, in order:
   *   Validate → Execute → Usage → USD Cost → KES → Margin → Credits →
   *   Deduct (idempotent) → Immutable record.
   */
  async run(input: {
    businessId: string;
    userId: string | null;
    idempotencyKey: string;
    requestId: string;
    feature: string;
    provider?: string;
    model?: string;
    messages: { role: "system" | "user" | "assistant"; content: string }[];
    maxTokens?: number;
    temperature?: number;
    options?: Record<string, unknown>;
  }): Promise<AIBillingResult> {
    const { config } = await getActiveAIConfig(this.db);
    const provider = resolveProvider(config, input.provider);
    const adapter = getAdapter(provider);

    await this.validateBeforeExecution({
      businessId: input.businessId,
      feature: input.feature,
    });

    if (!adapter.execute) {
      throw new ConfigError(`Provider "${provider.id}" does not support execution in the app.`);
    }

    const { usage, latencyMs } = await adapter.execute({
      model: input.model ?? provider.model,
      messages: input.messages,
      maxTokens: input.maxTokens,
      temperature: input.temperature,
      options: input.options,
    });

    return this.billFromUsage({
      businessId: input.businessId,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      requestId: input.requestId,
      feature: input.feature,
      provider: provider.id,
      model: input.model ?? provider.model,
      usage,
      latencyMs,
      metadata: input.options,
    });
  }

  /**
   * Billing for a call whose usage is ALREADY known (e.g. executed through a
   * queue, a batch job, or a different integration point). Follows the exact
   * lifecycle from "Receive Usage" onward and never deducts before real usage
   * exists.
   */
  async billFromUsage(input: AIBillableRequest): Promise<AIBillingResult> {
    const { version, config } = await getActiveAIConfig(this.db);
    const provider = resolveProvider(config, input.provider);

    const rate = await getCurrentRate(config.exchangeRateProvider.active, this.db);
    if (!rate) throw new NoActiveExchangeRateError();

    const cost = runBillingEngine({
      usage: input.usage,
      providerConfig: provider,
      exchangeRate: rate.rate,
      exchangeSource: rate.source,
    });

    const pricing = runPricingEngine({
      costKes: cost.costKes,
      margin: config.margin,
      credit: config.credit,
      feature: input.feature,
      featurePolicies: config.featurePolicies,
      featureCategories: config.featureCategories,
    });

    const balanceAfter = await deductAICredits(
      this.db,
      input.businessId,
      pricing.charge.creditsCharged,
      input.idempotencyKey
    );

    const record = toBillingRecord({
      businessId: input.businessId,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      requestId: input.requestId,
      feature: input.feature,
      featureCategory: pricing.featureCategory?.id ?? null,
      provider: provider.id,
      model: input.model,
      usage: input.usage,
      cost,
      charge: pricing.charge,
      balanceAfter,
      latencyMs: input.latencyMs ?? null,
      configVersion: version,
      metadata: {
        ...(input.metadata ?? {}),
        ...(pricing.featureCategory
          ? {
              feature_suggested_credits: pricing.featureCategory.suggestedCredits,
              feature_max_credits: pricing.featureCategory.maxCredits,
            }
          : {}),
        ...(pricing.maxCreditsExceeded ? { max_credits_exceeded: true } : {}),
      },
    });

    const saved = await writeBillingRecord(this.db, record);

    return {
      record: saved,
      costBreakdown: cost,
      chargeBreakdown: pricing.charge,
      balanceAfter,
    };
  }
}

export { InsufficientAICreditsError };
