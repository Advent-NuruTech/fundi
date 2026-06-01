export function formatPhone(phone: string): string {
  const digits = phone.trim().replace(/[^\d+]/g, "");
  const normalized = digits.startsWith("+") ? digits.slice(1) : digits;

  if (normalized.startsWith("254") && normalized.length === 12) return normalized;
  if (normalized.startsWith("0") && normalized.length === 10) return `254${normalized.slice(1)}`;
  if (normalized.startsWith("7") && normalized.length === 9) return `254${normalized}`;
  if (normalized.startsWith("1") && normalized.length === 9) return `254${normalized}`;

  return normalized;
}

export function isValidKenyanPhone(phone: string): boolean {
  return /^254[17]\d{8}$/.test(formatPhone(phone));
}
