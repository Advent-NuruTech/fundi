import { formatPhone } from "@/lib/sms/formatPhone";

// ── Customer Portal login rules ──────────────────────────────────────────────
//
// Login ID  = email (if present) else the customer's phone number.
// Password  = the phone number normalized to international format WITHOUT "+"
//             (e.g. 0712345678 → 254712345678).
//
// Supabase Auth is email-based, so phone-only customers are provisioned with a
// deterministic synthetic email (`254...@customer.fundiflow`). From the
// customer's point of view they simply sign in with their phone number — the
// conversion to the synthetic email happens here, entirely behind the scenes.

export const PORTAL_EMAIL_DOMAIN = "customer.fundiflow";

export function buildPortalSyntheticEmail(phone: string): string {
  return `${formatPhone(phone)}@${PORTAL_EMAIL_DOMAIN}`;
}

export function isSyntheticPortalEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${PORTAL_EMAIL_DOMAIN}`);
}

/**
 * Normalize a phone number for use as a credential: strip the "+", convert a
 * leading "0" to "254" (Kenyan default), and drop any spaces/dashes.
 */
export function normalizePhoneForAuth(phone: string): string {
  return formatPhone(phone);
}

/**
 * True when the value typed by the user looks like a phone number rather than
 * an email address.
 */
export function looksLikePhone(value: string): boolean {
  const compact = value.trim().replace(/[^\d+]/g, "");
  if (!compact) return false;
  return /^\+?254\d{9}$/.test(compact) || /^\+?0\d{9}$/.test(compact) || /^\+?\d{9,15}$/.test(compact);
}

/**
 * Convert any user-supplied login id (email OR phone) into the auth email used
 * by Supabase. Email stays an email; a phone is normalized and wrapped in the
 * synthetic portal domain.
 */
export function toAuthEmail(loginId: string): string {
  const value = loginId.trim();
  if (!value) return value;
  if (looksLikePhone(value)) return buildPortalSyntheticEmail(value);
  return value.toLowerCase();
}

/**
 * The login id a customer should be told to use: their email when available,
 * otherwise their normalized phone number (NOT the synthetic email).
 */
export function buildPortalLoginId(email?: string, phone?: string): string {
  const normalizedEmail = email?.trim();
  if (normalizedEmail) return normalizedEmail.toLowerCase();
  return phone ? formatPhone(phone) : "";
}

export function buildDefaultPortalPassword(phone: string): string {
  return formatPhone(phone);
}

// ── First-notification onboarding block ──────────────────────────────────────

export function buildPortalOnboardingBlock(opts: { email?: string; phone: string }): string {
  const normalizedPhone = formatPhone(opts.phone);
  const email = opts.email?.trim();
  const loginIdLine = email ? `Login ID: ${email}` : `Login ID: ${normalizedPhone}`;

  return [
    "",
    "Track Your Order Online",
    "You can track your order anytime through our Customer Portal.",
    loginIdLine,
    `Default Password: ${normalizedPhone}`,
    "You can change your login ID and password after signing in.",
  ].join("\n");
}

export function appendPortalOnboarding(baseMessage: string, opts: { email?: string; phone: string }): string {
  return `${baseMessage}\n${buildPortalOnboardingBlock(opts)}`;
}