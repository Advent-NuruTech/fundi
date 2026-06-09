import { supabase } from "@/lib/supabase";
import { transformArrayToCamel, transformKeysToCamel, transformKeysToSnake } from "@/lib/case-utils";
import type {
  EcommerceStore,
  EcommerceProduct,
  EcommerceProductImage,
  EcommerceProductVariant,
  EcommerceCategory,
  EcommerceOrder,
  EcommerceOrderItem,
  EcommerceNotification,
  MarketplaceFilters,
  ProductFormInput,
  StoreSettingsInput,
  CheckoutInput,
  CartItem,
} from "@/types/ecommerce";

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GS-${ts}-${rand}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function fetchEcommerceCategories(): Promise<EcommerceCategory[]> {
  const { data, error } = await supabase
    .from("ecommerce_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return transformArrayToCamel<EcommerceCategory>(
    (data ?? []) as Record<string, unknown>[]
  );
}

// ── Store ────────────────────────────────────────────────────────────────────

export async function fetchStoreByBusinessId(
  businessId: string
): Promise<EcommerceStore | null> {
  const { data, error } = await supabase
    .from("ecommerce_stores")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return transformKeysToCamel<EcommerceStore>(
    data as Record<string, unknown>
  );
}

export async function fetchStoreBySlug(
  slug: string
): Promise<EcommerceStore | null> {
  const { data, error } = await supabase
    .from("ecommerce_stores")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("is_suspended", false)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return transformKeysToCamel<EcommerceStore>(
    data as Record<string, unknown>
  );
}

