"use client";

import { getImportApiUrl } from "@/core/config/import-api";
import { mergeNovelChapters, normalizeNovelRecord } from "@/lib/novels";
import { addNovel, getNovel, getNovelSummaries } from "@/lib/storage/indexeddb";
import { acquireNovelJobLock, releaseNovelJobLock } from "@/core/concurrency/novelJobLock";
import type { Chapter, Novel } from "@/shared/types";

type ImportApiResponse = {
  id?: string;
  title?: string;
  author?: string;
  image?: string;
  alternative?: string;
  genres?: string[];
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
  const firstLine = Array.isArray(chapter.content) ? chapter.content[0] ?? "" : "";
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
  if (!novel.sourceUrl || novel.isCompleted) {
    return;
  }

  const lockKey = novel.sourceUrl ?? novel.id;
  if (!acquireNovelJobLock(lockKey)) {
    return;
  }

  try {
    let offset = 0;
    let latestMeta: ImportApiResponse | null = null;
    const incomingChapters: Chapter[] = [];

    while (true) {
      const response = await fetch(getImportApiUrl(), {
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

      if (response.status === 409) {
        break;
      }

      if (!response.ok) {
        const errorText = (await response.text()).substring(0, 300);
        throw new Error(`Update check failed with status ${response.status}: ${errorText}`);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Invalid backend response. Expected JSON.");
      }

      latestMeta = data;
      const chunk = data.chapters ?? [];
      if (chunk.length === 0) {
        break;
      }

      for (let i = 0; i < chunk.length; i += 1) {
        incomingChapters.push(mapIncomingChapter(chunk[i], novel.chapters.length + incomingChapters.length + 1));
      }

      if (chunk.length < CHUNK_SIZE) {
        break;
      }
      offset += CHUNK_SIZE;
    }

    const existingKeys = new Set(novel.chapters.map(toChapterKey));
    const uniqueNew = incomingChapters.filter((chapter) => !existingKeys.has(toChapterKey(chapter)));

    if (uniqueNew.length === 0) {
      if (latestMeta && isCompletedStatus(latestMeta.status) && !novel.isCompleted) {
        await addNovel({ ...novel, isCompleted: true, lastUpdated: new Date().toISOString() });
      }
      return;
    }

    const mergedChapters = mergeNovelChapters(novel.id, novel.chapters, uniqueNew);

    await addNovel(normalizeNovelRecord({
      ...novel,
      author: latestMeta?.author ?? novel.author,
      image: latestMeta?.image ?? novel.image,
      alternative: latestMeta?.alternative ?? novel.alternative,
      genres: Array.isArray(latestMeta?.genres) ? latestMeta.genres : novel.genres,
      tags: Array.isArray(latestMeta?.tags) ? latestMeta.tags : novel.tags,
      status: latestMeta?.status ?? novel.status,
      rating: typeof latestMeta?.rating === "number" ? latestMeta.rating : novel.rating,
      description: latestMeta?.description ?? novel.description,
      isCompleted: novel.isCompleted || isCompletedStatus(latestMeta?.status),
      lastUpdated: new Date().toISOString(),
      chapters: mergedChapters,
    }));
  } catch (error) {
    console.error({
        message: "Auto update failed for novel",
        novel: novel.title,
        url: novel.sourceUrl,
        error,
    });
  } finally {
    releaseNovelJobLock(lockKey);
  }
}

export async function updateAllNovels() {
  try {
    const summaries = await getNovelSummaries();
    for (const summary of summaries) {
      const novel = await getNovel(summary.id);
      if (novel) {
        await updateSingleNovel(novel);
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("library:updated"));
    }
  } catch (error) {
    console.error("Auto update failed during novel processing:", error);
  }
}

export function startAutoNovelUpdates() {
  updateAllNovels().catch((error) => console.error("Auto update failed:", error));
  return window.setInterval(() => {
    updateAllNovels().catch((error) => console.error("Auto update failed:", error));
  }, UPDATE_INTERVAL_MS);
}