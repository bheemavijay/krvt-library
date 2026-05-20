"use client";

import { useSyncExternalStore } from "react";

import { isBrowser } from "@/lib/utils";

export type ReplacementRule = {
  find: string;
  replace: string;
  caseSensitive: boolean;
  isRegex: boolean;
};

export type ReaderSettings = {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  textAlign: "left" | "center" | "right";
  contentMaxWidth: number;
  showNovelName: boolean;
  showChapterName: boolean;
  showTopNav: boolean;
  showBottomNav: boolean;
  showFooter: boolean;
  autoScroll: boolean;
  paragraphHighlight: boolean;
  autoNext: boolean;
  autoPlayTts: boolean;
  replacements: ReplacementRule[];
  tts: {
    voiceURI: string;
    rate: number;
    pitch: number;
  };
};

const STORAGE_KEY = "krvt-reader-settings";
const STORAGE_EVENT = "krvt-reader-settings-change";
export const READER_FONT_OPTIONS = [
  {
    label: "Merriweather",
    value: "Merriweather",
    stack: 'var(--font-merriweather), Georgia, "Times New Roman", serif',
  },
  {
    label: "Lora",
    value: "Lora",
    stack: 'var(--font-lora), Georgia, "Times New Roman", serif',
  },
  {
    label: "Crimson Text",
    value: "Crimson Text",
    stack: 'var(--font-crimson), Georgia, "Times New Roman", serif',
  },
  {
    label: "Source Serif",
    value: "Source Serif",
    stack: 'var(--font-source-serif), "Source Serif Pro", Georgia, "Times New Roman", serif',
  },
  {
    label: "Playfair Display",
    value: "Playfair Display",
    stack: 'var(--font-playfair), Georgia, "Times New Roman", serif',
  },
  {
    label: "Inter",
    value: "Inter",
    stack: 'var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    label: "Nunito",
    value: "Nunito",
    stack: 'var(--font-nunito), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    label: "Georgia",
    value: "Georgia",
    stack: 'Georgia, "Times New Roman", serif',
  },
  {
    label: "Times New Roman",
    value: "Times New Roman",
    stack: '"Times New Roman", Times, serif',
  },
] as const;

const FONT_ALIASES: Record<string, string> = {
  Palatino: "Lora",
  "Palatino Linotype": "Lora",
  Garamond: "Crimson Text",
  "Book Antiqua": "Lora",
  Baskerville: "Playfair Display",
  Cambria: "Source Serif",
  Charter: "Source Serif",
  "Iowan Old Style": "Source Serif",
  "Source Serif Pro": "Source Serif",
  Arial: "Inter",
  Verdana: "Nunito",
};

const defaultSettings: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: "Merriweather",
  textColor: "#FFFFFF",
  backgroundColor: "#16151d",
  textAlign: "left",
  contentMaxWidth: 720,
  showNovelName: true,
  showChapterName: true,
  showTopNav: true,
  showBottomNav: true,
  showFooter: true,
  autoScroll: true,
  paragraphHighlight: true,
  autoNext: false,
  autoPlayTts: false,
  replacements: [],
  tts: {
    voiceURI: "",
    rate: 1,
    pitch: 1,
  },
};

let cachedSettings: ReaderSettings = defaultSettings;
let cachedStorageValue: string | null = null;

export function getDefaultReaderSettings() {
  return defaultSettings;
}

export function getReaderFontStack(fontFamily: string) {
  const normalizedFont = normalizeFontFamily(fontFamily);
  return (
    READER_FONT_OPTIONS.find((font) => font.value === normalizedFont)?.stack ??
    READER_FONT_OPTIONS[0].stack
  );
}

export function ensureReaderFontsLoaded() {
  return;
}

export function getSettings(): ReaderSettings {
  if (!isBrowser()) {
    return defaultSettings;
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  if (storedValue === cachedStorageValue) {
    return cachedSettings;
  }

  cachedStorageValue = storedValue;
  try {
    cachedSettings = normalizeSettings(storedValue);
  } catch (e) {
    console.error("Settings corrupted, resetting:", e);
    window.localStorage.removeItem(STORAGE_KEY);
    cachedSettings = defaultSettings;
  }
  return cachedSettings;
}

export function subscribeToSettings(callback: () => void) {
  if (!isBrowser()) {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === STORAGE_KEY) {
      callback();
    }
  };

  const handleCustomEvent = () => {
    callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, handleCustomEvent);
  };
}

