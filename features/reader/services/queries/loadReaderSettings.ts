// This service is responsible for loading reader settings.

import { getSettings } from "@/features/reader/repositories/readerSettingsRepository";

export function loadReaderSettings() {
  return getSettings();
}
