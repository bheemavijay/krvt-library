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
} from "@/features/reader/repositories/readerSettingsRepository";

export type {
  ReaderSettings,
  ReplacementRule,
} from "@/features/reader/types/ReaderSettings";

import {
  getDefaultReaderSettings,
  getSettings,
  subscribeToSettings,
} from "@/features/reader/repositories/readerSettingsRepository";

export function useReaderSettings() {
  return useSyncExternalStore(subscribeToSettings, getSettings, getDefaultReaderSettings);
}
