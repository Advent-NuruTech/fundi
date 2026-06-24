import type { Business, Order, TaxMode } from "@/types/domain";

/**
 * Receipt math, kept pure so it can be unit-tested and reused by any surface
 * (order detail, POS, customer portal, PDF export…).
 *
 * The golden rule (agreed with the business owner): turning VAT ON must NEVER
 * change what an existing customer already owes. So:
 *   - tax disabled        → no tax anywhere; total = the agreed order amount.
 *   - inclusive (default) → the agreed amount already contains VAT; we only
 *                           break it out (subtotal = total ÷ (1+rate), tax = rest).
 *   - exclusive           → VAT is added on top of the agreed amount.
 */

export interface ReceiptLineItem {
  name: string;
  notes?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface ReceiptTotals {
  /** Whether any tax row should be rendered at all. */
  taxEnabled: boolean;
  taxLabel: string;
  taxRate: number;
  taxMode: TaxMode;
  /** Pre-tax (taxable) amount. Equals `total` when tax is disabled. */
  subtotal: number;
  /** Tax amount. 0 when tax is disabled. */
  tax: number;
  /** Grand total the customer pays. */
  total: number;
}

export interface ReceiptData {
  business: {
    name: string;
    logoUrl?: string;
    phone?: string;
    email?: string;
    location?: string;
    footer?: string;
    currency: string;
  };
  order: {
    number: string;
    createdAt: string;
    customerName: string;
    customerPhone?: string;
  };
  items: ReceiptLineItem[];
  totals: ReceiptTotals;
  payment: {
    amountPaid: number;
    balance: number;
    status: Order["paymentStatus"];
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function buildReceiptTotals(order: Order, business: Business): ReceiptTotals {
  const taxEnabled = business.taxEnabled ?? false;
  const taxRate = business.taxRate ?? 16;
  const taxMode: TaxMode = business.taxMode ?? "inclusive";
  const taxLabel = business.taxLabel?.trim() || "VAT";

  // The agreed order amount is the source of truth for what the customer owes.
  const agreed = order.subtotalAmount ?? 0;

  if (!taxEnabled || taxRate <= 0) {
    return { taxEnabled: false, taxLabel, taxRate, taxMode, subtotal: round2(agreed), tax: 0, total: round2(agreed) };
  }

  if (taxMode === "exclusive") {
    const tax = round2(agreed * (taxRate / 100));
    return { taxEnabled: true, taxLabel, taxRate, taxMode, subtotal: round2(agreed), tax, total: round2(agreed + tax) };
  }

  // inclusive: back the VAT out of the agreed (gross) amount.
  const subtotal = round2(agreed / (1 + taxRate / 100));
  const tax = round2(agreed - subtotal);
  return { taxEnabled: true, taxLabel, taxRate, taxMode, subtotal, tax, total: round2(agreed) };
}

export function buildReceiptData(order: Order, business: Business): ReceiptData {
  const items: ReceiptLineItem[] = (order.garments ?? []).map((g) => ({
    name: g.name,
    notes: g.styleNotes,
    quantity: g.quantity,
    rate: g.agreedPrice,
    amount: round2(g.agreedPrice * g.quantity),
  }));

  return {
    business: {
      name: business.name,
      logoUrl: business.logoUrl,
      phone: business.phone,
      email: business.email,
      location: business.location,
      footer: business.receiptFooter,
      currency: business.currency || "KES",
    },
    order: {
      number: order.orderNumber,
      createdAt: order.createdAt,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
    },
    items,
    totals: buildReceiptTotals(order, business),
    payment: {
      amountPaid: order.amountPaid ?? 0,
      balance: order.balanceAmount ?? 0,
      status: order.paymentStatus,
    },
  };
}

/** Money formatter for receipts: always 2 decimals, grouped thousands. */
export function formatReceiptMoney(value: number): string {
  return new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}
