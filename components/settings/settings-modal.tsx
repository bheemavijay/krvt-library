"use client";

import { useEffect, useSyncExternalStore, useState } from "react";

import type { AppAccentColor, AppThemeMode, ReaderFontFamily, ReaderLineHeight, ReaderTheme } from "@/types";

import { Button } from "@/components/ui/button";
import {
  getAppSettingsState,
  getServerAppSettingsState,
  saveAppSettings,
  subscribeToAppSettings,
} from "@/lib/app-settings";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_READER_THEME,
  getReadingState,
  getServerReadingState,
  saveReaderSettings,
  subscribeToReadingState,
} from "@/lib/reader-storage";
import { cn } from "@/lib/utils";
import { useSettingsModal } from "@/components/settings/settings-modal-context";

const fontFamilies: ReaderFontFamily[] = ["Times New Roman", "Georgia", "Iowan Old Style"];
const lineHeightOptions: ReaderLineHeight[] = [1.6, 1.8, 1.9, 2];
const readerThemes: ReaderTheme[] = ["dark", "sepia"];
const accentOptions: Array<{ value: AppAccentColor; label: string; previewClass: string }> = [
  { value: "gold", label: "Gold", previewClass: "bg-royal-gold" },
  { value: "purple", label: "Purple", previewClass: "bg-royal-purple" },
  { value: "crimson", label: "Crimson", previewClass: "bg-royal-crimson" },
];
const appThemeModes: Array<{ value: AppThemeMode; label: string }> = [
  { value: "dark", label: "Dark" },
  { value: "black", label: "Black" },
];

export function SettingsModal() {
  const { isOpen, close } = useSettingsModal();
  const readingState = useSyncExternalStore(
    subscribeToReadingState,
    getReadingState,
    getServerReadingState,
  );
const safeReadingState = readingState ?? {
  fontFamily: DEFAULT_FONT_FAMILY,
  fontSize: DEFAULT_FONT_SIZE,
  lineHeight: DEFAULT_LINE_HEIGHT,
  theme: DEFAULT_READER_THEME,
  tts: {
    voiceURI: "",
    rate: 1,
    pitch: 1,
  },
};
  const appSettings = useSyncExternalStore(
    subscribeToAppSettings,
    getAppSettingsState,
    getServerAppSettingsState,
  );
  const [activeTab, setActiveTab] = useState<"reading" | "app">("reading");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

useEffect(() => {
  try {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;

    const loadVoices = () => {
      try {
        const voices = synth.getVoices();
        if (voices && voices.length > 0) {
          setVoices(voices);
        }
      } catch (e) {
        console.error("Voice load error:", e);
      }
    };

    loadVoices();
    synth.onvoiceschanged = loadVoices;

    return () => {
      synth.onvoiceschanged = null; // ✅ cleanup
    };
  } catch (e) {
    console.error("SpeechSynthesis init error:", e);
  }
}, []);

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

const fontSize = safeReadingState.fontSize ?? DEFAULT_FONT_SIZE;
const lineHeight = safeReadingState.lineHeight ?? DEFAULT_LINE_HEIGHT;
const theme = safeReadingState.theme ?? DEFAULT_READER_THEME;

const tts = safeReadingState.tts ?? {
  voiceURI: "",
  rate: 1,
  pitch: 1,
};
const fontFamily = safeReadingState.fontFamily ?? DEFAULT_FONT_FAMILY;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close settings"
        onClick={close}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative z-[81] w-full max-w-md rounded-[1.25rem] border border-white/10 bg-[#121212] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.5)] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.28em] text-royal-gold">Settings</p>
            <h2 className="font-heading text-2xl text-foreground">Library Settings</h2>
          </div>
          <Button type="button" onClick={close} className="rounded-full px-4 shrink-0">
            Close
          </Button>
        </div>

        <div className="mt-5 flex gap-1 rounded-full border border-white/10 bg-white/5 p-1 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("reading")}
            className={cn(
              "flex-1 rounded-full px-3 sm:px-4 py-2 text-sm transition whitespace-nowrap",
              activeTab === "reading" ? "bg-white/10 text-foreground" : "text-white/65",
            )}
          >
            Reading
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("app")}
            className={cn(
              "flex-1 rounded-full px-3 sm:px-4 py-2 text-sm transition whitespace-nowrap",
              activeTab === "app" ? "bg-white/10 text-foreground" : "text-white/65",
            )}
          >
            App
          </button>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto pr-2 pb-2">
          {activeTab === "reading" && (
            <div className="space-y-6">
              <SettingsSection label="Font family">
                <div className="grid grid-cols-1 gap-2">
                  {fontFamilies.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => saveReaderSettings({ fontFamily: option })}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-left text-sm transition min-h-[44px]",
                        option === fontFamily
                          ? "border-royal-gold bg-white/10 text-foreground"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </SettingsSection>

              <SettingsSection label="Font size">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => saveReaderSettings({ fontSize: Math.max(fontSize - 2, 14) })}
                    className="size-11 rounded-full px-0 shrink-0"
                  >
                    -
                  </Button>
                  <div className="flex-1 text-center text-base text-white/75">{fontSize}px</div>
                  <Button
                    type="button"
                    onClick={() => saveReaderSettings({ fontSize: Math.min(fontSize + 2, 26) })}
                    className="size-11 rounded-full px-0 shrink-0"
                  >
                    +
                  </Button>
                </div>
              </SettingsSection>

              <SettingsSection label="Line height">
                <div className="grid grid-cols-4 gap-2">
                  {lineHeightOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => saveReaderSettings({ lineHeight: option })}
                      className={cn(
                        "rounded-xl border px-2 sm:px-3 py-3 sm:py-2 text-sm transition min-h-[44px]",
                        option === lineHeight
                          ? "border-royal-gold bg-white/10 text-foreground"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20",
                      )}
                    >
                      {option.toFixed(1)}
                    </button>
                  ))}
                </div>
              </SettingsSection>

              <SettingsSection label="Theme preset">
                <div className="grid grid-cols-2 gap-2">
                  {readerThemes.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => saveReaderSettings({ theme: option })}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-sm capitalize transition min-h-[44px]",
                        option === theme
                          ? "border-royal-gold bg-white/10 text-foreground"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </SettingsSection>

              <SettingsSection label="TTS Voice">
                <select
                  className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm"
                  onChange={(e) =>
                    saveReaderSettings({
                      tts: { ...(safeReadingState.tts || { voiceURI: "", rate: 1, pitch: 1 }), voiceURI: e.target.value },
                    })
                  }
                  value={tts.voiceURI}
                >
                  <option value="">Default Voice</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </SettingsSection>

            </div>
          )}

          {activeTab === "app" && (
            <div className="space-y-6">
              <SettingsSection label="Accent color">
                <div className="grid grid-cols-1 gap-2">
                  {accentOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => saveAppSettings({ accentColor: option.value })}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition min-h-[44px]",
                        option.value === appSettings.accentColor
                          ? "border-royal-gold bg-white/10 text-foreground"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20",
                      )}
                    >
                      <span className={cn("size-3 rounded-full shrink-0", option.previewClass)} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </SettingsSection>

              <SettingsSection label="Theme mode">
                <div className="grid grid-cols-2 gap-2">
                  {appThemeModes.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => saveAppSettings({ themeMode: option.value })}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-sm transition min-h-[44px]",
                        option.value === appSettings.themeMode
                          ? "border-royal-gold bg-white/10 text-foreground"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </SettingsSection>
            </div>
          )}
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
      <p className="text-xs uppercase tracking-[0.28em] text-royal-gold">{label}</p>
      {children}
    </section>
  );
}
