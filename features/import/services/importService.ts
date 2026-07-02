// TODO: [KRVT-ARCH-V2] This service orchestrates the import process.
// It calls the legacy importer implementation.

import {
  importNovel as legacyImportNovel,
  importFromText as legacyImportFromText,
} from "@/lib/importer";
import type { ImporterOptions } from "@/features/import/types";

/**
 * Initiates the import of a novel from a URL.
 * This is the primary entry point for the import feature.
 *
 * @param novelId The ID of the novel to import.
 * @param options Configuration for the import process.
 */
export function importNovel(novelId: string, options: ImporterOptions = {}) {
  // For now, this service directly calls the legacy importer.
  // In the future, this service will own the core import logic.
  return legacyImportNovel(novelId, options);
}

/**
 * Imports a novel from a text string.
 *
 * @param text The text content of the novel.
 * @param title The title of the novel.
 */
export function importFromText(text: string, title: string) {
  return legacyImportFromText(text, title);
}
