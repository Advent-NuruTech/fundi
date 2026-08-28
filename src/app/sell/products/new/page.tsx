"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { ProductForm } from "@/modules/globalsell/components/product-form";
import {
  fetchEcommerceCategories,
  ensureStore,
  createProduct,
} from "@/services/ecommerce.service";
import type { EcommerceCategory, EcommerceStore, ProductFormInput } from "@/types/ecommerce";
import { toast } from "sonner";

export default function NewProductPage() {
  const router = useRouter();
  const { user, business } = useAuth();
  const [categories, setCategories] = useState<EcommerceCategory[]>([]);
  const [store, setStore] = useState<EcommerceStore | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeError, setStoreError] = useState("");

  useEffect(() => {
    fetchEcommerceCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.businessId || !business?.name) {
      setStoreLoading(false);
      setStoreError("A business profile is required before products can be created.");
      return;
    }
    setStoreLoading(true);
    setStoreError("");
    ensureStore(user.businessId, business.name)
      .then(setStore)
      .catch((error) => {
        setStore(null);
        setStoreError(error instanceof Error ? error.message : "Your Global Sell store could not be loaded.");
      })
      .finally(() => setStoreLoading(false));
  }, [user?.businessId, business?.name]);

  async function handleSubmit(input: ProductFormInput) {
    if (!user?.businessId || !store) {
      toast.error("Store not ready. Please try again.");
      return;
    }
    try {
      await createProduct(user.businessId, store.id, input);
      toast.success("Product created!");
      router.push("/sell/products");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Product could not be created.");
    }
  }

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <AlertCircle className="mx-auto h-9 w-9 text-amber-600" />
        <h1 className="mt-3 text-lg font-bold text-slate-900">Store unavailable</h1>
        <p className="mt-1 text-sm text-slate-600">
          {storeError || "Your Global Sell store could not be loaded."}
        </p>
        <Link href="/sell" className="mt-4 inline-flex text-sm font-semibold text-emerald-700 hover:underline">
          Return to Global Sell
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <Link
          href="/sell/products"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-emerald-600 transition mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          My Products
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Add New Product</h1>
      </div>

      <ProductForm
        categories={categories}
        onSubmit={handleSubmit}
        submitLabel="Create Product"
      />
    </div>
  );
}
