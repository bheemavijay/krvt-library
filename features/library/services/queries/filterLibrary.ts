// TODO: [KRVT-ARCH-V2] This service is responsible for filtering the library.

import type { NovelSummary } from "@/shared/types";

type ChapterFilter = "all" | "short" | "medium" | "long";

function matchesChapterFilter(novel: NovelSummary, filter: ChapterFilter) {
  const count = novel.chapterCount;
  if (filter === "short") return count < 50;
  if (filter === "medium") return count >= 50 && count < 200;
  if (filter === "long") return count >= 200;
  return true;
}

export function filterLibrary({
  novels,
  selectedGenre,
  chapterFilter,
}: {
  novels: NovelSummary[];
  selectedGenre: string;
  chapterFilter: ChapterFilter;
}): NovelSummary[] {
  const genreQuery = selectedGenre.toLowerCase();
  const filteredByGenre =
    selectedGenre === "All"
      ? novels
      : novels.filter((novel) =>
          [...(novel.genres ?? []), ...(novel.tags ?? [])].some(
            (genre) => genre.toLowerCase() === genreQuery
          )
        );

  return filteredByGenre.filter((novel) =>
    matchesChapterFilter(novel, chapterFilter)
  );
}
