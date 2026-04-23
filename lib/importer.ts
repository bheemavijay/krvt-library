"use client";

import { saveNovel } from "@/lib/storage/indexeddb";

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export async function importFromText(text: string, title: string) {
  if (!text || !title) {
    throw new Error("Missing title or content");
  }

  const chapters = parseChapters(text);

  const novel = {
    id: generateId(),
    title,
    author: "Unknown",
    chapters,
    createdAt: Date.now(),
  };

  // ✅ IMPORTANT: async save
  await saveNovel(novel);

  return novel;
}

function parseChapters(text: string) {
  const lines = text.split("\n");

  const chapters: any[] = [];
  let current = {
    id: generateId(),
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

      chapterCount++;

      current = {
        id: generateId(),
        order: chapterCount,
        title: line.trim() || `Chapter ${chapterCount}`,
        content: [],
      };
    } else {
      if (line.trim()) {
        current.content.push(line.trim());
      }
    }
  }

  if (current.content.length > 0) {
    chapters.push(current);
  }

  return chapters;
}