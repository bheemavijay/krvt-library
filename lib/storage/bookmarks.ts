import type { LibraryBookmarksState, NovelBookmark } from "@/types";

const STORAGE_KEY = "krvt-library-bookmarks";
const STORAGE_EVENT = "krvt-library-bookmarks-change";

const defaultState: LibraryBookmarksState = {};

let cachedState: LibraryBookmarksState = defaultState;
let cachedStorageValue: string | null = null;

// 🔥 CHECK BROWSER
function isBrowser() {
  return typeof window !== "undefined";
}

// 🔥 GET STATE
export function getBookmarksState(): LibraryBookmarksState {
  if (!isBrowser()) return defaultState;

  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (storedValue === cachedStorageValue) {
    return cachedState;
  }

  cachedStorageValue = storedValue;
  cachedState = storedValue ? JSON.parse(storedValue) : defaultState;

  return cachedState;
}

// 🔥 SUBSCRIBE
export function subscribeToBookmarks(callback: () => void) {
  if (!isBrowser()) return () => {};

  const handler = () => callback();

  window.addEventListener("storage", handler);
  window.addEventListener(STORAGE_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(STORAGE_EVENT, handler);
  };
}

// 🔥 CHECK BOOKMARK
export function isChapterBookmarked(novelId: string, chapterIndex: number) {
  const state = getBookmarksState();
  return state[novelId]?.some(b => b.chapterIndex === chapterIndex);
}

// 🔥 SAVE BOOKMARK
export function saveNovelBookmark(
  novelId: string,
  chapterIndex: number,
  title: string
) {
  const state = getBookmarksState();

  const list = state[novelId] || [];

  const exists = list.find(b => b.chapterIndex === chapterIndex);

  if (exists) {
    return { added: false, bookmark: exists };
  }

  const newBookmark: NovelBookmark = {
    chapterIndex,
    title,
    createdAt: new Date().toISOString(),
  };

  const nextState: LibraryBookmarksState = {
    ...state,
    [novelId]: [newBookmark, ...list],
  };

  persist(nextState);

  return { added: true, bookmark: newBookmark };
}

// 🔥 PERSIST
function persist(state: LibraryBookmarksState) {
  cachedState = state;
  cachedStorageValue = JSON.stringify(state);

  window.localStorage.setItem(STORAGE_KEY, cachedStorageValue);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}