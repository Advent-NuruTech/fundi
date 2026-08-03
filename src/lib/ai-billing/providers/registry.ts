import type { AIProviderConfig } from "@/types/ai-billing";
import type { AIProviderAdapter } from "./types";
import { createOpenAIAdapter } from "./openai-adapter";

type AdapterFactory = (config: AIProviderConfig) => AIProviderAdapter;

const REGISTRY = new Map<string, AdapterFactory>();

export function registerProvider(id: string, factory: AdapterFactory): void {
  REGISTRY.set(id, factory);
}

export function getAdapter(config: AIProviderConfig): AIProviderAdapter {
  const factory = REGISTRY.get(config.id) ?? REGISTRY.get("openai");
  if (!factory) {
    throw new Error(`No provider adapter registered for "${config.id}".`);
  }
  return factory(config);
}

export function hasAdapter(id: string): boolean {
  return REGISTRY.has(id);
}

export function listAdapterIds(): string[] {
  return Array.from(REGISTRY.keys());
}

registerProvider("openai", createOpenAIAdapter);
