"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/features/auth/components/auth-context";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const COOLDOWN_KEY = "fundiflow_install_cooldown";
const COOLDOWN_DURATION = 60 * 60 * 1000;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return isStandalone() || document.querySelector("meta[name='mobile-web-app-capable']")?.getAttribute("content") === "yes";
}

function isInCooldown(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cooldownUntil = localStorage.getItem(COOLDOWN_KEY);
    if (!cooldownUntil) return false;
    return Date.now() < parseInt(cooldownUntil, 10);
  } catch {
    return false;
  }
}

function setCooldown(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now() + COOLDOWN_DURATION));
  } catch {
  }
}

function getInstallPlatform(): "mobile" | "desktop" | "unknown" {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return isMobile ? "mobile" : "desktop";
}

export interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  platform: "mobile" | "desktop" | "unknown";
  hydrated: boolean;
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
  dismiss: () => void;
}

export function usePWAInstall(): PWAInstallState {
  const { user } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);

  const [state] = useState(() => ({
    isInstalled: isInstalled(),
    isStandalone: isStandalone(),
    platform: getInstallPlatform(),
  }));

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (state.isInstalled || state.isStandalone) return;
    if (!user) return;
    if (isInCooldown()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      promptEventRef.current = e as BeforeInstallPromptEvent;
      setInstallPrompt(promptEventRef.current);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [user, state.isInstalled, state.isStandalone]);

  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const prompt = promptEventRef.current;
    if (!prompt) return "unavailable";

    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      promptEventRef.current = null;
      setInstallPrompt(null);
      setCanInstall(false);
      if (result.outcome === "dismissed") {
        setCooldown();
      }
      return result.outcome;
    } catch {
      setCooldown();
      return "unavailable";
    }
  }, []);

  const dismiss = useCallback(() => {
    setCanInstall(false);
    setInstallPrompt(null);
    promptEventRef.current = null;
    setCooldown();
  }, []);

  const show =
    hydrated &&
    !state.isInstalled &&
    !state.isStandalone &&
    !!user &&
    canInstall &&
    !isInCooldown();

  return {
    canInstall: show,
    isInstalled: state.isInstalled,
    isStandalone: state.isStandalone,
    installPrompt,
    platform: state.platform,
    hydrated,
    install,
    dismiss,
  };
}
