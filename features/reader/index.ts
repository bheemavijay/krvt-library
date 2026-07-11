// New Public Hooks
export { useReader } from "./hooks/useReader";
export { useReaderSettings } from "./hooks/useReaderSettings";
export { useBookmarks } from "./hooks/useBookmarks";

// --- LEGACY EXPORTS ---
// These will be removed once all components are migrated.

export {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_READER_THEME,
  getReadingState,
  getServerReadingState,
  saveChapterScrollPosition,
  saveNovelReadingProgress,
  subscribeToReadingState,
} from "@/lib/reader-storage";

export {
  getBookmarksState,
  getServerBookmarksState,
  saveNovelBookmark,
  subscribeToBookmarks,
} from "@/lib/bookmark-storage";

export {
  ensureReaderFontsLoaded,
  getDefaultReaderSettings,
  getReaderFontStack,
  getSettings,
  READER_FONT_OPTIONS,
  saveSettings,
  subscribeToSettings,
  // The old useReaderSettings is no longer exported
  type ReaderSettings,
  type ReplacementRule,
} from "@/lib/settings";

export {
  getBookmarksState as getReaderBookmarksState,
  isChapterBookmarked,
  removeNovelBookmark,
  saveNovelBookmark as saveStoredNovelBookmark,
  subscribeToBookmarks as subscribeToStoredBookmarks,
} from "@/lib/storage/bookmarks";

export { getChapter, getNovelChapterList, getNovelSummary } from "@/lib/storage/indexeddb";