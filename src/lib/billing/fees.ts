import type { CheckoutTotals, PlanSlug } from "@/types/billing";
import {
  getPlanConfig,
  PAYSTACK_FEE_CAP_KES,
  PAYSTACK_FEE_RATE,
  SMS_SENDER_ID_PRICE,
} from "./constants";

/**
 * Calculates the Paystack processing fee for a subtotal (KES).
 * Customer pays this on top of the subtotal.
 * Formula: 1.5% of subtotal, capped at KES 2,000.
 */
export function calculatePaystackFee(subtotalKes: number): number {
  return Math.min(Math.ceil(subtotalKes * PAYSTACK_FEE_RATE), PAYSTACK_FEE_CAP_KES);
}

/**
 * Calculates the full checkout totals for a given plan + addons.
 * First payment = installation fee only (not monthly fee).
 * Processing margin is already included in plan installation fees — no
 * separate fee is added to the user-facing total.
 */
export function calculateCheckoutTotals(
  planSlug: PlanSlug,
  addSmsSenderId: boolean
): CheckoutTotals {
  const plan = getPlanConfig(planSlug);

  const installationFee = plan?.installationFee ?? 0;
  const smsSenderIdAmount = addSmsSenderId ? SMS_SENDER_ID_PRICE : 0;
  const subtotal = installationFee + smsSenderIdAmount;

  return {
    installationFee,
    smsSenderIdAmount,
    subtotal,
    paystackFee: 0,  // margin absorbed into plan pricing; not shown to users
    total: subtotal,
  };
}

/** Converts KES to Paystack kobo/cents (KES × 100). */
export function kesToKobo(kes: number): number {
  return Math.round(kes * 100);
}

/** Converts Paystack kobo/cents back to KES (÷ 100). */
export function koboToKes(kobo: number): number {
  return kobo / 100;
}

/** Locale-formatted KES display string. */
export function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}
