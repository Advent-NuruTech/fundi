"use client";

import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardProps {
  title: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "info";
  loading?: boolean;
  subtitle?: string;
  className?: string;
}

const variantStyles = {
  default: { text: "text-slate-900", bg: "bg-white", icon: "text-slate-500" },
  success: { text: "text-emerald-700", bg: "bg-emerald-50/50", icon: "text-emerald-500" },
  danger: { text: "text-rose-700", bg: "bg-rose-50/50", icon: "text-rose-500" },
  warning: { text: "text-amber-700", bg: "bg-amber-50/50", icon: "text-amber-500" },
  info: { text: "text-blue-700", bg: "bg-blue-50/50", icon: "text-blue-500" },
};

export function StatsCard({ title, value, trend, trendLabel, icon, variant = "default", loading, subtitle, className }: StatsCardProps) {
  const styles = variantStyles[variant];

  if (loading) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardContent className="p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("relative overflow-hidden transition hover:shadow-md", styles.bg, className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
          {icon && <div className={cn("rounded-lg p-2", styles.icon)}>{icon}</div>}
        </div>
        <p className={cn("mt-2 text-2xl font-bold tracking-tight", styles.text)}>{value}</p>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        {trend !== undefined && (
          <div className="mt-2 flex items-center gap-1.5">
            {trend > 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
            ) : trend < 0 ? (
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                trend > 0 ? "text-emerald-600" : trend < 0 ? "text-rose-600" : "text-slate-400"
              )}
            >
              {Math.abs(trend).toFixed(1)}%
            </span>
            {trendLabel && <span className="text-xs text-slate-400">{trendLabel}</span>}
          </div>
        )}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 h-1",
            variant === "success" && "bg-emerald-500",
            variant === "danger" && "bg-rose-500",
            variant === "warning" && "bg-amber-500",
            variant === "info" && "bg-blue-500",
            variant === "default" && "bg-slate-300"
          )}
        />
      </CardContent>
    </Card>
  );
}
