"use client";

import { useEffect, useSyncExternalStore } from "react";

import type { AppAccentColor, AppThemeMode } from "@/types";

import { Button } from "@/components/ui/button";
import {
  getAppSettingsState,
  getServerAppSettingsState,
  saveAppSettings,
  subscribeToAppSettings,
} from "@/lib/app-settings";
import { cn } from "@/lib/utils";
import { useSettingsModal } from "@/components/settings/settings-modal-context";

const accentOptions: Array<{ value: AppAccentColor; label: string; previewClass: string }> = [
  { value: "gold", label: "Gold", previewClass: "bg-royal-gold" },
  { value: "purple", label: "Purple", previewClass: "bg-royal-purple" },
  { value: "crimson", label: "Crimson", previewClass: "bg-royal-crimson" },
];

const appThemeModes: Array<{ value: AppThemeMode; label: string; description: string }> = [
  { value: "dark", label: "Dark", description: "Balanced dark library surface" },
  { value: "black", label: "Black", description: "Pure black Android-friendly mode" },
  { value: "gold-black", label: "Gold + Black", description: "Warm premium contrast" },
  { value: "silver-graphite", label: "Silver + Graphite", description: "Cool luxury graphite" },
];

export function SettingsModal() {
  const { isOpen, close } = useSettingsModal();
  const appSettings = useSyncExternalStore(
    subscribeToAppSettings,
    getAppSettingsState,
    getServerAppSettingsState,
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close settings"
        onClick={close}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative z-[81] flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-[var(--krvt-border)] bg-[var(--krvt-panel-strong)] p-5 shadow-[var(--krvt-shadow)] sm:p-6">
        <div className="flex shrink-0 items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--krvt-accent)]">App Settings</p>
            <h2 className="font-heading text-2xl text-foreground">KRVT Library</h2>
          </div>
          <Button type="button" onClick={close} className="shrink-0 rounded-full px-4">
            Close
          </Button>
        </div>

        <div className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
          <SettingsSection label="Theme mode">
            <div className="grid grid-cols-1 gap-2">
              {appThemeModes.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => saveAppSettings({ themeMode: option.value })}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left text-sm transition",
                    option.value === appSettings.themeMode
                      ? "border-[var(--krvt-accent)] bg-[var(--krvt-accent-soft)] text-foreground"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/20",
                  )}
                >
                  <span className="block font-medium">{option.label}</span>
                  <span className="mt-1 block text-xs text-white/45">{option.description}</span>
                </button>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection label="Accent color">
            <div className="grid grid-cols-1 gap-2">
              {accentOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => saveAppSettings({ accentColor: option.value })}
                  disabled={appSettings.themeMode === "gold-black" || appSettings.themeMode === "silver-graphite"}
                  className={cn(
                    "flex min-h-[44px] items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition",
                    option.value === appSettings.accentColor
                      ? "border-[var(--krvt-accent)] bg-[var(--krvt-accent-soft)] text-foreground"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/20",
                    (appSettings.themeMode === "gold-black" || appSettings.themeMode === "silver-graphite") &&
                      "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className={cn("size-3 shrink-0 rounded-full", option.previewClass)} />
                  {option.label}
                </button>
              ))}
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <p className="text-xs uppercase tracking-[0.28em] text-[var(--krvt-accent)]">{label}</p>
      {children}
    </section>
  );
}
