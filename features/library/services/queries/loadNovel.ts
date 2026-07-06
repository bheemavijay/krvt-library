// This service is responsible for loading a single novel.

import { getNovel } from "@/storage/repositories/NovelRepository";
import type { Novel } from "@/shared/types";

export async function loadNovel(id: string): Promise<Novel | null> {
  return getNovel(id);
}
