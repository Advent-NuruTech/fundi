"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface NetworkStatus {
  online: boolean;
  wasOffline: boolean;
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [online, setOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true
  );
  const lastOnlineRef = useRef<Date | null>(online ? new Date() : null);
  const lastOfflineRef = useRef<Date | null>(online ? null : new Date());
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setOnline(true);
      lastOnlineRef.current = new Date();
      wasOfflineRef.current = true;
    };

    const handleOffline = () => {
      setOnline(false);
      lastOfflineRef.current = new Date();
    };

    window.addEventListener("online", handleOnline, { passive: true });
    window.addEventListener("offline", handleOffline, { passive: true });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    online,
    wasOffline: wasOfflineRef.current,
    lastOnlineAt: lastOnlineRef.current,
    lastOfflineAt: lastOfflineRef.current,
  };
}

export function useOnlineStatus(): boolean {
  return useNetworkStatus().online;
}

export function useOnReconnect(callback: () => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      callbackRef.current();
    };

    window.addEventListener("online", handleOnline, { passive: true });
    return () => window.removeEventListener("online", handleOnline);
  }, []);
}

export function usePeriodicSync(interval: number, callback: () => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const timer = setInterval(() => {
      if (navigator.onLine) {
        callbackRef.current();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);
}