export async function createStore(
  businessId: string,
  businessName: string,
  input: Partial<StoreSettingsInput>
): Promise<EcommerceStore> {
  const baseSlug = slugify(input.storeName ?? businessName);
  // Ensure slug uniqueness
  let slug = baseSlug;
  let attempt = 0;
  while (true) {
    const { data } = await supabase
      .from("ecommerce_stores")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const payload = {
    business_id: businessId,
    slug,
    store_name: input.storeName ?? businessName,
    description: input.description ?? null,
    banner_url: input.bannerUrl ?? null,
    logo_url: input.logoUrl ?? null,
    contact_phone: input.contactPhone ?? null,
    notification_phone: input.notificationPhone ?? null,
    contact_email: input.contactEmail ?? null,
    location: input.location ?? null,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("ecommerce_stores")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return transformKeysToCamel<EcommerceStore>(
    data as Record<string, unknown>
  );
}

export async function updateStore(
  storeId: string,
  input: Partial<StoreSettingsInput>
): Promise<EcommerceStore> {
  const payload = transformKeysToSnake(
    input as Record<string, unknown>,
    false
  );

  const { data, error } = await supabase
    .from("ecommerce_stores")
    .update(payload)
    .eq("id", storeId)
    .select()
    .single();

  if (error) throw error;
  return transformKeysToCamel<EcommerceStore>(
    data as Record<string, unknown>
  );
}

export async function ensureStore(
  businessId: string,
  businessName: string
): Promise<EcommerceStore> {
  const existing = await fetchStoreByBusinessId(businessId);
  if (existing) return existing;
  return createStore(businessId, businessName, { storeName: businessName });
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function fetchMarketplaceProducts(
  filters: MarketplaceFilters = {}
): Promise<{ products: EcommerceProduct[]; total: number }> {
  const {
    search,
    categorySlug,
    minPrice,
    maxPrice,
    storeSlug,
    sortBy = "latest",
    inStockOnly,
    channel,
    page = 1,
    pageSize = 24,
  } = filters;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("ecommerce_products")
    .select(
      `
      *,
      category:ecommerce_categories(*),
      images:ecommerce_product_images(*),
      variants:ecommerce_product_variants(*),
      store:ecommerce_stores!inner(id, slug, store_name, logo_url, location, is_active, is_suspended)
    `,
      { count: "exact" }
    )
    .eq("status", "published")
    .eq("ecommerce_stores.is_active", true)
    .eq("ecommerce_stores.is_suspended", false);

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,description.ilike.%${search}%,brand.ilike.%${search}%`
    );
  }

  if (categorySlug) {
    const { data: cat } = await supabase
      .from("ecommerce_categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (cat) query = query.eq("category_id", cat.id);
  }

  if (minPrice !== undefined) query = query.gte("base_price", minPrice);
  if (maxPrice !== undefined) query = query.lte("base_price", maxPrice);
  if (inStockOnly) query = query.gt("total_stock", 0);
  if (channel && channel !== "all") {
    // retail page: show retail + both; wholesale page: show wholesale + both
    query = query.in("sale_channel", [channel, "both"]);
  }

  if (storeSlug) {
    const { data: store } = await supabase
      .from("ecommerce_stores")
      .select("id")
      .eq("slug", storeSlug)
      .maybeSingle();
    if (store) query = query.eq("store_id", store.id);
  }

  switch (sortBy) {
    case "price_asc":
      query = query.order("base_price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("base_price", { ascending: false });
      break;
    case "popular":
      query = query.order("order_count", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  const products = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const product = transformKeysToCamel<EcommerceProduct>(row);
    if (row.store && typeof row.store === "object" && !Array.isArray(row.store)) {
      product.store = transformKeysToCamel<
        Pick<EcommerceStore, "id" | "slug" | "storeName" | "logoUrl" | "location">
      >(row.store as Record<string, unknown>);
    }
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
    return product;
  });

  return { products, total: count ?? 0 };
}

export async function fetchProductById(
  id: string
): Promise<EcommerceProduct | null> {
  const { data, error } = await supabase
    .from("ecommerce_products")
    .select(
      `
      *,
      category:ecommerce_categories(*),
      images:ecommerce_product_images(*),
      variants:ecommerce_product_variants(*),
      store:ecommerce_stores(id, slug, store_name, logo_url, location)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const product = transformKeysToCamel<EcommerceProduct>(row);
  if (row.store && typeof row.store === "object" && !Array.isArray(row.store)) {
    product.store = transformKeysToCamel(row.store as Record<string, unknown>);
  }
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
  return product;
}

export async function fetchMyProducts(
  businessId: string
): Promise<EcommerceProduct[]> {
  const { data, error } = await supabase
    .from("ecommerce_products")
    .select(
      `
      *,
      category:ecommerce_categories(id, name, slug),
      images:ecommerce_product_images(*),
      variants:ecommerce_product_variants(*)
    `
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
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
    return product;
  });
}

export async function fetchStoreProducts(
  storeSlug: string
): Promise<EcommerceProduct[]> {
  const store = await fetchStoreBySlug(storeSlug);
  if (!store) return [];

  const { data, error } = await supabase
    .from("ecommerce_products")
    .select(
      `
      *,
      category:ecommerce_categories(id, name, slug),
      images:ecommerce_product_images(*),
      variants:ecommerce_product_variants(*)
    `
    )
    .eq("store_id", store.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
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
    return product;
  });
}

export async function createProduct(
  businessId: string,
  storeId: string,
  input: ProductFormInput
): Promise<EcommerceProduct> {
  const baseSlug = slugify(input.name);
  let slug = baseSlug;
  let attempt = 0;
  while (true) {
    const { data } = await supabase
      .from("ecommerce_products")
      .select("id")
      .eq("business_id", businessId)
      .eq("slug", slug)
      .maybeSingle();
    if (!data) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const { images, variants, ...rest } = input;
  const productPayload = {
    ...transformKeysToSnake(rest as Record<string, unknown>, false),
    business_id: businessId,
    store_id: storeId,
    slug,
  };

  const { data: productData, error: productError } = await supabase
    .from("ecommerce_products")
    .insert(productPayload)
    .select()
    .single();

  if (productError) throw productError;
  const product = transformKeysToCamel<EcommerceProduct>(
    productData as Record<string, unknown>
  );

  if (images.length > 0) {
    const imagePaylods = images.map((img, i) => ({
      product_id: product.id,
      url: img.url,
      alt_text: img.altText ?? null,
      sort_order: i,
      is_primary: img.isPrimary || i === 0,
    }));
    const { data: imgData, error: imgError } = await supabase
      .from("ecommerce_product_images")
      .insert(imagePaylods)
      .select();
    if (imgError) throw imgError;
    product.images = transformArrayToCamel<EcommerceProductImage>(
      (imgData ?? []) as Record<string, unknown>[]
    );
  }

  if (variants.length > 0) {
    const variantPayloads = variants.map((v, i) => ({
      product_id: product.id,
      business_id: businessId,
      name: v.name,
      options: v.options,
      sku: v.sku ?? null,
      price_override: v.priceOverride ?? null,
      wholesale_price: v.wholesalePrice ?? null,
      wholesale_min_qty: v.wholesaleMinQty ?? null,
      stock_quantity: v.stockQuantity,
      image_url: v.images.find((img) => img.isPrimary)?.url ?? v.images[0]?.url ?? null,
      variant_images: v.images ?? [],
      is_available: v.isAvailable,
      sort_order: i,
    }));
    const { data: varData, error: varError } = await supabase
      .from("ecommerce_product_variants")
      .insert(variantPayloads)
      .select();
    if (varError) throw varError;
    product.variants = transformArrayToCamel<EcommerceProductVariant>(
      (varData ?? []) as Record<string, unknown>[]
    );
  }

  // Update store product count
  try {
    await supabase.rpc("increment_store_product_count" as never, {
      p_store_id: storeId,
    });
  } catch { /* non-critical */ }

  return product;
}

export async function updateProduct(
  productId: string,
  businessId: string,
  input: Partial<ProductFormInput>
): Promise<EcommerceProduct> {
  const { images, variants, ...rest } = input;

  if (Object.keys(rest).length > 0) {
    const payload = transformKeysToSnake(rest as Record<string, unknown>, false);
    const { error } = await supabase
      .from("ecommerce_products")
      .update(payload)
      .eq("id", productId)
      .eq("business_id", businessId);
    if (error) throw error;
  }

  if (images !== undefined) {
    await supabase
      .from("ecommerce_product_images")
      .delete()
      .eq("product_id", productId);

    if (images.length > 0) {
      const payloads = images.map((img, i) => ({
        product_id: productId,
        url: img.url,
        alt_text: img.altText ?? null,
        sort_order: i,
        is_primary: img.isPrimary || i === 0,
      }));
      await supabase.from("ecommerce_product_images").insert(payloads);
    }
  }

  if (variants !== undefined) {
    await supabase
      .from("ecommerce_product_variants")
      .delete()
      .eq("product_id", productId);

    if (variants.length > 0) {
      const payloads = variants.map((v, i) => ({
        product_id: productId,
        business_id: businessId,
        name: v.name,
        options: v.options,
        sku: v.sku ?? null,
        price_override: v.priceOverride ?? null,
        wholesale_price: v.wholesalePrice ?? null,
        wholesale_min_qty: v.wholesaleMinQty ?? null,
        stock_quantity: v.stockQuantity,
        image_url: v.images.find((img) => img.isPrimary)?.url ?? v.images[0]?.url ?? null,
        variant_images: v.images ?? [],
        is_available: v.isAvailable,
        sort_order: i,
      }));
      await supabase.from("ecommerce_product_variants").insert(payloads);
    }
  }

  const updated = await fetchProductById(productId);
  if (!updated) throw new Error("Product not found after update");
  return updated;
}

export async function deleteProduct(
  productId: string,
  businessId: string
): Promise<void> {
  const { error } = await supabase
    .from("ecommerce_products")
    .delete()
    .eq("id", productId)
    .eq("business_id", businessId);
  if (error) throw error;
}

export async function updateProductStatus(
  productId: string,
  businessId: string,
  status: "draft" | "published" | "archived" | "out_of_stock"
): Promise<void> {
  const { error } = await supabase
    .from("ecommerce_products")
    .update({ status })
    .eq("id", productId)
    .eq("business_id", businessId);
  if (error) throw error;
}

// ── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(
  sellerBusinessId: string,
  cartItems: CartItem[],
  checkout: CheckoutInput
): Promise<EcommerceOrder> {
  const subtotal = cartItems.reduce(
    (n, i) => n + i.unitPrice * i.quantity,
    0
  );
  const total = subtotal;
  const orderNumber = generateOrderNumber();

  const orderPayload = {
    order_number: orderNumber,
    seller_business_id: sellerBusinessId,
    buyer_business_id: checkout.buyerBusinessId ?? null,
    buyer_user_id: checkout.buyerUserId ?? null,
    buyer_name: checkout.buyerName,
    buyer_phone: checkout.buyerPhone,
    buyer_email: checkout.buyerEmail ?? null,
    delivery_location: checkout.deliveryLocation ?? null,
    notes: checkout.notes ?? null,
    subtotal,
    total,
    currency: "KES",
    status: "pending",
    payment_method: checkout.paymentMethod ?? "manual",
    payment_status: "unpaid",
  };

  const { data: orderData, error: orderError } = await supabase
    .from("ecommerce_orders")
    .insert(orderPayload)
    .select()
    .single();

  if (orderError) throw orderError;
  const order = transformKeysToCamel<EcommerceOrder>(
    orderData as Record<string, unknown>
  );

  const itemPayloads = cartItems.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    variant_id: item.variantId ?? null,
    product_name: item.productName,
    variant_name: item.variantName ?? null,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.unitPrice * item.quantity,
  }));

  const { data: itemsData, error: itemsError } = await supabase
    .from("ecommerce_order_items")
    .insert(itemPayloads)
    .select();

  if (itemsError) throw itemsError;
  order.items = transformArrayToCamel<EcommerceOrderItem>(
    (itemsData ?? []) as Record<string, unknown>[]
  );

  // Reserve stock
  for (const item of cartItems) {
    try {
      if (item.variantId) {
        await supabase.rpc("reserve_variant_stock" as never, {
          p_variant_id: item.variantId,
          p_quantity: item.quantity,
        });
      } else {
        const { data: pd } = await supabase
          .from("ecommerce_products")
          .select("reserved_stock")
          .eq("id", item.productId)
          .maybeSingle();
        if (pd) {
          await supabase
            .from("ecommerce_products")
            .update({ reserved_stock: ((pd as { reserved_stock: number }).reserved_stock ?? 0) + item.quantity })
            .eq("id", item.productId);
        }
      }
    } catch { /* non-critical */ }
  }

  // Create in-app notification for seller
  await supabase.from("ecommerce_notifications").insert({
    business_id: sellerBusinessId,
    order_id: order.id,
    type: "new_order",
    title: "New Order Received",
    message: `${checkout.buyerName} placed order ${orderNumber} — KES ${total.toLocaleString()}`,
    read: false,
  });

  return order;
}

