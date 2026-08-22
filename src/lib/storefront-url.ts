const DEFAULT_SHOP_ORIGIN = "https://shop.fundiflow.co.ke";

export const SHOP_ORIGIN = (
  process.env.NEXT_PUBLIC_SHOP_URL ?? DEFAULT_SHOP_ORIGIN
).replace(/\/$/, "");

export function normalizeHandle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export function storeUrl(handle: string): string {
  return `${SHOP_ORIGIN}/${encodeURIComponent(handle)}`;
}

export function productUrl(handle: string, productSlug: string): string {
  return `${storeUrl(handle)}/p/${encodeURIComponent(productSlug)}`;
}

export function shopUrl(path = ""): string {
  if (!path || path === "/") return SHOP_ORIGIN;
  return `${SHOP_ORIGIN}/${path.replace(/^\//, "")}`;
}

