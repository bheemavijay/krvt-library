import { markTopNavigation as markTopNavigationInRepository } from "@/features/reader/repositories/readerNavigationRepository";

export function markTopNavigation(novelId: string, chapterIndex: number) {
  markTopNavigationInRepository(novelId, chapterIndex);
}
