"use client";

import { useEffect, useState } from "react";

const FALLBACK_STATUSES = [
  "Thinking…",
  "Looking carefully…",
  "Checking your data…",
  "Finalizing…",
];

export function StatusBubble({ statuses }: { statuses?: string[] }) {
  const items = statuses && statuses.length > 0 ? statuses : FALLBACK_STATUSES;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 1600);
    return () => window.clearInterval(id);
  }, [items]);

  return (
    <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-slate-500">{items[index]}</span>
    </div>
  );
}
