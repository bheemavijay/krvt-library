// This service is responsible for removing a bookmark.

import { removeBookmark as removeBookmarkFromRepo } from "@/storage/repositories/BookmarkRepository";

export async function removeBookmark(novelId: string, chapterIndex: number) {
  return removeBookmarkFromRepo(novelId, chapterIndex);
}
