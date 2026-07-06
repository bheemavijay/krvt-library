// This hook is responsible for loading a single novel.

import { useEffect, useState } from "react";
import { loadNovel } from "@/features/library/services/queries/loadNovel";
import type { Novel } from "@/shared/types";

export function useNovel(novelId: string) {
  const [novel, setNovel] = useState<Novel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!novelId) {
      setIsLoading(false);
      setNovel(null);
      return;
    }

    async function load() {
      try {
        setIsLoading(true);
        const loadedNovel = await loadNovel(novelId);
        setNovel(loadedNovel);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load novel");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [novelId]);

  return { novel, isLoading, error };
}
