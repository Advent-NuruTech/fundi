import type {
  AIProviderConfig,
  AIProviderPricing,
  AIProviderUsage,
  AICostBreakdown,
} from "@/types/ai-billing";

export interface ProviderHealth {
  ok: boolean;
  status: "healthy" | "degraded" | "down";
  latencyMs: number | null;
  message: string | null;
  checkedAt: string;
}

export interface AIExecutionResult {
  usage: AIProviderUsage;
  latencyMs: number;
  raw: unknown;
}

export interface AIExecutionRequest {
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  maxTokens?: number;
  temperature?: number;
  /** Extra provider-specific options. */
  options?: Record<string, unknown>;
}

/**
 * Every provider implements this same interface. The Billing Engine only ever
 * talks to an AIProviderAdapter — it never knows which provider is running.
 * Adding a new provider (OpenAI, Anthropic, Google, Azure, local LLM…) is just
 * a new adapter; the Billing and Pricing engines change nothing.
 */
export interface AIProviderAdapter {
  readonly id: string;
  readonly name: string;
  readonly model: string;

  getPricing(config: AIProviderConfig): AIProviderPricing;

  getUsage(rawResponse: unknown): AIProviderUsage;

  calculateCost(usage: AIProviderUsage, config: AIProviderConfig): AICostBreakdown["providerCostUsd"];

  health(): Promise<ProviderHealth>;

  supportsCaching(): boolean;
  supportsReasoning(): boolean;
  supportsImages(): boolean;
  supportsAudio(): boolean;

  /** Optional — executes the request against the provider. */
  execute?(request: AIExecutionRequest): Promise<AIExecutionResult>;
}
