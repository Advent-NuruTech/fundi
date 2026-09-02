"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, ImageIcon, Loader2, Globe, MessageSquare, Save, Store, ExternalLink, Upload, XCircle } from "lucide-react";
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
import { normalizeHandle, storeUrl } from "@/lib/storefront-url";
import { StoreShareButton } from "@/modules/globalsell/components/store-share-button";
import { uploadImage } from "@/services/cloudinary/upload.service";

const schema = z.object({
  storeName: z.string().min(2, "Store name is required"),
  publicHandle: z
    .string()
    .min(3, "Store address must be at least 3 characters")
    .max(50, "Store address must be at most 50 characters")
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/, "Use lowercase letters, numbers, and single hyphens")
    .refine((value) => !value.includes("--"), "Do not use consecutive hyphens"),
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
  const [uploadingImage, setUploadingImage] = useState<"logoUrl" | "bannerUrl" | null>(null);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
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
            publicHandle: s.publicHandle,
            description: s.description ?? "",
            location: s.location ?? "",
            contactPhone: s.contactPhone ?? "",
            contactEmail: s.contactEmail ?? "",
            notificationPhone: s.notificationPhone ?? "",
            logoUrl: s.logoUrl ?? "",
            bannerUrl: s.bannerUrl ?? "",
          });
        } else {
          const storeName = business?.name ?? "";
          reset({ storeName, publicHandle: normalizeHandle(storeName) });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingStore(false));
  }, [user?.businessId, business?.name, reset]);

  const publicHandle = useWatch({ control, name: "publicHandle" }) ?? "";
  const logoUrl = useWatch({ control, name: "logoUrl" }) ?? "";
  const bannerUrl = useWatch({ control, name: "bannerUrl" }) ?? "";

  useEffect(() => {
    if (!publicHandle || publicHandle.length < 3 || errors.publicHandle) {
      setHandleAvailable(null);
      return;
    }
    if (store?.publicHandle === publicHandle) {
      setHandleAvailable(true);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCheckingHandle(true);
      try {
        const query = new URLSearchParams({ handle: publicHandle });
        const response = await fetch(`/api/globalsell/handles?${query}`, {
          signal: controller.signal,
        });
        const result = (await response.json()) as { available?: boolean };
        setHandleAvailable(response.ok ? Boolean(result.available) : null);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setHandleAvailable(null);
        }
      } finally {
        setCheckingHandle(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [errors.publicHandle, publicHandle, store?.id, store?.publicHandle]);

  async function handleImageUpload(field: "logoUrl" | "bannerUrl", file?: File) {
    if (!file || !user?.businessId) return;

    setUploadingImage(field);
    try {
      const uploaded = await uploadImage({
        file,
        businessId: user.businessId,
        uploadedByUid: user.uid,
      });
      setValue(field, uploaded.url, { shouldDirty: true, shouldValidate: true });
      toast.success(`${field === "logoUrl" ? "Profile image" : "Banner image"} uploaded — remember to save`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploadingImage(null);
    }
  }

  async function onSubmit(values: FormValues) {
    if (!user?.businessId) return;
    setSaving(true);
    try {
      const payload = {
        storeName: values.storeName,
        publicHandle: values.publicHandle,
        description: values.description || undefined,
        location: values.location || undefined,
        contactPhone: values.contactPhone || undefined,
        contactEmail: values.contactEmail || undefined,
        notificationPhone: values.notificationPhone || undefined,
        logoUrl: values.logoUrl || undefined,
        bannerUrl: values.bannerUrl || undefined,
      };

      if (store) {
        const updated = await updateStore(store.id, user.businessId, payload, values.publicHandle);
        setStore(updated);
      } else {
        const created = await createStore(
          user.businessId,
          business?.name ?? "My Store",
          payload,
          values.publicHandle
        );
        setStore(created);
      }
      toast.success("Store settings saved!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
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
          <div className="flex shrink-0 items-center gap-2">
            <StoreShareButton
              storeName={store.storeName}
              storeUrl={storeUrl(store.publicHandle)}
              description={store.description}
              className="gap-1.5 px-2.5 text-xs sm:px-3 sm:text-sm"
            />
            <Link href={storeUrl(store.publicHandle)} target="_blank">
              <Button variant="outline" size="sm" className="gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">View Store</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
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
                Store Web Address *
              </label>
              <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                <span className="hidden items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 sm:flex">
                  shop.fundiflow.co.ke/
                </span>
                <input
                  {...register("publicHandle", {
                    onChange: (event) => {
                      const normalized = normalizeHandle(event.target.value);
                      if (normalized !== event.target.value) {
                        setValue("publicHandle", normalized, { shouldValidate: true });
                      }
                    },
                  })}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none"
                />
              </div>
              <div className="mt-1.5 flex min-h-5 items-center gap-1.5 text-xs">
                {checkingHandle ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking availability…</>
                ) : handleAvailable === true ? (
                  <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Address available</span>
                ) : handleAvailable === false ? (
                  <span className="flex items-center gap-1 text-rose-600"><XCircle className="h-3.5 w-3.5" /> Address already taken or reserved</span>
                ) : null}
              </div>
              {errors.publicHandle && (
                <p className="mt-1 text-xs text-rose-500">{errors.publicHandle.message}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Changing this address keeps the old link working through a permanent redirect.
              </p>
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

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Profile Image
                </label>
                <div className="mb-2 flex h-20 items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-2">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-emerald-50">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Store profile preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-emerald-600">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Square photo recommended (like a profile picture).</p>
                </div>
                <input
                  {...register("logoUrl")}
                  placeholder="https://…"
                  type="url"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
                />
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  {uploadingImage === "logoUrl" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingImage === "logoUrl" ? "Uploading…" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingImage !== null}
                    onChange={(event) => {
                      void handleImageUpload("logoUrl", event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
                {errors.logoUrl && (
                  <p className="mt-1 text-xs text-rose-500">{errors.logoUrl.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Cover Banner
                </label>
                <div className="mb-2 h-20 overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="Store banner preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center gap-2 text-xs text-slate-500">
                      <ImageIcon className="h-4 w-4 text-emerald-600" />
                      Use a wide cover image (recommended 1200 × 630).
                    </div>
                  )}
                </div>
                <input
                  {...register("bannerUrl")}
                  placeholder="https://…"
                  type="url"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500"
                />
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  {uploadingImage === "bannerUrl" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingImage === "bannerUrl" ? "Uploading…" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingImage !== null}
                    onChange={(event) => {
                      void handleImageUpload("bannerUrl", event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
                {errors.bannerUrl && (
                  <p className="mt-1 text-xs text-rose-500">{errors.bannerUrl.message}</p>
                )}
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
              href={storeUrl(store.publicHandle)}
              target="_blank"
              className="text-emerald-600 hover:underline"
            >
              {storeUrl(store.publicHandle)}
            </Link>
          </div>
        )}

        <Button type="submit" disabled={saving || checkingHandle || handleAvailable === false} className="gap-2 min-w-[140px]">
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
