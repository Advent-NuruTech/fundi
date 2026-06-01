"use client";

import { useEffect, useState, useRef } from "react";
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from "lucide-react";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

type SyncState = "synced" | "syncing" | "offline" | "error" | "pending";

function useTimeout() {
  const ref = useRef<number>(0);
  const w = typeof window !== "undefined" ? window : null;

  const set = (fn: () => void, ms: number) => {
    if (w) ref.current = w.setTimeout(fn, ms);
  };

  const clear = () => {
    if (w) w.clearTimeout(ref.current);
  };

  return { ref, set, clear };
}

export function SyncIndicator() {
  const { isSyncing, pendingCount, lastError, triggerSync } = useSyncEngine();
  const { online } = useNetworkStatus();
  const [visible, setVisible] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("synced");
  const [showLabel, setShowLabel] = useState(false);
  const timer = useTimeout();

  useEffect(() => {
    if (!online) {
      setSyncState("offline");
      setVisible(true);
      return;
    }

    if (isSyncing) {
      setSyncState("syncing");
      setVisible(true);
      return;
    }

    if (lastError) {
      setSyncState("error");
      setVisible(true);
      timer.clear();
      timer.set(() => setVisible(false), 8000);
      return;
    }

    if (pendingCount > 0) {
      setSyncState("pending");
      setVisible(true);
      return;
    }

    setSyncState("synced");
    if (visible) {
      timer.clear();
      timer.set(() => setVisible(false), 2000);
    }
  }, [online, isSyncing, pendingCount, lastError]);

  useEffect(() => {
    return () => timer.clear();
  }, []);

  if (!visible) return null;

  const config = {
    synced: { icon: Check, color: "text-emerald-500", bg: "bg-emerald-50", label: "Synced" },
    syncing: { icon: RefreshCw, color: "text-blue-500", bg: "bg-blue-50", label: "Syncing..." },
    offline: { icon: CloudOff, color: "text-amber-500", bg: "bg-amber-50", label: "Offline" },
    error: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", label: "Sync error" },
    pending: { icon: Cloud, color: "text-slate-400", bg: "bg-slate-100", label: `${pendingCount} pending` },
  };

  const { icon: Icon, color, bg, label } = config[syncState];

  return (
    <div
      className="flex items-center gap-1.5"
      onMouseEnter={() => setShowLabel(true)}
      onMouseLeave={() => setShowLabel(false)}
    >
      <button
        onClick={syncState === "error" || syncState === "pending" ? triggerSync : undefined}
        disabled={syncState === "syncing"}
        className={`flex items-center justify-center rounded-full ${bg} p-1.5 transition active:scale-90 ${
          syncState === "error" || syncState === "pending"
            ? "cursor-pointer hover:opacity-80"
            : "cursor-default"
        }`}
        aria-label={label}
        title={label}
      >
        <Icon
          className={`h-3.5 w-3.5 ${color} ${
            syncState === "syncing" ? "animate-spin" : ""
          }`}
        />
      </button>
      {showLabel && (
        <span className="animate-in fade-in slide-in-from-left-1 text-[11px] font-medium text-slate-400 duration-200">
          {label}
        </span>
      )}
    </div>
  );
}
