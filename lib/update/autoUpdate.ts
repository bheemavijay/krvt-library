"use client";

import { addNovel, getAllNovels } from "@/lib/storage/indexeddb";
import type { Chapter, Novel } from "@/types";

type ImportApiResponse = {
  id?: string;
  title?: string;
  author?: string;
  image?: string;
  alternative?: string;
  genres?: string[];
  categories?: string[];
  tags?: string[];
  status?: string;
  rating?: number | null;
  description?: string;
  sourceUrl?: string;
  chapters?: Array<{
    id?: string;
    title: string;
    content: string[] | string;
  }>;
  error?: string;
};

const CHUNK_SIZE = 50;
const UPDATE_INTERVAL_MS = 30 * 60 * 1000;

function toChapterKey(chapter: Pick<Chapter, "id" | "title" | "content">) {
  const firstLine = chapter.content?.[0] ?? "";
  return `${chapter.id}::${chapter.title.toLowerCase().trim()}::${firstLine}`;
}

function mapIncomingChapter(
  chapter: NonNullable<ImportApiResponse["chapters"]>[number],
  order: number,
): Chapter {
  const normalizedContent = Array.isArray(chapter.content)
    ? chapter.content
    : String(chapter.content ?? "")
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

  return {
    id: chapter.id ?? String(order),
    order,
    title: chapter.title,
    content: normalizedContent,
  };
}

function isCompletedStatus(status?: string) {
  return /\b(completed|complete|full)\b/i.test(status ?? "");
}

async function updateSingleNovel(novel: Novel) {
  if (!novel.sourceUrl || novel.isCompleted) return;

  try {
    let offset = 0;
    let latestMeta: ImportApiResponse | null = null;
    const incomingChapters: Chapter[] = [];

    while (true) {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: novel.sourceUrl,
          offset,
          existingNovel: {
            title: novel.title,
            novelUrl: novel.sourceUrl,
            lastChapterIndex: Math.max(0, novel.chapters.length - 1),
            chapterCount: novel.chapters.length,
          },
        }),
      });

      const data = (await response.json()) as ImportApiResponse;
      if (response.status === 409 || data.error === "No new chapters available") break;
      if (!response.ok) throw new Error(data.error || "Auto update failed");

      latestMeta = data;
      const chunk = data.chapters ?? [];
      if (!chunk.length) break;

      for (let i = 0; i < chunk.length; i += 1) {
        incomingChapters.push(mapIncomingChapter(chunk[i], novel.chapters.length + incomingChapters.length + 1));
      }

      if (chunk.length < CHUNK_SIZE) break;
      offset += CHUNK_SIZE;
    }

    if (!incomingChapters.length) {
      if (latestMeta && isCompletedStatus(latestMeta.status) && !novel.isCompleted) {
        await addNovel({
          ...novel,
          isCompleted: true,
          lastUpdated: new Date().toISOString(),
        });
      }
      return;
    }

    const existingKeys = new Set(novel.chapters.map((chapter) => toChapterKey(chapter)));
    const uniqueNew: Chapter[] = [];

    for (const chapter of incomingChapters) {
      const key = toChapterKey(chapter);
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      uniqueNew.push(chapter);
    }

    if (!uniqueNew.length) return;

    const mergedChapters = [...novel.chapters, ...uniqueNew].map((chapter, index) => ({
      ...chapter,
      order: index + 1,
      id: chapter.id || String(index + 1),
    }));

    await addNovel({
      ...novel,
      author: latestMeta?.author ?? novel.author,
      image: latestMeta?.image ?? novel.image,
      alternative: latestMeta?.alternative ?? novel.alternative,
      genres: Array.isArray(latestMeta?.genres) ? latestMeta?.genres : novel.genres,
      categories: Array.isArray(latestMeta?.categories) ? latestMeta?.categories : novel.categories,
      tags: Array.isArray(latestMeta?.tags) ? latestMeta?.tags : novel.tags,
      status: latestMeta?.status ?? novel.status,
      rating: typeof latestMeta?.rating === "number" ? latestMeta.rating : novel.rating,
      description: latestMeta?.description ?? novel.description,
      sourceUrl: novel.sourceUrl,
      isCompleted: novel.isCompleted || isCompletedStatus(latestMeta?.status),
      lastUpdated: new Date().toISOString(),
      chapters: mergedChapters,
    });
  } catch (error) {
    console.error(`Auto update skipped for novel: ${novel.title}`, error);
  }
}

export async function updateAllNovels() {
  try {
    const novels = await getAllNovels();
    for (const novel of novels) {
      await updateSingleNovel(novel);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("library:updated"));
    }
  } catch (error) {
    console.error("Auto update failed", error);
  }
}

export function startAutoNovelUpdates() {
  updateAllNovels().catch(() => {});
  return window.setInterval(() => {
    updateAllNovels().catch(() => {});
  }, UPDATE_INTERVAL_MS);
}
