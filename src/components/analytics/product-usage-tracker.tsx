"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const DEDUPE_WINDOW_MS = 15 * 60 * 1000;

export function ProductUsageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const storageKey = `ff_feature_view:${pathname}`;
    try {
      const lastSeen = Number(sessionStorage.getItem(storageKey) ?? 0);
      if (Date.now() - lastSeen < DEDUPE_WINDOW_MS) return;
      sessionStorage.setItem(storageKey, String(Date.now()));
    } catch {
      // Storage can be unavailable in strict privacy modes; analytics must
      // never block the product experience.
    }

    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session?.access_token) return;
      return fetch("/api/product-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ pathname }),
        keepalive: true,
      }).catch(() => undefined);
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
