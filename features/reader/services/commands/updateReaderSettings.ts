// This service is responsible for updating reader settings.

import { saveSettings } from "@/features/reader/repositories/readerSettingsRepository";
import type { ReaderSettings } from "@/features/reader/types/ReaderSettings";

export function updateReaderSettings(nextSettings: Partial<ReaderSettings>) {
  saveSettings(nextSettings);
}
