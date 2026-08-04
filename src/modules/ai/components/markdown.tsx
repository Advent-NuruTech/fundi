"use client";

import type { ReactNode } from "react";

/**
 * Minimal, dependency-free Markdown renderer for AI replies.
 * Supports the subset the assistants are instructed to use: headings, bold,
 * italic, inline code, fenced code blocks, bullet/numbered lists, links,
 * blockquotes and horizontal rules. Everything else renders as plain text.
 */

function InlineText({ text }: { text: string }) {
  const out: ReactNode[] = [];

  // Inline code spans (protected from all other parsing).
  const codeParts = text.split(/(`[^`]+`)/g);
  codeParts.forEach((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      out.push(
        <code
          key={`c${i}`}
          className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-800"
        >
          {part.slice(1, -1)}
        </code>
      );
      return;
    }

    // Bold.
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    boldParts.forEach((bp, j) => {
      if (bp.startsWith("**") && bp.endsWith("**") && bp.length > 4) {
        out.push(
          <strong key={`b${i}-${j}`} className="font-semibold text-slate-900">
            <InlineText text={bp.slice(2, -2)} />
          </strong>
        );
        return;
      }

      // Links.
      const linkParts = bp.split(/(\[[^[\]]+\]\([^()\s]+\))/g);
      linkParts.forEach((lp, k) => {
        const m = lp.match(/^\[([^\]]+)\]\(([^()\s]+)\)$/);
        if (m) {
          out.push(
            <a
              key={`l${i}-${j}-${k}`}
              href={m[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2"
            >
              {m[1]}
            </a>
          );
          return;
        }

        // Italic.
        const itParts = lp.split(/(\*[^*]+\*)/g);
        itParts.forEach((it, l) => {
          if (it.startsWith("*") && it.endsWith("*") && it.length > 2) {
            out.push(<em key={`e${i}-${j}-${k}-${l}`}>{it.slice(1, -1)}</em>);
          } else if (it) {
            out.push(<span key={`s${i}-${j}-${k}-${l}`}>{it}</span>);
          }
        });
      });
    });
  });

  return <>{out}</>;
}

interface Block {
  type: "paragraph" | "list" | "ordered" | "code" | "heading" | "quote" | "hr" | "empty";
  items?: string[];
  level?: number;
  lang?: string;
}

function parseBlocks(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];
  let current: Block | null = null;

  const pushCurrent = () => {
    if (current) {
      blocks.push(current);
      current = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Fenced code continuation / close.
    if (current?.type === "code") {
      if (line.trim().startsWith("```")) pushCurrent();
      else current.items!.push(raw);
      continue;
    }
    if (line.startsWith("```")) {
      pushCurrent();
      current = { type: "code", lang: line.slice(3).trim(), items: [] };
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      pushCurrent();
      blocks.push({ type: "heading", level: heading[1].length, items: [heading[2]] });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      pushCurrent();
      blocks.push({ type: "hr" });
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      pushCurrent();
      blocks.push({ type: "quote", items: [quote[1]] });
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (current?.type !== "list") {
        pushCurrent();
        current = { type: "list", items: [] };
      }
      current.items!.push(bullet[1]);
      continue;
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ordered) {
      if (current?.type !== "ordered") {
        pushCurrent();
        current = { type: "ordered", items: [] };
      }
      current.items!.push(ordered[1]);
      continue;
    }

    if (line.trim() === "") {
      pushCurrent();
      continue;
    }

    pushCurrent();
    blocks.push({ type: "paragraph", items: [line] });
  }
  pushCurrent();
  return blocks;
}

const headingClass = (level: number) =>
  [
    "mt-5 mb-2 text-lg font-bold text-slate-900 first:mt-0",
    "mt-4 mb-1.5 text-base font-bold text-slate-900",
    "mt-3 mb-1 text-sm font-semibold text-slate-900",
    "mt-2 mb-1 text-sm font-semibold text-slate-700",
  ][level - 1] ?? "mt-2 mb-1 text-sm font-semibold text-slate-700";

export function Markdown({ content }: { content: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-slate-700">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            const Heading = ["h1", "h2", "h3", "h4"][(block.level ?? 2) - 1] as "h1" | "h2" | "h3" | "h4";
            return (
              <Heading key={i} className={headingClass(block.level ?? 2)}>
                <InlineText text={(block.items ?? [])[0] ?? ""} />
              </Heading>
            );
          case "paragraph":
            return (
              <p key={i}>
                <InlineText text={(block.items ?? [])[0] ?? ""} />
              </p>
            );
          case "list":
            return (
              <ul key={i} className="list-disc space-y-0.5 pl-5">
                {(block.items ?? []).map((item, j) => (
                  <li key={j}>
                    <InlineText text={item} />
                  </li>
                ))}
              </ul>
            );
          case "ordered":
            return (
              <ol key={i} className="list-decimal space-y-0.5 pl-5">
                {(block.items ?? []).map((item, j) => (
                  <li key={j}>
                    <InlineText text={item} />
                  </li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-l-2 border-emerald-300 pl-3 text-slate-600">
                <InlineText text={(block.items ?? [])[0] ?? ""} />
              </blockquote>
            );
          case "code":
            return (
              <pre
                key={i}
                className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100"
              >
                <code>{(block.items ?? []).join("\n")}</code>
              </pre>
            );
          case "hr":
            return <hr key={i} className="my-2 border-slate-200" />;
          default:
            return <div key={i} className="h-1" />;
        }
      })}
    </div>
  );
}
