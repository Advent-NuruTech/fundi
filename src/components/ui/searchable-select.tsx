"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Search, ChevronDown, Plus, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  /** Optional section header used to group options in the list. */
  group?: string;
  /** Optional payload available to filter chips. */
  data?: Record<string, unknown>;
}

export interface FilterChip {
  key: string;
  label: string;
  /** Return true to keep an option visible while this chip is active. */
  match: (option: SearchableOption) => boolean;
}

interface Props {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  onCreate?: (label: string) => void;
  loading?: boolean;
  className?: string;
  /** Quick filter chips shown above the search box. The first chip is active by default. */
  chips?: FilterChip[];
  /** Cap how many results are rendered at once (perf for huge lists). */
  maxResults?: number;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search...",
  emptyLabel = "Nothing found",
  disabled = false,
  onCreate,
  loading = false,
  className,
  chips,
  maxResults = 150,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeChip, setActiveChip] = useState<string | undefined>(chips?.[0]?.key);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  // 1. Chip filter (e.g. Individuals / Groups), applied first.
  const chipFiltered = useMemo(() => {
    if (!chips || chips.length === 0 || !activeChip) return options;
    const chip = chips.find((c) => c.key === activeChip);
    return chip ? options.filter(chip.match) : options;
  }, [options, chips, activeChip]);

  // 2. Text search over the chip-filtered list.
  const query = search.trim().toLowerCase();
  const searched = useMemo(() => {
    if (!query) return chipFiltered;
    return chipFiltered.filter((o) => o.label.toLowerCase().includes(query));
  }, [chipFiltered, query]);

  // 3. Cap rendered results to keep huge lists fast and scrollable.
  const shown = useMemo(() => searched.slice(0, maxResults), [searched, maxResults]);

  const grouped = useMemo(() => {
    if (!shown.some((o) => o.group)) return null;
    const map = new Map<string, SearchableOption[]>();
    for (const o of shown) {
      const key = o.group || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return Array.from(map.entries());
  }, [shown]);

  const totalMatches = searched.length;
  const truncated = totalMatches > shown.length;

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      setHighlightedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search, activeChip]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setOpen(false);
      setSearch("");
      setHighlightedIndex(0);
    },
    [onChange]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, shown.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      const option = shown[highlightedIndex];
      if (option) {
        event.preventDefault();
        handleSelect(option.value);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setSearch("");
    }
  };

  const showCreate = onCreate && query.length > 0 && !searched.some((o) => o.label.toLowerCase() === query);

  const renderOption = (option: SearchableOption, index: number, isActive: boolean) => (
    <button
      key={option.value}
      type="button"
      onMouseEnter={() => setHighlightedIndex(index)}
      onClick={() => handleSelect(option.value)}
      className={cn(
        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition",
        isActive ? "bg-emerald-50 text-emerald-800" : "text-slate-700",
        isActive && "font-medium"
      )}
    >
      <span className="truncate">{option.label}</span>
      {option.value === value && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
    </button>
  );

  let flatIndex = -1;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm transition hover:border-slate-300",
          disabled && "cursor-not-allowed opacity-50",
          !selected && "text-slate-400"
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {chips && chips.length > 0 && (
            <div className="flex flex-wrap gap-1 border-b border-slate-100 px-2 py-1.5">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setActiveChip(chip.key)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition",
                    activeChip === chip.key
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            {totalMatches > 0 && (
              <span className="shrink-0 text-xs text-slate-400">{totalMatches}</span>
            )}
          </div>

          <div ref={listRef} className="max-h-64 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            )}

            {!loading && shown.length === 0 && !showCreate && (
              <div className="px-3 py-4 text-center text-sm text-slate-400">{emptyLabel}</div>
            )}

            {!loading && grouped ? (
              grouped.map(([groupName, groupOptions]) => (
                <div key={groupName}>
                  <div className="sticky top-0 border-y border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {groupName}
                    <span className="ml-1 font-normal normal-case text-slate-400">
                      {groupOptions.length}
                    </span>
                  </div>
                  {groupOptions.map((option) => {
                    flatIndex += 1;
                    return renderOption(option, flatIndex, flatIndex === highlightedIndex);
                  })}
                </div>
              ))
            ) : (
              !loading &&
              shown.map((option) => {
                flatIndex += 1;
                return renderOption(option, flatIndex, flatIndex === highlightedIndex);
              })
            )}

            {truncated && (
              <div className="border-t border-slate-100 px-3 py-2 text-center text-xs text-slate-400">
                Showing {shown.length} of {totalMatches} matches — keep typing to narrow results
              </div>
            )}

            {showCreate && (
              <button
                type="button"
                onClick={() => {
                  onCreate?.(search.trim());
                  setSearch("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
              >
                <Plus className="h-4 w-4" />
                Create &quot;{search.trim()}&quot;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
