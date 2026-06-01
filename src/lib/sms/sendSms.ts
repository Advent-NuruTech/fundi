export interface SendSmsResult {
  success: boolean;
  error?: string;
  response?: unknown;
}

export async function sendSms(recipient: string, message: string): Promise<SendSmsResult> {
  try {
    const response = await fetch("/api/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, message }),
    });
    return response.json();
  } catch {
    return { success: false, error: "Network error" };
  }
}
