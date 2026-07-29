"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  History,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Ruler,
  Save,
  Venus,
  Mars,
  X,
} from "lucide-react";

import type { Customer, Order, Payment, CustomerChangeEntry } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatKes, formatDateLabel } from "@/lib/utils";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import {
  listenCustomer,
  listenOrders,
  listenPayments,
  updateCustomer,
  listenCustomerChanges,
} from "@/services/firestore.service";
import {
  updateCustomerSchema,
  type UpdateCustomerValues,
} from "@/schemas/customer.schema";

const MEASUREMENT_LABELS: Record<string, string> = {
  bust: "Bust",
  waist: "Waist",
  hips: "Hips",
  height: "Height",
  shoulder: "Shoulder",
  sleeve: "Sleeve",
  inseam: "Inseam",
  length: "Length",
  neck: "Neck",
  thigh: "Thigh",
  crotchDepth: "Crotch Depth",
  armhole: "Armhole",
  bicep: "Bicep",
  forearm: "Forearm",
  wrist: "Wrist",
  chest: "Chest",
  backWidth: "Back Width",
  acrossShoulder: "Across Shoulder",
  neckToWaist: "Neck to Waist",
  waistToHip: "Waist to Hip",
  hipToHem: "Hip to Hem",
  fullLength: "Full Length",
  jacketLength: "Jacket Length",
  trouserLength: "Trouser Length",
  outseam: "Outseam",
  knee: "Knee",
  calf: "Calf",
  ankle: "Ankle",
  upperArm: "Upper Arm",
  elbow: "Elbow",
  headCircumference: "Head Circumference",
  notes: "Notes",
};

const STAGE_COLORS: Record<string, string> = {
  cutting: "bg-blue-100 text-blue-700",
  stitching: "bg-indigo-100 text-indigo-700",
  fitting: "bg-purple-100 text-purple-700",
  finishing: "bg-amber-100 text-amber-700",
  ready_for_pickup: "bg-emerald-100 text-emerald-700",
  delivered: "bg-slate-100 text-slate-600",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  unpaid: "bg-rose-100 text-rose-600",
};

const FIELD_LABELS: Record<string, string> = {
  fullName: "Full Name",
  phone: "Phone",
  email: "Email",
  gender: "Gender",
  preferences: "Style Preferences",
  notes: "Notes",
  measurements: "Measurements",
};

