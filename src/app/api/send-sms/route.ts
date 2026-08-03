import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { formatPhone, isValidKenyanPhone } from "@/lib/sms/formatPhone";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { consumeUsage, InsufficientUsageError } from "@/lib/billing/usage-metering";

type WasmsResult = {
  recipient?: string;
  success?: boolean;
  message_id?: string;
  error?: string;
  message?: string;
};

type WasmsResponse = {
  success?: boolean;
  status?: string;
  total?: number;
  success_count?: number;
  failed_count?: number;
  results?: WasmsResult[];
  error?: string;
  message?: string;
  credits_available?: number;
  credits_needed?: number;
};

type SmsRequestBody = {
  recipient?: string;
  message?: string;
  sender?: string;
};

type WasmsPayload = {
  recipient: string;
  message: string;
  sender?: string;
};

function getProviderError(data: WasmsResponse): string {
  const failedResult = data.results?.find((result) => result.success === false);
  return (
    failedResult?.error ||
    failedResult?.message ||
    data.error ||
    data.message ||
    "SMS provider rejected the request"
  );
}

function wasSmsAccepted(data: WasmsResponse): boolean {
  const result = data.results?.[0];
  return (
    data.success === true &&
    data.status === "success" &&
    (data.success_count ?? 0) > 0 &&
    (data.failed_count ?? 0) === 0 &&
    result?.success === true
  );
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

/** Resolves the caller's workspace from the bearer token, if present. */
async function resolveWorkspaceId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const admin = getBillingAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.business_id ?? null;
}

export async function POST(request: Request) {
  const admin = getBillingAdminClient();
  let workspaceId: string | null = null;
  let reservedReference: string | null = null;

  try {
    const body = (await request.json()) as SmsRequestBody;
    const { recipient, message, sender } = body;
    console.log("Incoming SMS Request:", body);

    if (!recipient) {
      console.error("WASMS API Error:", { error: "Missing recipient", body });
      return NextResponse.json({ success: false, error: "Missing recipient" }, { status: 400 });
    }

    if (!message) {
      console.error("WASMS API Error:", { error: "Missing message", body });
      return NextResponse.json({ success: false, error: "Missing message" }, { status: 400 });
    }

    // Resolve the caller's business for metering (optional for server-to-server sends)
    workspaceId = await resolveWorkspaceId(request);

    const apiKey = process.env.WASMS_API_KEY;
    const apiSecret = process.env.WASMS_API_SECRET;
    console.log("WASMS Env Loaded:", {
      hasApiKey: Boolean(apiKey),
      hasApiSecret: Boolean(apiSecret),
    });

    if (!apiKey || !apiSecret) {
      console.error("Missing WASMS configuration");
      return NextResponse.json({ success: false, error: "SMS service not configured" }, { status: 500 });
    }

    const formattedPhone = formatPhone(recipient);
    console.log("SMS Phone Formatting:", {
      originalPhone: recipient,
      formattedPhone,
      isValid: isValidKenyanPhone(formattedPhone),
    });

    if (!isValidKenyanPhone(formattedPhone)) {
      console.error("WASMS API Error:", {
        error: "Invalid Kenyan phone number",
        originalPhone: recipient,
        formattedPhone,
      });
      return NextResponse.json(
        { success: false, error: "Use a valid Kenyan phone number with country code, for example 254712345678" },
        { status: 400 }
      );
    }

    const payload: WasmsPayload = {
      recipient: formattedPhone,
      message,
    };

    if (sender?.trim()) {
      payload.sender = sender.trim();
    }

    console.log("SMS Request Payload:", payload);

    // ── Reserve 1 SMS atomically BEFORE sending (refunded if the provider rejects) ──
    if (workspaceId) {
      reservedReference = `sms_${Date.now()}_${randomUUID()}`;
      try {
        await consumeUsage(admin, workspaceId, "sms", 1, reservedReference);
      } catch (meterError) {
        if (meterError instanceof InsufficientUsageError) {
          return NextResponse.json(
            {
              success: false,
              code: "INSUFFICIENT_USAGE",
              resource: "sms",
              error:
                "Your SMS allowance is used up. Add more SMS in Settings → Usage & Top-ups to keep sending.",
            },
            { status: 429 }
          );
        }
        console.warn("[send-sms] Metering reservation failed", meterError);
      }
    }

    const response = await fetch("https://www.wasms.co.ke/sendsms", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "X-API-Secret": apiSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.text();
    console.log("WASMS HTTP Status:", response.status);
    console.log("WASMS Raw Response Body:", responseBody);

    let data: WasmsResponse;
    try {
      data = responseBody ? (JSON.parse(responseBody) as WasmsResponse) : {};
    } catch (parseError) {
      console.error("WASMS API Error:", {
        error: "WASMS returned a non-JSON response",
        parseError: getErrorDetails(parseError),
        responseBody,
      });

      return NextResponse.json(
        {
          success: false,
          error: "SMS provider returned an invalid response",
          response: responseBody,
        },
        { status: response.ok ? 502 : response.status }
      );
    }

    console.log("WASMS Response:", data);

    if (!response.ok || !wasSmsAccepted(data)) {
      console.error("WASMS API Error:", data);
      if (workspaceId && reservedReference) {
        await refundReservedSms(workspaceId, reservedReference);
      }
      return NextResponse.json(
        { success: false, error: getProviderError(data), response: data },
        { status: response.ok ? 502 : response.status }
      );
    }

    const frontendResult = { success: true, recipient: formattedPhone, response: data };
    console.log("SMS API Result Returned:", frontendResult);
    return NextResponse.json(frontendResult);
  } catch (error) {
    console.error("SMS send exception:", getErrorDetails(error));
    if (workspaceId && reservedReference) {
      await refundReservedSms(workspaceId, reservedReference);
    }
    return NextResponse.json({ success: false, error: "Failed to send SMS" }, { status: 500 });
  }
}

/** Returns a previously reserved SMS credit when the provider rejects the send. */
async function refundReservedSms(workspaceId: string, consumedReference: string) {
  try {
    await getBillingAdminClient().rpc("credit_usage", {
      p_workspace: workspaceId,
      p_resource: "sms",
      p_units: 1,
      p_reference: `refund_${consumedReference}`,
      p_source: "adjustment",
      p_metadata: { refunded_consumption: consumedReference },
    });
  } catch (refundErr) {
    console.warn("[send-sms] Failed to refund reserved SMS", refundErr);
  }
}
