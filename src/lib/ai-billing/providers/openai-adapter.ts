import OpenAI from "openai";
import type {
  AIProviderConfig,
  AIProviderPricing,
  AIProviderUsage,
} from "@/types/ai-billing";
import type {
  AIExecutionRequest,
  AIExecutionResult,
  AIProviderAdapter,
  ProviderHealth,
} from "./types";
import { providerCostUsd } from "../formulas";

interface OpenAIUsageShape {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
  };
  completion_tokens_details?: {
    reasoning_tokens?: number;
  };
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }
  return new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
}

export class OpenAIAdapter implements AIProviderAdapter {
  constructor(readonly model: string) {}

  get id(): string {
    return "openai";
  }

  get name(): string {
    return "OpenAI";
  }

  getPricing(config: AIProviderConfig): AIProviderPricing {
    return config.pricing;
  }

  getUsage(rawResponse: unknown): AIProviderUsage {
    const usage = (rawResponse as { usage?: OpenAIUsageShape })?.usage;
    if (!usage) return { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, imageTokens: 0, audioTokens: 0 };
    const cachedInput = usage.prompt_tokens_details?.cached_tokens ?? 0;
    return {
      inputTokens: Math.max(0, (usage.prompt_tokens ?? 0) - cachedInput),
      cachedInputTokens: cachedInput,
      outputTokens: usage.completion_tokens ?? 0,
      reasoningTokens: usage.completion_tokens_details?.reasoning_tokens ?? 0,
      imageTokens: 0,
      audioTokens: 0,
    };
  }

  calculateCost(usage: AIProviderUsage, config: AIProviderConfig): number {
    return providerCostUsd(usage, config.pricing);
  }

  async health(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      const client = getOpenAIClient();
      await client.models.list();
      return {
        ok: true,
        status: "healthy",
        latencyMs: Date.now() - started,
        message: null,
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        ok: false,
        status: "down",
        latencyMs: Date.now() - started,
        message: err instanceof Error ? err.message : "Unknown provider error",
        checkedAt: new Date().toISOString(),
      };
    }
  }

  supportsCaching(): boolean {
    return true;
  }

  supportsReasoning(): boolean {
    return true;
  }

  supportsImages(): boolean {
    return false;
  }

  supportsAudio(): boolean {
    return false;
  }

  async execute(request: AIExecutionRequest): Promise<AIExecutionResult> {
    const client = getOpenAIClient();
    const started = Date.now();
    const completion = await client.chat.completions.create({
      model: this.model,
      messages: request.messages,
      ...(request.maxTokens != null ? { max_completion_tokens: request.maxTokens } : {}),
      ...(request.options ?? {}),
    });
    return {
      usage: this.getUsage(completion),
      latencyMs: Date.now() - started,
      raw: completion,
    };
  }
}

export function createOpenAIAdapter(config: AIProviderConfig): AIProviderAdapter {
  return new OpenAIAdapter(config.model);
}
