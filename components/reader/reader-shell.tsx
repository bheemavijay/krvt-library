"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Novel, ReaderTheme } from "@/types";

import { useSettingsModal } from "@/components/settings/settings-modal-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getBookmarksState,
  getServerBookmarksState,
  saveNovelBookmark,
  subscribeToBookmarks,
} from "@/lib/bookmark-storage";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_READER_THEME,
  getReadingState,
  getServerReadingState,
  saveChapterScrollPosition,
  saveNovelReadingProgress,
  subscribeToReadingState,
} from "@/lib/reader-storage";
import { clampChapterIndex, cn, getReadingProgress, isBrowser } from "@/lib/utils";

type ReaderShellProps = {
  novel: Novel;
  chapterIndex: number;
};

export function ReaderShell({ novel, chapterIndex }: ReaderShellProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const saveScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isChaptersOpen, setIsChaptersOpen] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [bookmarkMessage, setBookmarkMessage] = useState<{
    chapterIndex: number;
    text: string;
  } | null>(null);
  const router = useRouter();
  const { isOpen: isSettingsOpen, open: openSettings } = useSettingsModal();
  const readingState = useSyncExternalStore(
    subscribeToReadingState,
    getReadingState,
    getServerReadingState,
  );
  const bookmarksState = useSyncExternalStore(
    subscribeToBookmarks,
    getBookmarksState,
    getServerBookmarksState,
  );

  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeechIndex, setCurrentSpeechIndex] = useState(0);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const savedProgress = readingState.progressByNovel[novel.id];
  const activeChapterIndex = clampChapterIndex(chapterIndex, novel.chapters.length);
  const fontFamily = readingState.fontFamily ?? DEFAULT_FONT_FAMILY;
  const fontSize = savedProgress?.fontSize ?? readingState.fontSize ?? DEFAULT_FONT_SIZE;
  const lineHeight = readingState.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const theme = readingState.theme ?? DEFAULT_READER_THEME;
  const chapter = novel.chapters[activeChapterIndex];
  const progressLabel = getReadingProgress(activeChapterIndex + 1, novel.chapters.length);
  const estimatedReadMinutes = Math.max(1, Math.ceil(getWordCount(chapter.content) / 200));
  const savedScrollTop = savedProgress?.chapterScrollPositions?.[String(activeChapterIndex)] ?? 0;
  const isBookmarked = (bookmarksState[novel.id] ?? []).some(
    (bookmark) => bookmark.chapterIndex === activeChapterIndex,
  );

  const previousChapterHref =
    activeChapterIndex > 0 ? `/novel/${novel.id}/${activeChapterIndex}` : undefined;
  const nextChapterHref =
    activeChapterIndex < novel.chapters.length - 1
      ? `/novel/${novel.id}/${activeChapterIndex + 2}`
      : undefined;

  // --- TTS LOGIC ---
  const handleSpeakNext = useCallback(() => {
    if (!isBrowser() || !("speechSynthesis" in window)) return;

    const contentArray = Array.isArray(chapter.content) ? chapter.content : [chapter.content];

    // If we've reached the end of the chapter
    if (currentSpeechIndex >= contentArray.length) {
      setIsSpeaking(false);
      window.speechSynthesis.cancel();

      // Auto-navigate to next chapter if available
      if (nextChapterHref) {
        router.push(nextChapterHref);
      }
      return;
    }

    const textToSpeak = contentArray[currentSpeechIndex];
    if (!textToSpeak || !textToSpeak.trim()) {
      // Skip empty paragraphs
      setCurrentSpeechIndex(prev => prev + 1);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    speechRef.current = utterance;

    utterance.onend = () => {
      // Small delay helps some voices not cut off words abruptly
      setTimeout(() => {
        if (isSpeaking) {
           setCurrentSpeechIndex(prev => prev + 1);
        }
      }, 50);
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled') {
         console.error("Speech synthesis error", e);
         setIsSpeaking(false);
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [currentSpeechIndex, chapter.content, isSpeaking, nextChapterHref, router]);

  // Effect to trigger next speech when index changes while speaking
  useEffect(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel(); // Stop whatever is currently playing
      handleSpeakNext();
    }
  }, [currentSpeechIndex, isSpeaking, handleSpeakNext]);

  // Cleanup speech on unmount or chapter change
  useEffect(() => {
    return () => {
      if (isBrowser() && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [chapter.id]);

  // Reset speech index when chapter changes
  useEffect(() => {
    setCurrentSpeechIndex(0);
    setIsSpeaking(false);
  }, [chapter.id]);


  const toggleSpeech = () => {
    if (!isBrowser() || !("speechSynthesis" in window)) {
       alert("Your browser does not support text-to-speech.");
       return;
    }

    if (!isSpeaking) {
      setCurrentSpeechIndex(0);
      setIsSpeaking(true);
    } else {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // --- END TTS LOGIC ---

  useEffect(() => {
    saveNovelReadingProgress(novel.id, activeChapterIndex, fontSize);
  }, [activeChapterIndex, fontSize, novel.id]);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    const behavior = hasMountedRef.current && savedScrollTop === 0 ? "smooth" : "auto";
    window.scrollTo({ top: savedScrollTop, behavior });
    hasMountedRef.current = true;
  }, [activeChapterIndex, savedScrollTop]);

  useEffect(() => {
    if (!contentRef.current) {
      return;
    }

    contentRef.current.animate(
      [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "translateY(0px)" },
      ],
      { duration: 240, easing: "ease-out" },
    );
  }, [chapter.id]);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    const updateProgress = () => {
      const contentElement = contentRef.current;

      if (!contentElement) {
        setReadingProgress(0);
        return;
      }

      const contentTop = contentElement.offsetTop;
      const scrollTop = window.scrollY;
      const scrollHeight = contentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const scrollableHeight = Math.max(scrollHeight - clientHeight, 0);

      if (scrollableHeight <= 0) {
        setReadingProgress(scrollTop >= contentTop ? 100 : 0);
        return;
      }

      setReadingProgress(
        Math.min(Math.max(((scrollTop - contentTop) / scrollableHeight) * 100, 0), 100),
      );
    };

    const handleScroll = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        updateProgress();
      });
    };

    updateProgress();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [chapter.id]);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    const queueScrollSave = () => {
      if (saveScrollTimeoutRef.current) {
        clearTimeout(saveScrollTimeoutRef.current);
      }

      saveScrollTimeoutRef.current = setTimeout(() => {
        saveChapterScrollPosition(novel.id, activeChapterIndex, window.scrollY);
      }, 2000);
    };

    window.addEventListener("scroll", queueScrollSave, { passive: true });

    return () => {
      window.removeEventListener("scroll", queueScrollSave);

      if (saveScrollTimeoutRef.current) {
        clearTimeout(saveScrollTimeoutRef.current);
        saveScrollTimeoutRef.current = null;
      }

      saveChapterScrollPosition(novel.id, activeChapterIndex, window.scrollY);
    };
  }, [activeChapterIndex, novel.id]);

  const handleBookmark = () => {
    const result = saveNovelBookmark(novel.id, activeChapterIndex, chapter.title);

    setBookmarkMessage({
      chapterIndex: activeChapterIndex,
      text: result.added
        ? "Bookmark saved for this chapter."
        : "This chapter is already bookmarked.",
    });
  };

  const handleChapterSelect = (targetChapterIndex: number) => {
    setIsChaptersOpen(false);
    router.push(`/novel/${novel.id}/${targetChapterIndex + 1}`);
  };

  const handleReaderKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft" && previousChapterHref) {
      event.preventDefault();
      router.push(previousChapterHref);
    }

    if (event.key === "ArrowRight" && nextChapterHref) {
      event.preventDefault();
      router.push(nextChapterHref);
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    pointerStartRef.current = { x: touch.clientX, y: touch.clientY };

    if (!isBrowser() || window.innerWidth >= 768 || isSettingsOpen || isChaptersOpen) {
      touchStartRef.current = null;
      return;
    }

    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (!isBrowser() || window.innerWidth >= 768 || isSettingsOpen || isChaptersOpen) {
      touchStartRef.current = null;
      return;
    }

    const touchStart = touchStartRef.current;

    if (!touchStart) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    touchStartRef.current = null;

    if (absDeltaX < 70 || absDeltaX < absDeltaY * 1.4) {
      return;
    }

    if (deltaX < 0 && nextChapterHref) {
      router.push(nextChapterHref);
    }

    if (deltaX > 0 && previousChapterHref) {
      router.push(previousChapterHref);
    }
  };

  const handleReaderClick = (event: React.MouseEvent<HTMLElement>) => {
    if (isSettingsOpen || isChaptersOpen) {
      return;
    }

    const target = event.target as HTMLElement;

    if (target.closest("a, button, input, label, aside")) {
      return;
    }

    const pointerStart = pointerStartRef.current;

    if (pointerStart) {
      const deltaX = Math.abs(event.clientX - pointerStart.x);
      const deltaY = Math.abs(event.clientY - pointerStart.y);

      if (deltaX > 12 || deltaY > 12) {
        pointerStartRef.current = null;
        return;
      }
    }

    pointerStartRef.current = null;
    setIsImmersiveMode((current) => !current);
  };

  const themeStyles = getThemeStyles(theme);

  return (
    <main
      tabIndex={0}
      onKeyDown={handleReaderKeyDown}
      onClick={handleReaderClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 py-1 pb-28 outline-none sm:gap-6 sm:py-2 sm:pb-32"
      style={{ backgroundColor: "#121212" }}
    >
      <div className="fixed left-0 right-0 top-0 z-40 h-1 overflow-hidden bg-white/6">
        <div
          className="h-full bg-accent/85 transition-[width] duration-150 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <div
        className={cn(
          "flex flex-col gap-4 rounded-[1.6rem] border border-white/8 bg-black/30 p-4 shadow-[var(--shadow-soft)] backdrop-blur transition-all duration-300 sm:rounded-[2rem] sm:p-5 sm:flex-row sm:items-center sm:justify-between",
          isImmersiveMode && "pointer-events-none -translate-y-3 opacity-0",
        )}
      >
        <div className="space-y-2">
          <Link
            href={`/novel/${novel.id}`}
            className="text-sm text-muted transition hover:text-accent"
          >
            Back to novel
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent">{progressLabel}</p>
            <h1 className="font-heading text-2xl text-foreground sm:text-4xl">{novel.title}</h1>
            <p className="mt-1 text-sm text-muted">by {novel.author}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
             type="button"
             onClick={toggleSpeech}
             className={cn(
               "gap-2 rounded-full px-3 sm:px-4",
               isSpeaking && "border-accent bg-accent-soft text-accent"
             )}
             aria-label={isSpeaking ? "Pause speech" : "Read aloud"}
          >
            {isSpeaking ? "⏸ Pause" : "▶ Read Aloud"}
          </Button>

          <Button
            type="button"
            onClick={() => setIsChaptersOpen((current) => !current)}
            className="rounded-full px-3 sm:px-4"
            aria-label="Open chapters panel"
          >
            Chapters
          </Button>
          <Button
            type="button"
            onClick={handleBookmark}
            className={cn(
              "gap-2 rounded-full px-3 sm:px-4",
              isBookmarked && "border-accent bg-accent-soft text-accent",
            )}
            aria-label={isBookmarked ? "Chapter bookmarked" : "Bookmark this chapter"}
          >
            <span aria-hidden="true" className="text-base leading-none">
              {isBookmarked ? "?" : "?"}
            </span>
            <span className="hidden sm:inline">Bookmark</span>
          </Button>
          <Button
            type="button"
            onClick={() => {
              setIsChaptersOpen(false);
              openSettings();
            }}
            className="size-10 rounded-full px-0 text-base"
            aria-label="Open reader settings"
          >
            ?
          </Button>
        </div>
      </div>

      {bookmarkMessage?.chapterIndex === activeChapterIndex ? (
        <p className="self-start rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
          {bookmarkMessage.text}
        </p>
      ) : null}

      <Card
        className="rounded-[1.6rem] border-white/6 px-4 py-6 sm:rounded-[2rem] sm:px-8 sm:py-10"
        style={{
          backgroundColor: themeStyles.cardBackground,
          color: themeStyles.textColor,
        }}
      >
        <div
          key={chapter.id}
          ref={contentRef}
          className="mx-auto flex w-full max-w-[700px] flex-col gap-6 transition-opacity duration-300 sm:gap-8"
        >
          <header
            className="space-y-3 border-b pb-6 text-center"
            style={{ borderColor: themeStyles.dividerColor }}
          >
            <p
              className="text-sm uppercase tracking-[0.3em]"
              style={{ color: themeStyles.accentColor }}
            >
              Chapter {chapter.order}
            </p>
            <h2 className="font-heading text-2xl sm:text-3xl">{chapter.title}</h2>
            <p className="text-sm" style={{ color: themeStyles.bodyColor }}>
              {estimatedReadMinutes} min read
            </p>
          </header>

          <article
            className="space-y-5 text-left sm:space-y-6"
            style={{
              fontFamily,
              fontSize: `${fontSize}px`,
              lineHeight,
              color: themeStyles.bodyColor,
            }}
          >
           {(Array.isArray(chapter.content) ? chapter.content : [chapter.content]).map((paragraph, i) => (
             <p
               key={i}
               className={cn("transition-colors duration-200", isSpeaking && i === currentSpeechIndex && "bg-accent/20 rounded px-1")}
             >
               {paragraph}
             </p>
           ))}
          </article>
        </div>
      </Card>

      {isChaptersOpen ? (
        <button
          type="button"
          aria-label="Close chapter list"
          onClick={() => setIsChaptersOpen(false)}
          className="fixed inset-0 z-20 bg-black/35 backdrop-blur-[2px]"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 flex max-h-[70vh] flex-col gap-4 rounded-t-[1.75rem] border-t px-4 py-5 shadow-[var(--shadow)] transition-transform duration-300 sm:inset-x-auto sm:right-0 sm:top-0 sm:h-full sm:w-[22rem] sm:max-h-none sm:max-w-[88vw] sm:rounded-none sm:rounded-l-[1.75rem] sm:border-l sm:border-t-0",
          isChaptersOpen
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-full sm:translate-x-full sm:translate-y-0",
        )}
        style={{
          backgroundColor: "#121212",
          borderColor: themeStyles.dividerColor,
          color: themeStyles.textColor,
        }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-white/10 sm:hidden" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-xl">Chapters</h3>
            <p className="mt-1 text-sm" style={{ color: themeStyles.bodyColor }}>
              Jump to any chapter instantly.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setIsChaptersOpen(false)}
            className="rounded-full px-4"
            aria-label="Close chapters panel"
          >
            Close
          </Button>
        </div>

        <div className="overflow-y-auto pr-1">
          <div className="space-y-2">
            {novel.chapters.map((item, index) => {
              const isActive = index === activeChapterIndex;

              return (
                <button
                  key={`${index}-${item.id}`}
                  type="button"
                  onClick={() => handleChapterSelect(index)}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 rounded-[1.25rem] border px-4 py-3 text-left transition duration-200",
                    isActive
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-white/8 bg-white/4 hover:border-accent/45 hover:bg-white/8",
                  )}
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.28em] opacity-80">
                      Chapter {index + 1}
                    </p>
                    <p className={cn("truncate text-sm sm:text-base", isActive && "text-accent")}>
                      {item.title}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs uppercase tracking-[0.2em] opacity-70">
                    {isActive ? "Current" : "Open"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <div
        className={cn(
          "sticky bottom-4 z-20 mt-auto transition-all duration-300",
          isImmersiveMode && "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <div className="mx-auto flex w-full max-w-[700px] items-center gap-3 rounded-full border border-white/10 bg-black/45 p-3 shadow-[var(--shadow)] backdrop-blur">
          {previousChapterHref ? (
            <Button href={previousChapterHref} className="flex-1">
              Prev
            </Button>
          ) : (
            <Button type="button" disabled className="flex-1">
              Prev
            </Button>
          )}
          <div className="px-2 text-center text-xs uppercase tracking-[0.28em] text-muted">
            {chapter.order}
          </div>
          {nextChapterHref ? (
            <Button href={nextChapterHref} className="flex-1">
              Next
            </Button>
          ) : (
            <Button type="button" disabled className="flex-1">
              Next
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

function getThemeStyles(theme: ReaderTheme) {
  if (theme === "sepia") {
    return {
      cardBackground: "#2b2218",
      textColor: "#f0e4cf",
      bodyColor: "#dbcdb6",
      dividerColor: "rgba(240, 228, 207, 0.12)",
      accentColor: "#c59a53",
    };
  }

  return {
    cardBackground: "#1a1814",
    textColor: "#f5ecd9",
    bodyColor: "#f5ecd9",
    dividerColor: "rgba(245, 236, 217, 0.12)",
    accentColor: "#e0bc52",
  };
}

function getWordCount(paragraphs: string[]) {
  if (!Array.isArray(paragraphs)) return 0;

  return paragraphs.reduce((count, paragraph) => {
    const words = paragraph.split(/\s+/);
    return count + words.length;
  }, 0);
}
