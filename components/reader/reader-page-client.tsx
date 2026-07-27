"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

import { KrvtLoader } from "@/components/brand/krvt-loader";
import ReaderControls from "@/components/reader/reader-controls";
import { SettingsModal } from "@/components/reader/settings-modal";
import {
  ensureReaderFontsLoaded,
  useReaderSettings,
  useBookmarks,
  useReader,
  useReaderChapter,
  useReaderKeyboard,
  useReaderNavigation,
  useReaderProgress,
  useReaderScroll,
  useReaderSelection,
  useReaderUI,
  formatChapterIndexTitle,
} from "@/features/reader";
import { useTTS } from "@/features/tts";
import { cn } from "@/shared/utils";

type Props = {
  novelId: string;
  chapterParam: string;
};

export function ReaderPageClient({ novelId, chapterParam }: Props) {
  const router = useRouter();
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    isChapterPanelOpen,
    setIsChapterPanelOpen,
    chapterSearch,
    setChapterSearch,
    setStatusMessage,
  } = useReaderUI();

  const safeNovelId = decodeURIComponent(novelId).trim();
  const parsedChapterIndex = Number(chapterParam) - 1;
  const requestedChapterIndex =
    Number.isNaN(parsedChapterIndex) || parsedChapterIndex < 0 ? 0 : parsedChapterIndex;
  // Hooks from the new architecture
  const { settings, updateSettings } = useReaderSettings();
  const { novel, activeChapter: chapter, currentChapterIndex, isLoading, error, selectChapter } = useReader(safeNovelId, requestedChapterIndex);
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks(safeNovelId);
  const {
    markTopNavigation,
    readTopNavigationRequest,
    clearTopNavigationRequest,
    getLegacyScrollPosition,
  } = useReaderNavigation();
  const { saveScrollPosition } = useReaderProgress({
    novelId: safeNovelId,
    chapterIndex: currentChapterIndex,
    hasNovel: Boolean(novel),
    fontSize: settings.fontSize,
  });

  useEffect(() => {
    ensureReaderFontsLoaded();
  }, []);

  const preTtsChapterState = useReaderChapter({
    novel,
    chapter,
    chapterSearch,
    currentChapterIndex,
    currentParagraphIndex: null,
    settings,
    ttsState: "idle",
  });

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
    content: preTtsChapterState.normalizedContent,
    settings,
    nextHref: preTtsChapterState.nextHref,
    onAutoNext: handleAutoNextTts,
    onStatusMessage: setStatusMessage,
  });

  const chapterState = useReaderChapter({
    novel,
    chapter,
    chapterSearch,
    currentChapterIndex,
    currentParagraphIndex,
    settings,
    ttsState,
  });

  const prepareForNavigation = useCallback((targetChapterIndex: number) => {
    requestAutoplayOnNavigation();
    markTopNavigation(safeNovelId, targetChapterIndex);
  }, [markTopNavigation, requestAutoplayOnNavigation, safeNovelId]);

  const navigateToChapter = useCallback((href: string, targetChapterIndex: number) => {
    prepareForNavigation(targetChapterIndex);
    selectChapter(targetChapterIndex);
    router.push(href);
  }, [prepareForNavigation, router, selectChapter]);

  const {
    activeChapterRef,
    paragraphRefs,
    handleParagraphPointerDown,
  } = useReaderSelection({
    normalizedContentLength: chapterState.normalizedContent.length,
    startLongPressTts,
  });

  useReaderScroll({
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
    shouldAutoScroll: settings.autoScroll,
    ttsState,
  });

  useReaderKeyboard({
    currentChapterIndex,
    isChapterPanelOpen,
    isSettingsOpen,
    navigateToChapter,
    nextHref: chapterState.nextHref,
    previousHref: chapterState.previousHref,
  });

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
          {chapterState.filteredChapters.map(({ item, index }) => {
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
          <ReaderControls novel={novel} chapterIndex={currentChapterIndex} totalChapters={chapterState.totalChapters} progressPercent={chapterState.progressPercent} contentMaxWidth={settings.contentMaxWidth} paragraphIndex={currentParagraphIndex} paragraphCount={chapterState.normalizedContent.length} paragraphProgressPercent={chapterState.paragraphProgressPercent} showProgress={settings.showTopNav} onOpenSettings={() => setIsSettingsOpen(true)} onToggleTts={handleToggleTts} onBookmark={handleBookmarkToggle} onOpenChapters={() => setIsChapterPanelOpen((current) => !current)} isBookmarked={isBookmarked(currentChapterIndex)} isChapterPanelOpen={isChapterPanelOpen} ttsState={ttsState} onPrev={() => chapterState.previousHref && navigateToChapter(chapterState.previousHref, currentChapterIndex - 1)} onNext={() => chapterState.nextHref && navigateToChapter(chapterState.nextHref, currentChapterIndex + 1)} onStopTts={handleStopTts} />
          <article className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6" onDoubleClick={() => setIsSettingsOpen(true)} style={{ color: settings.textColor, fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight, maxWidth: chapterState.readerMaxWidth, fontFamily: chapterState.readerFontFamily, textAlign: chapterState.textAlign }}>
            {chapterState.normalizedContent.map((line, index) => {
              const isTitle = index === 0;
              const isHighlighted = chapterState.isParagraphHighlighted(index);
              return (
                <p key={`${chapter?.id}-${index}`} ref={(element) => { paragraphRefs.current[index] = element; }} className={cn("transition-all duration-300", isTitle ? "mb-8 font-serif text-2xl font-semibold leading-tight tracking-tight sm:mb-10 sm:text-3xl" : "mb-5 sm:mb-6", isHighlighted ? "rounded border-l-2 border-[#d4b16a] bg-[#d4b16a]/[0.08] pl-3 pr-2 py-1 shadow-sm" : "border-l-2 border-transparent pl-3 pr-2 py-1")} style={{ opacity: isHighlighted || isTitle ? 1 : 0.9 }} onPointerDown={handleParagraphPointerDown(index)} onPointerUp={clearLongPress} onPointerLeave={clearLongPress} onPointerCancel={clearLongPress}>{line}</p>
              );
            })}
          </article>
          {settings.showFooter && (
            <div className="mt-12">
              <div className="mb-6 border-t border-white/8" />
              <div className="flex items-center justify-between gap-3">
                {chapterState.previousHref ? <Link href={chapterState.previousHref} onClick={() => prepareForNavigation(currentChapterIndex - 1)} className={chapterState.navButtonClass}>Previous</Link> : <button type="button" disabled className={chapterState.navButtonClass}>Previous</button>}
                {chapterState.nextHref ? <Link href={chapterState.nextHref} onClick={() => prepareForNavigation(currentChapterIndex + 1)} className={chapterState.navButtonClass}>Next</Link> : <button type="button" disabled className={chapterState.navButtonClass}>Next</button>}
              </div>
            </div>
          )}
        </div>
      </main>
      <SettingsModal isOpen={isSettingsOpen} settings={settings} onClose={() => setIsSettingsOpen(false)} onChange={(next) => updateSettings(next)} />
    </>
  );
}

