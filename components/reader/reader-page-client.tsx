"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ReaderControls from "@/components/reader/reader-controls";
import { SettingsModal } from "@/components/reader/settings-modal";
import { saveChapterScrollPosition, saveNovelReadingProgress } from "@/lib/reader-storage";
import { saveSettings, useReaderSettings, type ReaderSettings } from "@/lib/settings";
import { isChapterBookmarked, removeNovelBookmark, saveNovelBookmark, subscribeToBookmarks } from "@/lib/storage/bookmarks";
import { getNovel } from "@/lib/storage/indexeddb";
import { isPaused, isSpeaking, pause, resume, speak, stop } from "@/lib/tts";
import { cn } from "@/lib/utils";
import type { Novel } from "@/types";

type Props = {
  novelId: string;
  chapterParam: string;
};

export function ReaderPageClient({ novelId, chapterParam }: Props) {
  const settings = useReaderSettings();
  const router = useRouter();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChapterPanelOpen, setIsChapterPanelOpen] = useState(false);
  const [chapterSearch, setChapterSearch] = useState("");
  const [ttsState, setTtsState] = useState<"idle" | "playing" | "paused">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [bookmarked, setBookmarked] = useState(false);
  const [autoNextEnabled, setAutoNextEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem("krvt-reader-auto-next") === "1"; } catch { return false; }
  });
  const [autoPlayTtsEnabled, setAutoPlayTtsEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem("krvt-reader-auto-play-tts") === "1"; } catch { return false; }
  });

  const activeChapterRef = useRef<HTMLAnchorElement | null>(null);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progressKey = `progress_${novelId}`;
  const autoNextKey = "krvt-reader-auto-next";
  const autoPlayKey = "krvt-reader-auto-play-tts";
  const parsedChapterIndex = Number(chapterParam) - 1;
  const requestedChapterIndex =
    Number.isNaN(parsedChapterIndex) || parsedChapterIndex < 0 ? 0 : parsedChapterIndex;

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    let isCancelled = false;
    async function load() {
      const data = await getNovel(novelId);
      if (!isCancelled) {
        setNovel(data);
        setLoading(false);
        window.setTimeout(() => {
          try {
            const saved = window.localStorage.getItem(progressKey);
            if (!saved) return;
            const parsed = JSON.parse(saved) as { chapterIndex?: number; scrollY?: number };
            if (parsed.chapterIndex === requestedChapterIndex) {
              window.scrollTo({ top: parsed.scrollY || 0, behavior: "auto" });
            }
          } catch { /* ignore */ }
        }, 100);
      }
    }
    load();
    return () => { isCancelled = true; };
  }, [novelId, progressKey, requestedChapterIndex]);

  useEffect(() => { return () => stop(); }, []);

  useEffect(() => {
    try { window.localStorage.setItem(autoNextKey, autoNextEnabled ? "1" : "0"); } catch { /* ignore */ }
  }, [autoNextEnabled]);

  useEffect(() => {
    try { window.localStorage.setItem(autoPlayKey, autoPlayTtsEnabled ? "1" : "0"); } catch { /* ignore */ }
  }, [autoPlayTtsEnabled]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    function handleScroll() {
      if (timeout) clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        try {
          window.localStorage.setItem(progressKey, JSON.stringify({ chapterIndex: requestedChapterIndex, scrollY: window.scrollY }));
          saveChapterScrollPosition(novelId, requestedChapterIndex, window.scrollY);
        } catch { /* ignore */ }
      }, 300);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [novelId, progressKey, requestedChapterIndex]);

  useEffect(() => {
    if (!novel) return;
    function updateBookmarkState() {
      setBookmarked(isChapterBookmarked(novel!.id, requestedChapterIndex));
    }
    updateBookmarkState();
    return subscribeToBookmarks(updateBookmarkState);
  }, [novel, requestedChapterIndex]);

  useEffect(() => {
    if (!novel) return;
    saveNovelReadingProgress(novel.id, requestedChapterIndex, settings.fontSize);
  }, [novel, requestedChapterIndex, settings.fontSize]);

  useEffect(() => {
    if (!isChapterPanelOpen || !activeChapterRef.current) return;
    activeChapterRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [isChapterPanelOpen, chapterSearch]);

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    };
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const chapterIndex = novel
    ? Math.min(requestedChapterIndex, novel.chapters.length - 1)
    : requestedChapterIndex;
  const chapter = novel?.chapters[chapterIndex];
  const textAlign = settings.textAlign ?? "left";
  const contentMaxWidth = Number(settings.contentMaxWidth ?? 720);
  const showNovelName = settings.showNovelName ?? true;
  const showChapterName = settings.showChapterName ?? true;
  const showTopNav = settings.showTopNav ?? true;
  const showBottomNav = settings.showBottomNav ?? true;
  const showFooter = settings.showFooter ?? true;

  const normalizedContent = useMemo(
    () =>
      chapter
        ? Array.isArray(chapter.content)
          ? chapter.content.filter(Boolean)
          : String(chapter.content ?? "")
              .split(/\n+/)
              .map((line) => line.trim())
              .filter(Boolean)
        : [],
    [chapter],
  );

  const previousHref = novel && chapterIndex > 0 ? `/novel/${novel.id}/${chapterIndex}` : undefined;
  const nextHref =
    novel && chapterIndex < novel.chapters.length - 1
      ? `/novel/${novel.id}/${chapterIndex + 2}`
      : undefined;

  const chapterSearchQuery = chapterSearch.trim().toLowerCase();
  const filteredChapters = (novel?.chapters ?? [])
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => {
      if (!chapterSearchQuery) return true;
      const chapterNumber = String(index + 1);
      const title = item.title.toLowerCase();
      return chapterNumber.includes(chapterSearchQuery) || title.includes(chapterSearchQuery);
    });

  // ── TTS ───────────────────────────────────────────────────────────────────
  const startTtsFromParagraph = useCallback(
    async (startIndex: number) => {
      const partialText = normalizedContent.slice(startIndex).join("\n\n");
      const started = await speak(partialText, settings, {
        onStart: () => {
          setTtsState("playing");
          setStatusMessage(startIndex === 0 ? "Reading chapter aloud." : `Reading from paragraph ${startIndex + 1}.`);
        },
        onPause: () => setTtsState("paused"),
        onResume: () => setTtsState("playing"),
        onEnd: () => {
          setTtsState("idle");
          setStatusMessage("Text-to-speech finished.");
          if (autoNextEnabled && nextHref) {
            if (autoPlayTtsEnabled) window.sessionStorage.setItem("krvt-reader-autoplay-tts", "1");
            try { router.push(nextHref); } catch (e) { console.error("Router push failed:", e); }
          }
        },
        onError: () => {
          setTtsState("idle");
          setStatusMessage("Text-to-speech could not start.");
        },
      });
      if (!started) setTtsState("idle");
    },
    [autoNextEnabled, autoPlayTtsEnabled, nextHref, normalizedContent, router, settings],
  );

  useEffect(() => {
    if (!autoPlayTtsEnabled || loading || !novel) return;
    const shouldAutoPlay = window.sessionStorage.getItem("krvt-reader-autoplay-tts");
    if (shouldAutoPlay !== "1") return;
    window.sessionStorage.removeItem("krvt-reader-autoplay-tts");
    const timeout = window.setTimeout(() => { void startTtsFromParagraph(0); }, 0);
    return () => clearTimeout(timeout);
  }, [autoPlayTtsEnabled, loading, novel, startTtsFromParagraph]);

  // ── Early returns ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
          <p className="text-sm text-white/40">Loading chapter…</p>
        </div>
      </div>
    );
  }
  if (!novel) return <p className="p-6 text-red-400">Novel not found.</p>;
  if (!chapter) return <div className="p-6">Chapter not found.</div>;

  // ── Handlers ──────────────────────────────────────────────────────────────
