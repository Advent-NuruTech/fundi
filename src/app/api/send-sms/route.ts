import { NextResponse } from "next/server";
import { formatPhone, isValidKenyanPhone } from "@/lib/sms/formatPhone";

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

export async function POST(request: Request) {
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
    return NextResponse.json({ success: false, error: "Failed to send SMS" }, { status: 500 });
  }
}