export async function fetchSellerOrders(
  businessId: string
): Promise<EcommerceOrder[]> {
  const { data, error } = await supabase
    .from("ecommerce_orders")
    .select("*, items:ecommerce_order_items(*)")
    .eq("seller_business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const order = transformKeysToCamel<EcommerceOrder>(row);
    if (Array.isArray(row.items)) {
      order.items = transformArrayToCamel<EcommerceOrderItem>(
        row.items as Record<string, unknown>[]
      );
    }
    return order;
  });
}

export async function fetchBuyerOrders(
  buyerBusinessId: string
): Promise<EcommerceOrder[]> {
  const { data, error } = await supabase
    .from("ecommerce_orders")
    .select(
      `
      *,
      items:ecommerce_order_items(*),
      store:ecommerce_stores!seller_business_id(id, slug, store_name)
    `
    )
    .eq("buyer_business_id", buyerBusinessId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const order = transformKeysToCamel<EcommerceOrder>(row);
    if (Array.isArray(row.items)) {
      order.items = transformArrayToCamel<EcommerceOrderItem>(
        row.items as Record<string, unknown>[]
      );
    }
    if (row.store && typeof row.store === "object" && !Array.isArray(row.store)) {
      order.store = transformKeysToCamel<Pick<EcommerceStore, "id" | "slug" | "storeName">>(
        row.store as Record<string, unknown>
      );
    }
    return order;
  });
}

