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
  getReaderFontStack,
  useReaderSettings,
  useBookmarks,
  useReader,
  useReaderNavigation,
  useProgress,
  type ReplacementRule,
} from "@/features/reader";
import { useTTS } from "@/features/tts";
import { cn } from "@/shared/utils";

type Props = {
  novelId: string;
  chapterParam: string;
};

export function ReaderPageClient({ novelId, chapterParam }: Props) {
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChapterPanelOpen, setIsChapterPanelOpen] = useState(false);
  const [chapterSearch, setChapterSearch] = useState("");
  const [, setStatusMessage] = useState("");

  const activeChapterRef = useRef<HTMLAnchorElement | null>(null);
  const paragraphRefs = useRef<Array<HTMLParagraphElement | null>>([]);

  const safeNovelId = decodeURIComponent(novelId).trim();
  const parsedChapterIndex = Number(chapterParam) - 1;
  const requestedChapterIndex =
    Number.isNaN(parsedChapterIndex) || parsedChapterIndex < 0 ? 0 : parsedChapterIndex;
  // Hooks from the new architecture
  const { settings, updateSettings } = useReaderSettings();
  const { novel, activeChapter: chapter, currentChapterIndex, isLoading, error, selectChapter } = useReader(safeNovelId, requestedChapterIndex);
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks(safeNovelId);
  const { saveScrollPosition, saveChapterChange } = useProgress(safeNovelId, currentChapterIndex);
  const {
    markTopNavigation,
    readTopNavigationRequest,
    clearTopNavigationRequest,
    getLegacyScrollPosition,
  } = useReaderNavigation();
  const totalChapters = novel?.chapters.length ?? 0;
  const nextHref =
    novel && currentChapterIndex < novel.chapters.length - 1
      ? `/reader?id=${novel.id}&chapter=${currentChapterIndex + 2}`
      : undefined;

  // Scroll restoration and saving logic
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

  // Save progress effect
  useEffect(() => {
    if (!novel) return;
    saveChapterChange(settings.fontSize);
  }, [novel, saveChapterChange, settings.fontSize]);

  // Chapter panel scroll effect
  useEffect(() => {
    if (!isChapterPanelOpen || !activeChapterRef.current) return;
    activeChapterRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [chapterSearch, isChapterPanelOpen]);

  const progressPercent = totalChapters > 0 ? Math.round(((currentChapterIndex + 1) / totalChapters) * 100) : 0;
  const textAlign = settings.textAlign as CSSProperties["textAlign"];
  const readerMaxWidth = settings.contentMaxWidth >= 9999 ? "100%" : `${settings.contentMaxWidth}px`;
  const readerFontFamily = getReaderFontStack(settings.fontFamily);

  useEffect(() => {
    ensureReaderFontsLoaded();
  }, []);

  const normalizedContent = useMemo(() => {
    if (!chapter) return [];
    const content = Array.isArray(chapter.content) ? chapter.content.filter(Boolean) : String(chapter.content ?? "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
    return applyTermReplacements(content, settings.replacements);
  }, [chapter, settings.replacements]);

  const handleAutoNextTts = useCallback(
    (href: string, targetChapterIndex: number, _shouldAutoPlay: boolean) => {
      markTopNavigation(safeNovelId, targetChapterIndex);
      router.push(href);
    },
    [markTopNavigation, router, safeNovelId],
  );

  const {
    ttsState,
    currentParagraphIndex,
    requestAutoplayOnNavigation,
    toggle: handleToggleTts,
    stop: handleStopTts,
    handleParagraphPointerDown: startLongPressTts,
    clearLongPress,
  } = useTTS({
    novelId: safeNovelId,
    chapterId: chapter?.id,
    chapterIndex: currentChapterIndex,
    isLoading,
    hasNovel: Boolean(novel),
    content: normalizedContent,
    settings,
    nextHref,
    onAutoNext: handleAutoNextTts,
    onStatusMessage: setStatusMessage,
  });

  const paragraphProgressPercent = currentParagraphIndex !== null && normalizedContent.length > 0 ? Math.round(((currentParagraphIndex + 1) / normalizedContent.length) * 100) : 0;
  const previousHref = novel && currentChapterIndex > 0 ? `/reader?id=${novel.id}&chapter=${currentChapterIndex}` : undefined;

  const prepareForNavigation = useCallback((targetChapterIndex: number) => {
    requestAutoplayOnNavigation();
    markTopNavigation(safeNovelId, targetChapterIndex);
  }, [markTopNavigation, requestAutoplayOnNavigation, safeNovelId]);

  const navigateToChapter = useCallback((href: string, targetChapterIndex: number) => {
    prepareForNavigation(targetChapterIndex);
    selectChapter(targetChapterIndex);
    router.push(href);
  }, [prepareForNavigation, router, selectChapter]);

  const filteredChapters = useMemo(() => {
    const query = chapterSearch.trim().toLowerCase();
    return (novel?.chapters ?? []).map((item, index) => ({ item, index })).filter(({ item, index }) => {
      if (!query) return true;
      return String(index + 1).includes(query) || item.title.toLowerCase().includes(query);
    });
  }, [chapterSearch, novel?.chapters]);

  useEffect(() => {
    paragraphRefs.current = paragraphRefs.current.slice(0, normalizedContent.length);
  }, [normalizedContent.length]);

  useEffect(() => {
    if (!settings.autoScroll || ttsState !== "playing" || currentParagraphIndex === null) return;
    const paragraph = paragraphRefs.current[currentParagraphIndex];
    if (!paragraph) return;
    const rect = paragraph.getBoundingClientRect();
    const topComfort = Math.round(window.innerHeight * 0.22);
    const bottomComfort = Math.round(window.innerHeight * 0.78);
    if (rect.top < topComfort || rect.bottom > bottomComfort) {
      paragraph.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [currentParagraphIndex, settings.autoScroll, ttsState]);

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

  if (isLoading) return <KrvtLoader />;
  if (!novel || error) return <p className="p-6 text-red-400">{error || "Novel not found."}</p>;
  if (!chapter) return <p className="p-6 text-red-400">Chapter not found.</p>;

  const handleBookmarkToggle = () => {
    if (isBookmarked(currentChapterIndex)) {
      removeBookmark(currentChapterIndex);
      setStatusMessage("Bookmark removed.");
    } else {
      addBookmark(currentChapterIndex);
      setStatusMessage("Chapter bookmarked.");
    }
  };

  const handleParagraphPointerDown = (index: number) => (_event: ReactPointerEvent<HTMLParagraphElement>) => {
    startLongPressTts(index);
  };

  const navButtonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/70 transition-all duration-150 hover:border-white/20 hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <>
      {isChapterPanelOpen && <button type="button" aria-label="Close chapter panel" onClick={() => setIsChapterPanelOpen(false)} className="fixed inset-0 z-40 bg-black/80 backdrop-blur-[2px]" />}
      <aside className={cn("fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-white/8 bg-[#0d0f13]/98 shadow-lg transition-transform duration-300 sm:shadow-[-24px_0_60px_rgba(0,0,0,0.4)]", isChapterPanelOpen ? "translate-x-0" : "translate-x-full")}>
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-3 py-3">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-widest text-[#d4b16a]">{novel.title}</p>
            <h2 className="truncate text-base font-semibold text-white">Chapter Index</h2>
          </div>
          <button type="button" onClick={() => setIsChapterPanelOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 hover:bg-white/5 hover:text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-3 pt-3">
          <input type="search" value={chapterSearch} onChange={(event) => setChapterSearch(event.target.value)} placeholder="Search chapters" className="w-full rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-white outline-none placeholder:text-white/30 focus:border-white/20" />
        </div>
        <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto px-3 pb-6">
          {filteredChapters.map(({ item, index }) => {
            const href = `/reader?id=${novel.id}&chapter=${index + 1}`;
            const isActive = index === currentChapterIndex;
            return (
              <Link key={item.id ?? `${novel.id}-${index}`} href={href} ref={isActive ? activeChapterRef : undefined} onClick={() => { prepareForNavigation(index); setIsChapterPanelOpen(false); }} className={cn("flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-all duration-150", isActive ? "border-[#d4b16a]/30 bg-[#d4b16a]/8 text-[#d4b16a]" : "border-white/6 bg-white/3 text-white/70 hover:border-white/12 hover:bg-white/6 hover:text-white")}>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium sm:text-sm">{index + 1}. {formatChapterIndexTitle(item.title, index)}</p></div>
              </Link>
            );
          })}
        </div>
      </aside>
      <main className={cn("min-h-screen", settings.showBottomNav ? "pb-20" : "pb-8")} style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}>
        <div className="w-full px-2 py-2 sm:px-4 sm:py-3">
          <ReaderControls novel={novel} chapterIndex={currentChapterIndex} totalChapters={totalChapters} progressPercent={progressPercent} contentMaxWidth={settings.contentMaxWidth} paragraphIndex={currentParagraphIndex} paragraphCount={normalizedContent.length} paragraphProgressPercent={paragraphProgressPercent} showProgress={settings.showTopNav} onOpenSettings={() => setIsSettingsOpen(true)} onToggleTts={handleToggleTts} onBookmark={handleBookmarkToggle} onOpenChapters={() => setIsChapterPanelOpen((current) => !current)} isBookmarked={isBookmarked(currentChapterIndex)} isChapterPanelOpen={isChapterPanelOpen} ttsState={ttsState} onPrev={() => previousHref && navigateToChapter(previousHref, currentChapterIndex - 1)} onNext={() => nextHref && navigateToChapter(nextHref, currentChapterIndex + 1)} onStopTts={handleStopTts} />
          <article className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6" onDoubleClick={() => setIsSettingsOpen(true)} style={{ color: settings.textColor, fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight, maxWidth: readerMaxWidth, fontFamily: readerFontFamily, textAlign }}>
            {normalizedContent.map((line, index) => {
              const isTitle = index === 0;
              const isHighlighted = settings.paragraphHighlight && currentParagraphIndex === index && (ttsState === "playing" || ttsState === "paused");
              return (
                <p key={`${chapter?.id}-${index}`} ref={(element) => { paragraphRefs.current[index] = element; }} className={cn("transition-all duration-300", isTitle ? "mb-8 font-serif text-2xl font-semibold leading-tight tracking-tight sm:mb-10 sm:text-3xl" : "mb-5 sm:mb-6", isHighlighted ? "rounded border-l-2 border-[#d4b16a] bg-[#d4b16a]/[0.08] pl-3 pr-2 py-1 shadow-sm" : "border-l-2 border-transparent pl-3 pr-2 py-1")} style={{ opacity: isHighlighted || isTitle ? 1 : 0.9 }} onPointerDown={handleParagraphPointerDown(index)} onPointerUp={clearLongPress} onPointerLeave={clearLongPress} onPointerCancel={clearLongPress}>{line}</p>
              );
            })}
          </article>
          {settings.showFooter && (
            <div className="mt-12">
              <div className="mb-6 border-t border-white/8" />
              <div className="flex items-center justify-between gap-3">
                {previousHref ? <Link href={previousHref} onClick={() => prepareForNavigation(currentChapterIndex - 1)} className={navButtonClass}>Previous</Link> : <button type="button" disabled className={navButtonClass}>Previous</button>}
                {nextHref ? <Link href={nextHref} onClick={() => prepareForNavigation(currentChapterIndex + 1)} className={navButtonClass}>Next</Link> : <button type="button" disabled className={navButtonClass}>Next</button>}
              </div>
            </div>
          )}
        </div>
      </main>
      <SettingsModal isOpen={isSettingsOpen} settings={settings} onClose={() => setIsSettingsOpen(false)} onChange={(next) => updateSettings(next)} />
    </>
  );
}

function applyTermReplacements(content: string[], replacements: ReplacementRule[]) {
  return content.map((line) => {
    let result = line.replace(/&quot;/gi, '"').replace(/&nbsp;/gi, " ").replace(/&#39;/gi, "'").replace(/\s{2,}/g, " ").replace(/\(To be continued.*?\)/gi, "").trim();
    for (const rule of replacements) {
      if (!rule.find) continue;
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
  if (!rule.isRegex) return new RegExp(escapeRegex(rule.find), baseFlags);
  return new RegExp(rule.find, baseFlags);
}

function replaceWithoutRegex(value: string, rule: ReplacementRule) {
  if (rule.caseSensitive) return value.split(rule.find).join(rule.replace || "");
  const lowerFind = rule.find.toLowerCase();
  let nextValue = value;
  let index = nextValue.toLowerCase().indexOf(lowerFind);
  while (index !== -1) {
    nextValue = nextValue.slice(0, index) + (rule.replace || "") + nextValue.slice(index + rule.find.length);
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
