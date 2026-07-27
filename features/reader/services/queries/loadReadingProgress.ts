// This service is responsible for loading reading progress for a novel.

import { getReadingState } from "@/features/reader/services/readingStateService";
import type { NovelReadingProgress } from "@/shared/types";

export function loadReadingProgress(
  novelId: string,
): NovelReadingProgress | undefined {
  return getReadingState().progressByNovel[novelId];
}
