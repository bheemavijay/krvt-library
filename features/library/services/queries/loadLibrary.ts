// TODO: [KRVT-ARCH-V2] This service is responsible for loading the library novels.

import { getNovelSummaries } from "@/storage/repositories/NovelRepository";
import type { NovelSummary } from "@/shared/types";

export async function loadLibrary(): Promise<NovelSummary[]> {
  return getNovelSummaries();
}
