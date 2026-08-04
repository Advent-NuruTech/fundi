import OpenAI from "openai";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PUBLIC_ASSISTANT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { buildInstantGreeting } from "@/lib/ai/greetings";
import { AI_FEATURE_PUBLIC } from "@/lib/ai/feature";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

// ─── Rate limiting ───────────────────────────────────────────────────────────
// In-memory sliding window per IP. Good enough for a marketing widget on a
// single Node instance; move to a distributed store (Redis/Upstash) when the
// Smart Assistant scales across many instances.

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 25;
const buckets = new Map<string, number[]>();

function allowRequest(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const hits = (buckets.get(ip) ?? []).filter((t) => t > windowStart);
  if (hits.length >= RATE_LIMIT_MAX) {
    buckets.set(ip, hits);
    return false;
  }
  hits.push(now);
  buckets.set(ip, hits);
  return true;
}

const MODEL_ID_RE = /^[a-z0-9][a-z0-9._-]*$/i;

function resolveModel(): string {
  const configured = process.env.OPENAI_MODEL;
  if (configured && MODEL_ID_RE.test(configured)) return configured;
  return "gpt-5.5";
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (!allowRequest(ip)) {
    return json({ error: "Too many requests. Please try again in a few minutes." }, 429);
  }

  const apiKey = process.env.OPENAI_API_KEY;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return json({ error: "Message is required" }, 400);

  // Instant greeting fast path — no LLM call, no tokens burned on "hi"/"thanks".
  const instant = buildInstantGreeting(message, {
    assistantName: "FundiFlow",
    role: "the Smart Assistant",
  });
  if (instant) return json({ reply: instant, model: "instant" });

  if (!apiKey) return json({ error: "AI is not configured" }, 503);

  // Optional short public history (no auth, no tenant data — never accept
  // anything other than plain role/content turns, capped aggressively).
  const rawHistory = Array.isArray(body?.history) ? body.history.slice(-10) : [];
  const history = rawHistory
    .map((h) => {
      const turn = h as { role?: unknown; content?: unknown };
      if (
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string" &&
        turn.content.length <= 2000
      ) {
        return { role: turn.role as "user" | "assistant", content: turn.content.slice(0, 2000) };
      }
      return null;
    })
    .filter((h): h is { role: "user" | "assistant"; content: string } => h !== null);

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: resolveModel(),
      messages: [
        { role: "system", content: PUBLIC_ASSISTANT_SYSTEM_PROMPT },
        ...history,
        { role: "user", content: message.slice(0, 2000) },
      ],
      max_completion_tokens: 700,
    });

    const reply = completion.choices?.[0]?.message?.content ?? "";
    if (!reply) return json({ error: "The assistant returned an empty reply." }, 502);

    // Trace for analytics (AI 4) — no PII, just usage fingerprint.
    console.info("[ai-public]", JSON.stringify({ id: randomUUID(), model: completion.model, feature: AI_FEATURE_PUBLIC }));

    return json({ reply, model: completion.model });
  } catch (err) {
    console.error("[ai-public] failed", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
