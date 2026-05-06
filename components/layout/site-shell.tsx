"use client";

import { useEffect, useSyncExternalStore } from "react";

import { GlobalHeader } from "@/components/layout/global-header";
import { SettingsModal } from "@/components/settings/settings-modal";
import {
  SettingsModalProvider,
  useSettingsModal,
} from "@/components/settings/settings-modal-context";
import {
  getAppSettingsState,
  getServerAppSettingsState,
  subscribeToAppSettings,
} from "@/lib/app-settings";
import { startAutoNovelUpdates } from "@/lib/update/autoUpdate";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <SettingsModalProvider>
      <SiteShellInner>{children}</SiteShellInner>
    </SettingsModalProvider>
  );
}

function SiteShellInner({ children }: SiteShellProps) {
  const appSettings = useSyncExternalStore(
    subscribeToAppSettings,
    getAppSettingsState,
    getServerAppSettingsState,
  );

  const { open } = useSettingsModal();

  useEffect(() => {
    try {
      if (typeof document === "undefined") return;

      document.documentElement.dataset.appThemeMode =
        appSettings?.themeMode ?? "dark";

      document.documentElement.style.setProperty(
        "--font-heading",
        appSettings?.fontFamily ?? "serif",
      );

      document.documentElement.style.setProperty(
        "--accent",
        appSettings?.accentColor ?? "gold",
      );

      document.documentElement.style.setProperty(
        "--accent-soft",
        "rgba(224, 188, 82, 0.18)",
      );
    } catch (e) {
      console.error("Theme apply error:", e);
    }
  }, [
    appSettings?.accentColor,
    appSettings?.themeMode,
    appSettings?.fontFamily,
  ]);

  useEffect(() => {
    let timer: number | undefined;

    try {
      if (typeof window !== "undefined") {
        timer = startAutoNovelUpdates();
      }
    } catch (e) {
      console.error("Auto update error:", e);
    }

    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(212,177,106,0.12),transparent_26%)]" />

      <GlobalHeader onOpenSettings={open} />

      <div className="relative min-h-screen w-full">{children}</div>

      <SettingsModal />
    </div>
  );
}
