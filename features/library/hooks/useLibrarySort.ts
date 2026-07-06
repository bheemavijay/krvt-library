// This hook manages library sort state and logic.

import { useMemo, useState } from "react";
import { sortLibrary } from "@/features/library/services/queries/sortLibrary";
import type { NovelSummary } from "@/shared/types";
import { getReadingState } from "@/features/reader"; // TODO: [KRVT-ARCH-V2] This should be a service call

type LibrarySort = "lastImported" | "lastRead" | "chapterCount";

export function useLibrarySort(novels: NovelSummary[]) {
  const [librarySort, setLibrarySort] = useState<LibrarySort>("lastImported");
  const readingState = getReadingState(); // TODO: [KRVT-ARCH-V2] Replace with useHistory hook

  const sortedNovels = useMemo(() => {
    return sortLibrary({
      novels,
      librarySort,
      readingState,
    });
  }, [novels, librarySort, readingState]);

  return {
    librarySort,
    setLibrarySort,
    sortedNovels,
  };
}
