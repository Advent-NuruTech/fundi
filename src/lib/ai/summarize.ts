// SERVER-ONLY — never import from client components.
//
// Conversation summarization for the Business AI Assistant (AI 2).
//
// Long conversations are the most expensive thing to resend: every turn re-sends
// the whole history even though it never changes. Instead of resending raw
// turns forever, older turns are collapsed into a compact memory summary that is
// stored on `ai_conversations` and reused on later turns. The summary is
// regenerated only every N messages, so the LLM cost of summarization is a small
// fraction of what resending the full transcript would cost.

import type { SupabaseClient } from "@supabase/supabase-js";
import { executeAssistantReply } from "./assistant-service";
import { AI_FEATURE_CHAT } from "./feature";

export interface SummarizeTurn {
  role: "user" | "assistant";
  content: string;
}

export const CONVERSATION_SUMMARY_PROMPT = `You are the memory keeper for a business AI assistant. Collapse the conversation transcript below into a compact, reusable memory summary.

Requirements:
- Output ONLY the summary text. No preamble, no headings, no "Summary:" label.
- Capture: the owner's goals and preferences, business decisions, specific figures mentioned, unresolved questions, and any agreed next steps.
- Ignore greetings, small talk and repeated pleasantries.
- Keep it under 160 words. Use short bullet fragments.
- Never invent facts that are not in the transcript.`;

export function formatTranscript(turns: SummarizeTurn[]): string {
  return turns.map((t) => `${t.role === "user" ? "Owner" : "Assistant"}: ${t.content}`).join("\n");
}

/**
 * Runs one small summarisation call over the given turns and returns the
 * trimmed summary text. Billed through the normal AI pipeline under the chat
 * feature (a tiny credit charge for a large ongoing saving). Callers should
 * treat failure as non-fatal: on any error the assistant just falls back to
 * resending raw history.
 */
export async function summarizeConversation(params: {
  db: SupabaseClient;
  businessId: string;
  userId: string;
  turns: SummarizeTurn[];
  idempotencyKey: string;
  requestId: string;
}): Promise<string> {
  const result = await executeAssistantReply({
    db: params.db,
    businessId: params.businessId,
    userId: params.userId,
    messages: [
      { role: "system", content: CONVERSATION_SUMMARY_PROMPT },
      { role: "user", content: formatTranscript(params.turns) },
    ],
    feature: AI_FEATURE_CHAT,
    maxTokens: 300,
    idempotencyKey: params.idempotencyKey,
    requestId: params.requestId,
  });
  return result.content.trim();
}
