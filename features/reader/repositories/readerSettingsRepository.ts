import { isBrowser } from "@/shared/utils";

const STORAGE_KEY = "krvt-reader-settings";
const STORAGE_EVENT = "krvt-reader-settings-change";

export function loadStoredReaderSettings() {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEY);
}

export function saveStoredReaderSettings(serializedSettings: string) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, serializedSettings);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function deleteStoredReaderSettings() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function subscribeToStoredReaderSettings(callback: () => void) {
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
