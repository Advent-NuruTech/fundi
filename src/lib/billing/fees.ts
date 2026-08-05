import type { CheckoutTotals, PlanConfig, PlanSlug } from "@/types/billing";
import {
  getPlanConfig,
  PAYSTACK_FEE_CAP_KES,
  PAYSTACK_FEE_RATE,
  SMS_SENDER_ID_PRICE as DEFAULT_SMS_SENDER_ID_PRICE,
} from "./constants";

/**
 * Optional live-pricing overrides so server routes and client pages can pass
 * the admin-edited values (from `src/lib/billing/dynamic-config.ts` / the
 * `usePlanConfigs` hook). When omitted, the baked-in defaults are used.
 */
export interface BillingPriceOverrides {
  plan?: PlanConfig | null;
  smsSenderIdPrice?: number;
}

/**
 * Calculates the Paystack processing fee for a subtotal (KES).
 * Customer pays this on top of the subtotal.
 * Formula: 1.5% of subtotal, capped at KES 2,000.
 */
export function calculatePaystackFee(subtotalKes: number): number {
  return Math.min(Math.ceil(subtotalKes * PAYSTACK_FEE_RATE), PAYSTACK_FEE_CAP_KES);
}

/**
 * Calculates the full checkout totals for a given plan.
 * First payment = the first month at the introductory launch rate
 * (2 months at `introPrice`, then the standard `monthlyPrice`).
 * Processing margin is already included in plan pricing — no separate fee is
 * added to the user-facing total.
 */
export function calculateCheckoutTotals(
  planSlug: PlanSlug,
  addSmsSenderId: boolean,
  overrides?: BillingPriceOverrides
): CheckoutTotals {
  const plan = overrides?.plan ?? getPlanConfig(planSlug);

  // First payment is the live intro (launch) price — never hardcoded; it comes
  // from the effective plan config (defaults + admin overrides from the DB).
  const firstPayment = plan?.introPrice ?? plan?.monthlyPrice ?? 0;
  const smsSenderIdAmount = addSmsSenderId
    ? (overrides?.smsSenderIdPrice ?? DEFAULT_SMS_SENDER_ID_PRICE)
    : 0;
  const subtotal = firstPayment + smsSenderIdAmount;

  return {
    firstPayment,
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
