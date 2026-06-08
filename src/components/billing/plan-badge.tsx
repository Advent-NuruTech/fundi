import { cn } from "@/lib/utils";
import type { PlanSlug } from "@/types/billing";

const BADGE_STYLES: Record<string, string> = {
  sindano: "bg-slate-100 text-slate-700 border-slate-200",
  fundi:   "bg-emerald-100 text-emerald-800 border-emerald-200",
  dhahabu: "bg-amber-100 text-amber-800 border-amber-200",
  custom:  "bg-violet-100 text-violet-800 border-violet-200",
};

const PLAN_LABELS: Record<string, string> = {
  sindano: "Sindano",
  fundi:   "Fundi",
  dhahabu: "Dhahabu",
  custom:  "Custom",
};

interface PlanBadgeProps {
  planSlug: PlanSlug;
  className?: string;
}

export function PlanBadge({ planSlug, className }: PlanBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        BADGE_STYLES[planSlug] ?? BADGE_STYLES.custom,
        className
      )}
    >
      {PLAN_LABELS[planSlug] ?? planSlug}
    </span>
  );
}
