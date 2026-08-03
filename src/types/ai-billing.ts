// ─── AI Billing Engine — types ───────────────────────────────────────────────
//
// These types describe the AI Billing Engine's configuration, provider usage,
// immutable billing records and analytics. Every commercial value is editable
// by the Super Admin and is never hardcoded in the engine itself.

// ─── Provider pricing (USD per 1M tokens) ────────────────────────────────────

export interface AIProviderPricing {
  input: number;
  cachedInput: number;
  output: number;
  reasoning: number;
  image: number;
  audio: number;
  currency: string;
  /** True when prices are expressed per 1,000,000 tokens. */
  perMillionTokens: boolean;
}

export interface AIProviderCapabilities {
  caching: boolean;
  reasoning: boolean;
  images: boolean;
  audio: boolean;
}

export interface AIProviderConfig {
  id: string;
  name: string;
  model: string;
  enabled: boolean;
  capabilities: AIProviderCapabilities;
  pricing: AIProviderPricing;
}

// ─── Margin / credit / feature policy ────────────────────────────────────────

export interface AIMarginConfig {
  /** Target portfolio gross margin, e.g. 100 → revenue multiplier 2.0. */
  targetGrossMarginPercent: number;
}

export type AICreditRoundingMode = "ceil" | "round" | "floor";

export interface AICreditConfig {
  /** Revenue per single AI credit, in KES. */
  valueKes: number;
  roundingMode: AICreditRoundingMode;
  /** Every request consumes at least this many credits. */
  minimumCredits: number;
}

export interface AIFeatureCategory {
  id: string;
  name: string;
  description: string;
  suggestedCredits: number;
  maxCredits: number;
}

/** Maps an AI feature key (e.g. "assistant.chat") to a category id. */
export type AIFeaturePolicies = Record<string, string>;

export type AIExchangeRateProviderId = "manual" | "central_bank" | "exchange_rate_api";

export interface AIExchangeRateConfig {
  active: AIExchangeRateProviderId;
}

// ─── Full active configuration ───────────────────────────────────────────────

export interface AIBillingConfig {
  activeProvider: string;
  providers: Record<string, AIProviderConfig>;
  margin: AIMarginConfig;
  credit: AICreditConfig;
  featureCategories: AIFeatureCategory[];
  featurePolicies: AIFeaturePolicies;
  exchangeRateProvider: AIExchangeRateConfig;
}

// ─── Exchange rate ───────────────────────────────────────────────────────────

export interface AIExchangeRate {
  id: string;
  rate: number;
  source: AIExchangeRateProviderId;
  updatedBy: string | null;
  createdAt: string;
}

// ─── Credit packs ────────────────────────────────────────────────────────────

export interface AICreditPack {
  id: string;
  label: string;
  credits: number;
  priceKes: number;
  active: boolean;
  sortOrder: number;
  updatedAt: string | null;
  createdAt: string;
}

// ─── Actual provider usage ───────────────────────────────────────────────────

export interface AIProviderUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  imageTokens: number;
  audioTokens: number;
}

// ─── Cost breakdown (Billing Engine output — provider cost only) ─────────────

export interface AICostBreakdown {
  providerCostUsd: number;
  exchangeRate: number;
  exchangeSource: AIExchangeRateProviderId;
  costKes: number;
}

// ─── Pricing Engine output ───────────────────────────────────────────────────

export interface AIChargeBreakdown {
  revenueMultiplier: number;
  revenueKes: number;
  creditValueKes: number;
  roundingMode: AICreditRoundingMode;
  rawCredits: number;
  minimumCredits: number;
  creditsCharged: number;
}

// ─── Immutable billing record ────────────────────────────────────────────────

export interface AIBillingRecord {
  id: string;
  idempotencyKey: string;
  requestId: string;
  businessId: string;
  userId: string | null;
  provider: string;
  model: string;
  feature: string;
  featureCategory: string | null;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  imageTokens: number;
  audioTokens: number;
  providerCostUsd: number;
  exchangeRate: number;
  exchangeSource: AIExchangeRateProviderId;
  costKes: number;
  revenueMultiplier: number;
  revenueKes: number;
  creditValueKes: number;
  roundingMode: AICreditRoundingMode;
  creditsCharged: number;
  minimumCredits: number;
  balanceAfter: number | null;
  latencyMs: number | null;
  configVersion: number;
  status: "charged" | "failed" | "refunded";
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── Engine inputs ───────────────────────────────────────────────────────────

/** Usage known BEFORE execution — used only for a cheap credit pre-check. */
export interface AIRequestIntent {
  feature: string;
  /** Estimated tokens so we can sanity-check credits before calling a provider. */
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
}

/** A fully-executed AI call ready to be billed. */
export interface AIBillableRequest {
  businessId: string;
  userId: string | null;
  /** Idempotency key — replaying the same key never double-charges. */
  idempotencyKey: string;
  requestId: string;
  feature: string;
  provider: string;
  model: string;
  usage: AIProviderUsage;
  latencyMs?: number | null;
  metadata?: Record<string, unknown>;
}

export interface AIBillingResult {
  record: AIBillingRecord;
  costBreakdown: AICostBreakdown;
  chargeBreakdown: AIChargeBreakdown;
  balanceAfter: number | null;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AIAnalyticsSummary {
  totalProviderCost: number;
  totalRevenue: number;
  grossMarginPercent: number;
  averageCredits: number;
  averageProviderCost: number;
  averageRevenue: number;
  requestCount: number;
  portfolioMarginPercent: number;
  belowTargetMargin: boolean;
  targetMarginPercent: number;
}

export interface AIAnalyticsBucket {
  key: string;
  count: number;
  totalCost: number;
  totalRevenue: number;
  totalCredits: number;
}

export interface AIAnalyticsDailyPoint {
  date: string;
  cost: number;
  revenue: number;
  requests: number;
}

export interface AIAnalytics {
  summary: AIAnalyticsSummary;
  byFeature: AIAnalyticsBucket[];
  byProvider: AIAnalyticsBucket[];
  byModel: AIAnalyticsBucket[];
  byCategory: AIAnalyticsBucket[];
  topFeatures: AIAnalyticsBucket[];
  mostExpensiveRequests: AIBillingRecord[];
  daily: AIAnalyticsDailyPoint[];
  monthly: AIAnalyticsDailyPoint[];
  timeRange: { start: string; end: string };
}
