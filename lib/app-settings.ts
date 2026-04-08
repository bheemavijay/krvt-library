import type { AppAccentColor, AppSettingsState, AppThemeMode } from "@/types";

import { isBrowser } from "@/lib/utils";

const STORAGE_KEY = "krvt-library-app-settings";
const STORAGE_EVENT = "krvt-library-app-settings-change";

const defaultState: AppSettingsState = {
  accentColor: "gold",
  themeMode: "dark",
};

let cachedState: AppSettingsState = defaultState;
let cachedStorageValue: string | null = null;

export function getAppSettingsState(): AppSettingsState {
  if (!isBrowser()) {
    return defaultState;
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (storedValue === cachedStorageValue) {
    return cachedState;
  }

  cachedStorageValue = storedValue;
  cachedState = normalizeAppSettingsState(storedValue);

  return cachedState;
}

export function getServerAppSettingsState(): AppSettingsState {
  return defaultState;
}

export function subscribeToAppSettings(onStoreChange: () => void) {
  if (!isBrowser()) {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleCustomEvent = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, handleCustomEvent);
  };
}

export function saveAppSettings(settings: {
  accentColor?: AppAccentColor;
  themeMode?: AppThemeMode;
}) {
  if (!isBrowser()) {
    return;
  }

  const currentState = getAppSettingsState();
  const nextState: AppSettingsState = {
    accentColor: settings.accentColor ?? currentState.accentColor,
    themeMode: settings.themeMode ?? currentState.themeMode,
  };

  if (
    nextState.accentColor === currentState.accentColor &&
    nextState.themeMode === currentState.themeMode
  ) {
    return;
  }

  cachedState = nextState;
  cachedStorageValue = JSON.stringify(nextState);
  window.localStorage.setItem(STORAGE_KEY, cachedStorageValue);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function normalizeAppSettingsState(storedValue: string | null): AppSettingsState {
  if (!storedValue) {
    return defaultState;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Partial<AppSettingsState>;

    return {
      accentColor: isValidAccentColor(parsedValue.accentColor)
        ? parsedValue.accentColor
        : defaultState.accentColor,
      themeMode: isValidThemeMode(parsedValue.themeMode)
        ? parsedValue.themeMode
        : defaultState.themeMode,
    };
  } catch {
    return defaultState;
  }
}

function isValidAccentColor(value: unknown): value is AppAccentColor {
  return value === "gold" || value === "purple" || value === "crimson";
}

function isValidThemeMode(value: unknown): value is AppThemeMode {
  return value === "dark" || value === "black";
}
