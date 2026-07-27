// This service is responsible for updating reader settings.

import { saveSettings } from "@/features/reader/services/readerSettingsService";
import type { ReaderSettings } from "@/features/reader/types/ReaderSettings";

export function updateReaderSettings(nextSettings: Partial<ReaderSettings>) {
  saveSettings(nextSettings);
}
