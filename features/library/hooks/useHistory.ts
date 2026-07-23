// This hook manages reading history.

import { getReadingState } from "@/features/reader";
import { getContinueReading } from "../services/queries/getContinueReading";
import type { NovelSummary } from "@/shared/types";

export function useHistory(novels: NovelSummary[]) {
  const readingState = getReadingState();
  const continueReadingItems = getContinueReading(novels);

  return {
    readingState,
    continueReadingItems,
  };
}
