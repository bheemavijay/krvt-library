// This service is responsible for adding a bookmark.

import { addBookmark as addBookmarkToRepo } from "@/storage/repositories/BookmarkRepository";

export async function addBookmark(novelId: string, chapterIndex: number) {
  return addBookmarkToRepo(novelId, chapterIndex);
}
