import { deleteNovel as deleteNovelFromDb } from "@/storage/repositories/NovelRepository";

export async function deleteNovel(novelId: string): Promise<void> {
  return deleteNovelFromDb(novelId);
}
