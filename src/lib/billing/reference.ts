import { randomBytes } from "crypto";

type ReferenceType = "install" | "monthly" | "sms" | "upgrade";

/**
 * Generates a globally unique, cryptographically random Paystack reference.
 * Format: ff_<type>_<base36-timestamp>_<12-hex-random>
 *
 * The prefix "ff" (FundiFlow) lets us identify our transactions in Paystack
 * dashboard and prevents any collision with other Paystack integrations.
 */
export function generateReference(type: ReferenceType): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(6).toString("hex");
  return `ff_${type}_${timestamp}_${random}`;
}
