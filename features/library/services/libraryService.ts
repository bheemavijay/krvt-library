import { getNovelSummaries } from "@/storage/repositories/NovelRepository";
import type { NovelSummary } from "@/shared/types";

type LibrarySort = "lastImported" | "lastRead" | "chapterCount";
type ChapterFilter = "all" | "short" | "medium" | "long";

export async function getLibraryNovels(): Promise<NovelSummary[]> {
  // In the future, this could be optimized to fetch only what's needed.
  return getNovelSummaries();
}

function matchesChapterFilter(novel: NovelSummary, filter: ChapterFilter) {
  const count = novel.chapterCount;
  if (filter === "short") return count < 50;
  if (filter === "medium") return count >= 50 && count < 200;
  if (filter === "long") return count >= 200;
  return true;
}

function getLastReadAt(novelId: string, readingState: any) {
  return readingState.progressByNovel[novelId]?.updatedAt ?? "";
}

export function filterAndSortNovels({
  novels,
  searchQuery,
  selectedGenre,
  chapterFilter,
  librarySort,
  readingState,
}: {
  novels: NovelSummary[];
  searchQuery: string;
  selectedGenre: string;
  chapterFilter: ChapterFilter;
  librarySort: LibrarySort;
  readingState: any;
}): NovelSummary[] {
  const query = searchQuery.toLowerCase().trim();
  const filteredBySearch = !query
    ? novels
    : novels.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.author?.toLowerCase().includes(query) ||
          n.genres?.some((g) => g.toLowerCase().includes(query)) ||
          n.tags?.some((t) => t.toLowerCase().includes(query))
      );

  const genreQuery = selectedGenre.toLowerCase();
  const filteredByGenre =
    selectedGenre === "All"
      ? filteredBySearch
      : filteredBySearch.filter((novel) =>
          [...(novel.genres ?? []), ...(novel.tags ?? [])].some(
            (genre) => genre.toLowerCase() === genreQuery
          )
        );

  const filteredByChapter = filteredByGenre.filter((novel) =>
    matchesChapterFilter(novel, chapterFilter)
  );

  return filteredByChapter.sort((left, right) => {
    if (librarySort === "chapterCount") {
      return right.chapterCount - left.chapterCount;
    }

    if (librarySort === "lastRead") {
      return (
        Date.parse(getLastReadAt(right.id, readingState) || "1970-01-01") -
        Date.parse(getLastReadAt(left.id, readingState) || "1970-01-01")
      );
    }

    return (
      Date.parse(right.lastUpdated || "1970-01-01") -
      Date.parse(left.lastUpdated || "1970-01-01")
    );
  });
}