export function CustomerProfileModulePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const customerId = params.id;
  const { businessId, ready, user } = useBusinessContext();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [changes, setChanges] = useState<CustomerChangeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"details" | "history">("details");

  const { register, handleSubmit, reset, formState, control } = useForm<
    UpdateCustomerValues
  >({
    resolver: zodResolver(updateCustomerSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "measurements",
  });

  useEffect(() => {
    if (!ready || !customerId) return;

    const unsubCustomer = listenCustomer(businessId, customerId, (c) => {
      setCustomer(c);
      setLoading(false);
    });
    const unsubOrders = listenOrders(businessId, (rows) =>
      setOrders(rows.filter((row) => row.customerId === customerId))
    );
    const unsubPayments = listenPayments(businessId, (rows) =>
      setPayments(rows.filter((row) => row.customerId === customerId))
    );
    const unsubChanges = listenCustomerChanges(businessId, customerId, setChanges);

    return () => {
      unsubCustomer();
      unsubOrders();
      unsubPayments();
      unsubChanges();
    };
  }, [businessId, customerId, ready]);

  const startEditing = useCallback(() => {
    if (!customer) return;
    reset({
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email ?? "",
      gender: customer.gender,
      preferences: customer.preferences ?? "",
      notes: customer.notes ?? "",
      measurements: Object.entries(customer.measurements ?? {})
        .filter(([k, v]) => k !== "notes" && v !== null && v !== undefined && String(v) !== "")
        .map(([name, value]) => ({ name, value: Number(value) })),
    });
    setEditing(true);
  }, [customer, reset]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    reset();
  }, [reset]);

  const buildMeasurements = (values: UpdateCustomerValues): Record<string, number> => {
    const measurements: Record<string, number> = {};
    for (const m of values.measurements ?? []) {
      if (m.name && (m.value || m.value === 0)) {
        measurements[m.name] = Number(m.value);
      }
    }
    return measurements;
  };

  const onSubmit: SubmitHandler<UpdateCustomerValues> = async (values) => {
    if (!user || !businessId || !customer) return;

    const measurements = buildMeasurements(values);
    const payload: Partial<Customer> = {};

    if (values.fullName !== customer.fullName) payload.fullName = values.fullName;
    if (values.phone !== customer.phone) payload.phone = values.phone;
    if ((values.email ?? "") !== (customer.email ?? "")) payload.email = values.email || undefined;
    if (values.gender !== customer.gender) payload.gender = values.gender;
    if ((values.preferences ?? "") !== (customer.preferences ?? "")) payload.preferences = values.preferences;
    if ((values.notes ?? "") !== (customer.notes ?? "")) payload.notes = values.notes;
    if (Object.keys(measurements).length > 0) payload.measurements = measurements;

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save");
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await updateCustomer(businessId, customerId, payload, {
        uid: user.uid,
        displayName: user.displayName || user.email || "Unknown",
      });
      toast.success("Customer updated");
      setEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update customer");
    } finally {
      setSaving(false);
    }
  };

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders]
  );

  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [payments]
  );

  const totalSpent = useMemo(
    () => payments.reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );

  const activeOrders = orders.filter((o) => o.stage !== "delivered").length;

  if (!ready || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-sm text-slate-500 py-8 text-center">
        Customer not found.
      </div>
    );
  }

  const balance = customer.outstandingBalance ?? 0;
  const measurementEntries = Object.entries(customer.measurements ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && String(v) !== ""
  );

  const badgeVariant =
    balance > 0 ? "warning" : orders.length === 0 ? "default" : "success";
  const badgeText =
    balance > 0 ? "Balance due" : orders.length === 0 ? "No orders yet" : "Cleared";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Back + header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {editing ? "Edit Customer" : "Customer Profile"}
            </h1>
            <p className="text-xs text-slate-500">
              {editing ? "Update customer details" : "Order history &amp; measurements"}
            </p>
          </div>
        </div>
        {!editing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={startEditing}
            className="gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={cancelEditing}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit(onSubmit)}
              disabled={saving}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setTab("details")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "details"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Info className="h-4 w-4" />
          Details
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "history"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <History className="h-4 w-4" />
          History
          {changes.length > 0 && (
            <span className="text-[11px] bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5">
              {changes.length}
            </span>
          )}
        </button>
      </div>

      {tab === "history" ? (
        /* ── HISTORY TAB ── */
        <div className="space-y-3">
          {changes.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
              <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No changes recorded yet.</p>
            </div>
          ) : (
            changes.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                      {entry.changedByName?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <span className="font-medium text-slate-700">
                      {entry.changedByName}
                    </span>
                  </div>
                  <span>{formatDateLabel(entry.createdAt)}</span>
                </div>
                <div className="space-y-1">
                  {(() => {
                    const raw = entry.changes;
                    let changeList: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
                    if (Array.isArray(raw)) {
                      changeList = raw;
                    } else if (typeof raw === "string") {
                      try { changeList = JSON.parse(raw); } catch { changeList = []; }
                    } else {
                      changeList = [];
                    }
                    if (!Array.isArray(changeList)) changeList = [];
                    return changeList.map((change, ci) => {
                      const isMeasurementField = change?.field?.startsWith("measurements.");
                      const isLegacyMeasurement = change?.field === "measurements";
                      const label = isMeasurementField
                        ? (MEASUREMENT_LABELS[change.field.slice("measurements.".length)] ?? change.field.slice("measurements.".length).replace(/([A-Z])/g, " $1").trim())
                        : (FIELD_LABELS[change?.field ?? ""] ?? change?.field ?? "—");
                      return (
                        <div key={ci} className="flex items-start gap-2 text-xs">
                          <span className="font-medium text-slate-600 shrink-0 w-28">
                            {label}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {isLegacyMeasurement ? (
                              <span className="text-slate-500 italic">Measurements updated</span>
                            ) : (
                              <>
                                <span className="text-slate-400 line-through">
                                  {String(change?.oldValue ?? "") || "—"}
                                </span>
                                <span className="text-slate-400">→</span>
                                <span className="text-emerald-700 font-medium">
                                  {String(change?.newValue ?? "") || "—"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      ) : editing ? (
        /* ── EDIT MODE ── */
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Basic Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Full name</Label>
                <Input {...register("fullName")} />
                {formState.errors.fullName && (
                  <p className="mt-1 text-xs text-rose-500">{formState.errors.fullName.message}</p>
                )}
              </div>
              <div>
                <Label>Gender</Label>
                <select
                  {...register("gender")}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <Label>Phone</Label>
                <Input type="tel" {...register("phone")} />
                {formState.errors.phone && (
                  <p className="mt-1 text-xs text-rose-500">{formState.errors.phone.message}</p>
                )}
              </div>
              <div className="col-span-2">
                <Label>Email</Label>
                <Input type="email" {...register("email")} />
                {formState.errors.email && (
                  <p className="mt-1 text-xs text-rose-500">{formState.errors.email.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Measurements (cm)</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: "", value: "" as unknown as number })}
                className="h-7 text-xs gap-1"
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <Input
                    placeholder="e.g. Bust"
                    {...register(`measurements.${index}.name`)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="cm"
                    type="number"
                    step="0.1"
                    {...register(`measurements.${index}.value`, { valueAsNumber: true })}
                    className="w-24"
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="mt-2 text-rose-400 hover:text-rose-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {fields.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">
                  No measurements yet. Click &quot;Add&quot; to add one.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Preferences &amp; Notes</h3>
            <div>
              <Label>Style preferences</Label>
              <Textarea
                {...register("preferences")}
                placeholder="e.g. Prefers loose fitting, bold colors…"
                className="resize-none"
                rows={2}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                {...register("notes")}
                placeholder="Any other notes…"
                className="resize-none"
                rows={2}
              />
            </div>
          </div>
        </form>
      ) : (
        /* ── VIEW MODE (default) ── */
        <>
          {/* Profile card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-xl font-bold text-emerald-700">
                {customer.fullName.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-lg leading-tight truncate">
                      {customer.fullName}
                    </p>
                    {customer.gender && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        {customer.gender === "male" ? (
                          <Mars className="h-3 w-3 text-blue-500" />
                        ) : (
                          <Venus className="h-3 w-3 text-pink-500" />
                        )}
                        {customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1)}
                      </span>
                    )}
                  </div>
                  <Badge variant={badgeVariant} className="shrink-0 text-[11px]">
                    {badgeText}
                  </Badge>
                </div>

                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {customer.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    Customer since{" "}
                    {new Date(customer.createdAt).toLocaleDateString("en-KE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-center">
                <p className="text-sm font-bold text-emerald-700 truncate">
                  {formatKes(totalSpent)}
                </p>
                <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wide mt-0.5">
                  Total paid
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-2.5 text-center">
                <p className="text-lg font-bold text-blue-700">{orders.length}</p>
                <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide mt-0.5">
                  Orders
                </p>
              </div>
              <div className={`rounded-xl p-2.5 text-center ${balance > 0 ? "bg-rose-50" : "bg-slate-50"}`}>
                <p className={`text-sm font-bold truncate ${balance > 0 ? "text-rose-600" : "text-slate-500"}`}>
                  {formatKes(balance)}
                </p>
                <p className={`text-[10px] font-medium uppercase tracking-wide mt-0.5 ${balance > 0 ? "text-rose-400" : "text-slate-400"}`}>
                  Balance
                </p>
              </div>
            </div>

            {/* Preferences & Notes */}
            {(customer.preferences || customer.notes) && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                {customer.preferences && (
                  <div className="flex gap-2 text-xs">
                    <ClipboardList className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-700">Preferences: </span>
                      <span className="text-slate-600">{customer.preferences}</span>
                    </div>
                  </div>
                )}
                {customer.notes && (
                  <div className="flex gap-2 text-xs">
                    <MessageSquare className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-700">Notes: </span>
                      <span className="text-slate-600">{customer.notes}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Measurements */}
          {measurementEntries.length > 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-4">
                <Ruler className="h-4 w-4 text-slate-500" />
                <h3 className="font-bold text-slate-900">Body Measurements</h3>
                <span className="text-xs text-slate-400">(cm)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {measurementEntries
                  .filter(([key]) => key !== "notes")
                  .map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center">
                      <p className="text-sm font-bold text-slate-900">{String(value)}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mt-0.5">
                        {MEASUREMENT_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").trim()}
                      </p>
                    </div>
                  ))}
              </div>
              {measurementEntries.find(([k]) => k === "notes") && (
                <p className="mt-3 text-xs text-slate-500">
                  <span className="font-semibold">Measurement notes:</span>{" "}
                  {String(measurementEntries.find(([k]) => k === "notes")?.[1] ?? "")}
                </p>
              )}
            </div>
          )}

          {/* Order history */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Order History</h3>
              {activeOrders > 0 && (
                <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  {activeOrders} active
                </span>
              )}
            </div>
            {sortedOrders.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {sortedOrders.map((order) => {
                  const orderBalance = order.balanceAmount ?? (order.subtotalAmount - order.amountPaid);
                  const isSettled = orderBalance <= 0;
                  return (
                    <div key={order.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/orders/${order.id}`} className="text-sm font-semibold text-emerald-700 hover:underline">
                            {order.orderNumber}
                          </Link>
                          <p className="text-xs text-slate-500 mt-0.5">Due {order.dueDate}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STAGE_COLORS[order.stage] ?? "bg-slate-100 text-slate-600"}`}>
                            {order.stage.replaceAll("_", " ")}
                          </span>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${PAYMENT_STATUS_COLORS[order.paymentStatus] ?? "bg-slate-100 text-slate-500"}`}>
                            {order.paymentStatus}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs border-t border-slate-200 pt-2">
                        <div className="flex items-center gap-1 text-slate-500">
                          <span className="text-slate-400">Total</span>
                          <span className="font-semibold text-slate-700">{formatKes(order.subtotalAmount)}</span>
                        </div>
                        <span className="text-slate-300">·</span>
                        <div className="flex items-center gap-1 text-slate-500">
                          <span className="text-slate-400">Paid</span>
                          <span className="font-semibold text-emerald-700">{formatKes(order.amountPaid)}</span>
                        </div>
                        <span className="text-slate-300">·</span>
                        {isSettled ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">Cleared</span>
                        ) : (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">{formatKes(orderBalance)} due</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment history */}
          {sortedPayments.length > 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-slate-900 mb-4">Payment History</h3>
              <div className="space-y-2">
                {sortedPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{formatKes(payment.amount)}</p>
                      <p className="text-xs text-slate-500 flex items-center flex-wrap gap-1">
                        <span>{payment.method.toUpperCase()}</span>
                        {payment.mpesaCode && (<><span className="text-slate-300">·</span><span>{payment.mpesaCode}</span></>)}
                        <span className="text-slate-300">·</span>
                        <Link href={`/orders/${payment.orderId}`} className="font-medium text-emerald-700 hover:underline">{payment.orderNumber}</Link>
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 shrink-0 ml-3">
                      {new Date(payment.recordedAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
