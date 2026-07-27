import { getLegacyChapterScrollPosition } from "@/features/reader/services/readingStateService";

export function loadLegacyChapterScrollPosition(novelId: string, chapterIndex: number) {
  return getLegacyChapterScrollPosition(novelId, chapterIndex);
}
