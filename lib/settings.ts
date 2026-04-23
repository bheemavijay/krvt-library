const STORAGE_KEY = "reader_settings";

// ✅ DEFAULT
const defaultSettings = {
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
let cachedSettings: any = null;
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
export function saveSettings(newSettings: any) {
  cachedSettings = { ...cachedSettings, ...newSettings };

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