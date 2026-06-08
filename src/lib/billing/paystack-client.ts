// SERVER-ONLY — never import from client components.

import { createHmac } from "crypto";

const PAYSTACK_BASE = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Missing PAYSTACK_SECRET_KEY");
  return key;
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${secretKey()}`,
    "Content-Type": "application/json",
  };
}

// ─── Initialize ─────────────────────────────────────────────────────────────

export interface PaystackInitParams {
  email: string;
  amount: number; // in kobo (KES × 100)
  reference: string;
  callback_url: string;
  metadata: Record<string, unknown>;
  currency?: string;
  channels?: string[];
}

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export async function initializeTransaction(
  params: PaystackInitParams
): Promise<PaystackInitResponse> {
  const body = {
    ...params,
    currency: params.currency ?? "KES",
    channels: params.channels ?? ["card", "mobile_money", "bank"],
  };

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Paystack initialize failed (${res.status}): ${JSON.stringify(err)}`
    );
  }

  return res.json() as Promise<PaystackInitResponse>;
}

// ─── Verify ─────────────────────────────────────────────────────────────────

export interface PaystackVerifyData {
  id: number;
  status: "success" | "failed" | "abandoned" | string;
  reference: string;
  amount: number; // kobo
  currency: string;
  paid_at: string;
  created_at: string;
  channel: string;
  fees: number;
  customer: {
    email: string;
    customer_code: string;
  };
  metadata: Record<string, unknown>;
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: PaystackVerifyData;
}

export async function verifyTransaction(
  reference: string
): Promise<PaystackVerifyResponse> {
  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET", headers: headers() }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Paystack verify failed (${res.status}): ${JSON.stringify(err)}`
    );
  }

  return res.json() as Promise<PaystackVerifyResponse>;
}

// ─── Webhook signature verification ─────────────────────────────────────────

/**
 * Verifies the X-Paystack-Signature header using HMAC-SHA512.
 * MUST be called with the raw (string) request body before any parsing.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  if (!signature) return false;
  const hash = createHmac("sha512", secretKey())
    .update(rawBody)
    .digest("hex");
  return hash === signature;
}

// ─── Base URL detection ──────────────────────────────────────────────────────

export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
}