export async function fetchOrderById(orderId: string): Promise<EcommerceOrder | null> {
  const { data, error } = await supabase
    .from("ecommerce_orders")
    .select("*, items:ecommerce_order_items(*)")
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const order = transformKeysToCamel<EcommerceOrder>(row);
  if (Array.isArray(row.items)) {
    order.items = transformArrayToCamel<EcommerceOrderItem>(
      row.items as Record<string, unknown>[]
    );
  }
  return order;
}

export async function trackOrderByNumberAndPhone(
  orderNumber: string,
  phone: string
): Promise<EcommerceOrder | null> {
  const { data, error } = await supabase
    .from("ecommerce_orders")
    .select("*, items:ecommerce_order_items(*)")
    .eq("order_number", orderNumber.toUpperCase())
    .eq("buyer_phone", phone)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const order = transformKeysToCamel<EcommerceOrder>(row);
  if (Array.isArray(row.items)) {
    order.items = transformArrayToCamel<EcommerceOrderItem>(
      row.items as Record<string, unknown>[]
    );
  }
  return order;
}

export async function updateOrderStatus(
  orderId: string,
  businessId: string,
  status: EcommerceOrder["status"],
  reason?: string
): Promise<void> {
  const update: Record<string, unknown> = { status };

  if (status === "confirmed") update.confirmed_at = new Date().toISOString();
  if (status === "shipped") update.shipped_at = new Date().toISOString();
  if (status === "delivered") update.delivered_at = new Date().toISOString();
  if (status === "rejected") update.rejection_reason = reason ?? null;
  if (status === "cancelled") update.cancellation_reason = reason ?? null;

  const { error } = await supabase
    .from("ecommerce_orders")
    .update(update)
    .eq("id", orderId)
    .eq("seller_business_id", businessId);

  if (error) throw error;

  // Add notification for buyer if they were logged in
  const order = await fetchOrderById(orderId);
  if (order?.buyerBusinessId) {
    await supabase.from("ecommerce_notifications").insert({
      business_id: order.buyerBusinessId,
      order_id: orderId,
      type: "order_status_changed",
      title: "Order Update",
      message: `Your order ${order.orderNumber} is now: ${status.replace(/_/g, " ")}`,
      read: false,
    });
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function fetchEcommerceNotifications(
  businessId: string
): Promise<EcommerceNotification[]> {
  const { data, error } = await supabase
    .from("ecommerce_notifications")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return transformArrayToCamel<EcommerceNotification>(
    (data ?? []) as Record<string, unknown>[]
  );
}

export async function markEcommerceNotificationRead(
  notificationId: string
): Promise<void> {
  await supabase
    .from("ecommerce_notifications")
    .update({ read: true })
    .eq("id", notificationId);
}

export async function markAllEcommerceNotificationsRead(
  businessId: string
): Promise<void> {
  await supabase
    .from("ecommerce_notifications")
    .update({ read: true })
    .eq("business_id", businessId)
    .eq("read", false);
}

// ── Real-time listeners ───────────────────────────────────────────────────────

export function listenSellerOrders(
  businessId: string,
  callback: (orders: EcommerceOrder[]) => void
): () => void {
  // Initial fetch
  fetchSellerOrders(businessId).then(callback).catch(() => {});

  const channel = supabase
    .channel(`ecommerce_orders_seller_${businessId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "ecommerce_orders",
        filter: `seller_business_id=eq.${businessId}`,
      },
      () => {
        fetchSellerOrders(businessId).then(callback).catch(() => {});
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function listenEcommerceNotifications(
  businessId: string,
  callback: (notifications: EcommerceNotification[]) => void
): () => void {
  fetchEcommerceNotifications(businessId).then(callback).catch(() => {});

  const channel = supabase
    .channel(`ecommerce_notifications_${businessId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "ecommerce_notifications",
        filter: `business_id=eq.${businessId}`,
      },
      () => {
        fetchEcommerceNotifications(businessId).then(callback).catch(() => {});
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
