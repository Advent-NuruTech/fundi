import "server-only";

import { cache } from "react";
import { createServiceSupabaseClient } from "@/lib/supabase";
import { transformArrayToCamel, transformKeysToCamel } from "@/lib/case-utils";
import type {
  EcommerceCategory,
  EcommerceProduct,
  EcommerceProductImage,
  EcommerceProductVariant,
  EcommerceStore,
} from "@/types/ecommerce";

const PUBLIC_STORE_FIELDS = [
  "id",
  "business_id",
  "slug",
  "public_handle",
  "store_name",
  "store_type",
  "description",
  "banner_url",
  "logo_url",
  "contact_phone",
  "contact_email",
  "location",
  "is_active",
  "is_verified",
  "is_suspended",
  "total_products",
  "total_orders",
  "created_at",
  "updated_at",
].join(",");

export type StorefrontResolution = {
  store: EcommerceStore;
  requestedHandle: string;
  isAlias: boolean;
};

function mapProduct(row: Record<string, unknown>, store?: EcommerceStore): EcommerceProduct {
  const product = transformKeysToCamel<EcommerceProduct>(row);
  if (Array.isArray(row.images)) {
    product.images = transformArrayToCamel<EcommerceProductImage>(
      row.images as Record<string, unknown>[]
    );
  }
  if (Array.isArray(row.variants)) {
    product.variants = transformArrayToCamel<EcommerceProductVariant>(
      row.variants as Record<string, unknown>[]
    );
  }
  if (row.category && typeof row.category === "object" && !Array.isArray(row.category)) {
    product.category = transformKeysToCamel<EcommerceCategory>(
      row.category as Record<string, unknown>
    );
  }
  if (store) {
    product.store = {
      id: store.id,
      slug: store.slug,
      publicHandle: store.publicHandle,
      storeName: store.storeName,
      logoUrl: store.logoUrl,
      location: store.location,
    };
  }
  return product;
}

async function loadActiveStoreById(storeId: string): Promise<EcommerceStore | null> {
  const db = createServiceSupabaseClient();
  const { data, error } = await db
    .from("ecommerce_stores")
    .select(PUBLIC_STORE_FIELDS)
    .eq("id", storeId)
    .eq("is_active", true)
    .eq("is_suspended", false)
    .maybeSingle();
  if (error) throw error;
  return data
    ? transformKeysToCamel<EcommerceStore>(data as unknown as Record<string, unknown>)
    : null;
}

export const resolveStorefront = cache(
  async (rawHandle: string): Promise<StorefrontResolution | null> => {
    const requestedHandle = decodeURIComponent(rawHandle).toLowerCase();
    const db = createServiceSupabaseClient();

    const { data: direct, error: directError } = await db
      .from("ecommerce_stores")
      .select(PUBLIC_STORE_FIELDS)
      .eq("public_handle", requestedHandle)
      .eq("is_active", true)
      .eq("is_suspended", false)
      .maybeSingle();
    if (directError) throw directError;
    if (direct) {
      return {
        store: transformKeysToCamel<EcommerceStore>(direct as unknown as Record<string, unknown>),
        requestedHandle,
        isAlias: false,
      };
    }

    const { data: alias, error: aliasError } = await db
      .from("ecommerce_store_handle_aliases")
      .select("store_id")
      .eq("handle", requestedHandle)
      .maybeSingle();
    if (aliasError) throw aliasError;

    let store = alias?.store_id ? await loadActiveStoreById(alias.store_id) : null;
    if (!store) {
      const { data: legacy, error: legacyError } = await db
        .from("ecommerce_stores")
        .select(PUBLIC_STORE_FIELDS)
        .eq("slug", requestedHandle)
        .eq("is_active", true)
        .eq("is_suspended", false)
        .maybeSingle();
      if (legacyError) throw legacyError;
      store = legacy
        ? transformKeysToCamel<EcommerceStore>(legacy as unknown as Record<string, unknown>)
        : null;
    }

    return store ? { store, requestedHandle, isAlias: true } : null;
  }
);

export const fetchStorefrontProducts = cache(
  async (store: EcommerceStore): Promise<EcommerceProduct[]> => {
    const db = createServiceSupabaseClient();
    const { data, error } = await db
      .from("ecommerce_products")
      .select(`
        *,
        category:ecommerce_categories(id, name, slug),
        images:ecommerce_product_images(*),
        variants:ecommerce_product_variants(*)
      `)
      .eq("store_id", store.id)
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map((row) => mapProduct(row, store));
  }
);

export const fetchStorefrontProduct = cache(
  async (store: EcommerceStore, productSlug: string): Promise<EcommerceProduct | null> => {
    const db = createServiceSupabaseClient();
    const { data, error } = await db
      .from("ecommerce_products")
      .select(`
        *,
        category:ecommerce_categories(id, name, slug),
        images:ecommerce_product_images(*),
        variants:ecommerce_product_variants(*)
      `)
      .eq("store_id", store.id)
      .eq("slug", decodeURIComponent(productSlug).toLowerCase())
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    return data ? mapProduct(data as Record<string, unknown>, store) : null;
  }
);

export async function fetchLegacyProductDestination(productId: string): Promise<{
  handle: string;
  productSlug: string;
} | null> {
  const db = createServiceSupabaseClient();
  const { data, error } = await db
    .from("ecommerce_products")
    .select("slug, status, store:ecommerce_stores!inner(public_handle, is_active, is_suspended)")
    .eq("id", productId)
    .eq("status", "published")
    .eq("ecommerce_stores.is_active", true)
    .eq("ecommerce_stores.is_suspended", false)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const storeRow = Array.isArray(data.store) ? data.store[0] : data.store;
  const handle = (storeRow as { public_handle?: string } | null)?.public_handle;
  return handle ? { handle, productSlug: data.slug } : null;
}

export async function countPublicSitemapEntries(kind: "stores" | "products"): Promise<number> {
  const db = createServiceSupabaseClient();
  if (kind === "stores") {
    const { count, error } = await db
      .from("ecommerce_stores")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("is_suspended", false);
    if (error) throw error;
    return count ?? 0;
  }
  const { count, error } = await db
    .from("ecommerce_products")
    .select("id, store:ecommerce_stores!inner(id)", { count: "exact", head: true })
    .eq("status", "published")
    .eq("ecommerce_stores.is_active", true)
    .eq("ecommerce_stores.is_suspended", false);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchPublicSitemapPage(
  kind: "stores" | "products",
  page: number,
  pageSize: number
): Promise<Array<{ handle: string; productSlug?: string; updatedAt: string }>> {
  const db = createServiceSupabaseClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  if (kind === "stores") {
    const { data, error } = await db
      .from("ecommerce_stores")
      .select("public_handle, updated_at")
      .eq("is_active", true)
      .eq("is_suspended", false)
      .order("id")
      .range(from, to);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      handle: row.public_handle,
      updatedAt: row.updated_at,
    }));
  }
  const { data, error } = await db
    .from("ecommerce_products")
    .select("slug, updated_at, store:ecommerce_stores!inner(public_handle, is_active, is_suspended)")
    .eq("status", "published")
    .eq("ecommerce_stores.is_active", true)
    .eq("ecommerce_stores.is_suspended", false)
    .order("id")
    .range(from, to);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const storeRow = Array.isArray(row.store) ? row.store[0] : row.store;
    const handle = (storeRow as { public_handle?: string } | null)?.public_handle;
    return handle ? [{ handle, productSlug: row.slug, updatedAt: row.updated_at }] : [];
  });
}
