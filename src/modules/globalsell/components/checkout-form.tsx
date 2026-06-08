"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckoutInput } from "@/types/ecommerce";

const schema = z.object({
  buyerName: z.string().min(2, "Full name is required"),
  buyerPhone: z.string().min(9, "Valid phone number required"),
  buyerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  deliveryLocation: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(["manual", "cash", "mpesa", "bank_transfer"]).optional(),
});

type FormValues = z.infer<typeof schema>;

interface CheckoutFormProps {
  defaultValues?: Partial<CheckoutInput>;
  onSubmit: (input: CheckoutInput) => Promise<void>;
  submitting?: boolean;
}

export function CheckoutForm({
  defaultValues,
  onSubmit,
  submitting = false,
}: CheckoutFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      buyerName: defaultValues?.buyerName ?? "",
      buyerPhone: defaultValues?.buyerPhone ?? "",
      buyerEmail: defaultValues?.buyerEmail ?? "",
      deliveryLocation: defaultValues?.deliveryLocation ?? "",
      notes: defaultValues?.notes ?? "",
      paymentMethod: defaultValues?.paymentMethod ?? "manual",
    },
  });

  async function handleFormSubmit(values: FormValues) {
    await onSubmit({
      ...values,
      buyerEmail: values.buyerEmail || undefined,
      deliveryLocation: values.deliveryLocation || undefined,
      notes: values.notes || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Full Name */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Full Name *
          </label>
          <input
            {...register("buyerName")}
            placeholder="John Kamau"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          {errors.buyerName && (
            <p className="mt-1 text-xs text-rose-500">{errors.buyerName.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Phone Number *
          </label>
          <input
            {...register("buyerPhone")}
            placeholder="0712 345 678"
            type="tel"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          {errors.buyerPhone && (
            <p className="mt-1 text-xs text-rose-500">{errors.buyerPhone.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Email Address
          </label>
          <input
            {...register("buyerEmail")}
            placeholder="you@email.com"
            type="email"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          {errors.buyerEmail && (
            <p className="mt-1 text-xs text-rose-500">{errors.buyerEmail.message}</p>
          )}
        </div>

        {/* Delivery Location */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Delivery Location
          </label>
          <input
            {...register("deliveryLocation")}
            placeholder="Nairobi CBD, Westlands, Mombasa Road…"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* Payment Method */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Payment Method
          </label>
          <select
            {...register("paymentMethod")}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
          >
            <option value="manual">Arrange with seller</option>
            <option value="cash">Cash on delivery</option>
            <option value="mpesa">M-Pesa</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>

        {/* Notes */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Order Notes
          </label>
          <textarea
            {...register("notes")}
            rows={2}
            placeholder="Any special instructions for the seller…"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
          />
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full gap-2" size="lg">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Placing Order…" : "Place Order"}
      </Button>
    </form>
  );
}
