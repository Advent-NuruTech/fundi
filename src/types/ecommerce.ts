// ── Ecommerce domain types for Global Sell marketplace ──────────────────────

export type EcommerceProductStatus = 'draft' | 'published' | 'archived' | 'out_of_stock';
export type EcommerceSaleChannel = 'retail' | 'wholesale' | 'both';

export type EcommerceOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'rejected';

export type EcommercePaymentStatus = 'unpaid' | 'paid' | 'partial' | 'refunded';

export type EcommercePaymentMethod = 'manual' | 'cash' | 'mpesa' | 'bank_transfer';

export type EcommerceInventoryChange = 'reserved' | 'released' | 'sold' | 'restocked' | 'adjusted';

export type EcommerceNotificationType = 'new_order' | 'order_status_changed' | 'stock_low';

// ── Category ────────────────────────────────────────────────────────────────

export interface EcommerceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  createdAt: string;
}

// ── Store ────────────────────────────────────────────────────────────────────

export interface EcommerceStore {
  id: string;
  businessId: string;
  /** Globally unique, merchant-controlled public storefront address. */
  publicHandle: string;
  /** Legacy slug retained for redirects and backwards compatibility. */
  slug: string;
  storeName: string;
  /** Seller industry category, mirrored from the business's businessType. */
  storeType?: import("@/lib/business-types").BusinessType;
  description?: string;
  bannerUrl?: string;
  logoUrl?: string;
  contactPhone?: string;
  notificationPhone?: string;
  contactEmail?: string;
  location?: string;
  isActive: boolean;
  isVerified: boolean;
  isSuspended: boolean;
  totalProducts: number;
  totalOrders: number;
  createdAt: string;
  updatedAt: string;
}

// ── Product Image ────────────────────────────────────────────────────────────

export interface EcommerceProductImage {
  id: string;
  productId: string;
  url: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

// ── Variant image (lightweight, stored as JSONB in variant row) ──────────────

export interface VariantImage {
  url: string;
  altText?: string;
  isPrimary: boolean;
}

// ── Product Variant ──────────────────────────────────────────────────────────

export interface EcommerceProductVariant {
  id: string;
  productId: string;
  businessId: string;
  name: string;
  options: Record<string, string>;  // { "Size": "L", "Color": "Red" }
  sku?: string;
  priceOverride?: number;
  wholesalePrice?: number;
  wholesaleMinQty?: number;
  stockQuantity: number;
  reservedQuantity: number;
  imageUrl?: string;
  variantImages?: VariantImage[];
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ── Product ──────────────────────────────────────────────────────────────────

export interface EcommerceProduct {
  id: string;
  businessId: string;
  storeId: string;
  name: string;
  slug: string;
  description?: string;
  richDescription?: string;
  categoryId?: string;
  category?: EcommerceCategory;
  brand?: string;
  sku?: string;
  basePrice: number;
  discountPrice?: number;
  wholesalePrice?: number;
  wholesaleMinQty?: number;
  saleChannel: EcommerceSaleChannel;
  currency: string;
  status: EcommerceProductStatus;
  trackInventory: boolean;
  allowBackorder: boolean;
  totalStock: number;
  reservedStock: number;
  tags?: string[];
  shippingWeight?: number;
  shippingInfo?: Record<string, unknown>;
  isFeatured: boolean;
  viewCount: number;
  orderCount: number;
  ratingAvg: number;
  ratingCount: number;
  images?: EcommerceProductImage[];
  variants?: EcommerceProductVariant[];
  store?: Pick<EcommerceStore, 'id' | 'slug' | 'publicHandle' | 'storeName' | 'logoUrl' | 'location'>;
  createdAt: string;
  updatedAt: string;
}

// ── Variant form input ───────────────────────────────────────────────────────

export interface VariantFormInput {
  id: string;                         // stable UUID for UI keying
  name: string;                       // derived: option values joined
  options: Record<string, string>;
  sku?: string;
  priceOverride?: number;
  wholesalePrice?: number;
  wholesaleMinQty?: number;
  stockQuantity: number;
  images: VariantImage[];             // multi-image; first isPrimary is imageUrl
  isAvailable: boolean;
}

// ── Product form input ───────────────────────────────────────────────────────

export interface ProductFormInput {
  name: string;
  description?: string;
  richDescription?: string;
  categoryId?: string;
  brand?: string;
  sku?: string;
  basePrice: number;
  discountPrice?: number;
  wholesalePrice?: number;
  wholesaleMinQty?: number;
  saleChannel: EcommerceSaleChannel;
  status: EcommerceProductStatus;
  trackInventory: boolean;
  allowBackorder: boolean;
  totalStock: number;
  tags?: string[];
  shippingWeight?: number;
  images: { url: string; altText?: string; isPrimary: boolean }[];
  variants: VariantFormInput[];
}

// ── Order Item ───────────────────────────────────────────────────────────────

export interface EcommerceOrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
}

// ── Order Payment ───────────────────────────────────────────────────────────

export interface EcommerceOrderPayment {
  id: string;
  businessId: string;
  orderId: string;
  amount: number;
  method: EcommercePaymentMethod;
  paymentReference?: string;
  note?: string;
  recordedByUid?: string;
  recordedByName?: string;
  createdAt: string;
}

// ── Order ────────────────────────────────────────────────────────────────────

export interface EcommerceOrder {
  id: string;
  orderNumber: string;
  sellerBusinessId: string;
  buyerBusinessId?: string;
  buyerUserId?: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  deliveryLocation?: string;
  notes?: string;
  subtotal: number;
  total: number;
  currency: string;
  status: EcommerceOrderStatus;
  paymentMethod: EcommercePaymentMethod;
  paymentStatus: EcommercePaymentStatus;
  paidAt?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  smsSent: boolean;
  items?: EcommerceOrderItem[];
  /** Payments recorded by the seller. Available to the purchaser in the customer portal. */
  payments?: EcommerceOrderPayment[];
  store?: Pick<EcommerceStore, 'id' | 'slug' | 'storeName'>;
  createdAt: string;
  updatedAt: string;
}

// ── Checkout input ───────────────────────────────────────────────────────────

export interface CheckoutInput {
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  deliveryLocation?: string;
  notes?: string;
  paymentMethod?: EcommercePaymentMethod;
  buyerBusinessId?: string;
  buyerUserId?: string;
}

// ── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;            // local UUID for cart item
  productId: string;
  variantId?: string;
  sellerBusinessId: string;
  sellerStoreSlug: string;
  storeName: string;
  productName: string;
  variantName?: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  maxStock?: number;
}

// ── Marketplace query filters ─────────────────────────────────────────────────

export interface MarketplaceFilters {
  search?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  storeSlug?: string;
  sortBy?: 'latest' | 'price_asc' | 'price_desc' | 'popular';
  inStockOnly?: boolean;
  channel?: EcommerceSaleChannel | 'all';
  page?: number;
  pageSize?: number;
}

// ── Ecommerce notification ───────────────────────────────────────────────────

export interface EcommerceNotification {
  id: string;
  businessId: string;
  orderId?: string;
  type: EcommerceNotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ── Store settings input ──────────────────────────────────────────────────────

export interface StoreSettingsInput {
  storeName: string;
  publicHandle?: string;
  description?: string;
  bannerUrl?: string;
  logoUrl?: string;
  contactPhone?: string;
  notificationPhone?: string;
  contactEmail?: string;
  location?: string;
}
