// This hook provides a list of all bookmarks across all novels.

import { useEffect, useState } from "react";
import { getAllBookmarks } from "@/storage/repositories/BookmarkRepository";
import type { NovelSummary } from "@/shared/types";

type BookmarkItem = {
  novel: NovelSummary;
  bookmark: {
    chapterIndex: number;
    createdAt: number;
  };
};

export function useAllBookmarks(allNovels: NovelSummary[]) {
  const [bookmarkItems, setBookmarkItems] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const allBookmarks = await getAllBookmarks();
      const novelMap = new Map(allNovels.map(n => [n.id, n]));

      const items = allBookmarks
        .map(b => {
          const novel = novelMap.get(b.novelId);
          if (!novel) return null;
          return {
            novel,
            bookmark: {
              chapterIndex: b.chapterIndex,
              createdAt: b.createdAt,
            },
          };
        })
        .filter((item): item is BookmarkItem => item !== null)
        .sort((a, b) => b.bookmark.createdAt - a.bookmark.createdAt);

      setBookmarkItems(items);
      setIsLoading(false);
    }
    load();
  }, [allNovels]);

  return {
    bookmarkItems,
    isLoading,
  };
}
