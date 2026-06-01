export function formatSenderId(sender?: string): string {
  if (!sender) return "FundiFlow";
  const sanitized = sender.replace(/[^a-zA-Z0-9]/g, "").trim();
  if (!sanitized) return "FundiFlow";
  return sanitized.slice(0, 11);
}
