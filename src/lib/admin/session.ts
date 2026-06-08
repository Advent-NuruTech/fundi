/**
 * Admin session token utilities — server-only.
 *
 * Token format: base64url(JSON payload).base64url(HMAC-SHA256 signature)
 * Uses Web Crypto API so it works in both Node.js and Edge runtimes.
 */

import type { AdminTokenPayload } from "@/types/admin";

const SESSION_COOKIE = "ffm_admin_session";
const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function getSecret(): string {
  const s =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  if (!s) throw new Error("Missing ADMIN_SESSION_SECRET");
  return s;
}

function b64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(base64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return bytes.buffer.slice(0) as ArrayBuffer;
}

async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signAdminToken(
  sessionId: string,
  uid: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminTokenPayload = {
    sessionId,
    uid,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const enc = new TextEncoder();
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = b64urlEncode(enc.encode(payloadJson).buffer as ArrayBuffer);

  const key = await importKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  const sigB64 = b64urlEncode(sig);

  return `${payloadB64}.${sigB64}`;
}

export async function verifyAdminToken(
  token: string
): Promise<AdminTokenPayload | null> {
  try {
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return null;

    const key = await importKey(getSecret());
    const enc = new TextEncoder();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sigB64),
      enc.encode(payloadB64)
    );
    if (!valid) return null;

    const payloadBytes = b64urlDecode(payloadB64);
    const payloadJson = new TextDecoder().decode(new Uint8Array(payloadBytes));
    const payload = JSON.parse(payloadJson) as AdminTokenPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE, TOKEN_TTL_SECONDS };
