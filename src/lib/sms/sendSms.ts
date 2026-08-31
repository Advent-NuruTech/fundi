import { supabase } from "@/lib/supabase";

export interface SendSmsResult {
  success: boolean;
  error?: string;
  code?: string;
  response?: unknown;
  recipient?: string;
}

export async function sendSms(
  recipient: string,
  message: string,
  sender?: string,
  businessId?: string
): Promise<SendSmsResult> {
  const payload = {
    recipient,
    message,
    ...(sender?.trim() ? { sender: sender.trim() } : {}),
    ...(businessId ? { businessId } : {}),
  };

  console.log("Sending SMS:", payload);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch("/api/send-sms", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    console.log("SMS API Response:", result);

    if (!response.ok) {
      console.error("SMS Error:", result);
      return {
        success: false,
        error: result?.error || "SMS request failed",
        code: result?.code,
        response: result?.response || result,
      };
    }

    if (!result?.success) {
      console.error("SMS Error:", result);
    }

    return result;
  } catch (error) {
    console.error("SMS Network Error:", error);
    return { success: false, error: "Network error", response: error };
  }
}
