// This service is responsible for loading reading progress for a novel.

import { getReadingState } from "@/lib/reader-storage";
import type { NovelReadingProgress } from "@/shared/types";

export function loadReadingProgress(
  novelId: string,
): NovelReadingProgress | undefined {
  return getReadingState().progressByNovel[novelId];
}
