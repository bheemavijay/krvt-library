// TODO: [KRVT-ARCH-V2] This controller will orchestrate library-related services.

import { loadLibrary } from "@/features/library/services/queries/loadLibrary";
import { searchLibrary } from "@/features/library/services/queries/searchLibrary";
import { filterLibrary } from "@/features/library/services/queries/filterLibrary";
import { sortLibrary } from "@/features/library/services/queries/sortLibrary";
import { deleteNovel as deleteNovelCommand } from "@/features/library/services/commands/delete/deleteNovel";
import type { NovelSummary } from "@/shared/types";

// TODO: [KRVT-ARCH-V2] Refine the controller to be a class-based implementation
// that can be instantiated in the hook.

export async function getProcessedLibrary(
  // This will be replaced by a more robust state management within the controller class
  searchQuery: string,
  selectedGenre: string,
  chapterFilter: any,
  librarySort: any,
  readingState: any
) {
  const allNovels = await loadLibrary();
  const searched = searchLibrary(allNovels, searchQuery);
  const filtered = filterLibrary({
    novels: searched,
    selectedGenre,
    chapterFilter,
  });
  const sorted = sortLibrary({
    novels: filtered,
    librarySort,
    readingState,
  });
  return sorted;
}
