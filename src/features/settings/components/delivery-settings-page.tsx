"use client";

import { useEffect, useState } from "react";
import { Truck, Plus, Trash2, Pencil, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/components/auth-context";
import {
  getDeliveryConfig,
  updateDeliveryConfig,
  listenDeliveryPartners,
  createDeliveryPartner,
  updateDeliveryPartner,
  deleteDeliveryPartner,
} from "@/services/firestore.service";
import type { BusinessDeliveryConfig, DeliveryPartner, DeliveryMethod } from "@/types/domain";
import { DEFAULT_DELIVERY_CONFIG } from "@/types/domain";
import { formatKes } from "@/lib/utils";

const SMS_OPTIONS: { key: keyof BusinessDeliveryConfig["sms"]; label: string; description: string }[] = [
  { key: "dispatch", label: "Ready for Dispatch", description: "Order complete and packed for delivery" },
  { key: "assign", label: "Courier Assigned", description: "Courier / partner has been assigned" },
  { key: "pickup", label: "Picked Up", description: "Courier collected the order" },
  { key: "transit", label: "In Transit", description: "Order is on the way" },
  { key: "attempt", label: "Delivery Attempted", description: "Delivery attempt was unsuccessful" },
  { key: "delivered", label: "Delivered", description: "Order successfully delivered" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"}`}
      />
    </button>
  );
}

export function DeliverySettingsPage() {
  const { user, business } = useAuth();
  const businessId = business?.id ?? user?.businessId ?? "";

  // ── config state ──
  const [config, setConfig] = useState<BusinessDeliveryConfig | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [defaultMethod, setDefaultMethod] = useState<DeliveryMethod>("delivery");
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState("0");
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState("");
  const [autoDeliverReadyMade, setAutoDeliverReadyMade] = useState(true);
  const [sms, setSms] = useState<BusinessDeliveryConfig["sms"]>({ ...DEFAULT_DELIVERY_CONFIG.sms });
  const [savingConfig, setSavingConfig] = useState(false);

  // ── partners state ──
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerCompany, setPartnerCompany] = useState("");
  const [partnerVehicle, setPartnerVehicle] = useState("");
  const [partnerReg, setPartnerReg] = useState("");
  const [partnerNotes, setPartnerNotes] = useState("");
  const [partnerActive, setPartnerActive] = useState(true);
  const [savingPartner, setSavingPartner] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    const unsub = listenDeliveryPartners(businessId, setPartners);
    getDeliveryConfig(businessId)
      .then((cfg) => {
        if (!cfg) return;
        setConfig(cfg);
        setEnabled(cfg.enabled);
        setDefaultMethod(cfg.defaultMethod);
        setDefaultDeliveryFee(String(cfg.defaultDeliveryFee ?? 0));
        setFreeDeliveryAbove(cfg.freeDeliveryAbove != null ? String(cfg.freeDeliveryAbove) : "");
        setAutoDeliverReadyMade(cfg.autoDeliverReadyMade);
        setSms({ ...cfg.sms });
      })
      .catch(() => {});
    return () => unsub();
  }, [businessId]);

  const resetPartnerForm = () => {
    setEditingId(null);
    setPartnerName("");
    setPartnerPhone("");
    setPartnerCompany("");
    setPartnerVehicle("");
    setPartnerReg("");
    setPartnerNotes("");
    setPartnerActive(true);
    setShowForm(false);
  };

  const startEditPartner = (p: DeliveryPartner) => {
    setEditingId(p.id);
    setPartnerName(p.name);
    setPartnerPhone(p.phone);
    setPartnerCompany(p.company ?? "");
    setPartnerVehicle(p.vehicleType ?? "");
    setPartnerReg(p.registrationNumber ?? "");
    setPartnerNotes(p.notes ?? "");
    setPartnerActive(p.isActive);
    setShowForm(true);
  };

  const handleSaveConfig = async () => {
    if (!businessId) {
      toast.error("Business not loaded yet — please wait a moment and retry");
      return;
    }
    const fee = Number(defaultDeliveryFee) || 0;
    if (fee < 0) {
      toast.error("Delivery fee cannot be negative");
      return;
    }
    const freeAbove = freeDeliveryAbove.trim() ? Number(freeDeliveryAbove) : null;
    setSavingConfig(true);
    try {
      await updateDeliveryConfig(businessId, {
        enabled,
        defaultMethod,
        defaultDeliveryFee: defaultMethod === "delivery" ? fee : 0,
        freeDeliveryAbove: freeAbove,
        autoDeliverReadyMade,
        sms,
      });
      toast.success("Delivery settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save delivery settings");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSavePartner = async () => {
    if (!businessId || savingPartner) return;
    if (!partnerName.trim()) {
      toast.error("Partner name is required");
      return;
    }
    if (!partnerPhone.trim()) {
      toast.error("Partner phone is required");
      return;
    }
    setSavingPartner(true);
    try {
      if (editingId) {
        await updateDeliveryPartner(businessId, editingId, {
          name: partnerName.trim(),
          phone: partnerPhone.trim(),
          company: partnerCompany.trim() || undefined,
          vehicleType: partnerVehicle.trim() || undefined,
          registrationNumber: partnerReg.trim() || undefined,
          notes: partnerNotes.trim() || undefined,
          isActive: partnerActive,
        });
        toast.success("Partner updated");
      } else {
        await createDeliveryPartner(businessId, {
          name: partnerName.trim(),
          phone: partnerPhone.trim(),
          company: partnerCompany.trim() || undefined,
          vehicleType: partnerVehicle.trim() || undefined,
          registrationNumber: partnerReg.trim() || undefined,
          notes: partnerNotes.trim() || undefined,
          isActive: partnerActive,
        });
        toast.success("Partner added");
      }
      resetPartnerForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save partner");
    } finally {
      setSavingPartner(false);
    }
  };

  const handleToggleActive = async (p: DeliveryPartner) => {
    if (!businessId) return;
    try {
      await updateDeliveryPartner(businessId, p.id, { isActive: !p.isActive });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update partner");
    }
  };

  const handleDeletePartner = async (p: DeliveryPartner) => {
    if (!businessId) return;
    if (!window.confirm(`Remove ${p.name} from delivery partners?`)) return;
    try {
      await deleteDeliveryPartner(businessId, p.id);
      toast.success("Partner removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove partner");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Delivery Settings</h1>
        <p className="text-gray-500">Delivery policy, customer SMS milestones and courier partners</p>
      </div>

      {/* ── Policy ── */}
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <Truck className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="font-bold">Delivery Policy</h2>
            <p className="text-sm text-gray-500">Defaults applied to every new order</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-2xl border bg-neutral-50 px-4 py-3.5">
          <div>
            <p className="text-sm font-semibold">Enable Delivery Management</p>
            <p className="text-xs text-gray-500">When off, all orders default to customer pickup.</p>
          </div>
          <Toggle checked={enabled} onChange={setEnabled} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Default Fulfilment</label>
            <select
              value={defaultMethod}
              onChange={(e) => setDefaultMethod(e.target.value as DeliveryMethod)}
              disabled={!enabled}
              className="h-12 w-full rounded-2xl border bg-white px-4 text-sm outline-none focus:border-black disabled:bg-neutral-50 disabled:text-gray-400"
            >
              <option value="delivery">Home Delivery</option>
              <option value="pickup">Customer Pickup</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Default Delivery Fee (KES)</label>
            <input
              type="number"
              min={0}
              value={defaultDeliveryFee}
              onChange={(e) => setDefaultDeliveryFee(e.target.value)}
              disabled={!enabled}
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black disabled:bg-neutral-50 disabled:text-gray-400"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Free Delivery Above (KES — optional)</label>
            <input
              type="number"
              min={0}
              value={freeDeliveryAbove}
              onChange={(e) => setFreeDeliveryAbove(e.target.value)}
              placeholder="e.g. 20000 — orders over this get free delivery"
              disabled={!enabled}
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black disabled:bg-neutral-50 disabled:text-gray-400"
            />
          </div>
          <div className="flex items-center justify-between rounded-2xl border bg-neutral-50 px-4 py-3.5 md:col-span-2">
            <div>
              <p className="text-sm font-semibold">Auto-deliver ready-made orders</p>
              <p className="text-xs text-gray-500">
                Ready-made items with no alterations are marked delivered automatically.
              </p>
            </div>
            <Toggle checked={autoDeliverReadyMade} onChange={setAutoDeliverReadyMade} />
          </div>
        </div>
      </div>

      {/* ── Customer SMS ── */}
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <Check className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="font-bold">Customer SMS Updates</h2>
            <p className="text-sm text-gray-500">Which delivery milestones text the customer</p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {SMS_OPTIONS.map((opt) => (
            <div
              key={opt.key}
              className="flex items-center justify-between rounded-2xl border bg-neutral-50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.description}</p>
              </div>
              <Toggle
                checked={sms[opt.key]}
                onChange={(v) => setSms((prev) => ({ ...prev, [opt.key]: v }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Partners ── */}
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Truck className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-bold">Delivery Partners</h2>
              <p className="text-sm text-gray-500">Couriers and riders you can assign to orders</p>
            </div>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-neutral-50"
            >
              <Plus className="h-4 w-4" /> Add Partner
            </button>
          )}
        </div>

        {showForm && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">{editingId ? "Edit Partner" : "New Partner"}</p>
              <button
                type="button"
                onClick={resetPartnerForm}
                className="rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Name *</label>
                <input
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="e.g. John Kamau"
                  className="h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Phone *</label>
                <input
                  value={partnerPhone}
                  onChange={(e) => setPartnerPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                  className="h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Company (optional)</label>
                <input
                  value={partnerCompany}
                  onChange={(e) => setPartnerCompany(e.target.value)}
                  placeholder="e.g. Swift Couriers"
                  className="h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Vehicle Type (optional)</label>
                <input
                  value={partnerVehicle}
                  onChange={(e) => setPartnerVehicle(e.target.value)}
                  placeholder="e.g. Motorcycle"
                  className="h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Registration (optional)</label>
                <input
                  value={partnerReg}
                  onChange={(e) => setPartnerReg(e.target.value)}
                  placeholder="e.g. KCD 123A"
                  className="h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Notes (optional)</label>
                <input
                  value={partnerNotes}
                  onChange={(e) => setPartnerNotes(e.target.value)}
                  placeholder="Anything to remember"
                  className="h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-white px-3 py-2.5 md:col-span-2">
                <p className="text-sm font-medium">Active</p>
                <Toggle checked={partnerActive} onChange={setPartnerActive} />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleSavePartner}
                disabled={savingPartner}
                className="inline-flex items-center gap-2 rounded-2xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
              >
                {savingPartner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {savingPartner ? "Saving…" : editingId ? "Save Changes" : "Add Partner"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 space-y-2">
          {partners.length === 0 ? (
            <p className="rounded-2xl border border-dashed py-8 text-center text-sm text-gray-400">
              No delivery partners yet. Add one to assign couriers to orders.
            </p>
          ) : (
            partners.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-2xl border bg-neutral-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-700">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {p.name}
                      {p.company && <span className="text-gray-400"> · {p.company}</span>}
                      {p.vehicleType && <span className="text-gray-400"> · {p.vehicleType}</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.phone}
                      {p.registrationNumber && ` · ${p.registrationNumber}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(p)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      p.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                    }`}
                  >
                    {p.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditPartner(p)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-600"
                    title="Edit partner"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePartner(p)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500"
                    title="Remove partner"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Save bar ── */}
      <div className="flex items-center justify-between rounded-3xl border bg-white p-5">
        <p className="text-sm text-gray-500">
          {config
            ? `New orders default to ${defaultMethod === "delivery" ? "home delivery" : "customer pickup"}${defaultMethod === "delivery" && Number(defaultDeliveryFee) > 0 ? ` · ${formatKes(Number(defaultDeliveryFee))}` : ""}`
            : "Loading current policy…"}
        </p>
        <button
          type="button"
          onClick={handleSaveConfig}
          disabled={savingConfig}
          className="rounded-2xl bg-black px-8 py-3 font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {savingConfig ? "Saving…" : "Save Delivery Settings"}
        </button>
      </div>
    </div>
  );
}
