"use client";

import { useMemo, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import type { Order } from "@/types/domain";
import { buildReceiptData, formatReceiptMoney, type ReceiptBusiness } from "@/lib/receipt";

const NAVY = "#16265c";

interface OrderReceiptProps {
  order: Order;
  business: ReceiptBusiness;
  /** Optional close handler — renders a close button in the action bar. */
  onClose?: () => void;
}

/**
 * Printable, supermarket-style receipt for a single order. The visual matches
 * the FundiFlow receipt template; per-business branding (logo, name, contacts)
 * fills the header. VAT rows render ONLY when the business has tax enabled —
 * when off there is no tax line and no placeholder at all.
 *
 * Printing isolates `#fundi-receipt` via the print stylesheet below, so the
 * dashboard chrome and the action bar never appear on paper.
 */
export function OrderReceipt({ order, business, onClose }: OrderReceiptProps) {
  const data = buildReceiptData(order, business);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [documentType, setDocumentType] = useState<"invoice" | "receipt">(
    order.balanceAmount > 0 ? "invoice" : "receipt"
  );
  const { totals } = data;

  const created = data.order.createdAt ? new Date(data.order.createdAt) : new Date();
  const dateStr = created.toLocaleDateString("en-KE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = created.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
  const currency = data.business.currency;

  const documentLabel = documentType === "invoice" ? "Invoice" : "Payment Receipt";
  const documentNumber = useMemo(
    () => `${documentType === "invoice" ? "INV" : "RCT"}-${data.order.number}`,
    [data.order.number, documentType]
  );
  const handlePrint = () => window.print();

  return (
    <div className="flex max-h-[90vh] flex-col">
      {/* Print isolation — keep ONLY the receipt on paper */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #fundi-receipt, #fundi-receipt * { visibility: visible !important; }
          #fundi-receipt {
            position: absolute !important;
            left: 0; top: 0;
            width: 100%;
            margin: 0; padding: 0;
            box-shadow: none !important;
            border: none !important;
          }
          @page { margin: 12mm; }
        }
      `}</style>

      {/* Action bar — hidden on print */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 print:hidden">
        <span className="text-sm font-semibold text-slate-700">{documentLabel} — {data.order.number}</span>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            <button onClick={() => setDocumentType("invoice")} className={`rounded-md px-2 py-1 text-xs font-semibold ${documentType === "invoice" ? "bg-slate-100 text-slate-900" : "text-slate-500"}`}>Invoice</button>
            <button onClick={() => setDocumentType("receipt")} className={`rounded-md px-2 py-1 text-xs font-semibold ${documentType === "receipt" ? "bg-slate-100 text-slate-900" : "text-slate-500"}`}>Receipt</button>
          </div>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#16265c] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#0f1c46]"
          >
            <Download className="h-3.5 w-3.5" /> Download PDF
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable receipt body */}
      <div className="overflow-y-auto bg-slate-100 p-4 print:overflow-visible print:bg-white print:p-0">
        <div
          id="fundi-receipt"
          ref={receiptRef}
          className="mx-auto w-full max-w-[420px] border border-slate-200 bg-white p-7 text-slate-900 shadow-sm"
        >
          {/* ── Header ── */}
          <div className="flex flex-col items-center text-center">
            {/* Business logo — disabled for now, will be implemented later.
            {data.business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.business.logoUrl}
                alt={data.business.name}
                className="mb-2 max-h-16 w-auto object-contain"
              />
            ) : (
              <div className="mb-1.5 flex items-center gap-2">
                <Droplet className="h-7 w-7 fill-[#2c5cc5] text-[#2c5cc5]" />
                <span className="text-2xl font-extrabold uppercase tracking-tight" style={{ color: NAVY }}>
                  {data.business.name}
                </span>
              </div>
            )}
            */}
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-2xl font-extrabold uppercase tracking-tight" style={{ color: NAVY }}>
                {data.business.name}
              </span>
            </div>
            <span
              className="mt-1 inline-block px-5 py-1 text-sm font-bold uppercase tracking-widest text-white"
              style={{ backgroundColor: NAVY }}
            >
              {documentLabel}
            </span>
          </div>

          <div className="my-5 border-t border-slate-300" />

          {/* ── Meta rows ── */}
          <dl className="space-y-2 text-sm">
            {data.business.phone && (
              <Row label="Phone Number" value={data.business.phone} />
            )}
            <Row label="Date" value={dateStr} />
            <Row label="Time" value={timeStr} />
            <Row label={`${documentType === "invoice" ? "Invoice" : "Receipt"} No.`} value={documentNumber} />
            {data.business.location && <Row label="Location" value={data.business.location} />}
            {data.business.email && <Row label="Email" value={data.business.email} />}
          </dl>

          <div className="my-5 border-t border-slate-300" />

          <dl className="space-y-2 text-sm">
            <Row label="Order Reference" value={data.order.number} bold />
            <Row label="Customer" value={data.order.customerName} />
            {data.order.customerPhone && <Row label="Customer phone" value={data.order.customerPhone} />}
          </dl>

          {/* ── Items table ── */}
          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="text-white" style={{ backgroundColor: NAVY }}>
                <th className="border border-[#16265c] px-2 py-2 text-left font-semibold">Item Name</th>
                <th className="border border-[#16265c] px-2 py-2 text-center font-semibold">Qty</th>
                <th className="border border-[#16265c] px-2 py-2 text-right font-semibold">Rate ({currency})</th>
                <th className="border border-[#16265c] px-2 py-2 text-right font-semibold">Amount ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i}>
                  <td className="border border-slate-300 px-2 py-2 align-top">
                    {item.name}
                    {item.notes && <span className="block text-xs text-slate-500">{item.notes}</span>}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center tabular-nums align-top">{item.quantity}</td>
                  <td className="border border-slate-300 px-2 py-2 text-right tabular-nums align-top">
                    {formatReceiptMoney(item.rate)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right tabular-nums align-top">
                    {formatReceiptMoney(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Totals ── */}
          <div className="mt-4 space-y-0 text-sm">
            {totals.taxEnabled && (
              <>
                <TotalRow label="Subtotal:" value={`${formatReceiptMoney(totals.subtotal)}`} />
                <TotalRow
                  label={`${totals.taxLabel} (${totals.taxRate}%):`}
                  value={`${formatReceiptMoney(totals.tax)}`}
                />
              </>
            )}
            <div
              className="mt-1 flex items-center justify-between bg-slate-100 px-3 py-2.5"
              style={{ borderTop: `2px solid ${NAVY}` }}
            >
              <span className="text-base font-bold">TOTAL:</span>
              <span className="text-base font-extrabold" style={{ color: NAVY }}>
                {currency} {formatReceiptMoney(totals.total)}
              </span>
            </div>
          </div>

          {/* ── Payment ── */}
          <div className="mt-5 space-y-2 text-sm">
            {order.payerName && <Row label="Paid By" value={order.payerName} />}
            <Row label="Amount Paid" value={`${currency} ${formatReceiptMoney(data.payment.amountPaid)}`} />
            {data.payment.balance > 0 ? (
              <Row label={documentType === "invoice" ? "Balance Due" : "Outstanding Balance"} value={`${currency} ${formatReceiptMoney(data.payment.balance)}`} bold />
            ) : (
              <div className="flex justify-end">
                <span
                  className="inline-block px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white"
                  style={{ backgroundColor: "#16a34a" }}
                >
                  Paid in full
                </span>
              </div>
            )}
          </div>

          <div className="my-5 border-t border-slate-300" />

          {/* ── Footer ── */}
          <div className="text-center">
            <p className="text-2xl italic" style={{ color: NAVY, fontFamily: "cursive" }}>
              Thank You!
            </p>
            <p className="mt-1 text-base font-bold" style={{ color: NAVY }}>
              Visit Again!
            </p>
            {data.business.footer && (
              <p className="mt-3 whitespace-pre-line text-xs text-slate-500">{data.business.footer}</p>
            )}
          </div>

          <div className="my-4 border-t border-slate-300" />
          <p className="text-center text-xs text-slate-400">Powered by Fundiflow</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="font-semibold text-slate-700">{label}:</dt>
      <dd className={`text-right ${bold ? "font-bold text-slate-900" : "text-slate-700"}`}>{value}</dd>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className="tabular-nums text-slate-800">{value}</span>
    </div>
  );
}
