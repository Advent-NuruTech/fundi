import { z } from "zod";

// ─── Provider pricing / capabilities ─────────────────────────────────────────

export const providerPricingSchema = z.object({
  input: z.number().min(0),
  cachedInput: z.number().min(0),
  output: z.number().min(0),
  reasoning: z.number().min(0),
  image: z.number().min(0),
  audio: z.number().min(0),
  currency: z.string().min(1).default("USD"),
  perMillionTokens: z.boolean().default(true),
});

export const providerCapabilitiesSchema = z.object({
  caching: z.boolean(),
  reasoning: z.boolean(),
  images: z.boolean(),
  audio: z.boolean(),
});

export const providerConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  model: z.string().min(1),
  enabled: z.boolean(),
  capabilities: providerCapabilitiesSchema,
  pricing: providerPricingSchema,
});

// ─── Margin / credit / features ───────────────────────────────────────────────

export const marginConfigSchema = z.object({
  targetGrossMarginPercent: z.number().min(0).max(10000),
});

export const creditConfigSchema = z.object({
  valueKes: z.number().min(0.000001),
  roundingMode: z.enum(["ceil", "round", "floor"]),
  minimumCredits: z.number().min(0),
});

export const featureCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  suggestedCredits: z.number().min(0),
  maxCredits: z.number().min(0),
});

export const exchangeRateConfigSchema = z.object({
  active: z.enum(["manual", "central_bank", "exchange_rate_api"]),
});

// ─── Full config PUT ─────────────────────────────────────────────────────────

export const aiBillingConfigSchema = z.object({
  activeProvider: z.string().min(1),
  providers: z.record(z.string(), providerConfigSchema),
  margin: marginConfigSchema,
  credit: creditConfigSchema,
  featureCategories: z.array(featureCategorySchema).min(1),
  featurePolicies: z.record(z.string(), z.string()),
  exchangeRateProvider: exchangeRateConfigSchema,
  note: z.string().max(500).optional().nullable(),
});

export type AIBillingConfigInput = z.infer<typeof aiBillingConfigSchema>;

// ─── Exchange rate PUT ───────────────────────────────────────────────────────

export const exchangeRatePutSchema = z.object({
  rate: z.number().positive().max(100000),
  source: z.enum(["manual", "central_bank", "exchange_rate_api"]).default("manual"),
});

export type ExchangeRateInput = z.infer<typeof exchangeRatePutSchema>;

// ─── Credit packs PUT ────────────────────────────────────────────────────────

export const creditPackInputSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  credits: z.number().positive(),
  priceKes: z.number().int().positive(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const creditPacksPutSchema = z.object({
  packs: z.array(creditPackInputSchema).min(1),
});

export type CreditPacksInput = z.infer<typeof creditPacksPutSchema>;
