// This repository manages chapter data. It performs pure CRUD operations.

import { openDB, CHAPTERS_STORE } from "@/storage/db/indexeddb";
import type { Chapter } from "@/shared/types";

// This is the raw data model as it exists in IndexedDB.
type StoredChapterRecord = {
  novelId: string;
  chapterIndex: number;
  id: string;
  order: number;
  title: string;
  content: string[];
  url?: string;
};

export async function getChapter(novelId: string, chapterIndex: number): Promise<StoredChapterRecord | null> {
  const db = await openDB();
  const tx = db.transaction(CHAPTERS_STORE, "readonly");
  const store = tx.objectStore(CHAPTERS_STORE);

  return new Promise((resolve) => {
    const request = store.get([novelId, chapterIndex]);
    request.onsuccess = () => {
      resolve((request.result as StoredChapterRecord) || null);
    };
    request.onerror = () => resolve(null);
  });
}

// This function remains as it orchestrates multiple `getChapter` calls.
export async function getNovelChapters(novelId: string, chapterCount: number) {
  const chapters: Chapter[] = [];
  for (let index = 0; index < chapterCount; index += 1) {
    // This now calls the local getChapter, which is incorrect.
    // This will be fixed in a subsequent step when getNovelChapters is migrated.
    // For now, we leave it to keep the build passing.
    const chapter = await getChapter(novelId, index);
    if (chapter) {
      // The transformation logic is now duplicated here temporarily.
      // This avoids breaking other parts of the app that rely on getNovelChapters.
      const { normalizeChapter } = await import("@/lib/novels");
      chapters.push(normalizeChapter(
        chapter.novelId,
        {
          id: chapter.id,
          order: chapter.order || chapter.chapterIndex + 1,
          title: chapter.title,
          content: chapter.content,
        },
        chapter.chapterIndex + 1,
      ));
    }
    if (index % 25 === 0) {
      await yieldToUi();
    }
  }
  return chapters;
}

async function yieldToUi() {
  if (typeof window === "undefined") {
    return;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}
