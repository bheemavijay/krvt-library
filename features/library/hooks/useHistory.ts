// This hook manages reading history.
// TODO: [KRVT-A6] This is a temporary implementation. The reading state logic
// should be fully migrated to the Reader feature's services.

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
