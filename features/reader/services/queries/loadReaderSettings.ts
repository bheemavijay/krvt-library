// This service is responsible for loading and normalizing reader settings from localStorage.

import { isBrowser } from "@/shared/utils";
import type { ReaderSettings, ReplacementRule } from "@/features/reader/types/ReaderSettings";

const STORAGE_KEY = "krvt-reader-settings";

// This is a subset of the constants from the original file.
// Only what is needed for loading is included.
const FONT_ALIASES: Record<string, string> = {
  Palatino: "Lora", "Palatino Linotype": "Lora", Garamond: "Crimson Text",
  "Book Antiqua": "Lora", Baskerville: "Playfair Display", Cambria: "Source Serif",
  Charter: "Source Serif", "Iowan Old Style": "Source Serif", "Source Serif Pro": "Source Serif",
  Arial: "Inter", Verdana: "Nunito",
};

const defaultSettings: ReaderSettings = {
  fontSize: 18, lineHeight: 1.8, fontFamily: "Merriweather",
  textColor: "#FFFFFF", backgroundColor: "#16151d", textAlign: "left",
  contentMaxWidth: 720, showNovelName: true, showChapterName: true,
  showTopNav: true, showBottomNav: true, showFooter: true,
  autoScroll: true, paragraphHighlight: true, autoNext: false,
  autoPlayTts: false, replacements: [],
  tts: { voiceURI: "", rate: 1, pitch: 1 },
};

let cachedSettings: ReaderSettings = defaultSettings;
let cachedStorageValue: string | null = null;

function normalizeFontFamily(value: string): string {
  const trimmed = value.trim();
  const aliased = FONT_ALIASES[trimmed] ?? trimmed;
  // This check is simplified as the full font options are not needed for loading.
  return aliased;
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

function normalizeSettings(storedValue: string | null): ReaderSettings {
  if (!storedValue) return defaultSettings;
  try {
    const parsed = JSON.parse(storedValue) as Partial<ReaderSettings>;
    return {
      ...defaultSettings,
      ...parsed,
      fontSize: typeof parsed.fontSize === "number" ? Math.min(Math.max(parsed.fontSize, 10), 40) : defaultSettings.fontSize,
      fontFamily: typeof parsed.fontFamily === "string" ? normalizeFontFamily(parsed.fontFamily) : defaultSettings.fontFamily,
      textAlign: isValidTextAlign(parsed.textAlign) ? parsed.textAlign : defaultSettings.textAlign,
      contentMaxWidth: typeof parsed.contentMaxWidth === "number" && parsed.contentMaxWidth >= 480 ? Math.min(Math.max(parsed.contentMaxWidth, 560), 9999) : defaultSettings.contentMaxWidth,
      autoScroll: parsed.autoScroll !== false,
      paragraphHighlight: parsed.paragraphHighlight !== false,
      autoNext: parsed.autoNext === true,
      autoPlayTts: parsed.autoPlayTts === true,
      replacements: Array.isArray(parsed.replacements) ? parsed.replacements.map(normalizeReplacementRule) : defaultSettings.replacements,
      tts: {
        voiceURI: parsed.tts?.voiceURI ?? defaultSettings.tts.voiceURI,
        rate: typeof parsed.tts?.rate === "number" ? parsed.tts.rate : defaultSettings.tts.rate,
        pitch: typeof parsed.tts?.pitch === "number" ? parsed.tts.pitch : defaultSettings.tts.pitch,
      },
    };
  } catch {
    return defaultSettings;
  }
}

export function loadReaderSettings(): ReaderSettings {
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
