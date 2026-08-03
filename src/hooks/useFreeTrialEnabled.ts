"use client";

import { useEffect, useState } from "react";

/**
 * Reads the platform-wide free-trial flag for the current visitor.
 *
 * - `enabled` is `false` while loading (safe default — trial wording is never
 *   flashed to users when the flag is off).
 * - The fetch result is cached for the page session so every component on the
 *   page shares one request.
 */

let cachedFlag: Promise<boolean> | null = null;

function loadFlag(): Promise<boolean> {
  if (!cachedFlag) {
    cachedFlag = fetch("/api/platform/free-trial", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { enabled: true }))
      .then((d) => d.enabled === true)
      .catch(() => true);
  }
  return cachedFlag;
}

export function useFreeTrialEnabled(): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadFlag().then((value) => {
      if (active) {
        setEnabled(value);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { enabled, loading };
}
