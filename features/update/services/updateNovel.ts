import { getImportApiUrl } from "@/core/config/import-api";
import { acquireNovelJobLock, releaseNovelJobLock } from "@/core/concurrency/novelJobLock";
import { mergeNovelChapters, normalizeNovelRecord } from "@/lib/novels";
import { addNovel, getNovel } from "@/storage/repositories/NovelRepository";
import type { Novel, NovelSummary } from "@/shared/types";

function pickDescription(...values: Array<string | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "No description available";
}

export async function updateNovel(summary: NovelSummary) {
  const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  console.info("krvt.debug.update.start", {
    requestId,
    novelId: summary.id,
    title: summary.title,
    caller: "LibraryManagementGrid",
  });

  const novel = await getNovel(summary.id);
  if (!novel) {
    throw new Error("Update failed: novel content missing");
  }

  if (!/^https?:/i.test(novel.sourceUrl)) {
    throw new Error("Update failed: source URL missing");
  }

  const lockKey = novel.sourceUrl || novel.id;
  if (!acquireNovelJobLock(lockKey)) {
    return null;
  }

  try {
    const apiUrl = getImportApiUrl();
    if (!apiUrl) {
      throw new Error("Import not supported in this environment");
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: novel.sourceUrl,
        existingNovel: {
          title: novel.title,
          novelUrl: novel.sourceUrl,
          lastChapterIndex: summary.chapterCount > 0 ? summary.chapterCount - 1 : -1,
          chapterCount: summary.chapterCount,
        },
      }),
    });
    const data: any = await response.json();
    if (!response.ok && response.status !== 409) {
      throw new Error(data.error || "Update failed");
    }

    const incoming = (data.chapters ?? []).map((chapter: any) => ({
      id: chapter.id ?? String(summary.chapterCount + (data.chapters ?? []).length + 1),
      order: summary.chapterCount + (data.chapters ?? []).length + 1,
      title: chapter.title,
      content: Array.isArray(chapter.content)
        ? chapter.content
        : String(chapter.content ?? "")
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean),
    }));

    const merged = mergeNovelChapters(novel.id, novel.chapters, incoming);
    const addedCount = merged.length - novel.chapters.length;
    const nextNovel: Novel = normalizeNovelRecord({
      ...novel,
      title: data?.title || novel.title,
      author: data?.author || novel.author,
      image: data?.image || novel.image,
      alternative: data?.alternative || novel.alternative,
      genres: Array.isArray(data?.genres) ? data.genres : novel.genres,
      tags: Array.isArray(data?.tags) ? data.tags : novel.tags,
      status: data?.status || novel.status,
      rating: typeof data?.rating === "number" ? data.rating : novel.rating,
      description: pickDescription(data?.description, novel.description),
      isCompleted: novel.isCompleted || /\b(completed|complete|full)\b/i.test(data?.status ?? ""),
      lastUpdated: new Date().toISOString(),
      chapters: merged,
    });

    await addNovel(nextNovel);

    return {
      novelId: novel.id,
      message:
        addedCount > 0
          ? `Updated "${novel.title}" with ${addedCount} new chapters`
          : `No new chapters for "${novel.title}"`,
    };
  } finally {
    releaseNovelJobLock(lockKey);
  }
}
