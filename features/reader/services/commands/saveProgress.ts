// This service is responsible for saving the user's reading progress.

import { getReadingState } from "@/lib/reader-storage"; // Legacy dependency
import { isBrowser } from "@/shared/utils";
import type { LibraryReadingState, NovelReadingProgress } from "@/shared/types";

const STORAGE_KEY = "krvt-library-reading-state";
const STORAGE_EVENT = "krvt-library-reading-state-change";

let cachedState: LibraryReadingState | null = null;
let cachedStorageValue: string | null = null;

function persistReadingState(nextState: LibraryReadingState) {
  cachedState = nextState;
  cachedStorageValue = JSON.stringify(nextState);
  window.localStorage.setItem(STORAGE_KEY, cachedStorageValue);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function saveProgress(
  novelId: string,
  chapterIndex: number,
  options: {
    fontSize?: number;
    scrollTop?: number;
  }
) {
  if (!isBrowser()) return;

  const currentState = getReadingState();
  const currentProgress = currentState.progressByNovel[novelId];

  let hasChanged = false;

  // Logic from saveNovelReadingProgress
  if (options.fontSize && (
    currentState.fontSize !== options.fontSize ||
    currentState.lastOpenedNovelId !== novelId ||
    currentProgress?.chapterIndex !== chapterIndex ||
    currentProgress?.fontSize !== options.fontSize
  )) {
    hasChanged = true;
  }

  // Logic from saveChapterScrollPosition
  const chapterKey = String(chapterIndex);
  const normalizedScrollTop = options.scrollTop ? Math.max(0, Math.round(options.scrollTop)) : undefined;
  const currentScrollTop = currentProgress?.chapterScrollPositions?.[chapterKey];

  if (normalizedScrollTop !== undefined && currentScrollTop !== normalizedScrollTop) {
    hasChanged = true;
  }

  if (!hasChanged) {
    return;
  }

  const newScrollPositions = { ...(currentProgress?.chapterScrollPositions ?? {}) };
  if (normalizedScrollTop !== undefined) {
    newScrollPositions[chapterKey] = normalizedScrollTop;
  }

  const progress: NovelReadingProgress = {
    novelId,
    chapterIndex,
    fontSize: options.fontSize ?? currentProgress?.fontSize ?? currentState.fontSize,
    chapterScrollPositions: newScrollPositions,
    updatedAt: new Date().toISOString(),
  };

  const nextState: LibraryReadingState = {
    ...currentState,
    fontSize: options.fontSize ?? currentState.fontSize,
    lastOpenedNovelId: novelId,
    progressByNovel: {
      ...currentState.progressByNovel,
      [novelId]: progress,
    },
  };

  persistReadingState(nextState);
}
