import type {
  LibraryReadingState,
  NovelReadingProgress,
  ReaderFontFamily,
  ReaderLineHeight,
  ReaderTheme,
} from "@/types";

import { isBrowser } from "@/lib/utils";

const STORAGE_KEY = "krvt-library-reading-state";
const STORAGE_EVENT = "krvt-library-reading-state-change";

export const DEFAULT_FONT_FAMILY: ReaderFontFamily = "Times New Roman";
export const DEFAULT_FONT_SIZE = 18;
export const DEFAULT_LINE_HEIGHT: ReaderLineHeight = 1.9;
export const DEFAULT_READER_THEME: ReaderTheme = "dark";

const defaultState: LibraryReadingState = {
  fontFamily: DEFAULT_FONT_FAMILY,
  fontSize: DEFAULT_FONT_SIZE,
  lineHeight: DEFAULT_LINE_HEIGHT,
  theme: DEFAULT_READER_THEME,
  lastOpenedNovelId: null,
  progressByNovel: {},
  tts: {
    voiceURI: "",
    rate: 1,
    pitch: 1,
  },
};

let cachedState: LibraryReadingState = defaultState;
let cachedStorageValue: string | null = null;

// ─────────────────────────────────────────────────────────────
// STATE GETTERS
// ─────────────────────────────────────────────────────────────

