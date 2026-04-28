"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";

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
    getServerAppSettingsState
  );

  const { open } = useSettingsModal();

  const [searchQuery, setSearchQuery] = useState("");

  // THEME APPLY
  useEffect(() => {
    document.documentElement.dataset.appThemeMode =
      appSettings.themeMode;

    document.documentElement.style.setProperty(
      "--font-heading",
      appSettings.fontFamily
    );

    document.documentElement.style.setProperty(
      "--accent",
      appSettings.accentColor
    );

    document.documentElement.style.setProperty(
      "--accent-soft",
      "rgba(224, 188, 82, 0.18)"
    );
  }, [
    appSettings.accentColor,
    appSettings.themeMode,
    appSettings.fontFamily,
  ]);

  // SERVICE WORKER
  /* useEffect(() => {
    if ("serviceWorker" in navigator) {
      //navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []); */

  useEffect(() => {
    const timer = startAutoNovelUpdates();
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(212,177,106,0.12),transparent_26%)]" />

      {/* HEADER */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">

          {/* LOGO */}
          <Link href="/" className="inline-flex items-center gap-3 text-white">
            <img
              src="/logo.png"
              alt="KRVT Library logo"
              className="h-10 w-auto object-contain sm:h-12"
            />
            <span className="font-semibold tracking-wide">
              KRVT Library
            </span>
          </Link>

          {/* NAV */}
          <nav className="ml-6 flex items-center gap-4 text-white/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <Link href="/?view=novels" className="hover:text-white">Novels</Link>
            <Link href="/?view=rankings" className="hover:text-white">Rankings</Link>
            <Link href="/?view=updates" className="hover:text-white">Updates</Link>
            <Link href="/?view=library" className="hover:text-white">Library</Link>
          </nav>

          {/* RIGHT SIDE */}
          <div className="ml-auto flex items-center gap-3">

            {/* SEARCH (LOCAL ONLY) */}
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="block w-64 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none"
            />

            {/* IMPORT */}
            <Link
              href="/import"
              className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              Import
            </Link>

            {/* SETTINGS */}
            <button
              onClick={open}
              className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              Settings
            </button>

          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6">
        {children}
      </div>

      <SettingsModal />
    </div>
  );
}