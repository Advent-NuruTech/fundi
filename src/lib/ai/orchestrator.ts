import "server-only";

import { BUSINESS_AI_PERSONAS, getBusinessPersona } from "@/lib/ai/personas";
import type { AIAssistantPersona, AIAssistantPersonaId, AIContextScope } from "@/lib/ai/types";

const ROUTES: Array<{ id: AIAssistantPersonaId; terms: RegExp }> = [
  { id: "financial_analyst", terms: /\b(profit|margin|cash|expense|debt|owe|payment|price|cost|revenue|finance|budget)\b/i },
  { id: "operations_manager", terms: /\b(workflow|bottleneck|deadline|late|overdue|team|staff|assign|operation)\b/i },
  { id: "production_planner", terms: /\b(production|cutting|stitching|fitting|finishing|capacity|shop floor)\b/i },
  { id: "inventory_advisor", terms: /\b(stock|inventory|material|fabric|reorder|supplier|dead stock)\b/i },
  { id: "customer_service", terms: /\b(complaint|reply|customer care|reminder|pickup|refund|message)\b/i },
  { id: "sales_assistant", terms: /\b(sell|sales|quote|upsell|cross-sell|repeat order|conversion)\b/i },
  { id: "marketing_strategist", terms: /\b(marketing|campaign|whatsapp|instagram|referral|promote|advertis)\b/i },
  { id: "growth_partner", terms: /\b(grow|growth|scale|expand|branch|strategy|weekly review|opportunity)\b/i },
];

/**
 * Routes one owner question to a small internal expert team. This is kept
 * deterministic so routing is fast, auditable and has no extra model cost.
 */
export function routeExpertTeam(
  message: string,
  leadId: AIAssistantPersonaId
): AIAssistantPersona[] {
  const ids: AIAssistantPersonaId[] = [leadId];

  for (const route of ROUTES) {
    if (route.terms.test(message) && !ids.includes(route.id)) ids.push(route.id);
    if (ids.length === 3) break;
  }

  if (leadId === "business_consultant" && ids.length === 1) {
    ids.push("growth_partner");
  }

  return ids.map(getBusinessPersona);
}

export function expertTeamScopes(team: AIAssistantPersona[]): AIContextScope[] {
  return [...new Set(team.flatMap((expert) => expert.contextScopes))];
}

export function buildExpertTeamPrompt(team: AIAssistantPersona[]): string {
  if (team.length <= 1) return "";

  return [
    "## INTERNAL EXPERT REVIEW",
    `You are the single trusted advisor speaking to the owner. Before answering, silently combine the views of: ${team.map((expert) => expert.label).join(", ")}.`,
    "Do not role-play a meeting or produce separate, repetitive answers. Resolve conflicts, check the numbers across disciplines, and deliver one concise recommendation.",
    ...team.slice(1).map((expert) => expert.specialization),
  ].join("\n\n");
}

export function expertTeamLabels(team: AIAssistantPersona[]): string[] {
  return team.map((expert) => expert.label);
}

export function isKnownExpertLabel(label: string): boolean {
  return BUSINESS_AI_PERSONAS.some((persona) => persona.label === label);
}
