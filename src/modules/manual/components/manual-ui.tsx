import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert, Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ManualField {
  field: string;
  required?: boolean;
  meaning: string;
  example: string;
}

export function ManualHeader({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="overflow-hidden rounded-3xl bg-slate-950 px-5 py-7 text-white shadow-sm sm:px-8 sm:py-9">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">{eyebrow}</p>
      <h1 className="mt-2 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </section>
  );
}

export function SectionHeading({
  number,
  title,
  description,
}: {
  number?: number;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {number ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
          {number}
        </span>
      ) : null}
      <div>
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
    </div>
  );
}

export function FieldGuide({ fields }: { fields: ManualField[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[180px_minmax(0,1.3fr)_minmax(0,1fr)] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
        <span>Field</span>
        <span>What it means</span>
        <span>Real example</span>
      </div>
      <div className="divide-y divide-slate-100">
        {fields.map((field) => (
          <div
            key={field.field}
            className="grid gap-2 px-4 py-4 md:grid-cols-[180px_minmax(0,1.3fr)_minmax(0,1fr)] md:gap-4"
          >
            <div>
              <p className="text-sm font-bold text-slate-900">{field.field}</p>
              <span
                className={cn(
                  "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  field.required
                    ? "bg-rose-50 text-rose-700"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                {field.required ? "Required" : "Optional"}
              </span>
            </div>
            <p className="text-sm leading-6 text-slate-600">{field.meaning}</p>
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-950">
              <span className="font-semibold md:hidden">Example: </span>
              {field.example}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExampleCard({
  title,
  children,
  tone = "emerald",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "emerald" | "amber" | "blue";
}) {
  const styles = {
    emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
  }[tone];

  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5", styles)}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">{title}</p>
      <div className="mt-2 space-y-1 text-sm leading-6">{children}</div>
    </div>
  );
}

export function NumberedSteps({ steps }: { steps: Array<{ title: string; text: string }> }) {
  return (
    <ol className="grid gap-3">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">{step.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Note({ children, warning = false }: { children: React.ReactNode; warning?: boolean }) {
  const Icon = warning ? CircleAlert : Lightbulb;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border p-4 text-sm leading-6",
        warning
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : "border-blue-200 bg-blue-50 text-blue-950"
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Checklist({ items }: { items: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <p key={item} className="flex gap-2 rounded-xl bg-slate-50 p-3 text-sm leading-5 text-slate-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          {item}
        </p>
      ))}
    </div>
  );
}

export function ProductLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline">
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}
