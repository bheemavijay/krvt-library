// This hook manages library filter state and logic.

import { useMemo, useState } from "react";
import { filterLibrary } from "@/features/library/services/queries/filterLibrary";
import type { NovelSummary } from "@/shared/types";

type ChapterFilter = "all" | "short" | "medium" | "long";

export function useLibraryFilter(novels: NovelSummary[]) {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [chapterFilter, setChapterFilter] = useState<ChapterFilter>("all");

  const filteredNovels = useMemo(() => {
    return filterLibrary({
      novels,
      selectedGenre,
      chapterFilter,
    });
  }, [novels, selectedGenre, chapterFilter]);

  return {
    selectedGenre,
    setSelectedGenre,
    chapterFilter,
    setChapterFilter,
    filteredNovels,
  };
}
