import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-emerald-600 text-white hover:bg-emerald-500",
        variant === "outline" && "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-500",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-11 px-6 text-base",
        size === "icon" && "h-9 w-9 px-0",
        className
      )}
      {...props}
    />
  );
}
