import type { LibraryBookmarksState, NovelBookmark } from "@/types";

import { isBrowser } from "@/lib/utils";

const STORAGE_KEY = "krvt-library-bookmarks";
const STORAGE_EVENT = "krvt-library-bookmarks-change";

const defaultState: LibraryBookmarksState = {};

let cachedState: LibraryBookmarksState = defaultState;
let cachedStorageValue: string | null = null;

export function getBookmarksState(): LibraryBookmarksState {
  if (!isBrowser()) {
    return defaultState;
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (storedValue === cachedStorageValue) {
    return cachedState;
  }

  cachedStorageValue = storedValue;
  cachedState = normalizeBookmarksState(storedValue);

  return cachedState;
}

export function getServerBookmarksState(): LibraryBookmarksState {
  return defaultState;
}

export function subscribeToBookmarks(onStoreChange: () => void) {
  if (!isBrowser()) {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleCustomEvent = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, handleCustomEvent);
  };
}

export function getNovelBookmarks(novelId: string) {
  return getBookmarksState()[novelId] ?? [];
}

export function isChapterBookmarked(novelId: string, chapterIndex: number) {
  return getNovelBookmarks(novelId).some((bookmark) => bookmark.chapterIndex === chapterIndex);
}

export function saveNovelBookmark(
  novelId: string,
  chapterIndex: number,
  title: string,
): { added: boolean; bookmark: NovelBookmark } {
  if (!isBrowser()) {
    return {
      added: false,
      bookmark: {
        chapterIndex,
        title,
        createdAt: new Date().toISOString(),
      },
    };
  }

  const currentState = getBookmarksState();
  const currentBookmarks = currentState[novelId] ?? [];
  const existingBookmark = currentBookmarks.find(
    (bookmark) => bookmark.chapterIndex === chapterIndex,
  );

  if (existingBookmark) {
    return {
      added: false,
      bookmark: existingBookmark,
    };
  }

  const nextBookmark: NovelBookmark = {
    chapterIndex,
    title,
    createdAt: new Date().toISOString(),
  };

  const nextState: LibraryBookmarksState = {
    ...currentState,
    [novelId]: sortBookmarksByLatest([nextBookmark, ...currentBookmarks]),
  };

  persistBookmarksState(nextState);

  return {
    added: true,
    bookmark: nextBookmark,
  };
}

function normalizeBookmarksState(storedValue: string | null): LibraryBookmarksState {
  if (!storedValue) {
    return defaultState;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Partial<LibraryBookmarksState>;

    if (!parsedValue || typeof parsedValue !== "object") {
      return defaultState;
    }

    const normalizedEntries = Object.entries(parsedValue).map(([novelId, bookmarks]) => [
      novelId,
      normalizeBookmarks(bookmarks),
    ]);

    return Object.fromEntries(normalizedEntries);
  } catch {
    return defaultState;
  }
}

function normalizeBookmarks(bookmarks: unknown): NovelBookmark[] {
  if (!Array.isArray(bookmarks)) {
    return [];
  }

  return sortBookmarksByLatest(
    bookmarks
      .filter((bookmark) => bookmark && typeof bookmark === "object")
      .map((bookmark) => {
        const value = bookmark as Partial<NovelBookmark>;

        return {
          chapterIndex:
            typeof value.chapterIndex === "number" && value.chapterIndex >= 0
              ? value.chapterIndex
              : 0,
          title: typeof value.title === "string" ? value.title : "Saved chapter",
          createdAt:
            typeof value.createdAt === "string" ? value.createdAt : new Date(0).toISOString(),
        } satisfies NovelBookmark;
      })
      .filter(
        (bookmark, index, collection) =>
          collection.findIndex((entry) => entry.chapterIndex === bookmark.chapterIndex) === index,
      ),
  );
}

function sortBookmarksByLatest(bookmarks: NovelBookmark[]) {
  return [...bookmarks].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function persistBookmarksState(nextState: LibraryBookmarksState) {
  cachedState = nextState;
  cachedStorageValue = JSON.stringify(nextState);
  window.localStorage.setItem(STORAGE_KEY, cachedStorageValue);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}
