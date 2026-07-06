// This service is responsible for loading bookmarks for a novel.

import { getBookmarks } from "@/storage/repositories/BookmarkRepository";

export async function loadBookmarks(novelId: string) {
  return getBookmarks(novelId);
}
