const DEFAULT_DESCRIPTION_LENGTH = 160;

export function truncateShareDescription(
  description: string | undefined,
  maxLength = DEFAULT_DESCRIPTION_LENGTH
): string {
  const normalized = description?.replace(/\s+/g, " ").trim() ?? "";
  if (normalized.length <= maxLength) return normalized;

  const availableLength = Math.max(1, maxLength - 1);
  const candidate = normalized.slice(0, availableLength).trimEnd();
  const lastSpace = candidate.lastIndexOf(" ");
  const cutoff = lastSpace >= Math.floor(availableLength * 0.6)
    ? candidate.slice(0, lastSpace)
    : candidate;

  return `${cutoff}…`;
}

export function productShareText(name: string, description?: string): string {
  const summary = truncateShareDescription(description);
  return summary ? `${name}\n\n${summary}` : name;
}
