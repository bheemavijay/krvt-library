// This service is responsible for saving the user's reading progress.

import {
  getReadingState,
  saveReadingState,
} from "@/features/reader/services/readingStateService";
import type { LibraryReadingState, NovelReadingProgress } from "@/shared/types";

export function saveProgress(
  novelId: string,
  chapterIndex: number,
  options: {
    fontSize?: number;
    scrollTop?: number;
  }
) {
  const currentState = getReadingState();
  const currentProgress = currentState.progressByNovel[novelId];

  let hasChanged = false;

  if (options.fontSize && (
    currentState.fontSize !== options.fontSize ||
    currentState.lastOpenedNovelId !== novelId ||
    currentProgress?.chapterIndex !== chapterIndex ||
    currentProgress?.fontSize !== options.fontSize
  )) {
    hasChanged = true;
  }

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

  saveReadingState(nextState);
}
