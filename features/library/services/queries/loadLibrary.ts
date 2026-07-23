import { getNovelSummaries } from "@/storage/repositories/NovelRepository";
import type { NovelSummary } from "@/shared/types";

export async function loadLibrary(): Promise<NovelSummary[]> {
  return getNovelSummaries();
}
