"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

import ReaderControls from "@/components/reader/reader-controls";
import { SettingsModal } from "@/components/reader/settings-modal";
import { saveChapterScrollPosition, saveNovelReadingProgress } from "@/lib/reader-storage";
import {
  getDefaultReaderSettings,
  saveSettings,
  useReaderSettings,
  type ReplacementRule,
} from "@/lib/settings";
import {
  isChapterBookmarked,
  removeNovelBookmark,
  saveNovelBookmark,
  subscribeToBookmarks,
} from "@/lib/storage/bookmarks";
import { getNovel } from "@/lib/storage/indexeddb";
import { isPaused, isSpeaking, pause, resume, speak } from "@/lib/tts";
import { cn } from "@/lib/utils";
import type { Novel } from "@/types";

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
  const [ttsState, setTtsState] = useState<"idle" | "playing" | "paused">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [bookmarked, setBookmarked] = useState(false);

  const longPressTimeoutRef = useRef<number | null>(null);
  const activeChapterRef = useRef<HTMLAnchorElement | null>(null);

  const safeNovelId = decodeURIComponent(novelId).trim();
  const parsedChapterIndex = Number(chapterParam) - 1;
  const requestedChapterIndex =
    Number.isNaN(parsedChapterIndex) || parsedChapterIndex < 0 ? 0 : parsedChapterIndex;
  const progressKey = `progress_${safeNovelId}`;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const nextNovel = await getNovel(safeNovelId);
        if (!cancelled) {
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
        try {
          const saved = window.localStorage.getItem(progressKey);
          if (!saved) {
            return;
          }

          const parsed = JSON.parse(saved) as { chapterIndex?: number; scrollY?: number };
          if (parsed.chapterIndex === requestedChapterIndex) {
            window.scrollTo({ top: parsed.scrollY || 0, behavior: "auto" });
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
    return () => {
      if (longPressTimeoutRef.current !== null) {
        clearTimeout(longPressTimeoutRef.current);
      }
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

  const previousHref =
    novel && chapterIndex > 0 ? `/reader?id=${novel.id}&chapter=${chapterIndex}` : undefined;
  const nextHref =
    novel && chapterIndex < novel.chapters.length - 1
      ? `/reader?id=${novel.id}&chapter=${chapterIndex + 2}`
      : undefined;

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

  const startTtsFromParagraph = useCallback(
    async (startIndex: number) => {
      const partialText = normalizedContent.slice(startIndex).join("\n\n");
      const started = await speak(partialText, settings, {
        onStart: () => {
          setTtsState("playing");
          setStatusMessage(
            startIndex === 0
              ? "Reading chapter aloud."
              : `Reading from paragraph ${startIndex + 1}.`,
          );
        },
        onPause: () => setTtsState("paused"),
        onResume: () => setTtsState("playing"),
        onEnd: () => {
          setTtsState("idle");
          setStatusMessage("Text-to-speech finished.");

          if (settings.autoNext && nextHref) {
            if (settings.autoPlayTts) {
              window.sessionStorage.setItem("krvt-reader-autoplay-tts", "1");
            }
            router.push(nextHref);
          }
        },
        onError: () => {
          setTtsState("idle");
          setStatusMessage("Text-to-speech could not start.");
        },
      });

      if (!started) {
        setTtsState("idle");
      }
    },
    [nextHref, normalizedContent, router, settings],
  );

  useEffect(() => {
    if (loading || !novel || !settings.autoPlayTts) {
      return;
    }

    let shouldAutoPlay = "";
    try {
      shouldAutoPlay = window.sessionStorage.getItem("krvt-reader-autoplay-tts") ?? "";
    } catch (e) {
      return;
    }

    if (shouldAutoPlay !== "1") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void startTtsFromParagraph(0);
    }, 0);

    return () => clearTimeout(timeout);
  }, [loading, novel, settings.autoPlayTts, startTtsFromParagraph]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
          <p className="text-sm text-white/40">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (!novel) {
    return <p className="p-6 text-red-400">Novel not found.</p>;
  }

  if (!chapter) {
    return <p className="p-6 text-red-400">Chapter not found.</p>;
  }

  const handleToggleTts = async () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setStatusMessage("TTS is not supported on this device.");
      return;
    }

    if (isSpeaking()) {
      if (isPaused()) {
        resume();
        setTtsState("playing");
        setStatusMessage("Text-to-speech resumed.");
      } else {
        pause();
        setTtsState("paused");
        setStatusMessage("Text-to-speech paused.");
      }
      return;
    }

    await startTtsFromParagraph(0);
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
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-[#d4b16a]">Chapters</p>
            <h2 className="truncate text-base font-semibold text-white">{novel.title}</h2>
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

        <div className="px-4 pt-4">
          <input
            type="search"
            value={chapterSearch}
            onChange={(event) => setChapterSearch(event.target.value)}
            placeholder="Search chapters"
            className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
          />
        </div>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto px-4 pb-6">
          {filteredChapters.map(({ item, index }) => {
            const href = `/reader?id=${novel.id}&chapter=${index + 1}`;
            const isActive = index === chapterIndex;

            return (
              <Link
                key={item.id ?? `${novel.id}-${index}`}
                href={href}
                ref={isActive ? activeChapterRef : undefined}
                onClick={() => setIsChapterPanelOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all duration-150",
                  isActive
                    ? "border-[#d4b16a]/30 bg-[#d4b16a]/8 text-[#d4b16a]"
                    : "border-white/6 bg-white/3 text-white/70 hover:border-white/12 hover:bg-white/6 hover:text-white",
                )}
              >
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider opacity-60">Ch. {index + 1}</p>
                  <p className="truncate font-medium">{item.title}</p>
                </div>
                <span className="shrink-0 text-[11px] uppercase tracking-wider opacity-50">
                  {isActive ? "Now" : "Go"}
                </span>
              </Link>
            );
          })}
        </div>
      </aside>

      <main
        className={cn("min-h-screen", settings.showBottomNav ? "pb-20" : "pb-8")}
        style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
      >
        {settings.showTopNav ? (
          <div className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0c10]/88 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <Link
                href={`/novel?id=${novel.id}`}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Back
              </Link>
              <p className="text-sm font-medium text-white/75">
                {chapterIndex + 1} / {totalChapters} ({progressPercent}%)
              </p>
            </div>
          </div>
        ) : null}

        <div className="w-full px-3 py-6 sm:px-4 sm:py-8">
          <ReaderControls
            novel={novel}
            chapterIndex={chapterIndex}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onToggleTts={handleToggleTts}
            onBookmark={handleBookmarkToggle}
            onOpenChapters={() => setIsChapterPanelOpen((current) => !current)}
            isBookmarked={bookmarked}
            isChapterPanelOpen={isChapterPanelOpen}
            ttsState={ttsState}
            onPrev={() => previousHref && router.push(previousHref)}
            onNext={() => nextHref && router.push(nextHref)}
          />

          {statusMessage ? (
            <div className="mb-5 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              {statusMessage}
            </div>
          ) : null}

          <article
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-6"
            onDoubleClick={() => setIsSettingsOpen(true)}
            style={{
              color: settings.textColor,
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
              fontFamily: settings.fontFamily,
              textAlign,
            }}
          >
            {normalizedContent.map((line, index) => (
              <p
                key={`${chapter.id}-${index}`}
                className="mb-6"
                style={{ opacity: 0.92 }}
                onPointerDown={handleParagraphPointerDown(index)}
                onPointerUp={clearLongPress}
                onPointerLeave={clearLongPress}
                onPointerCancel={clearLongPress}
              >
                {line}
              </p>
            ))}
          </article>

          {settings.showFooter ? (
            <div className="mt-12">
              <div className="mb-6 border-t border-white/8" />
              <div className="flex items-center justify-between gap-3">
                {previousHref ? (
                  <Link href={previousHref} className={navButtonClass}>
                    Previous
                  </Link>
                ) : (
                  <button type="button" disabled className={navButtonClass}>
                    Previous
                  </button>
                )}

                {nextHref ? (
                  <Link href={nextHref} className={navButtonClass}>
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

      const flags = rule.caseSensitive ? "g" : "gi";
      try {
        result = result.replace(new RegExp(rule.find, flags), rule.replace || "");
      } catch {
        if (rule.caseSensitive) {
          result = result.split(rule.find).join(rule.replace || "");
        } else {
          const lowerFind = rule.find.toLowerCase();
          let nextValue = result;
          let index = nextValue.toLowerCase().indexOf(lowerFind);
          while (index !== -1) {
            nextValue =
              nextValue.slice(0, index) +
              (rule.replace || "") +
              nextValue.slice(index + rule.find.length);
            index = nextValue.toLowerCase().indexOf(lowerFind, index + (rule.replace || "").length);
          }
          result = nextValue;
        }
      }
    }

    return result;
  });
}
