export {
  addNovel,
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
  clearAllNovels,
  addBookmark,
  getBookmarks,
  removeBookmark,
} from "@/lib/storage/indexeddb";

export {
  getBookmarksState,
  isChapterBookmarked,
  removeNovelBookmark,
  saveNovelBookmark,
  subscribeToBookmarks,
} from "@/lib/storage/bookmarks";
