/**
 * Business categories (industries) supported by FundiFlow.
 *
 * FundiFlow is a tailoring & fashion operating system. This registry drives
 * terminology, which modules appear, the default inventory taxonomy and the
 * onboarding copy. The registry is intentionally single-preset today — only
 * Tailoring & Fashion is offered.
 *
 * IMPORTANT: this file is plain data (no JSX, no React) so it is safe to import
 * from BOTH client components and server API routes (e.g. the onboard route
 * seeds inventory categories/units from here).
 *
 * Legacy businesses created with an old preset (retail, wholesale, hardware,
 * general) keep working — `getBusinessTypeConfig` falls back to the tailoring
 * preset for any unknown value, so nothing breaks.
 */

export type BusinessType = "tailoring";

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

/** Ordered for display in the onboarding picker. */
export const BUSINESS_TYPES: BusinessTypeConfig[] = [TAILORING];

const BY_ID: Record<BusinessType, BusinessTypeConfig> = {
  tailoring: TAILORING,
};

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === "string" && value in BY_ID;
}

/** Resolve a config from any input, always falling back to the default. */
export function getBusinessTypeConfig(value: unknown): BusinessTypeConfig {
  return isBusinessType(value) ? BY_ID[value] : BY_ID[DEFAULT_BUSINESS_TYPE];
}
