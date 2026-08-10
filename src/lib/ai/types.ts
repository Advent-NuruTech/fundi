// ─── FundiFlow AI ecosystem — shared types ───────────────────────────────────
//
// These types are shared between the server orchestration layer (prompts,
// context, assistant service, API routes) and the client UI. The persona
// registry lives in `personas.ts` and is deliberately plain data so it can be
// imported from client components (same pattern as `@/lib/business-types`).

export type AIAssistantPersonaId =
  | "business_consultant"
  | "operations_manager"
  | "financial_analyst"
  | "customer_service"
  | "sales_assistant"
  | "inventory_advisor"
  | "production_planner"
  | "marketing_strategist"
  | "growth_partner";

/**
 * Which business-data sections a persona may see. The context builder only
 * fetches the scopes a persona declares — this is the AI-level permission
 * boundary inside a single tenant (never mix what a persona doesn't need).
 */
export type AIContextScope =
  | "business"
  | "finance"
  | "inventory"
  | "orders"
  | "customers"
  | "payments"
  | "team"
  | "production"
  | "branches"
  | "messages"
  | "billing";

export interface AIAssistantPersona {
  id: AIAssistantPersonaId;
  /** Public display label, e.g. "Financial Analyst". */
  label: string;
  /** First-person role line shown as the assistant's greeting role. */
  role: string;
  /** Short picker subtitle. */
  tagline: string;
  /** Longer picker description. */
  description: string;
  /** lucide-react icon name (resolved client-side — keeps this file plain data). */
  icon: string;
  /** Tailwind classes for the persona avatar chip. */
  accent: string;
  /** Data scopes this persona is allowed to see. */
  contextScopes: AIContextScope[];
  /** Quick-start questions shown in an empty conversation. */
  suggestedPrompts: string[];
  /** The persona's specialisation block, appended to the shared guardrails. */
  specialization: string;
}

export interface AIConversationSummary {
  id: string;
  businessId: string;
  userId: string | null;
  title: string;
  personaId: AIAssistantPersonaId;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessageRecord {
  id: string;
  conversationId: string;
  businessId: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  creditsCharged: number;
  tokensTotal: number;
  createdAt: string;
}

export interface AIChatResponse {
  reply: string;
  conversationId: string;
  messageId: string;
  personaId: AIAssistantPersonaId;
  model: string;
  creditsCharged: number;
  balanceAfter: number | null;
  /** "engine" = full billing engine, "meter" = legacy credit meter, "greeting" = zero-cost instant reply. */
  billingMode: "engine" | "meter" | "greeting";
}

// ─── Smart Assistant (public website) ────────────────────────────────────────

export interface PublicChatResponse {
  reply: string;
  model: string;
}
