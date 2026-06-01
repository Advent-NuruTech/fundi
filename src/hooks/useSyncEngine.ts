"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  startBackgroundSync,
  getSyncEngine,
  registerBackgroundSync,
} from "@/lib/sync-engine";

const w = typeof window !== "undefined" ? window : null;

export interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
}

export function useSyncEngine(): SyncState & {
  triggerSync: () => Promise<void>;
  pendingCount: number;
} {
  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    lastError: null,
  });
  const engineRef = useRef(startBackgroundSync());

  useEffect(() => {
    const { engine, stop } = engineRef.current;

    registerBackgroundSync().catch(() => {});

    const interval = setInterval(async () => {
      const count = await engine.getPendingCount();
      setState((prev) => ({ ...prev, pendingCount: count }));
    }, 5000);

    return () => {
      stop();
      clearInterval(interval);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    const { engine } = engineRef.current;
    setState((prev) => ({ ...prev, isSyncing: true }));
    try {
      const result = await engine.startSync();
      const count = await engine.getPendingCount();
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        pendingCount: count,
        lastSyncAt: new Date().toISOString(),
        lastError: result.failed > 0 ? `${result.failed} items failed` : null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        lastError: error instanceof Error ? error.message : "Sync failed",
      }));
    }
  }, []);

  return {
    ...state,
    triggerSync,
    pendingCount: state.pendingCount,
  };
}

export function usePendingSyncCount(): number {
  const [count, setCount] = useState(0);
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    if (!w) return;
    const engine = getSyncEngine();
    const update = async () => {
      const c = await engine.getPendingCount();
      setCount(c);
    };
    update();
    intervalRef.current = w.setInterval(update, 10000);
    return () => {
      w.clearInterval(intervalRef.current);
    };
  }, []);

  return count;
}
