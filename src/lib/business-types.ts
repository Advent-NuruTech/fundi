/**
 * Business categories (industries) supported by FundiFlow.
 *
 * FundiFlow started life as a tailoring OS, but the same engine — inventory,
 * finance, customers, orders, POS, payments, analytics — solves the daily
 * pain of most Kenyan / African SMEs. This registry lets one codebase wear
 * many faces: it drives terminology, which modules appear, the default
 * inventory taxonomy, and the onboarding copy for each industry.
 *
 * IMPORTANT: this file is plain data (no JSX, no React) so it is safe to import
 * from BOTH client components and server API routes (e.g. the onboard route
 * seeds inventory categories/units from here).
 *
 * Adding a new industry = add an entry here. No database migration needed —
 * `businesses.business_type` is free-form text (see migration 00027).
 */

export type BusinessType =
  | "tailoring"
  | "retail"
  | "wholesale"
  | "hardware"
  | "general";

export const DEFAULT_BUSINESS_TYPE: BusinessType = "tailoring";

/** Words that change per industry so the UI never says the wrong thing. */
export interface BusinessTerms {
  /** Plural label for the sales/orders module, e.g. "Orders" / "Sales". */
  orders: string;
  /** Singular, e.g. "Order" / "Sale". */
  order: string;
  /** Plural label for people you sell to, e.g. "Customers" / "Clients". */
  customers: string;
  customer: string;
  /** Label for the stock module, e.g. "Inventory" / "Stock". */
  inventory: string;
  /** Plural label for stock records, e.g. "Materials" / "Products". */
  materials: string;
  material: string;
  /** Label for the production workflow (tailoring only). */
  production: string;
  suppliers: string;
}

export interface BusinessTypeConfig {
  id: BusinessType;
  /** Human label shown in onboarding & settings. */
  label: string;
  /** Friendly icon so a Grade-6 student instantly recognises their shop. */
  emoji: string;
  /** Short subtitle shown under the business name in the sidebar. */
  tagline: string;
  /** One-line description for the onboarding picker. */
  description: string;
  /** The single biggest daily pain this preset is tuned to solve. */
  painSolved: string;
  /** Industry-correct vocabulary. */
  terms: BusinessTerms;
  /**
   * Top-level navigation hrefs to HIDE for this industry. Everything not listed
   * stays visible. Keeping it as a deny-list means new modules show up
   * everywhere by default (safe, non-breaking).
   */
  hiddenNav: string[];
  /** Seeded when the business is created (idempotent). */
  inventoryCategories: string[];
  /** Seeded when the business is created (idempotent). */
  inventoryUnits: string[];
}

const TAILORING: BusinessTypeConfig = {
  id: "tailoring",
  label: "Tailoring & Fashion",
  emoji: "✂️",
  tagline: "Tailoring & Fashion OS",
  description: "Tailors, dressmakers and fashion designers tracking measurements, fabric and production.",
  painSolved: "Never lose a customer's measurements, fabric or due date again.",
  terms: {
    orders: "Orders",
    order: "Order",
    customers: "Customers",
    customer: "Customer",
    inventory: "Inventory",
    materials: "Materials",
    material: "Material",
    production: "Production",
    suppliers: "Suppliers",
  },
  hiddenNav: [],
  inventoryCategories: ["Fabrics", "Threads", "Buttons", "Zips", "Elastic", "Lining", "Accessories"],
  inventoryUnits: ["Pieces", "Meters", "Cones", "Kilograms", "Liters"],
};

