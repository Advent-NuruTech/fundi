import type { AIBillingConfig } from "@/types/ai-billing";

export const DEFAULT_AI_BILLING_CONFIG: AIBillingConfig = {
  activeProvider: "openai",
  providers: {
    openai: {
      id: "openai",
      name: "OpenAI",
      model: "GPT-5.6 Luna",
      enabled: true,
      capabilities: {
        caching: true,
        reasoning: false,
        images: false,
        audio: false,
      },
      pricing: {
        input: 0.2,
        cachedInput: 0.02,
        output: 1.2,
        reasoning: 0,
        image: 0,
        audio: 0,
        currency: "USD",
        perMillionTokens: true,
      },
    },
  },
  margin: {
    targetGrossMarginPercent: 100,
  },
  credit: {
    valueKes: 0.5,
    roundingMode: "ceil",
    minimumCredits: 1,
  },
  featureCategories: [
    {
      id: "simple",
      name: "Simple",
      description: "Short deterministic prompts (classify, extract, short answer).",
      suggestedCredits: 1,
      maxCredits: 10,
    },
    {
      id: "medium",
      name: "Medium",
      description: "Multi-step reasoning over structured business data.",
      suggestedCredits: 5,
      maxCredits: 50,
    },
    {
      id: "complex",
      name: "Complex",
      description: "Long-context generation with tool calls (reports, drafts).",
      suggestedCredits: 20,
      maxCredits: 200,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "Long-running / high-token workloads (batch, image, audio).",
      suggestedCredits: 100,
      maxCredits: 1000,
    },
  ],
  featurePolicies: {
    "assistant.chat": "medium",
    "assistant.smart_text": "medium",
    "order.autosuggest": "simple",
    "order.smart_fill": "medium",
    "inventory.reorder": "simple",
    "customer.summary": "medium",
    "report.draft": "complex",
    "report.batch": "enterprise",
  },
  exchangeRateProvider: {
    active: "manual",
  },
};
