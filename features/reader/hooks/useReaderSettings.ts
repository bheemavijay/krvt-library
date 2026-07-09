// This hook manages the state for reader settings.

import { useEffect, useState, useCallback } from "react";
import { loadReaderSettings } from "../services/queries/loadReaderSettings";
import { updateReaderSettings } from "../services/commands/updateReaderSettings";
import type { ReaderSettings } from "@/features/reader/types/ReaderSettings";

// This is a simplified subscription system for now.
// A more robust event bus could be used in the future.
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach(listener => listener());
}

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(loadReaderSettings());

  useEffect(() => {
    const callback = () => {
      setSettings(loadReaderSettings());
    };
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }, []);

  const updateSettings = useCallback((newSettings: Partial<ReaderSettings>) => {
    updateReaderSettings(newSettings);
    // Notify all instances of the hook to re-fetch the settings
    notify();
  }, []);

  return {
    settings,
    updateSettings,
  };
}
