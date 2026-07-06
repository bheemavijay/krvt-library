// This service is responsible for clearing the entire library.

import { clearAllNovels } from "@/storage/repositories/NovelRepository";

export async function clearLibrary(): Promise<void> {
  return clearAllNovels();
}
