// This hook manages the state for the library view and delegates logic to services.

import { useEffect, useState, useCallback } from "react";
import { loadLibrary } from "@/features/library/services/queries/loadLibrary";
import { searchLibrary } from "@/features/library/services/queries/searchLibrary";
import { filterLibrary } from "@/features/library/services/queries/filterLibrary";
import { sortLibrary } from "@/features/library/services/queries/sortLibrary";
import { deleteNovel as deleteNovelCommand } from "@/features/library/services/commands/delete/deleteNovel";
import type { NovelSummary } from "@/shared/types";
import { getReadingState } from "@/features/reader"; // Legacy dependency

type LibrarySort = "lastImported" | "lastRead" | "chapterCount";
type ChapterFilter = "all" | "short" | "medium" | "long";

export function useLibrary() {
  const [allNovels, setAllNovels] = useState<NovelSummary[]>([]);
  const [processedNovels, setProcessedNovels] = useState<NovelSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inputs for filtering and sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [chapterFilter, setChapterFilter] = useState<ChapterFilter>("all");
  const [librarySort, setLibrarySort] = useState<LibrarySort>("lastImported");

  const readingState = getReadingState(); // Legacy: To be replaced by useHistory()

  const processNovels = useCallback(() => {
    const searched = searchLibrary(allNovels, searchQuery);
    const filtered = filterLibrary({ novels: searched, selectedGenre, chapterFilter });
    const sorted = sortLibrary({ novels: filtered, librarySort, readingState });
    setProcessedNovels(sorted);
  }, [allNovels, searchQuery, selectedGenre, chapterFilter, librarySort, readingState]);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const novels = await loadLibrary();
      setAllNovels(novels);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load library");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    processNovels();
  }, [processNovels]);

  const deleteNovel = useCallback(async (novelId: string) => {
    await deleteNovelCommand(novelId);
    refresh(); // Re-fetch the entire library after a deletion
  }, [refresh]);

  return {
    novels: processedNovels,
    allNovels,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectedGenre,
    setSelectedGenre,
    chapterFilter,
    setChapterFilter,
    librarySort,
    setLibrarySort,
    deleteNovel,
    refresh,
  };
}
