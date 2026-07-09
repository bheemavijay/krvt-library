// This service orchestrates the loading of all data needed for the reader view.

import { getNovelSummary, getNovelChapterList } from "@/storage/repositories/NovelRepository";
import { loadChapter } from "./loadChapter";
import type { Novel } from "@/shared/types";

// This is the data model the reader component needs to function.
export type ReaderData = {
  novel: Novel | null;
};

export async function loadReader(
  novelId: string,
  requestedChapterIndex: number
): Promise<ReaderData> {
  try {
    const [summary, chapterList, activeChapter] = await Promise.all([
      getNovelSummary(novelId),
      getNovelChapterList(novelId),
      loadChapter(novelId, requestedChapterIndex),
    ]);

    if (!summary) {
      return { novel: null };
    }

    // This logic is moved directly from ReaderPageClient.tsx
    const novel: Novel = {
      ...summary,
      sourceUrl: summary.sourceUrl ?? "",
      alternative: "", // These fields are not in NovelSummary, so we provide defaults
      rating: undefined,
      genres: summary.genres ?? [],
      tags: summary.tags ?? [],
      lastUpdated: summary.lastUpdated ?? new Date().toISOString(),
      chapters: chapterList.map((item, index) =>
        index === requestedChapterIndex && activeChapter ? activeChapter : item
      ),
    };

    return { novel };
  } catch (error) {
    console.error("Failed to load reader data:", error);
    return { novel: null };
  }
}
