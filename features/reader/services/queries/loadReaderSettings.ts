// This service is responsible for loading reader settings.

import { getSettings } from "@/features/reader/services/readerSettingsService";

export function loadReaderSettings() {
  return getSettings();
}
