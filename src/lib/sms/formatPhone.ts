export function formatPhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("254")) return trimmed;
  if (trimmed.startsWith("0")) return `254${trimmed.slice(1)}`;
  return trimmed;
}
