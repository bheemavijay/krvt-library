/*
 * LEGACY FILE
 * Migrated to:
 * features/import/services/importService.ts
 *
 * Temporary compatibility wrapper.
 * Remove after Sprint Z cleanup.
 */

export {
  importNovel,
  importFromText,
} from "@/features/import"; // Pointing to the public API of the feature

export type {
  ImportProgress,
  ImporterOptions,
} from "@/features/import/types";