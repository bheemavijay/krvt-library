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
