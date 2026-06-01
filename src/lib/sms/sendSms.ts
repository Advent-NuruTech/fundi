export interface SendSmsResult {
  success: boolean;
  error?: string;
  response?: unknown;
}

export async function sendSms(recipient: string, message: string, sender?: string): Promise<SendSmsResult> {
  try {
    const response = await fetch("/api/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, message, sender }),
    });
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: result?.error || "SMS request failed",
        response: result?.response || result,
      };
    }
    return result;
  } catch {
    return { success: false, error: "Network error" };
  }
}
