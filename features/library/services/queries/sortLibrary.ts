// TODO: [KRVT-ARCH-V2] This service is responsible for sorting the library.

import type { NovelSummary } from "@/shared/types";
import { getReadingState } from "@/features/reader";

type LibrarySort = "lastImported" | "lastRead" | "chapterCount";

function getLastReadAt(novelId: string, readingState: any) {
  return readingState.progressByNovel[novelId]?.updatedAt ?? "";
}

export function sortLibrary({
  novels,
  librarySort,
  readingState,
}: {
  novels: NovelSummary[];
  librarySort: LibrarySort;
  readingState: any; // TODO: [KRVT-ARCH-V2] Use a proper type for readingState
}): NovelSummary[] {
  return [...novels].sort((left, right) => {
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
