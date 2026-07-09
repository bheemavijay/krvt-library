// This hook manages the core state of the reader, including the novel and chapter data.

import { useEffect, useState, useCallback } from "react";
import { loadReader } from "../services/queries/loadReader";
import { loadChapter } from "../services/queries/loadChapter";
import type { Novel, Chapter } from "@/shared/types";

export function useReader(novelId: string, initialChapterIndex: number) {
  const [novel, setNovel] = useState<Novel | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(initialChapterIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load for the entire reader (novel summary, chapter list)
  useEffect(() => {
    if (!novelId) {
      setIsLoading(false);
      setError("Novel ID is missing.");
      return;
    }

    async function initialLoad() {
      setIsLoading(true);
      try {
        const readerData = await loadReader(novelId, initialChapterIndex);
        if (readerData.novel) {
          setNovel(readerData.novel);
          setActiveChapter(readerData.novel.chapters[initialChapterIndex] ?? null);
        } else {
          setError("Failed to load novel.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    }
    initialLoad();
  }, [novelId, initialChapterIndex]);

  // Logic to load a new chapter when the index changes
  const selectChapter = useCallback(async (chapterIndex: number) => {
    if (!novel || chapterIndex < 0 || chapterIndex >= novel.chapters.length) {
      return;
    }

    setCurrentChapterIndex(chapterIndex);
    // Optimistically set the chapter if it's already loaded
    if (novel.chapters[chapterIndex]?.content?.length > 0) {
      setActiveChapter(novel.chapters[chapterIndex]);
    } else {
      // Fetch the full chapter content if it's not loaded
      setIsLoading(true);
      try {
        const fullChapter = await loadChapter(novel.id, chapterIndex);
        if (fullChapter) {
          setActiveChapter(fullChapter);
          // Optionally update the novel object with the full chapter data
          setNovel(prevNovel => {
            if (!prevNovel) return null;
            const newChapters = [...prevNovel.chapters];
            newChapters[chapterIndex] = fullChapter;
            return { ...prevNovel, chapters: newChapters };
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load chapter.");
      } finally {
        setIsLoading(false);
      }
    }
  }, [novel]);

  return {
    novel,
    activeChapter,
    currentChapterIndex,
    isLoading,
    error,
    selectChapter,
  };
}
