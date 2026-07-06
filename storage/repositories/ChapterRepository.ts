// TODO: [KRVT-ARCH-V2] This repository manages chapter data.

import { openDB, CHAPTERS_STORE } from "@/storage/db/indexeddb";
import type { Chapter } from "@/shared/types";
import { normalizeChapter } from "@/lib/novels";

// TODO: [KRVT-ARCH-V2] Move to a shared types file
type StoredChapterRecord = {
  novelId: string;
  chapterIndex: number;
  id: string;
  order: number;
  title: string;
  content: string[];
  url?: string;
};

export async function getChapter(novelId: string, chapterIndex: number): Promise<Chapter | null> {
  const db = await openDB();
  const tx = db.transaction(CHAPTERS_STORE, "readonly");
  const store = tx.objectStore(CHAPTERS_STORE);

  return new Promise((resolve) => {
    const request = store.get([novelId, chapterIndex]);
    request.onsuccess = () => {
      try {
        const record = request.result as StoredChapterRecord | undefined;
        resolve(record ? storedChapterToChapter(record) : null);
      } catch (error) {
        console.warn("Skipping corrupted chapter", { novelId, chapterIndex, error });
        resolve(null);
      }
    };
    request.onerror = () => resolve(null);
  });
}

export async function getNovelChapters(novelId: string, chapterCount: number) {
  const chapters: Chapter[] = [];
  for (let index = 0; index < chapterCount; index += 1) {
    const chapter = await getChapter(novelId, index);
    if (chapter) {
      chapters.push(chapter);
    }
    if (index % 25 === 0) {
      await yieldToUi();
    }
  }
  return chapters;
}

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

async function yieldToUi() {
  if (typeof window === "undefined") {
    return;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}
