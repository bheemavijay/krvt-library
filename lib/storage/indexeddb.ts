export {
  addNovel,
  saveNovelsBatch,
  saveOrUpdateNovel,
  saveNovel,
  getAllNovels,
  getNovelSummaries,
  getNovel,
  getNovelSummary,
  getNovelChapterList,
  deleteNovel,
  clearAllNovels,
} from "@/storage/repositories/NovelRepository";

export {
  getChapter,
  getNovelChapters,
} from "@/storage/repositories/ChapterRepository";

export {
  addBookmark,
  removeBookmark,
  getBookmarks,
} from "@/storage/repositories/BookmarkRepository";

export const SUMMARY_PAGE_SIZE = 60;
