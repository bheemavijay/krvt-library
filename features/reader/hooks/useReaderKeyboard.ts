import { useEffect } from "react";

export function useReaderKeyboard({
  currentChapterIndex,
  isChapterPanelOpen,
  isSettingsOpen,
  navigateToChapter,
  nextHref,
  previousHref,
}: {
  currentChapterIndex: number;
  isChapterPanelOpen: boolean;
  isSettingsOpen: boolean;
  navigateToChapter: (href: string, targetChapterIndex: number) => void;
  nextHref?: string;
  previousHref?: string;
}) {
  useEffect(() => {
    if (isSettingsOpen || isChapterPanelOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable) return;
      if (event.key === "ArrowUp") {
        event.preventDefault();
        window.scrollBy({ top: -Math.round(window.innerHeight * 0.24), behavior: "smooth" });
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        window.scrollBy({ top: Math.round(window.innerHeight * 0.24), behavior: "smooth" });
      } else if (event.key === "ArrowLeft" && previousHref) {
        event.preventDefault();
        navigateToChapter(previousHref, currentChapterIndex - 1);
      } else if (event.key === "ArrowRight" && nextHref) {
        event.preventDefault();
        navigateToChapter(nextHref, currentChapterIndex + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentChapterIndex, isChapterPanelOpen, isSettingsOpen, navigateToChapter, nextHref, previousHref]);
}
