"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Novel, ReaderLineHeight, ReaderTheme } from "@/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_READER_THEME,
  getReadingState,
  getServerReadingState,
  saveChapterScrollPosition,
  saveNovelReadingProgress,
  saveReaderSettings,
  subscribeToReadingState,
} from "@/lib/reader-storage";
import { clampChapterIndex, cn, getReadingProgress, isBrowser } from "@/lib/utils";

type ReaderShellProps = {
  novel: Novel;
  chapterIndex: number;
};

const fontSizeOptions = [16, 18, 20, 22];
const minFontSize = fontSizeOptions[0];
const maxFontSize = fontSizeOptions[fontSizeOptions.length - 1];
const lineHeightOptions: ReaderLineHeight[] = [1.6, 1.8, 2];

export function ReaderShell({ novel, chapterIndex }: ReaderShellProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const saveScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const router = useRouter();
  const readingState = useSyncExternalStore(
    subscribeToReadingState,
    getReadingState,
    getServerReadingState,
  );

  const savedProgress = readingState.progressByNovel[novel.id];
  const activeChapterIndex = clampChapterIndex(chapterIndex, novel.chapters.length);
  const fontSize = savedProgress?.fontSize ?? readingState.fontSize ?? DEFAULT_FONT_SIZE;
  const lineHeight = readingState.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const theme = readingState.theme ?? DEFAULT_READER_THEME;

  const chapter = novel.chapters[activeChapterIndex];
  const progressLabel = getReadingProgress(activeChapterIndex + 1, novel.chapters.length);
  const estimatedReadMinutes = Math.max(
    1,
    Math.ceil(getWordCount(chapter.content) / 200),
  );
  const savedScrollTop = savedProgress?.chapterScrollPositions?.[String(activeChapterIndex)] ?? 0;

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
      {
        duration: 240,
        easing: "ease-out",
      },
    );
  }, [chapter.id]);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const scrollableHeight = scrollHeight - clientHeight;

      if (scrollableHeight <= 0) {
        setReadingProgress(0);
        return;
      }

      const nextProgress = Math.min((scrollTop / scrollableHeight) * 100, 100);

      setReadingProgress(nextProgress);
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

  const previousChapterHref =
    activeChapterIndex > 0 ? `/novel/${novel.id}/${activeChapterIndex}` : undefined;
  const nextChapterHref =
    activeChapterIndex < novel.chapters.length - 1
      ? `/novel/${novel.id}/${activeChapterIndex + 2}`
      : undefined;
  const decreaseFontSize = () => {
    const nextFontSize = Math.max(fontSize - 2, minFontSize);

    saveReaderSettings({ fontSize: nextFontSize });
    saveNovelReadingProgress(novel.id, activeChapterIndex, nextFontSize);
  };
  const increaseFontSize = () => {
    const nextFontSize = Math.min(fontSize + 2, maxFontSize);

    saveReaderSettings({ fontSize: nextFontSize });
    saveNovelReadingProgress(novel.id, activeChapterIndex, nextFontSize);
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

    pointerStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };

    if (!isBrowser() || window.innerWidth >= 768 || isSettingsOpen) {
      touchStartRef.current = null;
      return;
    }

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };
  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (!isBrowser() || window.innerWidth >= 768 || isSettingsOpen) {
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
    if (isSettingsOpen) {
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
    >
      <div className="sticky top-0 z-30 h-1 overflow-hidden rounded-full bg-white/6">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <div
        className={cn(
          "flex flex-col gap-4 rounded-[1.6rem] border border-border bg-panel/75 p-4 shadow-[var(--shadow)] backdrop-blur transition-all duration-300 sm:rounded-[2rem] sm:p-5 sm:flex-row sm:items-center sm:justify-between",
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
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            onClick={decreaseFontSize}
            disabled={fontSize <= minFontSize}
            className="size-10 rounded-full px-0"
          >
            -
          </Button>
          <div className="min-w-14 text-center text-sm text-muted-strong">{fontSize}px</div>
          <Button
            type="button"
            onClick={increaseFontSize}
            disabled={fontSize >= maxFontSize}
            className="size-10 rounded-full px-0"
          >
            +
          </Button>
          <Button
            type="button"
            onClick={() => setIsSettingsOpen((current) => !current)}
            className="size-10 rounded-full px-0 text-base"
            aria-label="Open reader settings"
          >
            ⚙
          </Button>
        </div>
      </div>

      <Card
        className="rounded-[1.6rem] px-4 py-6 sm:rounded-[2rem] sm:px-8 sm:py-10"
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
              fontSize: `${fontSize}px`,
              lineHeight,
              color: themeStyles.bodyColor,
            }}
          >
            {chapter.content.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </article>
        </div>
      </Card>

      <aside
        className={cn(
          "fixed right-0 top-0 z-30 flex h-full w-[18rem] max-w-[88vw] flex-col gap-5 border-l px-4 py-5 shadow-[var(--shadow)] transition-transform duration-300",
          isSettingsOpen ? "translate-x-0" : "translate-x-full",
        )}
        style={{
          backgroundColor: themeStyles.drawerBackground,
          borderColor: themeStyles.dividerColor,
          color: themeStyles.textColor,
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-xl">Reader settings</h3>
          <Button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="size-10 rounded-full px-0"
            aria-label="Close reader settings"
          >
            ×
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em]" style={{ color: themeStyles.accentColor }}>
            Font size
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={decreaseFontSize}
              disabled={fontSize <= minFontSize}
              className="size-10 rounded-full px-0"
            >
              -
            </Button>
            <input
              type="range"
              min={minFontSize}
              max={maxFontSize}
              step={2}
              value={fontSize}
              onChange={(event) => {
                const nextFontSize = Number(event.target.value);

                saveReaderSettings({ fontSize: nextFontSize });
                saveNovelReadingProgress(novel.id, activeChapterIndex, nextFontSize);
              }}
              className="w-full accent-[var(--reader-accent)]"
              style={{ ["--reader-accent" as string]: themeStyles.accentColor }}
            />
            <Button
              type="button"
              onClick={increaseFontSize}
              disabled={fontSize >= maxFontSize}
              className="size-10 rounded-full px-0"
            >
              +
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em]" style={{ color: themeStyles.accentColor }}>
            Line height
          </p>
          <div className="flex gap-2">
            {lineHeightOptions.map((option) => (
              <Button
                key={option}
                type="button"
                onClick={() => saveReaderSettings({ lineHeight: option })}
                className={cn(
                  "flex-1",
                  option === lineHeight && "border-accent bg-accent-soft text-accent",
                )}
              >
                {option.toFixed(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em]" style={{ color: themeStyles.accentColor }}>
            Theme
          </p>
          <div className="space-y-2">
            {(["dark", "light", "sepia"] as ReaderTheme[]).map((option) => (
              <Button
                key={option}
                type="button"
                onClick={() => saveReaderSettings({ theme: option })}
                className={cn(
                  "w-full justify-start capitalize",
                  option === theme && "border-accent bg-accent-soft text-accent",
                )}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
      </aside>

      <div
        className={cn(
          "sticky bottom-4 z-20 mt-auto transition-all duration-300",
          isImmersiveMode && "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <div className="mx-auto flex w-full max-w-[700px] items-center gap-3 rounded-full border border-white/10 bg-panel-strong/92 p-3 shadow-[var(--shadow)] backdrop-blur">
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
  if (theme === "light") {
    return {
      cardBackground: "#f5f1e8",
      drawerBackground: "rgba(245, 241, 232, 0.98)",
      textColor: "#1f1d19",
      bodyColor: "#38342d",
      dividerColor: "rgba(31, 29, 25, 0.12)",
      accentColor: "#8a6428",
    };
  }

  if (theme === "sepia") {
    return {
      cardBackground: "#2b2218",
      drawerBackground: "rgba(43, 34, 24, 0.98)",
      textColor: "#f0e4cf",
      bodyColor: "#dbcdb6",
      dividerColor: "rgba(240, 228, 207, 0.12)",
      accentColor: "#c59a53",
    };
  }

  return {
    cardBackground: "rgba(25, 28, 38, 0.92)",
    drawerBackground: "rgba(17, 19, 26, 0.98)",
    textColor: "#f5f7fa",
    bodyColor: "#c6ceda",
    dividerColor: "rgba(255, 255, 255, 0.08)",
    accentColor: "#d4b16a",
  };
}

function getWordCount(paragraphs: string[]) {
  return paragraphs.reduce((count, paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);

    return count + words.length;
  }, 0);
}
