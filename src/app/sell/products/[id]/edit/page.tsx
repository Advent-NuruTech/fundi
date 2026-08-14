"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { ProductForm } from "@/modules/globalsell/components/product-form";
import {
  fetchProductById,
  fetchEcommerceCategories,
  updateProduct,
} from "@/services/ecommerce.service";
import type { EcommerceCategory, EcommerceProduct, ProductFormInput } from "@/types/ecommerce";
import { toast } from "sonner";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState<EcommerceProduct | null>(null);
  const [categories, setCategories] = useState<EcommerceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchProductById(id), fetchEcommerceCategories()])
      .then(([p, cats]) => {
        setProduct(p);
        setCategories(cats);
      })
      .catch(() => toast.error("Failed to load product"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(input: ProductFormInput) {
    if (!user?.businessId || !product) return;
    await updateProduct(product.id, user.businessId, input);
    toast.success("Product updated!");
    router.push("/sell/products");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-20 text-center text-slate-500">Product not found.</div>
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
        <h1 className="text-xl font-bold text-slate-900">Edit Product</h1>
      </div>

      <ProductForm
        initial={product}
        categories={categories}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </div>
  );
}
