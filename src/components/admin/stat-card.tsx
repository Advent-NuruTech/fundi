import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: "default" | "success" | "warning" | "danger" | "purple";
  loading?: boolean;
}

const VARIANT_STYLES = {
  default: {
    icon: "bg-slate-800 text-slate-400",
    value: "text-slate-100",
    trend_up: "text-emerald-400",
    trend_down: "text-rose-400",
  },
  success: {
    icon: "bg-emerald-900/40 text-emerald-400",
    value: "text-emerald-300",
    trend_up: "text-emerald-400",
    trend_down: "text-rose-400",
  },
  warning: {
    icon: "bg-amber-900/40 text-amber-400",
    value: "text-amber-300",
    trend_up: "text-emerald-400",
    trend_down: "text-rose-400",
  },
  danger: {
    icon: "bg-rose-900/40 text-rose-400",
    value: "text-rose-300",
    trend_up: "text-emerald-400",
    trend_down: "text-rose-400",
  },
  purple: {
    icon: "bg-violet-900/40 text-violet-400",
    value: "text-violet-300",
    trend_up: "text-emerald-400",
    trend_down: "text-rose-400",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  loading,
}: Props) {
  const styles = VARIANT_STYLES[variant];

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-800" />
            <div className="h-8 w-32 animate-pulse rounded bg-slate-800" />
            <div className="h-3 w-20 animate-pulse rounded bg-slate-800" />
          </div>
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-slate-700">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
          <p className={cn("mt-1.5 text-2xl font-bold tabular-nums", styles.value)}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "mt-1.5 text-xs font-medium",
                trend.value >= 0 ? styles.trend_up : styles.trend_down
              )}
            >
              {trend.value >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", styles.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
