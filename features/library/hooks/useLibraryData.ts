// This hook is responsible for fetching the raw library data.

import { useEffect, useState, useCallback } from "react";
import { loadLibrary } from "@/features/library/services/queries/loadLibrary";
import type { NovelSummary } from "@/shared/types";

export function useLibraryData() {
  const [novels, setNovels] = useState<NovelSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const libraryNovels = await loadLibrary();
      setNovels(libraryNovels);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load library");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    novels,
    isLoading,
    error,
    refresh,
    setNovels, // Expose setter for actions hook
  };
}
