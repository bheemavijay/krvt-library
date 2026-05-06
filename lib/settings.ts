"use client";

import { useSyncExternalStore } from "react";

import { isBrowser } from "@/lib/utils";

export type ReplacementRule = {
  find: string;
  replace: string;
  caseSensitive: boolean;
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

const defaultSettings: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: "Georgia",
  textColor: "#FFFFFF",
  backgroundColor: "#16151d",
  textAlign: "left",
  contentMaxWidth: 720,
  showNovelName: true,
  showChapterName: true,
  showTopNav: true,
  showBottomNav: true,
  showFooter: true,
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
    replacements: Array.isArray(nextSettings.replacements)
      ? nextSettings.replacements.map(normalizeReplacementRule).filter((rule) => rule.find)
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
      fontFamily:
        typeof parsed.fontFamily === "string" && parsed.fontFamily.trim()
          ? parsed.fontFamily
          : defaultSettings.fontFamily,
      textAlign: isValidTextAlign(parsed.textAlign) ? parsed.textAlign : defaultSettings.textAlign,
      contentMaxWidth:
        typeof parsed.contentMaxWidth === "number" && parsed.contentMaxWidth >= 480
          ? parsed.contentMaxWidth
          : defaultSettings.contentMaxWidth,
      autoNext: parsed.autoNext === true,
      autoPlayTts: parsed.autoPlayTts === true,
      replacements: Array.isArray(parsed.replacements)
        ? parsed.replacements.map(normalizeReplacementRule).filter((rule) => rule.find)
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

function normalizeReplacementRule(rule: Partial<ReplacementRule>): ReplacementRule {
  return {
    find: String(rule.find ?? "").trim(),
    replace: String(rule.replace ?? ""),
    caseSensitive: Boolean(rule.caseSensitive),
  };
}

function isValidTextAlign(value: unknown): value is ReaderSettings["textAlign"] {
  return value === "left" || value === "center" || value === "right";
}
