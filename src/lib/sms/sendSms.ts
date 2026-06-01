export interface SendSmsResult {
  success: boolean;
  error?: string;
  response?: unknown;
  recipient?: string;
}

export async function sendSms(recipient: string, message: string, sender?: string): Promise<SendSmsResult> {
  const payload = {
    recipient,
    message,
    ...(sender?.trim() ? { sender: sender.trim() } : {}),
  };

  console.log("Sending SMS:", payload);

  try {
    const response = await fetch("/api/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    console.log("SMS API Response:", result);

    if (!response.ok) {
      console.error("SMS Error:", result);
      return {
        success: false,
        error: result?.error || "SMS request failed",
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
