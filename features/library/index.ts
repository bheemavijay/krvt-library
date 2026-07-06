// Public API for the Library feature

export { useLibrary } from "./hooks/useLibrary";
export { useNovel } from "./hooks/useNovel";
export { useBookmarks } from "./hooks/useBookmarks";
export { useHistory } from "./hooks/useHistory";

// --- MIGRATION EXPORTS ---
// For legacy components that need to call services directly during transition.
// These will be removed after all UI is migrated to hooks.
export { loadNovel } from "./services/queries/loadNovel";

// --- LEGACY EXPORTS ---
// These will be removed once all features are migrated.
export {
  addNovel,
  clearAllNovels,
  deleteNovel,
  getAllNovels,
  getChapter,
  getNovel,
  getNovelChapterList,
  getNovelSummaries,
  getNovelSummary,
  saveNovel,
  saveNovelsBatch,
  saveOrUpdateNovel,
} from "@/lib/storage/indexeddb";

export {
  getBookmarksState,
  isChapterBookmarked,
  removeNovelBookmark,
  saveNovelBookmark,
  subscribeToBookmarks,
} from "@/lib/storage/bookmarks";
