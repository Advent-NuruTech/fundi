import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKes(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateLabel(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-KE", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function toYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Auto-generate a readable SKU from an item name, e.g. "School Uniform" →
 * "SCHL-UNI-8Q2". Editable by the business after creation.
 */
export function generateSku(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  const slug = clean.split("-").filter(Boolean).slice(0, 2).join("-") || "ITEM";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const suffix = hash.toString(36).toUpperCase().padStart(3, "0").slice(0, 3);
  return `${slug}-${suffix}`;
}
