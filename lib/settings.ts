export type ReaderSettings = {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;

  // ✅ ADD THESE ↓↓↓
  textAlign?: string;
  contentMaxWidth?: number;
  showNovelName?: boolean;
  showChapterName?: boolean;
  showTopNav?: boolean;
  showBottomNav?: boolean;
  showFooter?: boolean;

  tts: {
    voiceURI: string;
    rate: number;
    pitch: number;
  };
};

const STORAGE_KEY = "reader_settings";

// ✅ DEFAULT
const defaultSettings: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: "Georgia",
  textColor: "#FFFFFF",
  backgroundColor: "#16151d",
  tts: {
    voiceURI: "",
    rate: 1,
    pitch: 1,
  },
};

// ✅ CACHE (IMPORTANT)
let cachedSettings: ReaderSettings | null = null;
const listeners = new Set<() => void>();

// ✅ LOAD (ONLY ONCE)
function loadSettings() {
  if (cachedSettings) return cachedSettings;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cachedSettings = raw
      ? { ...defaultSettings, ...JSON.parse(raw) }
      : defaultSettings;
  } catch {
    cachedSettings = defaultSettings;
  }

  return cachedSettings;
}

// ✅ GET SNAPSHOT (NO NEW OBJECT!)
export function getSettings() {
  return loadSettings();
}

// ✅ SUBSCRIBE
export function subscribeToSettings(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// ✅ SAVE
export function saveSettings(newSettings: Partial<ReaderSettings>) {
  cachedSettings = {
    ...(cachedSettings ?? defaultSettings),
    ...newSettings,
  } as ReaderSettings;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSettings));

  listeners.forEach((cb) => cb());
}

// ✅ HOOK
import { useSyncExternalStore } from "react";

export function useReaderSettings() {
  return useSyncExternalStore(
    subscribeToSettings,
    getSettings,
    () => defaultSettings
  );
}