"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
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

  useEffect(() => {
    fetchEcommerceCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.businessId || !business?.name) return;
    ensureStore(user.businessId, business.name)
      .then(setStore)
      .catch(() => {})
      .finally(() => setStoreLoading(false));
  }, [user?.businessId, business?.name]);

  async function handleSubmit(input: ProductFormInput) {
    if (!user?.businessId || !store) {
      toast.error("Store not ready. Please try again.");
      return;
    }
    await createProduct(user.businessId, store.id, input);
    toast.success("Product created!");
    router.push("/sell/products");
  }

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
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
