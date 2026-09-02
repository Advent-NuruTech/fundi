"use client";

import { usePWAInstallContext } from "@/components/pwa/pwa-install-provider";

export function usePWAInstall() {
  return usePWAInstallContext();
}
