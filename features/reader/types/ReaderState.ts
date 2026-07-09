// This file can contain feature-specific types for the Reader in the future.
// For now, it is empty because all relevant types are shared domain models.

import type {
  NovelReadingProgress,
  LibraryReadingState,
} from "@/shared/types";

// Re-exporting for any internal feature dependencies that might need them.
export type { NovelReadingProgress, LibraryReadingState };
