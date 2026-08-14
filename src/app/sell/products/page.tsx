"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Package,
  MoreVertical,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Globe,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/features/auth/components/auth-context";
import { useMyProducts } from "@/modules/globalsell/hooks/use-my-products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatKes } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_BADGE = {
  published: { label: "Live", variant: "success" as const },
  draft: { label: "Draft", variant: "default" as const },
  archived: { label: "Archived", variant: "warning" as const },
  out_of_stock: { label: "Out of Stock", variant: "danger" as const },
};

export default function MyProductsPage() {
  const { user, business } = useAuth();
  const businessId = user?.businessId ?? "";
  const { products, loading, publishProduct, archiveProduct, removeProduct } =
    useMyProducts(businessId, business?.name ?? "");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await removeProduct(id);
      toast.success("Product deleted");
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleStatus(id: string, current: string) {
    try {
      if (current === "published") {
        await archiveProduct(id);
        toast.success("Product archived");
      } else {
        await publishProduct(id);
        toast.success("Product published");
      }
    } catch {
      toast.error("Failed to update status");
    }
    setOpenMenuId(null);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Products</h1>
          <p className="text-sm text-slate-500">{products.length} products in your store</p>
        </div>
        <Link href="/sell/products/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border-2 border-dashed border-slate-200">
          <Package className="h-14 w-14 text-slate-200 mb-4" />
          <h3 className="text-base font-semibold text-slate-700">No products yet</h3>
          <p className="text-sm text-slate-400 mt-1">
            Create your first product to start selling on Global Sell
          </p>
          <Link href="/sell/products/new">
            <Button size="sm" className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Add First Product
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const primaryImage =
              product.images?.find((i) => i.isPrimary) ?? product.images?.[0];
            const statusConfig = STATUS_BADGE[product.status] ?? STATUS_BADGE.draft;

            return (
              <Card key={product.id} className="relative overflow-hidden">
                {/* Image */}
                <div className="relative h-40 bg-slate-100">
                  {primaryImage ? (
                    <Image
                      src={primaryImage.url}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-10 w-10 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {product.name}
                      </h3>
                      {product.category && (
                        <p className="text-xs text-slate-400">{product.category.name}</p>
                      )}
                    </div>

                    {/* Menu */}
                    <div className="relative shrink-0">
                      <button
                        onClick={() =>
                          setOpenMenuId(openMenuId === product.id ? null : product.id)
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 transition text-slate-400"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenuId === product.id && (
                        <div className="absolute right-0 top-8 z-10 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                          <Link
                            href={`/sell/products/${product.id}/edit`}
                            onClick={() => setOpenMenuId(null)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit
                          </Link>
                          <button
                            onClick={() =>
                              handleToggleStatus(product.id, product.status)
                            }
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            {product.status === "published" ? (
                              <>
                                <EyeOff className="h-3.5 w-3.5" />
                                Archive
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5" />
                                Publish
                              </>
                            )}
                          </button>
                          {product.status === "published" && (
                            <Link
                              href={`/globalsell/product/${product.id}`}
                              target="_blank"
                              onClick={() => setOpenMenuId(null)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              <Globe className="h-3.5 w-3.5" />
                              View Live
                            </Link>
                          )}
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDelete(product.id);
                            }}
                            disabled={deletingId === product.id}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <span className="text-base font-bold text-slate-900">
                        {formatKes(product.discountPrice ?? product.basePrice)}
                      </span>
                      {product.discountPrice && (
                        <span className="ml-1.5 text-xs text-slate-400 line-through">
                          {formatKes(product.basePrice)}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        {product.totalStock} in stock
                      </p>
                      {(product.variants?.length ?? 0) > 0 && (
                        <p className="text-xs text-slate-400">
                          {product.variants!.length} variants
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
