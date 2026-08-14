"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Globe, MessageSquare, Save, Store, ExternalLink } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import {
  fetchStoreByBusinessId,
  createStore,
  updateStore,
} from "@/services/ecommerce.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import type { EcommerceStore } from "@/types/ecommerce";

const schema = z.object({
  storeName: z.string().min(2, "Store name is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  notificationPhone: z.string().optional(),
  logoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  bannerUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function StoreSettingsPage() {
  const { user, business } = useAuth();
  const [store, setStore] = useState<EcommerceStore | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!user?.businessId) return;
    fetchStoreByBusinessId(user.businessId)
      .then((s) => {
        setStore(s);
        if (s) {
          reset({
            storeName: s.storeName,
            description: s.description ?? "",
            location: s.location ?? "",
            contactPhone: s.contactPhone ?? "",
            contactEmail: s.contactEmail ?? "",
            notificationPhone: s.notificationPhone ?? "",
            logoUrl: s.logoUrl ?? "",
            bannerUrl: s.bannerUrl ?? "",
          });
        } else {
          reset({ storeName: business?.name ?? "" });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingStore(false));
  }, [user?.businessId, business?.name, reset]);

  async function onSubmit(values: FormValues) {
    if (!user?.businessId) return;
    setSaving(true);
    try {
      const payload = {
        storeName: values.storeName,
        description: values.description || undefined,
        location: values.location || undefined,
        contactPhone: values.contactPhone || undefined,
        contactEmail: values.contactEmail || undefined,
        notificationPhone: values.notificationPhone || undefined,
        logoUrl: values.logoUrl || undefined,
        bannerUrl: values.bannerUrl || undefined,
      };

      if (store) {
        const updated = await updateStore(store.id, payload);
        setStore(updated);
      } else {
        const created = await createStore(
          user.businessId,
          business?.name ?? "My Store",
          payload
        );
        setStore(created);
      }
      toast.success("Store settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loadingStore) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Store Settings</h1>
          <p className="text-sm text-slate-500">
            Configure how your store appears on Global Sell
          </p>
        </div>
        {store && (
          <Link href={`/globalsell/store/${store.slug}`} target="_blank">
            <Button variant="outline" size="sm" className="gap-2">
              <Globe className="h-4 w-4" />
              View Store
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </div>

      {/* SMS notice */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <MessageSquare className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-emerald-900">Order SMS Notifications</p>
          <p className="text-emerald-700 mt-0.5">
            Set a <strong>Notification Phone</strong> below to receive an SMS every time a
            customer places an order. Example:{" "}
            <em>
              &ldquo;Dear merchant, new order from John — 20 shirts × KES 500. Order #GS-XXX.
              Login to confirm. — FundiFlow&rdquo;
            </em>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Store Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Store Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Store Name *
              </label>
              <input
                {...register("storeName")}
                placeholder="My Tailoring Store"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              {errors.storeName && (
                <p className="mt-1 text-xs text-rose-500">{errors.storeName.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Store Description
              </label>
              <textarea
                {...register("description")}
                rows={3}
                placeholder="Tell customers about your store…"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Location
              </label>
              <input
                {...register("location")}
                placeholder="Nairobi, Kenya"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Logo URL
                </label>
                <input
                  {...register("logoUrl")}
                  placeholder="https://…"
                  type="url"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
                />
                {errors.logoUrl && (
                  <p className="mt-1 text-xs text-rose-500">{errors.logoUrl.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Banner URL
                </label>
                <input
                  {...register("bannerUrl")}
                  placeholder="https://…"
                  type="url"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Contact Phone
                </label>
                <input
                  {...register("contactPhone")}
                  placeholder="0712 345 678"
                  type="tel"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Contact Email
                </label>
                <input
                  {...register("contactEmail")}
                  placeholder="store@email.com"
                  type="email"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
                />
                {errors.contactEmail && (
                  <p className="mt-1 text-xs text-rose-500">{errors.contactEmail.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SMS Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-500" />
              Order SMS Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Notification Phone Number
              </label>
              <input
                {...register("notificationPhone")}
                placeholder="254712345678 (include country code)"
                type="tel"
                className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                This number receives an SMS every time a customer places an order on your
                store. Use Kenyan format: 254712345678
              </p>
            </div>
          </CardContent>
        </Card>

        {store && (
          <div className="text-xs text-slate-400">
            Store URL:{" "}
            <Link
              href={`/globalsell/store/${store.slug}`}
              target="_blank"
              className="text-emerald-600 hover:underline"
            >
              /globalsell/store/{store.slug}
            </Link>
          </div>
        )}

        <Button type="submit" disabled={saving} className="gap-2 min-w-[140px]">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
      </form>
    </div>
  );
}
