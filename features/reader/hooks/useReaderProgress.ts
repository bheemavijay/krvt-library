import { useEffect } from "react";

import { useProgress } from "@/features/reader/hooks/useProgress";

export function useReaderProgress({
  novelId,
  chapterIndex,
  hasNovel,
  fontSize,
}: {
  novelId: string;
  chapterIndex: number;
  hasNovel: boolean;
  fontSize: number;
}) {
  const { saveScrollPosition, saveChapterChange } = useProgress(novelId, chapterIndex);

  useEffect(() => {
    if (!hasNovel) return;
    saveChapterChange(fontSize);
  }, [fontSize, hasNovel, saveChapterChange]);

  return {
    saveScrollPosition,
  };
}
