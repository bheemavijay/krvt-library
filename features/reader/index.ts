export { useReader } from "./hooks/useReader";
export { useReaderSettings } from "./hooks/useReaderSettings";
export { useBookmarks } from "./hooks/useBookmarks";
export { useProgress } from "./hooks/useProgress";
export { useReaderNavigation } from "./hooks/useReaderNavigation";
export { useReaderChapter, formatChapterIndexTitle } from "./hooks/useReaderChapter";
export { useReaderKeyboard } from "./hooks/useReaderKeyboard";
export { useReaderProgress } from "./hooks/useReaderProgress";
export { useReaderScroll } from "./hooks/useReaderScroll";
export { useReaderSelection } from "./hooks/useReaderSelection";
export { useReaderUI } from "./hooks/useReaderUI";

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
} from "@/features/reader/services/readingStateService";

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
} from "@/features/reader/services/readerSettingsService";

export type {
  ReaderSettings,
  ReplacementRule,
} from "@/features/reader/types/ReaderSettings";

export {
  getBookmarksState as getReaderBookmarksState,
  isChapterBookmarked,
  removeNovelBookmark,
  saveNovelBookmark as saveStoredNovelBookmark,
  subscribeToBookmarks as subscribeToStoredBookmarks,
} from "@/lib/storage/bookmarks";

export { getChapter, getNovelChapterList, getNovelSummary } from "@/lib/storage/indexeddb";