const RETAIL: BusinessTypeConfig = {
  id: "retail",
  label: "Retail Shop / Duka",
  emoji: "🏪",
  tagline: "Retail Shop OS",
  description: "Shops, dukas, minimarts and kiosks selling products over the counter.",
  painSolved: "Know exactly what's selling, what's running out, and how much you really made today.",
  terms: {
    orders: "Sales",
    order: "Sale",
    customers: "Customers",
    customer: "Customer",
    inventory: "Stock",
    materials: "Products",
    material: "Product",
    production: "Production",
    suppliers: "Suppliers",
  },
  hiddenNav: ["/production"],
  inventoryCategories: ["Groceries", "Beverages", "Snacks", "Household", "Personal Care", "Electronics", "Stationery", "Other"],
  inventoryUnits: ["Pieces", "Packets", "Cartons", "Kilograms", "Liters", "Dozens"],
};

const WHOLESALE: BusinessTypeConfig = {
  id: "wholesale",
  label: "Wholesale / Distributor",
  emoji: "📦",
  tagline: "Wholesale & Distribution OS",
  description: "Wholesalers and distributors moving stock in bulk to shops and traders.",
  painSolved: "Track bulk stock, credit customers and supplier debts without a single notebook.",
  terms: {
    orders: "Orders",
    order: "Order",
    customers: "Clients",
    customer: "Client",
    inventory: "Stock",
    materials: "Products",
    material: "Product",
    production: "Production",
    suppliers: "Suppliers",
  },
  hiddenNav: ["/production"],
  inventoryCategories: ["Foodstuff", "Beverages", "Cleaning Supplies", "Packaging", "Cereals", "Cooking Oil", "Sugar & Flour", "Other"],
  inventoryUnits: ["Cartons", "Bales", "Sacks", "Crates", "Kilograms", "Pieces", "Dozens"],
};

const HARDWARE: BusinessTypeConfig = {
  id: "hardware",
  label: "Hardware Store",
  emoji: "🔧",
  tagline: "Hardware Store OS",
  description: "Hardware shops selling building, plumbing, electrical and tools.",
  painSolved: "Stop stock-outs on fast movers and track every shilling across thousands of SKUs.",
  terms: {
    orders: "Sales",
    order: "Sale",
    customers: "Customers",
    customer: "Customer",
    inventory: "Stock",
    materials: "Products",
    material: "Product",
    production: "Production",
    suppliers: "Suppliers",
  },
  hiddenNav: ["/production"],
  inventoryCategories: ["Cement & Building", "Plumbing", "Electrical", "Paint", "Tools", "Steel & Metal", "Timber", "Fasteners", "Other"],
  inventoryUnits: ["Pieces", "Bags", "Meters", "Kilograms", "Litres", "Rolls", "Bundles"],
};

const GENERAL: BusinessTypeConfig = {
  id: "general",
  label: "Other Business",
  emoji: "🏬",
  tagline: "Business Management OS",
  description: "Any other SME — services, agribusiness, salons and more.",
  painSolved: "Run inventory, finance and customers in one simple place built for SMEs.",
  terms: {
    orders: "Orders",
    order: "Order",
    customers: "Customers",
    customer: "Customer",
    inventory: "Inventory",
    materials: "Items",
    material: "Item",
    production: "Production",
    suppliers: "Suppliers",
  },
  hiddenNav: ["/production"],
  inventoryCategories: ["General", "Supplies", "Equipment", "Other"],
  inventoryUnits: ["Pieces", "Boxes", "Kilograms", "Litres", "Hours"],
};

/** Ordered for display in the onboarding picker. */
export const BUSINESS_TYPES: BusinessTypeConfig[] = [
  RETAIL,
  WHOLESALE,
  HARDWARE,
  TAILORING,
  GENERAL,
];

const BY_ID: Record<BusinessType, BusinessTypeConfig> = {
  tailoring: TAILORING,
  retail: RETAIL,
  wholesale: WHOLESALE,
  hardware: HARDWARE,
  general: GENERAL,
};

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === "string" && value in BY_ID;
}

/** Resolve a config from any input, always falling back to the default. */
export function getBusinessTypeConfig(value: unknown): BusinessTypeConfig {
  return isBusinessType(value) ? BY_ID[value] : BY_ID[DEFAULT_BUSINESS_TYPE];
}
