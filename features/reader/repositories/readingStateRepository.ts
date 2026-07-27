import { isBrowser } from "@/shared/utils";

const STORAGE_KEY = "krvt-library-reading-state";
const STORAGE_EVENT = "krvt-library-reading-state-change";

export function loadStoredReadingState() {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEY);
}

export function saveStoredReadingState(serializedState: string) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, serializedState);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function deleteStoredReadingState() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function loadLegacyStoredProgress(novelId: string) {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(`progress_${novelId}`);
}

export function subscribeToStoredReadingState(onStoreChange: () => void) {
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
