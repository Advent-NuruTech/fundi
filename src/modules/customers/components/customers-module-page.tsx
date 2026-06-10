"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";

import type { Customer } from "@/types/domain";
import {
  customerSchema,
  type CustomerInput,
  type CustomerValues,
} from "@/schemas/customer.schema";

import { useBusinessContext } from "@/modules/shared/use-business-context";
import {
  createCustomer,
  listenCustomers,
} from "@/services/firestore.service";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatKes } from "@/lib/utils";

type FilterType = "all" | "balance" | "clear";

export function CustomersModulePage() {
  const { businessId, user, ready } = useBusinessContext();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const { register, handleSubmit, reset, formState } = useForm<
    CustomerInput,
    undefined,
    CustomerValues
  >({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      preferences: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!ready || !businessId) return;
    return listenCustomers(businessId, setCustomers);
  }, [businessId, ready]);

  const realCustomers = useMemo(
    () => customers.filter((c) => !c.id.startsWith("tmp-")),
    [customers]
  );

  const withBalance = useMemo(
    () => realCustomers.filter((c) => (c.outstandingBalance ?? 0) > 0).length,
    [realCustomers]
  );

  const thisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return realCustomers.filter((c) => c.createdAt >= monthStart).length;
  }, [realCustomers]);

  const filtered = useMemo(() => {
    const optimistic = customers.filter((c) => c.id.startsWith("tmp-"));
    let list = [...realCustomers];

    if (filter === "balance") list = list.filter((c) => (c.outstandingBalance ?? 0) > 0);
    if (filter === "clear") list = list.filter((c) => (c.outstandingBalance ?? 0) === 0);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email ?? "").toLowerCase().includes(q)
      );
    }

    return [...optimistic, ...list];
  }, [customers, realCustomers, search, filter]);

  const cleanMeasurements = (values: CustomerValues) => {
    const measurements = {
      bust: values.bust ?? null,
      waist: values.waist ?? null,
      hips: values.hips ?? null,
      shoulder: values.shoulder ?? null,
      sleeve: values.sleeve ?? null,
      inseam: values.inseam ?? null,
      length: values.length ?? null,
    };
    return Object.fromEntries(
      Object.entries(measurements).filter(([, value]) => value !== null && value !== undefined)
    );
  };

  const onSubmit: SubmitHandler<CustomerValues> = async (values) => {
    if (!user || !businessId) return;

    const measurements = cleanMeasurements(values);
    const optimisticId = `tmp-${Date.now()}`;

    const optimisticCustomer: Customer = {
      id: optimisticId,
      businessId,
      fullName: values.fullName,
      phone: values.phone,
      email: values.email || undefined,
      preferences: values.preferences || "",
      notes: values.notes || "",
      measurements,
      outstandingBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSavingCustomer(true);
    setCustomers((prev) => [optimisticCustomer, ...prev]);

    try {
      await createCustomer(businessId, {
        businessId,
        fullName: values.fullName,
        phone: values.phone,
        email: values.email || undefined,
        preferences: values.preferences || "",
        notes: values.notes || "",
        measurements,
      });
      toast.success("Customer saved");
      reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save customer"
      );
      setCustomers((prev) => prev.filter((entry) => entry.id !== optimisticId));
    } finally {
      setSavingCustomer(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {realCustomers.length} total · {withBalance} with outstanding balance
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{realCustomers.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total customers</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-rose-500">{withBalance}</p>
          <p className="text-xs text-slate-500 mt-0.5">Balance due</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{thisMonth}</p>
          <p className="text-xs text-slate-500 mt-0.5">Joined this month</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 lg:grid-cols-3"
      >
        {/* Customer list */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>All Customers</CardTitle>

            {/* Search */}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, or email…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mt-2">
              {(["all", "balance", "clear"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f === "all" ? "All" : f === "balance" ? "With Balance" : "Cleared"}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                {search ? "No customers match your search." : "No customers yet. Add your first one →"}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {/* Table header */}
                <div className="grid grid-cols-[2rem_2.5rem_1fr_auto] items-center gap-3 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <span>#</span>
                  <span />
                  <span>Customer</span>
                  <span className="text-right">Balance</span>
                </div>

                {filtered.map((customer, index) => {
                  const isTemp = customer.id.startsWith("tmp-");
                  const balance = customer.outstandingBalance ?? 0;

                  return (
                    <div
                      key={customer.id}
                      className={`grid grid-cols-[2rem_2.5rem_1fr_auto] items-center gap-3 px-5 py-3 ${
                        isTemp ? "opacity-60" : "hover:bg-slate-50"
                      } transition-colors`}
                    >
                      {/* Row number */}
                      <span className="text-right text-xs font-mono text-slate-400">
                        {isTemp ? "…" : index + 1}
                      </span>

                      {/* Avatar */}
                      <div className="h-9 w-9 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700">
                        {customer.fullName.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        {isTemp ? (
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {customer.fullName}
                          </p>
                        ) : (
                          <Link
                            href={`/customers/${customer.id}`}
                            className="text-sm font-semibold text-emerald-700 hover:underline truncate block"
                          >
                            {customer.fullName}
                          </Link>
                        )}
                        <p className="text-xs text-slate-500 truncate">
                          {customer.phone}
                          {customer.email ? ` · ${customer.email}` : ""}
                        </p>
                      </div>

                      {/* Balance badge */}
                      <div className="shrink-0 text-right">
                        {balance > 0 ? (
                          <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
                            {formatKes(balance)}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                            Cleared
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add customer form */}
        <Card>
          <CardHeader>
            <CardTitle>Add Customer</CardTitle>
          </CardHeader>

          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <Label>Full name *</Label>
                <Input {...register("fullName")} placeholder="Jane Doe" />
                {formState.errors.fullName && (
                  <p className="mt-1 text-xs text-rose-500">
                    {formState.errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <Label>Phone *</Label>
                <Input
                  type="tel"
                  placeholder="+254 7XX XXX XXX"
                  {...register("phone")}
                />
                {formState.errors.phone && (
                  <p className="mt-1 text-xs text-rose-500">
                    {formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="optional"
                  {...register("email")}
                />
                {formState.errors.email && (
                  <p className="mt-1 text-xs text-rose-500">
                    {formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2 mt-1">
                  Measurements (cm)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Bust"
                    type="number"
                    {...register("bust", { valueAsNumber: true })}
                  />
                  <Input
                    placeholder="Waist"
                    type="number"
                    {...register("waist", { valueAsNumber: true })}
                  />
                  <Input
                    placeholder="Hips"
                    type="number"
                    {...register("hips", { valueAsNumber: true })}
                  />
                  <Input
                    placeholder="Shoulder"
                    type="number"
                    {...register("shoulder", { valueAsNumber: true })}
                  />
                  <Input
                    placeholder="Sleeve"
                    type="number"
                    {...register("sleeve", { valueAsNumber: true })}
                  />
                  <Input
                    placeholder="Inseam"
                    type="number"
                    {...register("inseam", { valueAsNumber: true })}
                  />
                  <Input
                    placeholder="Length"
                    type="number"
                    {...register("length", { valueAsNumber: true })}
                    className="col-span-2"
                  />
                </div>
              </div>

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

              <Button
                className="w-full"
                type="submit"
                disabled={formState.isSubmitting || savingCustomer}
              >
                {formState.isSubmitting || savingCustomer ? "Saving…" : "Save customer"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
