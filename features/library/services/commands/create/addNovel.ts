// TODO: [KRVT-ARCH-V2] This service is responsible for adding a novel.

import { addNovel as addNovelToDb } from "@/storage/repositories/NovelRepository";
import type { Novel } from "@/shared/types";

export async function addNovel(novel: Novel): Promise<Novel> {
  return addNovelToDb(novel);
}
