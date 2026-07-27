import { getLegacyChapterScrollPosition } from "@/features/reader/repositories/readingStateRepository";

export function loadLegacyChapterScrollPosition(novelId: string, chapterIndex: number) {
  return getLegacyChapterScrollPosition(novelId, chapterIndex);
}