export function saveSettings(nextSettings: Partial<ReaderSettings>) {
  if (!isBrowser()) {
    return;
  }

  const current = getSettings();
  const merged: ReaderSettings = {
    ...current,
    ...nextSettings,
    fontFamily:
      typeof nextSettings.fontFamily === "string"
        ? normalizeFontFamily(nextSettings.fontFamily)
        : current.fontFamily,
    fontSize:
      typeof nextSettings.fontSize === "number"
        ? Math.min(Math.max(nextSettings.fontSize, 10), 40)
        : current.fontSize,
    contentMaxWidth:
      typeof nextSettings.contentMaxWidth === "number"
        ? Math.min(Math.max(nextSettings.contentMaxWidth, 560), 9999)
        : current.contentMaxWidth,
    replacements: Array.isArray(nextSettings.replacements)
      ? nextSettings.replacements.map(normalizeReplacementRule)
      : current.replacements,
    tts: {
      ...current.tts,
      ...(nextSettings.tts ?? {}),
    },
  };

  const serialized = JSON.stringify(merged);
  if (serialized === cachedStorageValue) {
    return;
  }

  cachedSettings = merged;
  cachedStorageValue = serialized;
  window.localStorage.setItem(STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function useReaderSettings() {
  return useSyncExternalStore(subscribeToSettings, getSettings, getDefaultReaderSettings);
}

function normalizeSettings(storedValue: string | null): ReaderSettings {
  if (!storedValue) {
    return defaultSettings;
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<ReaderSettings>;
    return {
      ...defaultSettings,
      ...parsed,
      fontSize:
        typeof parsed.fontSize === "number"
          ? Math.min(Math.max(parsed.fontSize, 10), 40)
          : defaultSettings.fontSize,
      fontFamily:
        typeof parsed.fontFamily === "string" ? normalizeFontFamily(parsed.fontFamily) : defaultSettings.fontFamily,
      textAlign: isValidTextAlign(parsed.textAlign) ? parsed.textAlign : defaultSettings.textAlign,
      contentMaxWidth:
        typeof parsed.contentMaxWidth === "number" && parsed.contentMaxWidth >= 480
          ? Math.min(Math.max(parsed.contentMaxWidth, 560), 9999)
          : defaultSettings.contentMaxWidth,
      autoScroll: parsed.autoScroll !== false,
      paragraphHighlight: parsed.paragraphHighlight !== false,
      autoNext: parsed.autoNext === true,
      autoPlayTts: parsed.autoPlayTts === true,
      replacements: Array.isArray(parsed.replacements)
        ? parsed.replacements.map(normalizeReplacementRule)
        : defaultSettings.replacements,
      tts: {
        voiceURI: parsed.tts?.voiceURI ?? defaultSettings.tts.voiceURI,
        rate: typeof parsed.tts?.rate === "number" ? parsed.tts.rate : defaultSettings.tts.rate,
        pitch:
          typeof parsed.tts?.pitch === "number" ? parsed.tts.pitch : defaultSettings.tts.pitch,
      },
    };
  } catch {
    return defaultSettings;
  }
}

function normalizeFontFamily(value: string) {
  const trimmed = value.trim();
  const aliased = FONT_ALIASES[trimmed] ?? trimmed;
  return READER_FONT_OPTIONS.some((font) => font.value === aliased)
    ? aliased
    : defaultSettings.fontFamily;
}

function normalizeReplacementRule(rule: Partial<ReplacementRule>): ReplacementRule {
  return {
    find: String(rule.find ?? "").trim(),
    replace: String(rule.replace ?? ""),
    caseSensitive: Boolean(rule.caseSensitive),
    isRegex: Boolean(rule.isRegex),
  };
}

function isValidTextAlign(value: unknown): value is ReaderSettings["textAlign"] {
  return value === "left" || value === "center" || value === "right";
}
