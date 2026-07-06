// This hook manages bookmark state for a novel.

import { useEffect, useState, useCallback } from "react";
import { loadBookmarks } from "../services/queries/loadBookmarks";
import { addBookmark as addBookmarkService } from "../services/commands/create/addBookmark";
import { removeBookmark as removeBookmarkService } from "../services/commands/delete/removeBookmark";

type Bookmark = {
  novelId: string;
  chapterIndex: number;
  createdAt: number;
};

export function useBookmarks(novelId: string) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const refreshBookmarks = useCallback(async () => {
    if (!novelId) return;
    const freshBookmarks = await loadBookmarks(novelId);
    setBookmarks(freshBookmarks);
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

  return { bookmarks, isBookmarked, addBookmark, removeBookmark };
}
