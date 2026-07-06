// This hook manages library search state and logic.

import { useMemo, useState } from "react";
import { searchLibrary } from "@/features/library/services/queries/searchLibrary";
import type { NovelSummary } from "@/shared/types";

export function useLibrarySearch(novels: NovelSummary[]) {
  const [searchQuery, setSearchQuery] = useState("");

  const searchedNovels = useMemo(() => {
    return searchLibrary(novels, searchQuery);
  }, [novels, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    searchedNovels,
  };
}
