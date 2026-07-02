"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

import { KrvtLoader } from "@/components/brand/krvt-loader";
import ReaderControls from "@/components/reader/reader-controls";
import { SettingsModal } from "@/components/reader/settings-modal";
import {
  ensureReaderFontsLoaded,
  getDefaultReaderSettings,
  getReaderFontStack,
  saveChapterScrollPosition,
  saveSettings,
  saveNovelReadingProgress,
  useReaderSettings,
  type ReplacementRule,
} from "@/features/reader";
import {
  getChapter,
  getNovelChapterList,
  getNovelSummary,
  isChapterBookmarked,
  removeNovelBookmark,
  saveStoredNovelBookmark as saveNovelBookmark,
  subscribeToStoredBookmarks as subscribeToBookmarks,
} from "@/features/reader";
import {
  clearTtsResumeState,
  createTtsSessionManager,
  getTtsResumeState,
  initializeTts,
  isPaused,
  isSpeaking,
  pause,
  resume,
  saveTtsResumeState,
  speak,
  stop,
} from "@/features/tts";
import { cn } from "@/shared/utils";
import type { Novel } from "@/shared/types";

type Props = {
  novelId: string;
  chapterParam: string;
};

export function ReaderPageClient({ novelId, chapterParam }: Props) {
  const router = useRouter();
  const settings = useReaderSettings() ?? getDefaultReaderSettings();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChapterPanelOpen, setIsChapterPanelOpen] = useState(false);
  const [chapterSearch, setChapterSearch] = useState("");
  const [ttsState, setTtsState] = useState<"idle" | "playing" | "paused" | "stopped">("idle");
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState<number | null>(null);
  const [, setStatusMessage] = useState("");
  const [bookmarked, setBookmarked] = useState(false);

  const longPressTimeoutRef = useRef<number | null>(null);
  const activeChapterRef = useRef<HTMLAnchorElement | null>(null);
  const paragraphRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const ttsSessionRef = useRef(createTtsSessionManager());
  const settingsRef = useRef(settings);
  const nextHrefRef = useRef<string | undefined>(undefined);
  const lastPlaybackParagraphIndexRef = useRef<number | null>(null);

  const safeNovelId = decodeURIComponent(novelId).trim();
  const parsedChapterIndex = Number(chapterParam) - 1;
  const requestedChapterIndex =
    Number.isNaN(parsedChapterIndex) || parsedChapterIndex < 0 ? 0 : parsedChapterIndex;
  const progressKey = `progress_${safeNovelId}`;
  const topNavigationKey = "krvt-reader-open-chapter-at-top";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [summary, chapterList, activeChapter] = await Promise.all([
          getNovelSummary(safeNovelId),
          getNovelChapterList(safeNovelId),
          getChapter(safeNovelId, requestedChapterIndex),
        ]);
        if (!cancelled) {
          const nextNovel = summary
            ? {
                ...summary,
                sourceUrl: summary.sourceUrl ?? "",
                alternative: "",
                rating: undefined,
                genres: summary.genres ?? [],
                tags: summary.tags ?? [],
                lastUpdated: summary.lastUpdated ?? new Date().toISOString(),
                chapters: chapterList.map((item, index) =>
                  index === requestedChapterIndex && activeChapter ? activeChapter : item,
                ),
              }
            : null;
          setNovel(nextNovel);
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to load novel:", e);
        if (!cancelled) {
          setNovel(null);
          setLoading(false);
        }
      }
      if (cancelled) {
        return;
      }

      window.setTimeout(() => {
        const topRequest = readTopNavigationRequest(topNavigationKey);
        const shouldOpenAtTop =
          topRequest?.novelId === safeNovelId && topRequest.chapterIndex === requestedChapterIndex;

        window.scrollTo({ top: 0, behavior: "auto" });
        if (shouldOpenAtTop) {
          clearTopNavigationRequest(topNavigationKey);
          return;
        }

        try {
          const saved = window.localStorage.getItem(progressKey);
          if (!saved) {
            return;
          }

          const parsed = JSON.parse(saved) as { chapterIndex?: number; scrollY?: number };
          if (parsed.chapterIndex === requestedChapterIndex && parsed.scrollY) {
            window.scrollTo({ top: parsed.scrollY, behavior: "auto" });
          }
        } catch {
          // Ignore corrupted scroll progress.
        }
      }, 80);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [progressKey, requestedChapterIndex, safeNovelId]);

  useEffect(() => {
    let timeout: number | null = null;

    const handleScroll = () => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }

      timeout = window.setTimeout(() => {
        try {
          const payload = {
            chapterIndex: requestedChapterIndex,
            scrollY: window.scrollY,
          };
          window.localStorage.setItem(progressKey, JSON.stringify(payload));
          saveChapterScrollPosition(safeNovelId, requestedChapterIndex, window.scrollY);
        } catch {
          // Ignore scroll persistence failures.
        }
      }, 250);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, [progressKey, requestedChapterIndex, safeNovelId]);

  useEffect(() => {
    if (!novel) {
      return;
    }

    const syncBookmarkState = () => {
      setBookmarked(isChapterBookmarked(novel.id, requestedChapterIndex));
    };

    syncBookmarkState();
    return subscribeToBookmarks(syncBookmarkState);
  }, [novel, requestedChapterIndex]);

  useEffect(() => {
    if (!novel) {
      return;
    }

    saveNovelReadingProgress(novel.id, requestedChapterIndex, settings.fontSize);
  }, [novel, requestedChapterIndex, settings.fontSize]);

  useEffect(() => {
    if (!isChapterPanelOpen || !activeChapterRef.current) {
      return;
    }

    activeChapterRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [chapterSearch, isChapterPanelOpen]);

  useEffect(() => {
    const ttsSession = ttsSessionRef.current;

    return () => {
      if (longPressTimeoutRef.current !== null) {
        clearTimeout(longPressTimeoutRef.current);
      }
      ttsSession.cancel();
      stop();
    };
  }, []);

  const chapterIndex = novel
    ? Math.min(requestedChapterIndex, Math.max(0, novel.chapters.length - 1))
    : requestedChapterIndex;
  const chapter = novel?.chapters[chapterIndex];
  const totalChapters = novel?.chapters.length ?? 0;
  const progressPercent =
    totalChapters > 0 ? Math.round(((chapterIndex + 1) / totalChapters) * 100) : 0;
  const textAlign = settings.textAlign as CSSProperties["textAlign"];
  const readerMaxWidth = settings.contentMaxWidth >= 9999 ? "100%" : `${settings.contentMaxWidth}px`;
  const readerFontFamily = getReaderFontStack(settings.fontFamily);

  useEffect(() => {
    ensureReaderFontsLoaded();
  }, []);

  const normalizedContent = useMemo(() => {
    if (!chapter) {
      return [];
    }

    const content = Array.isArray(chapter.content)
      ? chapter.content.filter(Boolean)
      : String(chapter.content ?? "")
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean);

    return applyTermReplacements(content, settings.replacements);
  }, [chapter, settings.replacements]);
  const paragraphProgressPercent =
    currentParagraphIndex !== null && normalizedContent.length > 0
      ? Math.round(((currentParagraphIndex + 1) / normalizedContent.length) * 100)
      : 0;

  const previousHref =
    novel && chapterIndex > 0 ? `/reader?id=${novel.id}&chapter=${chapterIndex}` : undefined;
  const nextHref =
    novel && chapterIndex < novel.chapters.length - 1
      ? `/reader?id=${novel.id}&chapter=${chapterIndex + 2}`
      : undefined;

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    nextHrefRef.current = nextHref;
  }, [nextHref]);

  const prepareForNavigation = useCallback(
    (targetChapterIndex: number) => {
      if (ttsState === "playing" || ttsState === "paused") {
        try {
          window.sessionStorage.setItem("krvt-reader-autoplay-tts", "1");
        } catch {
          // Ignore
        }
      }
      markTopNavigation(topNavigationKey, safeNovelId, targetChapterIndex);
    },
    [safeNovelId, ttsState],
  );

  const navigateToChapter = useCallback(
    (href: string, targetChapterIndex: number) => {
      prepareForNavigation(targetChapterIndex);
      router.push(href);
    },
    [prepareForNavigation, router],
  );

  const filteredChapters = useMemo(() => {
    const query = chapterSearch.trim().toLowerCase();
    return (novel?.chapters ?? [])
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => {
        if (!query) {
          return true;
        }

        return String(index + 1).includes(query) || item.title.toLowerCase().includes(query);
      });
  }, [chapterSearch, novel?.chapters]);

  useEffect(() => {
    paragraphRefs.current = paragraphRefs.current.slice(0, normalizedContent.length);
  }, [normalizedContent.length]);

  useEffect(() => {
    if (!settings.autoScroll || ttsState !== "playing" || currentParagraphIndex === null) {
      return;
    }

    const paragraph = paragraphRefs.current[currentParagraphIndex];
    if (!paragraph) {
      return;
    }

    const rect = paragraph.getBoundingClientRect();
    const topComfort = Math.round(window.innerHeight * 0.22);
    const bottomComfort = Math.round(window.innerHeight * 0.78);

    if (rect.top < topComfort || rect.bottom > bottomComfort) {
      paragraph.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [currentParagraphIndex, settings.autoScroll, ttsState]);

  useEffect(() => {
    ttsSessionRef.current.cancel();
    stop();
    setTtsState("idle");
    setCurrentParagraphIndex(null);
    lastPlaybackParagraphIndexRef.current = null;
  }, [chapter?.id]);

  const playParagraph = useCallback(
    async (paragraphIndex: number, runId: number) => {
      const paragraph = normalizedContent[paragraphIndex]?.trim();
      if (!paragraph) {
        const nextIndex = normalizedContent.findIndex(
          (line, index) => index > paragraphIndex && line.trim(),
        );
        if (nextIndex === -1) {
          setTtsState("idle");
          setCurrentParagraphIndex(null);
          return;
        }
        await playParagraph(nextIndex, runId);
        return;
      }

      ttsSessionRef.current.markParagraph(paragraphIndex);
      lastPlaybackParagraphIndexRef.current = paragraphIndex;
      setCurrentParagraphIndex(paragraphIndex);
      const started = await speak(paragraph, settingsRef.current, {
        onStart: () => {
          if (!ttsSessionRef.current.isCurrent(runId)) {
            return;
          }
          setTtsState("playing");
        },
        onPause: () => setTtsState("paused"),
        onResume: () => setTtsState("playing"),
        onEnd: () => {
          if (!ttsSessionRef.current.isCurrent(runId)) {
            return;
          }

          const nextIndex = normalizedContent.findIndex(
            (line, index) => index > paragraphIndex && line.trim(),
          );

          if (nextIndex !== -1) {
            void playParagraph(nextIndex, runId);
            return;
          }

          setTtsState("idle");
          setCurrentParagraphIndex(null);

          const latestSettings = settingsRef.current;
          const latestNextHref = nextHrefRef.current;
          if (latestSettings.autoNext && latestNextHref) {
            if (latestSettings.autoPlayTts) {
              window.sessionStorage.setItem("krvt-reader-autoplay-tts", "1");
            }
            markTopNavigation(topNavigationKey, safeNovelId, chapterIndex + 1);
            router.push(latestNextHref);
          }
        },
        onError: (error) => {
          if (!ttsSessionRef.current.isCurrent(runId)) {
            return;
          }
          if (ttsSessionRef.current.isPauseRequested()) {
            return;
          }
          console.error("Reader TTS paragraph failed", { error, paragraphIndex });
          setTtsState("idle");
          setStatusMessage("Text-to-speech could not start.");
        },
      });

      if (!started && ttsSessionRef.current.isCurrent(runId)) {
        if (ttsSessionRef.current.isPauseRequested()) {
          return;
        }
        setTtsState("idle");
      }
    },
    [chapterIndex, normalizedContent, router, safeNovelId],
  );

  const startTtsFromParagraph = useCallback(
    async (startIndex: number) => {
      if (normalizedContent.length === 0) {
        setStatusMessage("There is no chapter text available to read.");
        return;
      }

      const safeStartIndex = Math.min(Math.max(startIndex, 0), normalizedContent.length - 1);
      lastPlaybackParagraphIndexRef.current = safeStartIndex;
      const runId = ttsSessionRef.current.start(safeStartIndex);
      setTtsState("playing");
      await playParagraph(safeStartIndex, runId);
    },
    [normalizedContent.length, playParagraph],
  );

  useEffect(() => {
    if (loading || !novel || normalizedContent.length === 0) {
      return;
    }

    let shouldAutoPlay = "";
    try {
      shouldAutoPlay = window.sessionStorage.getItem("krvt-reader-autoplay-tts") ?? "";
    } catch (e) {
      return;
    }

    if (shouldAutoPlay === "1") {
      window.sessionStorage.removeItem("krvt-reader-autoplay-tts");
      const timeout = window.setTimeout(() => {
        void startTtsFromParagraph(0);
      }, 0);
      return () => clearTimeout(timeout);
    }

    const resumeState = getTtsResumeState();
    if (
      resumeState &&
      resumeState.novelId === safeNovelId &&
      resumeState.chapterIndex === requestedChapterIndex
    ) {
      const timeout = window.setTimeout(() => {
        void startTtsFromParagraph(resumeState.paragraphIndex);
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [loading, novel, startTtsFromParagraph, normalizedContent.length, safeNovelId, requestedChapterIndex]);

  useEffect(() => {
    if (isSettingsOpen || isChapterPanelOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        window.scrollBy({ top: -Math.round(window.innerHeight * 0.24), behavior: "smooth" });
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        window.scrollBy({ top: Math.round(window.innerHeight * 0.24), behavior: "smooth" });
      } else if (event.key === "ArrowLeft" && previousHref) {
        event.preventDefault();
        navigateToChapter(previousHref, chapterIndex - 1);
      } else if (event.key === "ArrowRight" && nextHref) {
        event.preventDefault();
        navigateToChapter(nextHref, chapterIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chapterIndex, isChapterPanelOpen, isSettingsOpen, navigateToChapter, nextHref, previousHref]);

  useEffect(() => {
    if (ttsState === "playing" && currentParagraphIndex !== null) {
      saveTtsResumeState({
        novelId: safeNovelId,
        chapterIndex: requestedChapterIndex,
        paragraphIndex: currentParagraphIndex,
        rate: settings.tts.rate,
        voiceURI: settings.tts.voiceURI,
      });
    } else if (ttsState === "stopped") {
      clearTtsResumeState();
    }
  }, [ttsState, currentParagraphIndex, safeNovelId, requestedChapterIndex, settings.tts.rate, settings.tts.voiceURI]);

  if (loading) {
    return <KrvtLoader />;
  }

  if (!novel) {
    return <p className="p-6 text-red-400">Novel not found.</p>;
  }

  if (!chapter) {
    return <p className="p-6 text-red-400">Chapter not found.</p>;
  }

  const handleToggleTts = async () => {
    const ready = await initializeTts();
    if (!ready) {
      setStatusMessage("Text-to-speech could not start.");
      return;
    }

    if (isSpeaking()) {
      if (isPaused()) {
        resume();
        ttsSessionRef.current.setPauseRequested(false);
        setTtsState("playing");
      } else {
        ttsSessionRef.current.setPauseRequested(true);
        pause();
        setTtsState("paused");
      }
      return;
    }

    if (ttsState === "paused") {
      resume();
      ttsSessionRef.current.setPauseRequested(false);
      setTtsState("playing");
      return;
    }

    await startTtsFromParagraph(ttsState === "stopped" ? 0 : currentParagraphIndex ?? lastPlaybackParagraphIndexRef.current ?? 0);
  };

  const handleStopTts = () => {
    ttsSessionRef.current.cancel();
    stop();
    lastPlaybackParagraphIndexRef.current = null;
    setTtsState("stopped");
    setCurrentParagraphIndex(null);
    clearTtsResumeState();
  };

  const handleBookmarkToggle = () => {
    if (bookmarked) {
      const result = removeNovelBookmark(novel.id, chapterIndex);
      setStatusMessage(result.removed ? "Bookmark removed." : "Bookmark not found.");
      return;
    }

    const result = saveNovelBookmark(novel.id, chapterIndex, chapter.title);
    setStatusMessage(result.added ? "Chapter bookmarked." : "Already bookmarked.");
  };

  const handleParagraphPointerDown =
    (index: number) => (_event: ReactPointerEvent<HTMLParagraphElement>) => {
      if (ttsState !== "playing" && ttsState !== "paused") {
        return;
      }

      if (longPressTimeoutRef.current !== null) {
        clearTimeout(longPressTimeoutRef.current);
      }

      longPressTimeoutRef.current = window.setTimeout(() => {
        void startTtsFromParagraph(index);
      }, 450);
    };

  const clearLongPress = () => {
    if (longPressTimeoutRef.current !== null) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const navButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/70 transition-all duration-150 hover:border-white/20 hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <>
      {isChapterPanelOpen ? (
        <button
          type="button"
          aria-label="Close chapter panel"
          onClick={() => setIsChapterPanelOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-[2px]"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-white/8 bg-[#0d0f13]/98 shadow-lg transition-transform duration-300 sm:shadow-[-24px_0_60px_rgba(0,0,0,0.4)]",
          isChapterPanelOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-3 py-3">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-widest text-[#d4b16a]">{novel.title}</p>
            <h2 className="truncate text-base font-semibold text-white">Chapter Index</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsChapterPanelOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 hover:bg-white/5 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-3 pt-3">
          <input
            type="search"
            value={chapterSearch}
            onChange={(event) => setChapterSearch(event.target.value)}
            placeholder="Search chapters"
            className="w-full rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-white outline-none placeholder:text-white/30 focus:border-white/20"
          />
        </div>

        <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto px-3 pb-6">
          {filteredChapters.map(({ item, index }) => {
            const href = `/reader?id=${novel.id}&chapter=${index + 1}`;
            const isActive = index === chapterIndex;

            return (
              <Link
                key={item.id ?? `${novel.id}-${index}`}
                href={href}
                ref={isActive ? activeChapterRef : undefined}
                onClick={() => {
                  prepareForNavigation(index);
                  setIsChapterPanelOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-all duration-150",
                  isActive
                    ? "border-[#d4b16a]/30 bg-[#d4b16a]/8 text-[#d4b16a]"
                    : "border-white/6 bg-white/3 text-white/70 hover:border-white/12 hover:bg-white/6 hover:text-white",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium sm:text-sm">
                    {index + 1}. {formatChapterIndexTitle(item.title, index)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      <main
        className={cn("min-h-screen", settings.showBottomNav ? "pb-20" : "pb-8")}
        style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
      >
        <div className="w-full px-2 py-2 sm:px-4 sm:py-3">
          <ReaderControls
            novel={novel}
            chapterIndex={chapterIndex}
            totalChapters={totalChapters}
            progressPercent={progressPercent}
            contentMaxWidth={settings.contentMaxWidth}
            paragraphIndex={currentParagraphIndex}
            paragraphCount={normalizedContent.length}
            paragraphProgressPercent={paragraphProgressPercent}
            showProgress={settings.showTopNav}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onToggleTts={handleToggleTts}
            onBookmark={handleBookmarkToggle}
            onOpenChapters={() => setIsChapterPanelOpen((current) => !current)}
            isBookmarked={bookmarked}
            isChapterPanelOpen={isChapterPanelOpen}
            ttsState={ttsState}
            onPrev={() => previousHref && navigateToChapter(previousHref, chapterIndex - 1)}
            onNext={() => nextHref && navigateToChapter(nextHref, chapterIndex + 1)}
            onStopTts={handleStopTts}
          />

          <article
            className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6"
            onDoubleClick={() => setIsSettingsOpen(true)}
            style={{
              color: settings.textColor,
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
              maxWidth: readerMaxWidth,
              fontFamily: readerFontFamily,
              textAlign,
            }}
          >
            {normalizedContent.map((line, index) => {
              const isTitle = index === 0;
              const isHighlighted =
                settings.paragraphHighlight &&
                currentParagraphIndex === index &&
                (ttsState === "playing" || ttsState === "paused");

              return (
                <p
                  key={`${chapter.id}-${index}`}
                  ref={(element) => {
                    paragraphRefs.current[index] = element;
                  }}
                  className={cn(
                    "transition-all duration-300",
                    isTitle
                      ? "mb-8 font-serif text-2xl font-semibold leading-tight tracking-tight sm:mb-10 sm:text-3xl"
                      : "mb-5 sm:mb-6",
                    isHighlighted
                      ? "rounded border-l-2 border-[#d4b16a] bg-[#d4b16a]/[0.08] pl-3 pr-2 py-1 shadow-sm"
                      : "border-l-2 border-transparent pl-3 pr-2 py-1",
                  )}
                  style={{ opacity: isHighlighted || isTitle ? 1 : 0.9 }}
                  onPointerDown={handleParagraphPointerDown(index)}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                  onPointerCancel={clearLongPress}
                >
                  {line}
                </p>
              );
            })}
          </article>

          {settings.showFooter ? (
            <div className="mt-12">
              <div className="mb-6 border-t border-white/8" />
              <div className="flex items-center justify-between gap-3">
                {previousHref ? (
                  <Link
                    href={previousHref}
                    onClick={() => prepareForNavigation(chapterIndex - 1)}
                    className={navButtonClass}
                  >
                    Previous
                  </Link>
                ) : (
                  <button type="button" disabled className={navButtonClass}>
                    Previous
                  </button>
                )}

                {nextHref ? (
                  <Link
                    href={nextHref}
                    onClick={() => prepareForNavigation(chapterIndex + 1)}
                    className={navButtonClass}
                  >
                    Next
                  </Link>
                ) : (
                  <button type="button" disabled className={navButtonClass}>
                    Next
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onChange={(next) => saveSettings(next)}
      />
    </>
  );
}

function markTopNavigation(storageKey: string, novelId: string, chapterIndex: number) {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify({ novelId, chapterIndex }));
  } catch {
    // Ignore unavailable session storage.
  }
}

function readTopNavigationRequest(storageKey: string) {
  try {
    const storedValue = window.sessionStorage.getItem(storageKey);
    if (!storedValue) {
      return null;
    }

    const parsed = JSON.parse(storedValue) as { novelId?: unknown; chapterIndex?: unknown };
    if (typeof parsed.novelId !== "string" || typeof parsed.chapterIndex !== "number") {
      return null;
    }

    return {
      novelId: parsed.novelId,
      chapterIndex: parsed.chapterIndex,
    };
  } catch {
    return null;
  }
}

function clearTopNavigationRequest(storageKey: string) {
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Ignore unavailable session storage.
  }
}

function applyTermReplacements(content: string[], replacements: ReplacementRule[]) {
  return content.map((line) => {
    let result = line
      .replace(/&quot;/gi, '"')
      .replace(/&nbsp;/gi, " ")
      .replace(/&#39;/gi, "'")
      .replace(/\s{2,}/g, " ")
      .replace(/\(To be continued.*?\)/gi, "")
      .trim();

    for (const rule of replacements) {
      if (!rule.find) {
        continue;
      }

      try {
        result = result.replace(createReplacementRegex(rule), rule.replace || "");
      } catch {
        result = replaceWithoutRegex(result, rule);
      }
    }

    return result;
  });
}

function createReplacementRegex(rule: ReplacementRule) {
  const baseFlags = rule.caseSensitive ? "g" : "gi";
  if (!rule.isRegex) {
    return new RegExp(escapeRegex(rule.find), baseFlags);
  }

  return new RegExp(rule.find, baseFlags);
}

function replaceWithoutRegex(value: string, rule: ReplacementRule) {
  if (rule.caseSensitive) {
    return value.split(rule.find).join(rule.replace || "");
  }

  const lowerFind = rule.find.toLowerCase();
  let nextValue = value;
  let index = nextValue.toLowerCase().indexOf(lowerFind);

  while (index !== -1) {
    nextValue =
      nextValue.slice(0, index) +
      (rule.replace || "") +
      nextValue.slice(index + rule.find.length);
    index = nextValue.toLowerCase().indexOf(lowerFind, index + (rule.replace || "").length);
  }

  return nextValue;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatChapterIndexTitle(title: string, index: number) {
  const trimmed = title.trim();
  return trimmed || `Chapter ${index + 1}`;
}
