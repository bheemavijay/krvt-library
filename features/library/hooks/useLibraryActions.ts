// This hook provides library action commands.

import { useCallback } from "react";
import { deleteNovel as deleteNovelCommand } from "@/features/library/services/commands/delete/deleteNovel";
import type { NovelSummary } from "@/shared/types";

export function useLibraryActions(setNovels: (updater: (novels: NovelSummary[]) => NovelSummary[]) => void) {
  const deleteNovel = useCallback(
    async (novelId: string) => {
      await deleteNovelCommand(novelId);
      setNovels((prev) => prev.filter((n) => n.id !== novelId));
    },
    [setNovels]
  );

  return {
    deleteNovel,
  };
}
