// This service is responsible for loading and normalizing a single chapter.

import { getChapter as getChapterFromRepo } from "@/storage/repositories/ChapterRepository";
import type { Chapter } from "@/shared/types";
import { normalizeChapter } from "@/lib/novels";

// This type is duplicated from the repository layer for now.
// It will be consolidated in a future sprint.
type StoredChapterRecord = {
  novelId: string;
  chapterIndex: number;
  id: string;
  order: number;
  title: string;
  content: string[];
  url?: string;
};

function storedChapterToChapter(record: StoredChapterRecord): Chapter {
  return normalizeChapter(
    record.novelId,
    {
      id: record.id,
      order: record.order || record.chapterIndex + 1,
      title: record.title,
      content: record.content,
    },
    record.chapterIndex + 1,
  );
}

export async function loadChapter(novelId: string, chapterIndex: number): Promise<Chapter | null> {
  const record = await getChapterFromRepo(novelId, chapterIndex);
  if (!record) {
    return null;
  }
  // The transformation logic now lives in the service layer.
  return storedChapterToChapter(record as StoredChapterRecord);
}
