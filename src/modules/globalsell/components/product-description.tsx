"use client";

import { useState } from "react";

const EXPANDABLE_DESCRIPTION_LENGTH = 220;

export function ProductDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = description.trim().length > EXPANDABLE_DESCRIPTION_LENGTH;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="mb-2 text-sm font-semibold text-slate-900">Description</h2>
      <p className={`whitespace-pre-wrap text-sm leading-6 text-slate-600 ${!expanded && canExpand ? "line-clamp-4" : ""}`}>
        {description}
      </p>
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      )}
    </section>
  );
}
