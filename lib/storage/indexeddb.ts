/*
 * LEGACY FILE
 * Migrated to:
 * storage/db/indexeddb.ts
 * storage/repositories/*
 *
 * Temporary compatibility wrapper.
 * Remove after Sprint Z cleanup.
 */

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

// This constant was originally defined in this file.
export const SUMMARY_PAGE_SIZE = 60;
