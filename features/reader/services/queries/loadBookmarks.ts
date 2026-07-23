// This service is responsible for loading bookmarks for a novel.

import { getBookmarks } from "@/storage/repositories/BookmarkRepository";
import type { NovelBookmark } from "@/shared/types";

export async function loadBookmarks(novelId: string): Promise<NovelBookmark[]> {
  // The repository returns a slightly different Bookmark type.
  // We must cast it here to conform to the shared domain model.
  const bookmarks = await getBookmarks(novelId);
  return bookmarks as unknown as NovelBookmark[];
}
