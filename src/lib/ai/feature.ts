// ─── AI feature keys ─────────────────────────────────────────────────────────
//
// These keys must match the `featurePolicies` in the AI Billing config
// (`src/lib/ai-billing/constants.ts`) so usage lands in the right pricing
// category. Each AI surface bills under its own feature so platform analytics
// can tell exactly what is being used.

/** Business AI Assistant conversations (AI 2) — maps to the "medium" category. */
export const AI_FEATURE_CHAT = "assistant.chat";

/** Public Smart Assistant (AI 1) — free, never billed to a tenant. */
export const AI_FEATURE_PUBLIC = "assistant.public";

/** Customer-facing auto-replies (AI 3) — reserved for the portal integration. */
export const AI_FEATURE_CUSTOMER_REPLY = "assistant.customer_reply";
