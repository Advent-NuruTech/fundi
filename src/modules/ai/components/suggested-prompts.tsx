"use client";

import { Sparkles } from "lucide-react";
import type { AIAssistantPersona } from "@/lib/ai/types";

export function SuggestedPrompts({
  persona,
  onPick,
}: {
  persona: AIAssistantPersona;
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {persona.suggestedPrompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onPick(prompt)}
          className="inline-flex max-w-full items-start gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
          <span className="truncate">{prompt}</span>
        </button>
      ))}
    </div>
  );
}
