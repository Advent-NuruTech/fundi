"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  platform: "mobile" | "desktop" | "unknown";
  hydrated: boolean;
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
  dismiss: () => void;
}

const PWAInstallContext = createContext<PWAInstallState | null>(null);
const INSTALLED_KEY = "fundiflow_pwa_installed";

function hasRecordedInstallation(): boolean {
  try {
    return window.localStorage.getItem(INSTALLED_KEY) === "true";
  } catch {
    return false;
  }
}

function recordInstallation(): void {
  try {
    window.localStorage.setItem(INSTALLED_KEY, "true");
  } catch {
    // Installation still works when browser storage is unavailable.
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function getInstallPlatform(): "mobile" | "desktop" | "unknown" {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  return isMobile ? "mobile" : "desktop";
}

export function PWAInstallProvider({ children }: { children: React.ReactNode }) {
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [platform, setPlatform] = useState<"mobile" | "desktop" | "unknown">("unknown");

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateInstallState = () => {
      const runningStandalone = isStandalone();
      setStandalone(runningStandalone);
      setInstalled(runningStandalone || hasRecordedInstallation());
    };
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      promptEventRef.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const handleAppInstalled = () => {
      recordInstallation();
      promptEventRef.current = null;
      setCanInstall(false);
      setInstalled(true);
      setStandalone(true);
    };

    updateInstallState();
    setPlatform(getInstallPlatform());
    setHydrated(true);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    displayMode.addEventListener("change", updateInstallState);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      displayMode.removeEventListener("change", updateInstallState);
    };
  }, []);

  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const prompt = promptEventRef.current;
    if (!prompt) return "unavailable";

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      promptEventRef.current = null;
      setCanInstall(false);
      if (outcome === "accepted") {
        // appinstalled normally follows this event. Update immediately as well
        // so every install control disappears without waiting for that event.
        recordInstallation();
        setInstalled(true);
        setStandalone(true);
      }
      return outcome;
    } catch {
      return "unavailable";
    }
  }, []);

  const dismiss = useCallback(() => {
    promptEventRef.current = null;
    setCanInstall(false);
  }, []);

  const value = useMemo(
    () => ({
      canInstall: canInstall && !installed,
      isInstalled: installed,
      isStandalone: standalone,
      platform,
      hydrated,
      install,
      dismiss,
    }),
    [canInstall, dismiss, hydrated, install, installed, platform, standalone]
  );

  return <PWAInstallContext.Provider value={value}>{children}</PWAInstallContext.Provider>;
}

export function usePWAInstallContext(): PWAInstallState {
  const context = useContext(PWAInstallContext);
  if (!context) {
    throw new Error("usePWAInstall must be used within PWAInstallProvider");
  }
  return context;
}
