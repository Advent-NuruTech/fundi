import OpenAI from "openai";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { consumeUsage, InsufficientUsageError } from "@/lib/billing/usage-metering";

export async function POST(req: Request) {
  const admin = getBillingAdminClient();
  let workspaceId: string | null = null;
  let reservedReference: string | null = null;

  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "AI is not configured" }, { status: 503 });
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const body = await req.json();
    const message = body.message;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Resolve the caller's business (optional — falls back to unmetered)
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token) {
      const { data: { user }, error } = await admin.auth.getUser(token);
      if (!error && user) {
        const { data: profile } = await admin
          .from("profiles")
          .select("business_id")
          .eq("id", user.id)
          .maybeSingle();
        workspaceId = profile?.business_id ?? null;
      }
    }

    // Reserve 1 AI credit before generating (refunded if the call fails)
    if (workspaceId) {
      reservedReference = `ai_${Date.now()}_${randomUUID()}`;
      try {
        await consumeUsage(admin, workspaceId, "ai_credits", 1, reservedReference);
      } catch (meterError) {
        if (meterError instanceof InsufficientUsageError) {
          return NextResponse.json(
            {
              error:
                "Your AI credit allowance is used up. Add more credits in Settings → Usage & Top-ups to keep using the AI Assistant.",
              code: "INSUFFICIENT_USAGE",
              resource: "ai_credits",
            },
            { status: 429 }
          );
        }
        console.warn("[ai] Metering reservation failed", meterError);
      }
    }

    const response = await client.responses.create({
      model: "gpt-5.5",
      input: message,
    });

    return NextResponse.json({ reply: response.output_text });
  } catch (error) {
    console.error(error);
    if (workspaceId && reservedReference) {
      try {
        await admin.rpc("credit_usage", {
          p_workspace: workspaceId,
          p_resource: "ai_credits",
          p_units: 1,
          p_reference: `refund_${reservedReference}`,
          p_source: "adjustment",
          p_metadata: { refunded_consumption: reservedReference },
        });
      } catch (refundErr) {
        console.warn("[ai] Failed to refund reserved credit", refundErr);
      }
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