export function getReadingState(): LibraryReadingState {
  if (!isBrowser()) {
    return defaultState;
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (storedValue === cachedStorageValue) {
    return cachedState;
  }

  cachedStorageValue = storedValue;
  try {
    cachedState = normalizeReadingState(storedValue);
  } catch (e) {
    console.error("Reading state corrupted, resetting:", e);
    window.localStorage.removeItem(STORAGE_KEY); // 🔥 critical fix
    cachedState = defaultState;
  }

  return cachedState;
}

export function getServerReadingState(): LibraryReadingState {
  return defaultState;
}

export function subscribeToReadingState(onStoreChange: () => void) {
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

// ─────────────────────────────────────────────────────────────
// PROGRESS
// ─────────────────────────────────────────────────────────────

export function getNovelReadingProgress(
  novelId: string,
): NovelReadingProgress | undefined {
  return getReadingState().progressByNovel[novelId];
}

export function saveNovelReadingProgress(
  novelId: string,
  chapterIndex: number,
  fontSize: number,
) {
  if (!isBrowser()) return;

  const currentState = getReadingState();
  const currentProgress = currentState.progressByNovel[novelId];

  if (
    currentState.fontSize === fontSize &&
    currentState.lastOpenedNovelId === novelId &&
    currentProgress?.chapterIndex === chapterIndex &&
    currentProgress?.fontSize === fontSize
  ) {
    return;
  }

  const progress: NovelReadingProgress = {
    novelId,
    chapterIndex,
    fontSize,
    chapterScrollPositions: currentProgress?.chapterScrollPositions ?? {},
    updatedAt: new Date().toISOString(),
  };

  const nextState: LibraryReadingState = {
    ...currentState,
    fontSize,
    lastOpenedNovelId: novelId,
    progressByNovel: {
      ...currentState.progressByNovel,
      [novelId]: progress,
    },
  };

  persistReadingState(nextState);
}

export function saveChapterScrollPosition(
  novelId: string,
  chapterIndex: number,
  scrollTop: number,
) {
  if (!isBrowser()) return;

  const currentState = getReadingState();
  const currentProgress = currentState.progressByNovel[novelId];

  const chapterKey = String(chapterIndex);
  const normalizedScrollTop = Math.max(0, Math.round(scrollTop));
  const currentScrollTop = currentProgress?.chapterScrollPositions?.[chapterKey];

  if (
    currentState.lastOpenedNovelId === novelId &&
    currentProgress?.chapterIndex === chapterIndex &&
    currentScrollTop === normalizedScrollTop
  ) {
    return;
  }

  const progress: NovelReadingProgress = {
    novelId,
    chapterIndex,
    fontSize: currentProgress?.fontSize ?? currentState.fontSize,
    chapterScrollPositions: {
      ...(currentProgress?.chapterScrollPositions ?? {}),
      [chapterKey]: normalizedScrollTop,
    },
    updatedAt: new Date().toISOString(),
  };

  const nextState: LibraryReadingState = {
    ...currentState,
    lastOpenedNovelId: novelId,
    progressByNovel: {
      ...currentState.progressByNovel,
      [novelId]: progress,
    },
  };

  persistReadingState(nextState);
}

// ─────────────────────────────────────────────────────────────
// SETTINGS (FIXED)
// ─────────────────────────────────────────────────────────────

export function saveReaderSettings(settings: {
  fontFamily?: ReaderFontFamily;
  fontSize?: number;
  lineHeight?: ReaderLineHeight;
  theme?: ReaderTheme;
  tts?: {
    voiceURI?: string;
    rate?: number;
    pitch?: number;
  };
}) {
  if (!isBrowser()) return;

  const currentState = getReadingState();

  const nextState: LibraryReadingState = {
    ...currentState,
    fontFamily: settings.fontFamily ?? currentState.fontFamily,
    fontSize: settings.fontSize ?? currentState.fontSize,
    lineHeight: settings.lineHeight ?? currentState.lineHeight,
    theme: settings.theme ?? currentState.theme,

    // ✅ FIX: proper TTS merge
    tts: {
      ...currentState.tts,
      ...(settings.tts || {}),
    },
  };

  // ✅ FIX: include TTS in comparison
  if (
    nextState.fontFamily === currentState.fontFamily &&
    nextState.fontSize === currentState.fontSize &&
    nextState.lineHeight === currentState.lineHeight &&
    nextState.theme === currentState.theme &&
    JSON.stringify(nextState.tts) === JSON.stringify(currentState.tts)
  ) {
    return;
  }

  persistReadingState(nextState);
}

// ─────────────────────────────────────────────────────────────
// NORMALIZATION (FIXED)
// ─────────────────────────────────────────────────────────────

function normalizeReadingState(
  storedValue: string | null,
): LibraryReadingState {
  if (!storedValue) {
    return defaultState;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Partial<LibraryReadingState>;

    const progressByNovel =
      parsedValue.progressByNovel && typeof parsedValue.progressByNovel === "object"
        ? normalizeProgressByNovel(parsedValue.progressByNovel)
        : defaultState.progressByNovel;

    return {
      fontFamily: isValidFontFamily(parsedValue.fontFamily)
        ? parsedValue.fontFamily
        : DEFAULT_FONT_FAMILY,

      fontSize:
        typeof parsedValue.fontSize === "number"
          ? parsedValue.fontSize
          : DEFAULT_FONT_SIZE,

      lineHeight: isValidLineHeight(parsedValue.lineHeight)
        ? parsedValue.lineHeight
        : DEFAULT_LINE_HEIGHT,

      theme: isValidTheme(parsedValue.theme)
        ? parsedValue.theme
        : DEFAULT_READER_THEME,

      lastOpenedNovelId:
        typeof parsedValue.lastOpenedNovelId === "string"
          ? parsedValue.lastOpenedNovelId
          : null,

      progressByNovel,

      // ✅ FIX: normalize TTS
      tts: {
        voiceURI: parsedValue.tts?.voiceURI ?? "",
        rate: parsedValue.tts?.rate ?? 1,
        pitch: parsedValue.tts?.pitch ?? 1,
      },
    };
  } catch {
    return defaultState;
  }
}

// ─────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────

function persistReadingState(nextState: LibraryReadingState) {
  cachedState = nextState;
  cachedStorageValue = JSON.stringify(nextState);
  window.localStorage.setItem(STORAGE_KEY, cachedStorageValue);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function normalizeProgressByNovel(
  progressByNovel: LibraryReadingState["progressByNovel"],
) {
  const normalizedEntries = Object.entries(progressByNovel).map(([novelId, progress]) => [
    novelId,
    {
      ...progress,
      chapterScrollPositions:
        progress?.chapterScrollPositions &&
        typeof progress.chapterScrollPositions === "object"
          ? progress.chapterScrollPositions
          : {},
    },
  ]);

  return Object.fromEntries(normalizedEntries);
}

function isValidTheme(value: unknown): value is ReaderTheme {
  return value === "dark" || value === "light" || value === "sepia";
}

function isValidFontFamily(value: unknown): value is ReaderFontFamily {
  return (
    value === "Times New Roman" ||
    value === "Georgia" ||
    value === "Iowan Old Style"
  );
}

function isValidLineHeight(value: unknown): value is ReaderLineHeight {
  return value === 1.6 || value === 1.8 || value === 1.9 || value === 2;
}