// This service is responsible for loading reading progress for a novel.

import { getReadingState } from "@/lib/reader-storage"; // Legacy dependency
import type { NovelReadingProgress } from "@/shared/types";

export function loadReadingProgress(
  novelId: string,
): NovelReadingProgress | undefined {
  // This logic is moved directly from getNovelReadingProgress in lib/reader-storage.ts
  return getReadingState().progressByNovel[novelId];
}
