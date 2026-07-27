"use client";

import { useSyncExternalStore } from "react";

export {
  ensureReaderFontsLoaded,
  getDefaultReaderSettings,
  getReaderFontStack,
  getSettings,
  READER_FONT_OPTIONS,
  saveSettings,
  subscribeToSettings,
} from "@/features/reader/services/readerSettingsService";

export type {
  ReaderSettings,
  ReplacementRule,
} from "@/features/reader/types/ReaderSettings";

import {
  getDefaultReaderSettings,
  getSettings,
  subscribeToSettings,
} from "@/features/reader/services/readerSettingsService";

export function useReaderSettings() {
  return useSyncExternalStore(subscribeToSettings, getSettings, getDefaultReaderSettings);
}
