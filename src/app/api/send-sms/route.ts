import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { InsufficientUsageError } from "@/lib/billing/usage-metering";
import { formatPhone, isValidKenyanPhone } from "@/lib/sms/formatPhone";
import {
  PlatformSmsExhaustedError,
  refundAccountedSms,
  reserveAccountedSms,
} from "@/lib/sms/platform-accounting";

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
  /** Only accepted alongside the server-only internal key. */
  businessId?: string;
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
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return error;
}

/**
 * Resolves a tenant from its bearer token. Server-to-server sends may provide a
 * business ID only when they also prove possession of the service-role key.
 */
async function resolveWorkspaceId(
  request: Request,
  requestedBusinessId?: string
): Promise<string | null> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const admin = getBillingAdminClient();

  if (token) {
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(token);
    if (error || !user) return null;

    const { data: profile } = await admin
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .maybeSingle();

    if (requestedBusinessId) {
      if (profile?.business_id === requestedBusinessId) return requestedBusinessId;

      const { data: membership } = await admin
        .from("business_members")
        .select("id")
        .eq("profile_id", user.id)
        .eq("business_id", requestedBusinessId)
        .eq("active", true)
        .maybeSingle();
      return membership ? requestedBusinessId : null;
    }

    return profile?.business_id ?? null;
  }

  const internalKey = request.headers.get("x-fundiflow-internal-key");
  const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    requestedBusinessId &&
    internalKey &&
    expectedKey &&
    internalKey === expectedKey
  ) {
    return requestedBusinessId;
  }

  return null;
}

export async function POST(request: Request) {
  const admin = getBillingAdminClient();
  let workspaceId: string | null = null;
  let reservedReference: string | null = null;

  try {
    const body = (await request.json()) as SmsRequestBody;
    const { recipient, message, sender, businessId } = body;

    if (!recipient) {
      return NextResponse.json({ success: false, error: "Missing recipient" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ success: false, error: "Missing message" }, { status: 400 });
    }

    // Every provider send must be attributable to exactly one business.
    workspaceId = await resolveWorkspaceId(request, businessId);
    if (!workspaceId) {
      return NextResponse.json(
        {
          success: false,
          code: "SMS_ACCOUNTING_CONTEXT_REQUIRED",
          error: "A valid business session is required to send SMS.",
        },
        { status: 401 }
      );
    }

    const apiKey = process.env.WASMS_API_KEY;
    const apiSecret = process.env.WASMS_API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, error: "SMS service not configured" },
        { status: 500 }
      );
    }

    const formattedPhone = formatPhone(recipient);
    if (!isValidKenyanPhone(formattedPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: "Use a valid Kenyan phone number with country code, for example 254712345678",
        },
        { status: 400 }
      );
    }

    const payload: WasmsPayload = { recipient: formattedPhone, message };
    if (sender?.trim()) payload.sender = sender.trim();

    // Reserve the tenant credit and central provider unit in one transaction.
    reservedReference = `sms_${Date.now()}_${randomUUID()}`;
    try {
      await reserveAccountedSms(admin, workspaceId, 1, reservedReference, {
        recipient: formattedPhone,
        sender: payload.sender ?? null,
        message_length: message.length,
      });
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
      if (meterError instanceof PlatformSmsExhaustedError) {
        return NextResponse.json(
          {
            success: false,
            code: "PLATFORM_SMS_EXHAUSTED",
            error: "SMS is temporarily unavailable while platform stock is replenished.",
          },
          { status: 503 }
        );
      }
      console.error("[send-sms] Accounting reservation failed", meterError);
      return NextResponse.json(
        {
          success: false,
          code: "SMS_ACCOUNTING_FAILED",
          error: "SMS accounting is temporarily unavailable.",
        },
        { status: 503 }
      );
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
    let data: WasmsResponse;
    try {
      data = responseBody ? (JSON.parse(responseBody) as WasmsResponse) : {};
    } catch (parseError) {
      console.error("[send-sms] Provider returned invalid JSON", getErrorDetails(parseError));
      await refundReservedSms(workspaceId, reservedReference, "invalid_provider_response");
      return NextResponse.json(
        {
          success: false,
          error: "SMS provider returned an invalid response",
          response: responseBody,
        },
        { status: response.ok ? 502 : response.status }
      );
    }

    if (!response.ok || !wasSmsAccepted(data)) {
      await refundReservedSms(workspaceId, reservedReference, "provider_rejected");
      return NextResponse.json(
        { success: false, error: getProviderError(data), response: data },
        { status: response.ok ? 502 : response.status }
      );
    }

    return NextResponse.json({ success: true, recipient: formattedPhone, response: data });
  } catch (error) {
    console.error("SMS send exception:", getErrorDetails(error));
    if (workspaceId && reservedReference) {
      await refundReservedSms(workspaceId, reservedReference, "send_exception");
    }
    return NextResponse.json({ success: false, error: "Failed to send SMS" }, { status: 500 });
  }
}

/** Returns both reserved balances when the provider does not accept the send. */
async function refundReservedSms(
  workspaceId: string,
  consumedReference: string,
  reason: string
) {
  try {
    await refundAccountedSms(
      getBillingAdminClient(),
      workspaceId,
      consumedReference,
      { reason }
    );
  } catch (refundError) {
    console.error("[send-sms] Failed to refund accounted SMS", refundError);
  }
}
