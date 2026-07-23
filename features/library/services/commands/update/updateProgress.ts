// This service is responsible for updating reading progress.

import { saveNovelReadingProgress } from "@/features/reader";

export function updateProgress(novelId: string, chapterIndex: number, fontSize: number) {
  return saveNovelReadingProgress(novelId, chapterIndex, fontSize);
}
