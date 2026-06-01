import { NextResponse } from "next/server";
import { formatPhone } from "@/lib/sms/formatPhone";
import { formatSenderId } from "@/lib/sms/formatSenderId";

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

    const data = await response.json();

    return NextResponse.json({ success: true, response: data });
  } catch (error) {
    console.error("SMS send error:", error);
    return NextResponse.json({ success: false, error: "Failed to send SMS" }, { status: 500 });
  }
}
