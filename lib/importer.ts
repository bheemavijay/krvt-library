"use client";

import { normalizeNovelRecord, slugifyNovelId } from "@/lib/novels";
import { saveOrUpdateNovel } from "@/lib/storage/indexeddb";

export async function importFromText(text: string, title: string) {
  if (!text || !title) {
    throw new Error("Missing title or content");
  }

  const chapters = parseChapters(text);

  const novel = normalizeNovelRecord({
    title,
    author: "Unknown",
    sourceUrl: `local://uploaded/${slugifyNovelId(title)}`,
    chapters,
  });

  await saveOrUpdateNovel(novel);

  return novel;
}

function parseChapters(text: string) {
  const lines = text.split("\n");
  const chapters: Array<{
    id: string;
    order: number;
    title: string;
    content: string[];
  }> = [];

  let current = {
    id: "",
    order: 1,
    title: "Chapter 1",
    content: [] as string[],
  };

  let chapterCount = 1;

  for (const line of lines) {
    if (line.toLowerCase().includes("chapter")) {
      if (current.content.length > 0) {
        chapters.push(current);
      }

      chapterCount += 1;
      current = {
        id: "",
        order: chapterCount,
        title: line.trim() || `Chapter ${chapterCount}`,
        content: [],
      };
      continue;
    }

    if (line.trim()) {
      current.content.push(line.trim());
    }
  }

  if (current.content.length > 0) {
    chapters.push(current);
  }

  return chapters;
}
