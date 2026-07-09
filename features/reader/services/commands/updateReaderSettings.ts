// This service is responsible for updating and persisting reader settings.

import { isBrowser } from "@/shared/utils";
import { loadReaderSettings } from "../queries/loadReaderSettings";
import type { ReaderSettings, ReplacementRule } from "@/features/reader/types/ReaderSettings";

const STORAGE_KEY = "krvt-reader-settings";
const STORAGE_EVENT = "krvt-reader-settings-change";

// Copied from legacy lib/settings.ts
const FONT_ALIASES: Record<string, string> = {
  Palatino: "Lora", "Palatino Linotype": "Lora", Garamond: "Crimson Text",
  "Book Antiqua": "Lora", Baskerville: "Playfair Display", Cambria: "Source Serif",
  Charter: "Source Serif", "Iowan Old Style": "Source Serif", "Source Serif Pro": "Source Serif",
  Arial: "Inter", Verdana: "Nunito",
};

// These are also duplicated for now to make the service self-contained.
let cachedSettings: ReaderSettings | null = null;
let cachedStorageValue: string | null = null;

function normalizeFontFamily(value: string): string {
  const trimmed = value.trim();
  return FONT_ALIASES[trimmed] ?? trimmed;
}

function normalizeReplacementRule(rule: Partial<ReplacementRule>): ReplacementRule {
  return {
    find: String(rule.find ?? "").trim(),
    replace: String(rule.replace ?? ""),
    caseSensitive: Boolean(rule.caseSensitive),
    isRegex: Boolean(rule.isRegex),
  };
}

export function updateReaderSettings(nextSettings: Partial<ReaderSettings>) {
  if (!isBrowser()) {
    return;
  }

  const current = loadReaderSettings();
  const merged: ReaderSettings = {
    ...current,
    ...nextSettings,
    fontFamily: typeof nextSettings.fontFamily === "string" ? normalizeFontFamily(nextSettings.fontFamily) : current.fontFamily,
    fontSize: typeof nextSettings.fontSize === "number" ? Math.min(Math.max(nextSettings.fontSize, 10), 40) : current.fontSize,
    contentMaxWidth: typeof nextSettings.contentMaxWidth === "number" ? Math.min(Math.max(nextSettings.contentMaxWidth, 560), 9999) : current.contentMaxWidth,
    replacements: Array.isArray(nextSettings.replacements) ? nextSettings.replacements.map(normalizeReplacementRule) : current.replacements,
    tts: {
      ...current.tts,
      ...(nextSettings.tts ?? {}),
    },
  };

  const serialized = JSON.stringify(merged);
  // The original file used a module-level cache. We replicate that here.
  // A better solution might involve a dedicated caching service in the future.
  if (serialized === cachedStorageValue) {
    return;
  }

  cachedSettings = merged;
  cachedStorageValue = serialized;
  window.localStorage.setItem(STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}
