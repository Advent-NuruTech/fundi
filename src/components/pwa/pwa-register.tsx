"use client";

import { useEffect } from "react";
import { startBackgroundSync, registerBackgroundSync } from "@/lib/sync-engine";

export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        if (registration.installing) {
          registration.installing.addEventListener("statechange", () => {
            if (registration.active) {
              registerBackgroundSync().catch(() => {});
            }
          });
        }
        if (registration.active) {
          registerBackgroundSync().catch(() => {});
        }
      } catch {
      }
    };

    registerSW();

    const { stop } = startBackgroundSync();

    return () => {
      stop();
    };
  }, []);

  return null;
}
