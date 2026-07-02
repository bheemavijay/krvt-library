"use client";

import { useEffect, useSyncExternalStore } from "react";

import { GlobalHeader } from "@/components/layout/global-header";
import { AndroidBackHandler } from "@/components/navigation/android-back-handler";
import { SettingsModal } from "@/components/settings/settings-modal";
import {
  SettingsModalProvider,
  useSettingsModal,
} from "@/components/settings/settings-modal-context";
import {
  getAppSettingsState,
  getServerAppSettingsState,
  subscribeToAppSettings,
} from "@/features/settings";
import { getAppThemeTokens } from "@/shared/theme/tokens";
import { startAutoNovelUpdates } from "@/features/update";

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

      const themeTokens = getAppThemeTokens(
        appSettings?.themeMode ?? "dark",
        appSettings?.accentColor ?? "gold",
      );

      document.documentElement.dataset.appThemeMode =
        appSettings?.themeMode ?? "dark";

      document.documentElement.style.setProperty(
        "--font-heading",
        appSettings?.fontFamily ?? "serif",
      );

      document.documentElement.style.setProperty("--krvt-bg", themeTokens.background);
      document.documentElement.style.setProperty("--krvt-fg", themeTokens.foreground);
      document.documentElement.style.setProperty("--krvt-panel", themeTokens.panel);
      document.documentElement.style.setProperty("--krvt-panel-strong", themeTokens.panelStrong);
      document.documentElement.style.setProperty("--krvt-border", themeTokens.border);
      document.documentElement.style.setProperty("--krvt-accent", themeTokens.accent);
      document.documentElement.style.setProperty("--krvt-accent-soft", themeTokens.accentSoft);
      document.documentElement.style.setProperty("--krvt-shadow", themeTokens.shadow);
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
      <GlobalHeader onOpenSettings={open} />
      <AndroidBackHandler />

      <div className="relative min-h-screen w-full">{children}</div>

      <SettingsModal />
    </div>
  );
}
