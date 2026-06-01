import { NextResponse } from "next/server";
import { formatPhone, isValidKenyanPhone } from "@/lib/sms/formatPhone";
import { formatSenderId } from "@/lib/sms/formatSenderId";

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

export async function POST(request: Request) {
  try {
    const { recipient, message, sender } = await request.json();

    if (!recipient) {
      return NextResponse.json({ success: false, error: "Missing recipient" }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ success: false, error: "Missing message" }, { status: 400 });
    }

    const apiKey = process.env.WASMS_API_KEY;
    const apiSecret = process.env.WASMS_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error("Missing WASMS configuration");
      return NextResponse.json({ success: false, error: "SMS service not configured" }, { status: 500 });
    }

    const formattedPhone = formatPhone(recipient);
    if (!isValidKenyanPhone(formattedPhone)) {
      return NextResponse.json(
        { success: false, error: "Use a valid Kenyan phone number with country code, for example 254712345678" },
        { status: 400 }
      );
    }

    const safeSender = formatSenderId(sender);

    const response = await fetch("https://www.wasms.co.ke/sendsms", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "X-API-Secret": apiSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: formattedPhone,
        message,
        sender: safeSender,
      }),
    });

    const data = (await response.json()) as WasmsResponse;

    if (!response.ok || !wasSmsAccepted(data)) {
      console.error("WASMS API error:", data);
      return NextResponse.json(
        { success: false, error: getProviderError(data), response: data },
        { status: response.ok ? 502 : response.status }
      );
    }

    return NextResponse.json({ success: true, recipient: formattedPhone, response: data });
  } catch (error) {
    console.error("SMS send error:", error);
    return NextResponse.json({ success: false, error: "Failed to send SMS" }, { status: 500 });
  }
}
