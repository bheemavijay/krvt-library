import { useCallback } from "react";

import { clearTopNavigationRequest as clearTopNavigationRequestCommand } from "@/features/reader/services/commands/clearTopNavigationRequest";
import { markTopNavigation as markTopNavigationCommand } from "@/features/reader/services/commands/markTopNavigation";
import { loadLegacyChapterScrollPosition } from "@/features/reader/services/queries/loadLegacyChapterScrollPosition";
import { readTopNavigationRequest as readTopNavigationRequestQuery } from "@/features/reader/services/queries/readTopNavigationRequest";

export function useReaderNavigation() {
  const markTopNavigation = useCallback((novelId: string, chapterIndex: number) => {
    markTopNavigationCommand(novelId, chapterIndex);
  }, []);

  const readTopNavigationRequest = useCallback(() => {
    return readTopNavigationRequestQuery();
  }, []);

  const clearTopNavigationRequest = useCallback(() => {
    clearTopNavigationRequestCommand();
  }, []);

  const getLegacyScrollPosition = useCallback((novelId: string, chapterIndex: number) => {
    return loadLegacyChapterScrollPosition(novelId, chapterIndex);
  }, []);

  return {
    markTopNavigation,
    readTopNavigationRequest,
    clearTopNavigationRequest,
    getLegacyScrollPosition,
  };
}
