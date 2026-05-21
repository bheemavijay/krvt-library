"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Bookmark,
  Info,
  List,
  Pause,
  Play,
  Settings,
  SkipBack,
  SkipForward,
  TextSelect,
  Volume2,
  Wand2,
} from "lucide-react";

type ReaderControlsProps = {
  novel: { id: string; title: string; chapters: Array<unknown> };
  chapterIndex: number;
  totalChapters: number;
  progressPercent: number;
  contentMaxWidth: number;
  paragraphIndex?: number | null;
  paragraphCount?: number;
  paragraphProgressPercent?: number;
  showProgress?: boolean;
  onOpenSettings: () => void;
  onToggleTts?: () => void;
  onBookmark?: () => void;
  onOpenChapters?: () => void;
  onToggleAutoScroll?: () => void;
  onToggleHighlight?: () => void;
  onToggleAutoNext?: () => void;
  isBookmarked?: boolean;
  isChapterPanelOpen?: boolean;
  autoScroll?: boolean;
  paragraphHighlight?: boolean;
  autoNext?: boolean;
  ttsState?: "idle" | "playing" | "paused";
  onPrev?: () => void;
  onNext?: () => void;
};

const IconBtn = ({
  onClick,
  label,
  active,
  children,
}: {
  onClick?: () => void;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      "flex shrink-0 items-center justify-center rounded-lg sm:rounded-xl",
      "h-10 w-10 sm:h-11 sm:w-11",
      "text-white/70 transition-all duration-200",
      "hover:bg-white/10 hover:text-white active:scale-95",
      active && "bg-white/5 text-[#d4b16a]",
    )}
  >
    {children}
  </button>
);

export default function ReaderControls({
  novel,
  chapterIndex,
  totalChapters,
  progressPercent,
  contentMaxWidth,
  paragraphIndex = null,
  paragraphCount = 0,
  paragraphProgressPercent = 0,
  showProgress = true,
  onOpenSettings,
  onToggleTts,
  onBookmark,
  onOpenChapters,
  onToggleAutoScroll,
  onToggleHighlight,
  onToggleAutoNext,
  isBookmarked = false,
  isChapterPanelOpen = false,
  autoScroll = true,
  paragraphHighlight = true,
  autoNext = false,
  ttsState = "idle",
  onPrev,
  onNext,
}: ReaderControlsProps) {
  const isTtsActive = ttsState === "playing" || ttsState === "paused";
  const hasPrev = chapterIndex > 0;
  const hasNext = chapterIndex < totalChapters - 1;
  const controlMaxWidth = contentMaxWidth >= 9999 ? "100%" : `${contentMaxWidth}px`;
  const ttsLabel =
    ttsState === "playing" ? "Pause reading" : ttsState === "paused" ? "Resume reading" : "Read aloud";

  return (
    <div className="sticky z-40 -mx-3 mb-4 sm:-mx-4" style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <div className="w-full px-3 py-2 sm:px-4">
        <div
          className="mx-auto w-full rounded-xl border border-white/10 bg-[#0b0c10]/90 px-2.5 py-2.5 shadow-lg shadow-black/25 backdrop-blur-xl sm:px-4"
          style={{ maxWidth: controlMaxWidth }}
        >
          {showProgress ? (
            <div className="mb-2 space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-white/55">
                <span className="flex min-w-0 items-center gap-2 truncate">
                  <Image src="/krvt-shield.svg" alt="" width={18} height={18} className="h-4 w-4 shrink-0" />
                  <span className="truncate">Chapter {chapterIndex + 1} of {totalChapters}</span>
                </span>
                <span className="shrink-0">{progressPercent}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-[#d4b16a] transition-[width] duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {paragraphIndex !== null && paragraphCount > 0 ? (
                <div className="flex items-center gap-2 text-[11px] text-white/45">
                  <span className="shrink-0">Paragraph {paragraphIndex + 1}/{paragraphCount}</span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-white/45 transition-[width] duration-300"
                      style={{ width: `${paragraphProgressPercent}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex min-h-10 w-full items-center justify-between gap-2">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="Previous chapter"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 sm:w-11"
            >
              <SkipBack size={17} />
            </button>

            <div className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-3">

              <IconBtn onClick={onBookmark} label="Bookmark" active={isBookmarked}>
                <Bookmark size={18} className="sm:w-5 sm:h-5" />
              </IconBtn>

              <Link
                href={`/novel?id=${novel.id}`}
                aria-label="Novel details"
                title="Novel details"
                className={iconButtonClass(false)}
              >
                <Info size={18} className="sm:w-5 sm:h-5" />
              </Link>

              <IconBtn onClick={onToggleTts} label={ttsLabel} active={isTtsActive}>
                {ttsState === "playing" ? (
                  <Pause size={18} className="sm:w-5 sm:h-5" />
                ) : ttsState === "paused" ? (
                  <Play size={18} className="sm:w-5 sm:h-5" />
                ) : (
                  <Volume2 size={18} className="sm:w-5 sm:h-5" />
                )}
              </IconBtn>

              <IconBtn onClick={onOpenSettings} label="Settings">
                <Settings size={18} className="sm:w-5 sm:h-5" />
              </IconBtn>

              <IconBtn onClick={onOpenChapters} label="Chapters" active={isChapterPanelOpen}>
                <List size={18} className="sm:w-5 sm:h-5" />
              </IconBtn>

            </div>
            <button
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Next chapter"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 sm:w-11"
            >
              <SkipForward size={17} />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5 border-t border-white/8 pt-2">
            <TogglePill active={autoScroll} label="Auto scroll" onClick={onToggleAutoScroll}>
              <Wand2 size={14} />
            </TogglePill>
            <TogglePill active={paragraphHighlight} label="Highlight" onClick={onToggleHighlight}>
              <TextSelect size={14} />
            </TogglePill>
            <TogglePill active={autoNext} label="Auto next" onClick={onToggleAutoNext}>
              <SkipForward size={14} />
            </TogglePill>
          </div>

        </div>
      </div>
    </div>
  );
}

function TogglePill({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-[11px] font-medium transition",
        active
          ? "border-[#d4b16a]/35 bg-[#d4b16a]/12 text-[#f0d99a] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "border-white/8 bg-white/[0.03] text-white/45 hover:bg-white/[0.07] hover:text-white/70",
      )}
    >
      {children}
      <span className="truncate">{label}</span>
    </button>
  );
}

function iconButtonClass(active?: boolean) {
  return cn(
    "flex shrink-0 items-center justify-center rounded-lg sm:rounded-xl",
    "h-10 w-10 sm:h-11 sm:w-11",
    "text-white/70 transition-all duration-200",
    "hover:bg-white/10 hover:text-white active:scale-95",
    active && "bg-white/5 text-[#d4b16a]",
  );
}
