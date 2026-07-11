// This hook manages saving the user's reading progress.

import { useCallback } from "react";
import { saveProgress } from "../services/commands/saveProgress";

export function useProgress(novelId: string, chapterIndex: number) {
  const saveScrollPosition = useCallback((scrollTop: number) => {
    saveProgress(novelId, chapterIndex, { scrollTop });
  }, [novelId, chapterIndex]);

  const saveChapterChange = useCallback((fontSize: number) => {
    saveProgress(novelId, chapterIndex, { fontSize });
  }, [novelId, chapterIndex]);

  return {
    saveScrollPosition,
    saveChapterChange,
  };
}
