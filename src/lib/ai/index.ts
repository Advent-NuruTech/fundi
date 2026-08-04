// FundiFlow AI ecosystem — barrel exports.
//
// NOTE: `context` and `assistant-service` are SERVER-ONLY. Client components
// should import `@/lib/ai/personas`, `@/lib/ai/types` and `@/lib/ai/prompts`
// directly and never import this barrel from a client bundle.

export * from "./types";
export * from "./personas";
export * from "./prompts";
export * from "./feature";

// Server-only modules — explicitly listed so tree-shaking stays predictable.
export { loadBusinessSnapshot, renderSnapshot, buildBusinessContext } from "./context";
export {
  executeAssistantReply,
  getAssistantCreditBalance,
  InsufficientUsageError,
  type ExecuteAssistantParams,
  type ExecuteAssistantResult,
} from "./assistant-service";
