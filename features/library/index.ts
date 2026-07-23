export { useLibrary } from "./hooks/useLibrary";
export { useNovel } from "./hooks/useNovel";
export { useBookmarks } from "./hooks/useBookmarks";
export { useHistory } from "./hooks/useHistory";

export { loadNovel } from "./services/queries/loadNovel";
export { clearLibrary } from "./services/commands/delete/clearLibrary";

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
