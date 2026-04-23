"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";

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
    document.documentElement.dataset.appThemeMode = appSettings.themeMode;

    if (appSettings.accentColor === "purple") {
      document.documentElement.style.setProperty("--accent", "#6C3BAA");
      document.documentElement.style.setProperty("--accent-soft", "rgba(108, 59, 170, 0.18)");
      return;
    }

    if (appSettings.accentColor === "crimson") {
      document.documentElement.style.setProperty("--accent", "#DC143C");
      document.documentElement.style.setProperty("--accent-soft", "rgba(220, 20, 60, 0.18)");
      return;
    }

    document.documentElement.style.setProperty("--accent", "#E0BC52");
    document.documentElement.style.setProperty("--accent-soft", "rgba(224, 188, 82, 0.18)");
  }, [appSettings.accentColor, appSettings.themeMode]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(212,177,106,0.12),transparent_26%)]" />
      <div className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-foreground transition hover:text-accent"
          >
            <Image
              src="/logo.png"
              alt="KRVT Library logo"
              width={176}
              height={48}
              className="h-10 w-auto object-contain sm:h-12"
              style={{ width: "auto" }}
              priority
            />
            <span className="font-semibold tracking-wide text-royal-gold">KRVT Library</span>
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/import"
              className="hidden sm:inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground transition hover:border-white/20 hover:bg-white/10"
            >
              Import Novel
            </Link>
            <button
              type="button"
              onClick={open}
              className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-foreground transition hover:border-white/20 hover:bg-white/10"
              aria-label="Open settings"
            >
              ⚙
            </button>
          </div>
        </div>
      </div>
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6">
        {children}
      </div>
      <SettingsModal />
    </div>
  );
}
