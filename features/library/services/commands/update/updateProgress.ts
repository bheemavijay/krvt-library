// This service is responsible for updating reading progress.
// TODO: [KRVT-A6] This is a temporary implementation. This logic
// should be fully migrated to the Reader feature's services.

import { saveNovelReadingProgress } from "@/features/reader";

export function updateProgress(novelId: string, chapterIndex: number, fontSize: number) {
  return saveNovelReadingProgress(novelId, chapterIndex, fontSize);
}
