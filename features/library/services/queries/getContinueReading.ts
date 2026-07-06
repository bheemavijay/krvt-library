// This service identifies novels the user is currently reading.

import type { NovelSummary } from "@/shared/types";
import { loadHistory } from "./loadHistory";

export function getContinueReading(novels: NovelSummary[]) {
  const readingState = loadHistory();
  return novels
    .map((novel) => {
      const progress = readingState.progressByNovel[novel.id];
      if (!progress) return null;
      return { novel, progress };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (!a || !b) return 0;
      return Date.parse(b.progress.updatedAt) - Date.parse(a.progress.updatedAt);
    });
}
