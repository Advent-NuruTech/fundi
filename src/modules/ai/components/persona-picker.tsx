"use client";

import {
  Briefcase,
  Workflow,
  TrendingUp,
  Headphones,
  ShoppingBag,
  Package,
  Scissors,
  Megaphone,
  Rocket,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { BUSINESS_AI_PERSONAS } from "@/lib/ai/personas";
import type { AIAssistantPersonaId } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Briefcase,
  Workflow,
  TrendingUp,
  Headphones,
  ShoppingBag,
  Package,
  Scissors,
  Megaphone,
  Rocket,
};

export function personaIcon(id: AIAssistantPersonaId): LucideIcon {
  const persona = BUSINESS_AI_PERSONAS.find((p) => p.id === id);
  return ICONS[persona?.icon ?? ""] ?? Sparkles;
}

export function PersonaPicker({
  activeId,
  onSelect,
}: {
  activeId: AIAssistantPersonaId;
  onSelect: (id: AIAssistantPersonaId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {BUSINESS_AI_PERSONAS.map((p) => {
        const Icon = ICONS[p.icon] ?? Sparkles;
        const active = p.id === activeId;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={cn(
              "rounded-xl border p-3 text-left transition",
              active
                ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50"
            )}
          >
            <div className={cn("mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg", p.accent)}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-slate-800">{p.label}</p>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">{p.tagline}</p>
          </button>
        );
      })}
    </div>
  );
}