const handleToggleTts = async () => {
  try {
    if (!window.speechSynthesis) {
      setStatusMessage("TTS not supported");
      return;
    }

    if (isSpeaking()) {
      if (isPaused()) {
        resume();
        setTtsState("playing");
      } else {
        pause();
        setTtsState("paused");
      }
      return;
    }

    await startTtsFromParagraph(0);
  } catch (e) {
    console.error(e);
    setStatusMessage("TTS failed");
  }
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

const handleSettingsChange = (next: ReaderSettings) => saveSettings(next);

  // ── Shared nav button styles ──────────────────────────────────────────────
  const navBtnCls =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/70 transition-all duration-150 hover:border-white/20 hover:bg-white/8 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <>
      {/* ── Top header ─────────────────────────────────────────────────────── */}
      {showTopNav && (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 backdrop-blur-xl h-[90px]">

          {/* BACKGROUND IMAGE */}
         <div
           className="absolute inset-0 bg-cover bg-center opacity-30"
           style={{ backgroundImage: "url('/logo.png')" }}
         />

         <div className="absolute inset-0 bg-black/90" />

          <div className="relative flex h-full items-center px-4">

            {/* LEFT LOGO */}
            <Link href="/" className="flex items-center gap-3">
              <div className="relative flex items-center justify-center h-16 w-16 rounded-xl bg-white/5 border border-white/10 shadow-[0_0_25px_rgba(212,177,106,0.15)] backdrop-blur-sm">
                <img
                  src="/logo.png"
                  className="h-11 w-11 object-contain scale-110"
                  alt="logo"
                />
              </div>
            </Link>

            {/* CENTER TITLE */}
            <div className="flex-1 text-center">
              <span className="text-2xl font-semibold bg-gradient-to-r from-[#d4b16a] via-[#fff3d6] to-[#d4b16a] bg-clip-text text-transparent">
                KRVT Library
              </span>
            </div>

            {/* RIGHT SEARCH */}
            <div className="w-[260px]">
              <input
                placeholder="Search novels..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              />
            </div>

          </div>
        </header>
      )}

      {/* ── Chapter panel backdrop ────────────────────────────────────────── */}
      {isChapterPanelOpen && (
        <button
          type="button"
          aria-label="Close chapter panel"
          onClick={() => setIsChapterPanelOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-[2px]"
        />
      )}

      {/* ── Chapter panel ─────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-white/8 bg-[#0d0f13]/98 shadow-[-24px_0_60px_rgba(0,0,0,0.4)] transition-transform duration-300",
          isChapterPanelOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#d4b16a]">Chapters</p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">{novel.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsChapterPanelOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="shrink-0 px-5 pt-4">
          <input
            type="search"
            value={chapterSearch}
            onChange={(e) => setChapterSearch(e.target.value)}
            placeholder="Search chapters…"
            className="w-full rounded-xl border border-white/8 bg-white/4 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
          />
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-6 pr-4">
          {filteredChapters.map(({ item, index: resolvedIndex }) => {
            const href = `/novel/${novel.id}/${resolvedIndex + 1}`;
            const isActive = resolvedIndex === chapterIndex;
            return (
              <Link
                key={item.id ?? `${novel.id}-${resolvedIndex}`}
                href={href}
                ref={isActive ? activeChapterRef : undefined}
                onClick={() => setIsChapterPanelOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 transition-all duration-150",
                  isActive
                    ? "border-[#d4b16a]/30 bg-[#d4b16a]/8 text-[#d4b16a]"
                    : "border-white/6 bg-white/3 text-white/70 hover:border-white/12 hover:bg-white/6 hover:text-white",
                )}
              >
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Ch. {resolvedIndex + 1}</p>
                  <p className="truncate text-sm font-medium">{item.title}</p>
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] opacity-50">
                  {isActive ? "Now" : "Go"}
                </span>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main
        className={cn(
          "min-h-screen",
          showTopNav ? "pt-[90px]" : "pt-0",
        )}
        style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
      >
        <div className="w-full px-4 py-6 sm:px-6 sm:py-8">

          {/* ── Chapter header ────────────────────────────────────────────── */}
          {showChapterName && (
            <h1 className="mb-6 text-center text-5xl font-semibold tracking-tight sm:text-6xl">
              <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
                {chapter.title}
              </span>
            </h1>
          )}

          {/* ── Inline sticky control bar ─────────────────────────────────── */}
          {showTopNav && (
            <ReaderControls
              novel={novel}
              chapterIndex={chapterIndex}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onToggleTts={handleToggleTts}
              onBookmark={handleBookmarkToggle}
              onOpenChapters={() => setIsChapterPanelOpen((v) => !v)}
              isBookmarked={bookmarked}
              isChapterPanelOpen={isChapterPanelOpen}
              autoNextEnabled={autoNextEnabled}
              autoPlayTtsEnabled={autoPlayTtsEnabled}
              onToggleAutoNext={() => setAutoNextEnabled((v) => !v)}
              onToggleAutoPlayTts={() => setAutoPlayTtsEnabled((v) => !v)}
              ttsState={ttsState}

              // ✅ ADD THESE
              onPrev={() => {
                if (chapterIndex > 0) {
                  router.push(`/novel/${novel.id}/${chapterIndex}`);
                }
              }}
              onNext={() => {
                if (chapterIndex < novel.chapters.length - 1) {
                  router.push(`/novel/${novel.id}/${chapterIndex + 2}`);
                }
              }}
            />
          )}

          {/* ── Reading content ───────────────────────────────────────────── */}
          <article
            onDoubleClick={() => setIsSettingsOpen(true)}
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
              fontFamily: settings.fontFamily,
              textAlign,
            }}
          >
            <div className="w-full transition-all duration-200 px-2 sm:px-4">
              {normalizedContent.map((line, index) => (
                <p
                  key={`${chapter.id}-${index}`}
                  className="mb-6"
                  style={{ color: settings.textColor, opacity: 0.9 }}
                  onPointerDown={() => {
                    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
                    longPressTimeoutRef.current = window.setTimeout(() => {
                      void startTtsFromParagraph(index);
                    }, 450);
                  }}
                  onPointerUp={() => {
                    if (longPressTimeoutRef.current) {
                      clearTimeout(longPressTimeoutRef.current);
                      longPressTimeoutRef.current = null;
                    }
                  }}
                  onPointerLeave={() => {
                    if (longPressTimeoutRef.current) {
                      clearTimeout(longPressTimeoutRef.current);
                      longPressTimeoutRef.current = null;
                    }
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          </article>

          {/* ── End-of-chapter navigation ─────────────────────────────────── */}
          <div className="mt-16 w-full">
            <div className="mb-6 border-t border-white/8" />
            <div className="flex items-center justify-between gap-4">
              {previousHref ? (
                <Link href={previousHref} className={navBtnCls}>
                  Previous
                </Link>
              ) : (
                <button type="button" disabled className={navBtnCls}>
                  Previous
                </button>
              )}

              {nextHref ? (
                <Link href={nextHref} className={navBtnCls}>
                  Next
                </Link>
              ) : (
                <button type="button" disabled className={navBtnCls}>
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </main>


      {/* ── Settings modal ────────────────────────────────────────────────── */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onChange={handleSettingsChange}
      />
    </>
  );
}