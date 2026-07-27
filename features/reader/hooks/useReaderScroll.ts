import { useEffect } from "react";
import type { RefObject } from "react";

import type { TtsState } from "@/features/tts";

export function useReaderScroll({
  activeChapterRef,
  chapterSearch,
  clearTopNavigationRequest,
  currentParagraphIndex,
  getLegacyScrollPosition,
  isChapterPanelOpen,
  isLoading,
  paragraphRefs,
  readTopNavigationRequest,
  requestedChapterIndex,
  safeNovelId,
  saveScrollPosition,
  shouldAutoScroll,
  ttsState,
}: {
  activeChapterRef: RefObject<HTMLAnchorElement | null>;
  chapterSearch: string;
  clearTopNavigationRequest: () => void;
  currentParagraphIndex: number | null;
  getLegacyScrollPosition: (novelId: string, chapterIndex: number) => number | null;
  isChapterPanelOpen: boolean;
  isLoading: boolean;
  paragraphRefs: RefObject<Array<HTMLParagraphElement | null>>;
  readTopNavigationRequest: () => { novelId: string; chapterIndex: number } | null;
  requestedChapterIndex: number;
  safeNovelId: string;
  saveScrollPosition: (scrollTop: number) => void;
  shouldAutoScroll: boolean;
  ttsState: TtsState;
}) {
  useEffect(() => {
    if (isLoading) return;
    window.setTimeout(() => {
      const topRequest = readTopNavigationRequest();
      const shouldOpenAtTop =
        topRequest?.novelId === safeNovelId && topRequest.chapterIndex === requestedChapterIndex;

      window.scrollTo({ top: 0, behavior: "auto" });
      if (shouldOpenAtTop) {
        clearTopNavigationRequest();
        return;
      }
      const legacyScrollPosition = getLegacyScrollPosition(safeNovelId, requestedChapterIndex);
      if (legacyScrollPosition) {
        window.scrollTo({ top: legacyScrollPosition, behavior: "auto" });
      }
    }, 80);
  }, [
    clearTopNavigationRequest,
    getLegacyScrollPosition,
    isLoading,
    readTopNavigationRequest,
    requestedChapterIndex,
    safeNovelId,
  ]);

  useEffect(() => {
    let timeout: number | null = null;
    const handleScroll = () => {
      if (timeout !== null) clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        saveScrollPosition(window.scrollY);
      }, 250);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (timeout !== null) clearTimeout(timeout);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [saveScrollPosition]);

  useEffect(() => {
    if (!isChapterPanelOpen || !activeChapterRef.current) return;
    activeChapterRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeChapterRef, chapterSearch, isChapterPanelOpen]);

  useEffect(() => {
    if (!shouldAutoScroll || ttsState !== "playing" || currentParagraphIndex === null) return;
    const paragraph = paragraphRefs.current?.[currentParagraphIndex];
    if (!paragraph) return;
    const rect = paragraph.getBoundingClientRect();
    const topComfort = Math.round(window.innerHeight * 0.22);
    const bottomComfort = Math.round(window.innerHeight * 0.78);
    if (rect.top < topComfort || rect.bottom > bottomComfort) {
      paragraph.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [currentParagraphIndex, paragraphRefs, shouldAutoScroll, ttsState]);
}
