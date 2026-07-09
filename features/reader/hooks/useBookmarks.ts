// This hook manages bookmark state for a given novel.

import { useEffect, useState, useCallback } from "react";
import { loadBookmarks } from "../services/queries/loadBookmarks";
import { addBookmark as addBookmarkService } from "../services/commands/addBookmark";
import { removeBookmark as removeBookmarkService } from "../services/commands/removeBookmark";
import type { NovelBookmark } from "@/shared/types";

export function useBookmarks(novelId: string) {
  const [bookmarks, setBookmarks] = useState<NovelBookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBookmarks = useCallback(async () => {
    if (!novelId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const freshBookmarks = await loadBookmarks(novelId);
    setBookmarks(freshBookmarks);
    setIsLoading(false);
  }, [novelId]);

  useEffect(() => {
    refreshBookmarks();
  }, [refreshBookmarks]);

  const addBookmark = useCallback(async (chapterIndex: number) => {
    await addBookmarkService(novelId, chapterIndex);
    refreshBookmarks();
  }, [novelId, refreshBookmarks]);

  const removeBookmark = useCallback(async (chapterIndex: number) => {
    await removeBookmarkService(novelId, chapterIndex);
    refreshBookmarks();
  }, [novelId, refreshBookmarks]);

  const isBookmarked = (chapterIndex: number) => {
    return bookmarks.some(b => b.chapterIndex === chapterIndex);
  };

  return {
    bookmarks,
    isLoading,
    isBookmarked,
    addBookmark,
    removeBookmark,
    refreshBookmarks,
  };
}
