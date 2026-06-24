"use client";

import { useEffect, useState } from "react";
import { Receipt, Upload, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/components/auth-context";
import { updateBusinessProfile } from "@/services/firestore.service";
import { uploadToCloudinary } from "@/services/profile.service";
import type { Business, Order, TaxMode } from "@/types/domain";
import { Dialog } from "@/components/ui/dialog";
import { OrderReceipt } from "@/components/receipt/order-receipt";

// A representative order used only to preview the receipt layout from settings.
function sampleOrder(): Order {
  return {
    id: "preview",
    businessId: "preview",
    orderNumber: "FF202505240945",
    customerId: "preview",
    customerName: "Jane Wanjiku",
    customerPhone: "0722456789",
    garments: [
      { name: "Office Suit (2-piece)", quantity: 1, agreedPrice: 4500, styleNotes: "Navy, slim fit" },
      { name: "Cotton Shirt", quantity: 2, agreedPrice: 1000 },
    ],
    measurementsSnapshot: {},
    fabricSelections: [],
    stage: "finishing",
    deliveryStatus: "pending",
    paymentStatus: "partial",
    dueDate: new Date().toISOString(),
    subtotalAmount: 6500,
    amountPaid: 4000,
    balanceAmount: 2500,
    fittingRecords: [],
    materialUsage: [],
    imageIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function ReceiptSettings() {
  const { business, refreshProfile } = useAuth();

  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState(16);
  const [taxMode, setTaxMode] = useState<TaxMode>("inclusive");
  const [taxLabel, setTaxLabel] = useState("VAT");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!business) return;
    setTaxEnabled(business.taxEnabled ?? false);
    setTaxRate(business.taxRate ?? 16);
    setTaxMode(business.taxMode ?? "inclusive");
    setTaxLabel(business.taxLabel ?? "VAT");
    setReceiptFooter(business.receiptFooter ?? "");
    setLogoUrl(business.logoUrl);
  }, [business]);

  const handleLogo = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setLogoUrl(url);
      toast.success("Logo uploaded — remember to save");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!business) {
      toast.error("Business not loaded yet — please wait a moment and retry");
      return;
    }
    if (taxEnabled && (taxRate <= 0 || taxRate > 100)) {
      toast.error("Tax rate must be between 0 and 100");
      return;
    }
    setSaving(true);
    try {
      await updateBusinessProfile(business.id, {
        taxEnabled,
        taxRate,
        taxMode,
        taxLabel: taxLabel.trim() || "VAT",
        receiptFooter: receiptFooter.trim(),
        logoUrl: logoUrl ?? "",
      });
      await refreshProfile();
      toast.success("Receipt settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  // Live preview reflects the unsaved form state, not just the saved business.
  const previewBusiness: Business = {
    ...(business ?? {
      id: "preview",
      name: "Your Business",
      phone: "",
      location: "",
      currency: "KES",
      country: "Kenya",
      ownerUid: "",
      createdAt: new Date().toISOString(),
    }),
    logoUrl,
    receiptFooter,
    taxEnabled,
    taxRate,
    taxMode,
    taxLabel,
  };

  return (
    <div className="rounded-3xl border bg-white p-6">
      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6" />
        <div>
          <h2 className="font-bold">Receipts &amp; Tax</h2>
          <p className="text-sm text-gray-500">
            Branding and VAT shown on every order receipt
          </p>
        </div>
      </div>

      {/* Logo */}
      <div className="mt-6 space-y-2">
        <label className="text-sm font-medium">Receipt Logo</label>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border bg-neutral-50">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-gray-400">No logo</span>
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition hover:bg-neutral-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Upload logo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleLogo(e.target.files?.[0])}
            />
          </label>
          {logoUrl && (
            <button
              type="button"
              onClick={() => setLogoUrl(undefined)}
              className="text-sm text-rose-500 hover:text-rose-700"
            >
              Remove
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400">
          If no logo is set, your business name is printed at the top instead.
        </p>
      </div>

      {/* VAT toggle */}
      <div className="mt-6 flex items-center justify-between rounded-2xl border bg-neutral-50 px-4 py-3.5">
        <div>
          <p className="text-sm font-semibold">Charge VAT / Tax</p>
          <p className="text-xs text-gray-500">
            When off, no tax line appears on receipts at all.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={taxEnabled}
          onClick={() => setTaxEnabled((v) => !v)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
            taxEnabled ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
              taxEnabled ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      {/* VAT details */}
      {taxEnabled && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tax Rate (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tax Label</label>
            <input
              value={taxLabel}
              onChange={(e) => setTaxLabel(e.target.value)}
              placeholder="VAT"
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Tax Mode</label>
            <select
              value={taxMode}
              onChange={(e) => setTaxMode(e.target.value as TaxMode)}
              className="h-12 w-full rounded-2xl border bg-white px-4 text-sm outline-none focus:border-black"
            >
              <option value="inclusive">Inclusive — agreed price already includes tax (recommended)</option>
              <option value="exclusive">Exclusive — tax added on top of the agreed price</option>
            </select>
            <p className="text-xs text-gray-400">
              {taxMode === "inclusive"
                ? "Turning VAT on won't change what customers already owe — the price is just broken into subtotal + tax."
                : "The receipt total will be higher than the agreed order amount, because tax is added on top."}
            </p>
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="mt-6 space-y-2">
        <label className="text-sm font-medium">Receipt Footer Note (optional)</label>
        <textarea
          value={receiptFooter}
          onChange={(e) => setReceiptFooter(e.target.value)}
          rows={2}
          placeholder="e.g. Goods once sold are not returnable. Thank you for your business."
          className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-black"
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition hover:bg-neutral-50"
        >
          <Eye className="h-4 w-4" /> Preview receipt
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-2xl bg-black px-8 py-3 font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {previewOpen && (
        <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} className="max-w-xl p-0">
          <OrderReceipt order={sampleOrder()} business={previewBusiness} onClose={() => setPreviewOpen(false)} />
        </Dialog>
      )}
    </div>
  );
}
